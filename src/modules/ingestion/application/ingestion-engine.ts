import type { Clock } from "../../../shared/clock/index.js";
import type { IdGenerator } from "../../../shared/id-generator/index.js";
import type { CandidateImportService } from "../../candidate/application/candidate-import-service.js";
import { ImportResumeError } from "../../candidate/application/import-resume-command.js";
import {
  buildPreview,
  documentsForScope,
  needsConfirmation,
  type ClassifiedDocument,
  type IngestScope,
  type IngestionJob,
  type IngestionReport,
  type SourceKind,
} from "../domain/ingestion-job.js";
import {
  classifyDocument,
  contentHash,
  packageFingerprint,
  type RawSourceFile,
} from "./stages/classify.js";
import type { SourceAdapter, SourceAdapterInput } from "./source-adapters/source-adapter.js";
import { ZipSourceAdapter } from "./source-adapters/zip-adapter.js";
import { FolderSourceAdapter } from "./source-adapters/folder-adapter.js";
import { MultiFileSourceAdapter } from "./source-adapters/multi-file-adapter.js";
import type {
  DocumentFingerprintStore,
  FileIngestionJobRepository,
  IngestionJobRepository,
  InMemoryIngestionJobRepository,
} from "../infrastructure/ingestion-job-repository.js";
import type { IngestStagingStore } from "../infrastructure/ingest-staging-store.js";

function withoutBuffer(d: ClassifiedDocument): Omit<ClassifiedDocument, "bufferBase64"> {
  return {
    path: d.path,
    filename: d.filename,
    mimeType: d.mimeType,
    contentHash: d.contentHash,
    bytes: d.bytes,
    classification: d.classification,
  };
}

type JobRepo = IngestionJobRepository & {
  saveWithBuffers?(job: IngestionJob): Promise<void>;
  getBuffer?(jobId: string, contentHash: string): Buffer | undefined;
  clearBuffers?(jobId: string): void;
  memory?: InMemoryIngestionJobRepository;
};

export class IngestionEngine {
  private readonly adapters: SourceAdapter[] = [
    new ZipSourceAdapter(),
    new FolderSourceAdapter(),
    new MultiFileSourceAdapter(),
  ];

  constructor(
    private readonly deps: {
      clock: Clock;
      idGenerator: IdGenerator;
      jobs: JobRepo;
      fingerprints: DocumentFingerprintStore;
      candidateImport: CandidateImportService;
      workspaceId: string;
      actorId?: string;
      staging?: IngestStagingStore;
      /** Tests: process worker inline so AC assertions need no sleep. */
      runInline?: boolean;
    },
  ) {}

  /** HTTP: accept parts → create job → return immediately (async process). */
  async createJobFromUpload(input: {
    parts: SourceAdapterInput["parts"];
    sourceHint?: SourceKind;
    autoConfirmScope?: IngestScope;
  }): Promise<IngestionJob> {
    const adapter = this.selectAdapter(input.parts, input.sourceHint);
    const { label, files } = await adapter.extract({ parts: input.parts });
    const classified = this.classifyAll(files);
    const fingerprint = packageFingerprint(classified.map((d) => d.contentHash));

    const prior = await this.deps.jobs.findCompletedByPackageFingerprint(
      this.deps.workspaceId,
      fingerprint,
    );

    const now = this.deps.clock.now().toISOString();
    const jobId = this.deps.idGenerator.generateId("ingest");
    const preview = buildPreview(classified);

    let job: IngestionJob = {
      id: jobId,
      workspaceId: this.deps.workspaceId,
      status: "Created",
      sourceKind: adapter.kind,
      sourceLabel: label,
      packageFingerprint: fingerprint,
      documents: classified,
      preview,
      progress: { processed: 0, total: classified.length, percent: 0 },
      createdAt: now,
      updatedAt: now,
    };

    if (prior?.report) {
      job = {
        ...job,
        status: "Completed",
        scope: prior.scope ?? "cv",
        report: {
          imported: 0,
          duplicate: prior.report.imported + prior.report.duplicate,
          skipped: prior.report.skipped,
          unsupported: prior.report.unsupported,
          failed: 0,
          durationMs: 0,
          candidateIds: [...prior.report.candidateIds],
          jobIds: [...(prior.report.jobIds ?? [])],
          failures: [],
        },
        completedAt: now,
        progress: {
          processed: classified.length,
          total: classified.length,
          percent: 100,
        },
      };
      await this.persistJob(job);
      return this.publicJob(job);
    }

    await this.persistJob(job);
    this.deps.staging?.stage(jobId, classified);

    if (input.autoConfirmScope) {
      return this.confirmJob(jobId, input.autoConfirmScope);
    }

    if (!needsConfirmation(preview) && preview.cv > 0) {
      return this.confirmJob(jobId, "cv");
    }

    job = {
      ...job,
      status: "AwaitingConfirmation",
      updatedAt: this.deps.clock.now().toISOString(),
    };
    await this.persistJob(job);
    return this.publicJob(job);
  }

  async confirmJob(jobId: string, scope: IngestScope): Promise<IngestionJob> {
    const job = await this.deps.jobs.get(jobId);
    if (!job) throw new IngestionError("NOT_FOUND", "Ingestion job not found");
    if (job.status !== "AwaitingConfirmation" && job.status !== "Created") {
      if (
        job.status === "Completed" ||
        job.status === "CompletedWithWarnings" ||
        job.status === "Failed"
      ) {
        return this.publicJob(job);
      }
      if (job.status === "Queued" || job.status === "Running") {
        return this.publicJob(job);
      }
    }

    const updated: IngestionJob = {
      ...job,
      scope,
      status: "Queued",
      updatedAt: this.deps.clock.now().toISOString(),
    };
    await this.persistJob(updated);

    if (this.deps.runInline) {
      return this.runJob(jobId);
    }

    queueMicrotask(() => {
      void this.runJob(jobId).catch(async () => {
        const failed = await this.deps.jobs.get(jobId);
        if (failed && failed.status === "Running") {
          await this.persistJob({
            ...failed,
            status: "Failed",
            errorMessage: "Worker failed",
            updatedAt: this.deps.clock.now().toISOString(),
          });
        }
      });
    });

    return this.publicJob(updated);
  }

  async getJob(jobId: string): Promise<IngestionJob | undefined> {
    const job = await this.deps.jobs.get(jobId);
    return job ? this.publicJob(job) : undefined;
  }

  async listJobs(limit = 50): Promise<IngestionJob[]> {
    const list = await this.deps.jobs.list(this.deps.workspaceId, limit);
    return list.map((j) => this.publicJob(j));
  }

  /** Pipeline worker: Deduplicate → Knowledge Extraction → Persist → Report */
  async runJob(jobId: string): Promise<IngestionJob> {
    const started = this.deps.clock.now();
    let job = await this.requireJob(jobId);
    if (job.status === "Completed" || job.status === "CompletedWithWarnings") {
      return this.publicJob(job);
    }

    job = {
      ...job,
      status: "Running",
      updatedAt: started.toISOString(),
    };
    await this.persistJob(job);

    const scope = job.scope ?? "cv";
    const selected = documentsForScope(job.documents, scope);
    const skippedOutOfScope = job.documents.length - selected.length;
    const unsupported = job.documents.filter((d) => d.classification === "unsupported").length;

    const report: IngestionReport = {
      imported: 0,
      duplicate: 0,
      skipped: skippedOutOfScope,
      unsupported,
      failed: 0,
      durationMs: 0,
      candidateIds: [],
      jobIds: [],
      failures: [],
    };

    const total = selected.length || 1;
    let processed = 0;

    for (const doc of selected) {
      const existing = await this.deps.fingerprints.get(job.workspaceId, doc.contentHash);
      if (existing) {
        report.duplicate += 1;
        report.candidateIds.push(existing);
        processed += 1;
        await this.touchProgress(jobId, processed, selected.length);
        continue;
      }

      if (doc.classification === "jd") {
        // MVP: JD files counted skipped (no silent Job create without text pipeline).
        report.skipped += 1;
        processed += 1;
        await this.touchProgress(jobId, processed, selected.length);
        continue;
      }

      if (doc.classification !== "cv") {
        report.skipped += 1;
        processed += 1;
        await this.touchProgress(jobId, processed, selected.length);
        continue;
      }

      const buffer = this.resolveBuffer(jobId, doc);
      if (!buffer) {
        report.failed += 1;
        report.failures.push({ path: doc.path, reason: "Missing file buffer" });
        processed += 1;
        await this.touchProgress(jobId, processed, selected.length);
        continue;
      }

      try {
        const mime =
          doc.mimeType === "application/msword"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : doc.mimeType;
        const result = await this.deps.candidateImport.importResume({
          file: buffer,
          filename: doc.filename,
          mimeType: mime,
          sourceType: "bulk_import",
          workspaceId: job.workspaceId,
          actorId: this.deps.actorId ?? "recruiter_alpha",
        });
        await this.deps.fingerprints.set(job.workspaceId, doc.contentHash, result.candidateId);
        report.imported += 1;
        report.candidateIds.push(result.candidateId);
      } catch (err) {
        report.failed += 1;
        const reason =
          err instanceof ImportResumeError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Import failed";
        report.failures.push({ path: doc.path, reason });
      }

      processed += 1;
      await this.touchProgress(jobId, processed, selected.length);
      void total;
    }

    report.durationMs = Math.max(0, this.deps.clock.now().getTime() - started.getTime());
    const warnings = report.failed > 0 || report.duplicate > 0 || report.skipped > 0;
    const finished = this.deps.clock.now().toISOString();
    job = {
      ...(await this.requireJob(jobId)),
      status: warnings ? "CompletedWithWarnings" : "Completed",
      report,
      progress: { processed: selected.length, total: selected.length, percent: 100 },
      updatedAt: finished,
      completedAt: finished,
      documents: job.documents.map((d) => withoutBuffer(d)),
    };
    await this.persistJob(job);
    this.deps.jobs.clearBuffers?.(jobId);
    this.deps.staging?.clear(jobId);
    return this.publicJob(job);
  }

  private async touchProgress(jobId: string, processed: number, total: number): Promise<void> {
    const job = await this.requireJob(jobId);
    const percent = total === 0 ? 100 : Math.min(99, Math.round((processed / total) * 100));
    await this.persistJob({
      ...job,
      progress: { processed, total, percent },
      updatedAt: this.deps.clock.now().toISOString(),
    });
  }

  private resolveBuffer(jobId: string, doc: ClassifiedDocument): Buffer | undefined {
    if (doc.bufferBase64) return Buffer.from(doc.bufferBase64, "base64");
    const staged = this.deps.staging?.read(jobId, doc.contentHash);
    if (staged) return staged;
    const fromRepo = this.deps.jobs.getBuffer?.(jobId, doc.contentHash);
    if (fromRepo) return fromRepo;
    const mem = (this.deps.jobs as FileIngestionJobRepository).memory;
    return mem?.getBuffer(jobId, doc.contentHash);
  }

  private classifyAll(files: RawSourceFile[]): ClassifiedDocument[] {
    return files.map((f) => ({
      path: f.path,
      filename: f.filename,
      mimeType: f.mimeType,
      contentHash: contentHash(f.buffer),
      bytes: f.buffer.byteLength,
      classification: classifyDocument(f),
      bufferBase64: f.buffer.toString("base64"),
    }));
  }

  private selectAdapter(
    parts: SourceAdapterInput["parts"],
    hint?: SourceKind,
  ): SourceAdapter {
    if (hint) {
      const found = this.adapters.find((a) => a.kind === hint);
      if (found) return found;
    }
    if (parts.some((p) => p.filename.toLowerCase().endsWith(".zip"))) {
      return this.adapters.find((a) => a.kind === "zip")!;
    }
    if (parts.some((p) => (p.relativePath ?? "").includes("/"))) {
      return this.adapters.find((a) => a.kind === "folder")!;
    }
    return this.adapters.find((a) => a.kind === "multi_file")!;
  }

  private async persistJob(job: IngestionJob): Promise<void> {
    const stripped: IngestionJob = {
      ...job,
      documents: job.documents.map((d) => withoutBuffer(d)),
    };
    if (this.deps.jobs.saveWithBuffers && job.documents.some((d) => d.bufferBase64)) {
      await this.deps.jobs.saveWithBuffers({
        ...stripped,
        documents: job.documents,
      });
    } else {
      await this.deps.jobs.save(stripped);
    }
  }

  private async requireJob(id: string): Promise<IngestionJob> {
    const job = await this.deps.jobs.get(id);
    if (!job) throw new IngestionError("NOT_FOUND", "Ingestion job not found");
    // Re-attach buffers from side store for Running
    const docs = job.documents.map((d) => {
      if (d.bufferBase64) return d;
      const buf = this.resolveBuffer(id, d);
      return buf ? { ...d, bufferBase64: buf.toString("base64") } : d;
    });
    return { ...job, documents: docs };
  }

  private publicJob(job: IngestionJob): IngestionJob {
    return {
      ...job,
      documents: job.documents.map((d) => withoutBuffer(d)),
    };
  }
}

export class IngestionError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "IngestionError";
  }
}
