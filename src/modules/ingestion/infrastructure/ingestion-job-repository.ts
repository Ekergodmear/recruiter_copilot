import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { IngestionJob } from "../domain/ingestion-job.js";

export interface IngestionJobRepository {
  save(job: IngestionJob): Promise<void>;
  get(id: string): Promise<IngestionJob | undefined>;
  list(workspaceId: string, limit?: number): Promise<IngestionJob[]>;
  findCompletedByPackageFingerprint(
    workspaceId: string,
    packageFingerprint: string,
  ): Promise<IngestionJob | undefined>;
}

function stripBuffers(job: IngestionJob): IngestionJob {
  return {
    ...job,
    documents: job.documents.map((d) => ({
      path: d.path,
      filename: d.filename,
      mimeType: d.mimeType,
      contentHash: d.contentHash,
      bytes: d.bytes,
      classification: d.classification,
    })),
  };
}

export class InMemoryIngestionJobRepository implements IngestionJobRepository {
  private readonly jobs = new Map<string, IngestionJob>();

  async save(job: IngestionJob): Promise<void> {
    this.jobs.set(job.id, structuredClone(stripBuffers(job)));
  }

  /** Keep buffers in a side map for in-flight processing (memory driver / tests). */
  private readonly buffers = new Map<string, Map<string, string>>();

  async saveWithBuffers(job: IngestionJob): Promise<void> {
    const bufMap = new Map<string, string>();
    for (const d of job.documents) {
      if (d.bufferBase64) bufMap.set(d.contentHash, d.bufferBase64);
    }
    this.buffers.set(job.id, bufMap);
    await this.save(job);
  }

  getBuffer(jobId: string, contentHash: string): Buffer | undefined {
    const b64 = this.buffers.get(jobId)?.get(contentHash);
    return b64 ? Buffer.from(b64, "base64") : undefined;
  }

  clearBuffers(jobId: string): void {
    this.buffers.delete(jobId);
  }

  async get(id: string): Promise<IngestionJob | undefined> {
    const j = this.jobs.get(id);
    return j ? structuredClone(j) : undefined;
  }

  async list(workspaceId: string, limit = 50): Promise<IngestionJob[]> {
    return [...this.jobs.values()]
      .filter((j) => j.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((j) => structuredClone(j));
  }

  async findCompletedByPackageFingerprint(
    workspaceId: string,
    packageFingerprint: string,
  ): Promise<IngestionJob | undefined> {
    const hit = [...this.jobs.values()].find(
      (j) =>
        j.workspaceId === workspaceId &&
        j.packageFingerprint === packageFingerprint &&
        (j.status === "Completed" || j.status === "CompletedWithWarnings") &&
        j.report,
    );
    return hit ? structuredClone(hit) : undefined;
  }

  snapshot(): IngestionJob[] {
    return [...this.jobs.values()].map((j) => structuredClone(j));
  }

  loadAll(jobs: IngestionJob[]): void {
    this.jobs.clear();
    for (const j of jobs) this.jobs.set(j.id, structuredClone(stripBuffers(j)));
  }
}

/** Durable JSON — AC-AUDIT-1. Buffers live only in process memory during Running. */
export class FileIngestionJobRepository implements IngestionJobRepository {
  readonly memory = new InMemoryIngestionJobRepository();
  private loaded = false;

  constructor(private readonly filePath: string) {}

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    if (!existsSync(this.filePath)) return;
    try {
      const raw = JSON.parse(readFileSync(this.filePath, "utf8")) as IngestionJob[];
      this.memory.loadAll(raw);
    } catch {
      /* ignore */
    }
  }

  private flush(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.memory.snapshot()), "utf8");
  }

  async save(job: IngestionJob): Promise<void> {
    this.ensureLoaded();
    await this.memory.save(job);
    this.flush();
  }

  async saveWithBuffers(job: IngestionJob): Promise<void> {
    this.ensureLoaded();
    await this.memory.saveWithBuffers(job);
    this.flush();
  }

  getBuffer(jobId: string, contentHash: string): Buffer | undefined {
    this.ensureLoaded();
    return this.memory.getBuffer(jobId, contentHash);
  }

  clearBuffers(jobId: string): void {
    this.memory.clearBuffers(jobId);
  }

  async get(id: string): Promise<IngestionJob | undefined> {
    this.ensureLoaded();
    return this.memory.get(id);
  }

  async list(workspaceId: string, limit?: number): Promise<IngestionJob[]> {
    this.ensureLoaded();
    return this.memory.list(workspaceId, limit);
  }

  async findCompletedByPackageFingerprint(
    workspaceId: string,
    packageFingerprint: string,
  ): Promise<IngestionJob | undefined> {
    this.ensureLoaded();
    return this.memory.findCompletedByPackageFingerprint(workspaceId, packageFingerprint);
  }
}

/** Content-hash → candidateId for document-level idempotency (AC-IDEMPOTENT-1). */
export interface DocumentFingerprintStore {
  get(workspaceId: string, contentHash: string): Promise<string | undefined>;
  set(workspaceId: string, contentHash: string, candidateId: string): Promise<void>;
}

export class InMemoryFingerprintStore implements DocumentFingerprintStore {
  private readonly map = new Map<string, string>();

  private key(workspaceId: string, hash: string) {
    return `${workspaceId}:${hash}`;
  }

  async get(workspaceId: string, contentHash: string): Promise<string | undefined> {
    return this.map.get(this.key(workspaceId, contentHash));
  }

  async set(workspaceId: string, contentHash: string, candidateId: string): Promise<void> {
    this.map.set(this.key(workspaceId, contentHash), candidateId);
  }

  snapshot(): Record<string, string> {
    return Object.fromEntries(this.map);
  }

  load(raw: Record<string, string>): void {
    this.map.clear();
    for (const [k, v] of Object.entries(raw)) this.map.set(k, v);
  }
}

export class FileFingerprintStore implements DocumentFingerprintStore {
  private readonly memory = new InMemoryFingerprintStore();
  private loaded = false;

  constructor(private readonly filePath: string) {}

  private ensure(): void {
    if (this.loaded) return;
    this.loaded = true;
    if (!existsSync(this.filePath)) return;
    try {
      this.memory.load(JSON.parse(readFileSync(this.filePath, "utf8")) as Record<string, string>);
    } catch {
      /* ignore */
    }
  }

  private flush(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.memory.snapshot()), "utf8");
  }

  async get(workspaceId: string, contentHash: string): Promise<string | undefined> {
    this.ensure();
    return this.memory.get(workspaceId, contentHash);
  }

  async set(workspaceId: string, contentHash: string, candidateId: string): Promise<void> {
    this.ensure();
    await this.memory.set(workspaceId, contentHash, candidateId);
    this.flush();
  }
}
