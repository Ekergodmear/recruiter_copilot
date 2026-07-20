import type { FastifyInstance } from "fastify";
import { cleanupMultipartTemp } from "../../../shared/security/temp-cleanup.js";
import { IngestionEngine, IngestionError } from "../application/ingestion-engine.js";
import type { IngestScope, SourceKind } from "../domain/ingestion-job.js";

function toView(job: NonNullable<Awaited<ReturnType<IngestionEngine["getJob"]>>>) {
  return {
    jobId: job.id,
    status: job.status,
    sourceKind: job.sourceKind,
    sourceLabel: job.sourceLabel,
    preview: job.preview,
    scope: job.scope,
    progress: job.progress,
    report: job.report,
    packageFingerprint: job.packageFingerprint,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
    errorMessage: job.errorMessage,
    documents: job.documents.map((d) => ({
      path: d.path,
      filename: d.filename,
      classification: d.classification,
      bytes: d.bytes,
    })),
  };
}

export function registerIngestionRoutes(
  app: FastifyInstance,
  engine: IngestionEngine,
  maxFileSizeBytes: number,
): void {
  app.post("/api/v1/ingestion/jobs", async (request, reply) => {
    const parts: {
      filename: string;
      mimeType: string;
      buffer: Buffer;
      relativePath?: string;
    }[] = [];
    let sourceHint: SourceKind | undefined;
    let autoScope: IngestScope | undefined;

    if (request.isMultipart()) {
      const multiparts = request.parts({
        limits: { fileSize: maxFileSizeBytes, files: 500 },
      });
      for await (const part of multiparts) {
        if (part.type === "file") {
          try {
            const buffer = await part.toBuffer();
            parts.push({
              filename: part.filename,
              mimeType: part.mimetype,
              buffer,
              relativePath: part.filename,
            });
          } finally {
            await cleanupMultipartTemp(part);
          }
        } else {
          const value = String(part.value ?? "");
          if (part.fieldname === "sourceKind") sourceHint = value as SourceKind;
          if (part.fieldname === "scope") autoScope = value as IngestScope;
        }
      }
    } else {
      const body = request.body as {
        files?: {
          filename: string;
          mimeType: string;
          contentBase64: string;
          relativePath?: string;
        }[];
        sourceKind?: SourceKind;
        scope?: IngestScope;
      };
      if (!body?.files?.length) {
        return reply.code(400).send({
          code: "INVALID_REQUEST",
          message: "Expected multipart files or JSON files[]",
        });
      }
      sourceHint = body.sourceKind;
      autoScope = body.scope;
      for (const f of body.files) {
        parts.push({
          filename: f.filename,
          mimeType: f.mimeType,
          buffer: Buffer.from(f.contentBase64, "base64"),
          relativePath: f.relativePath,
        });
      }
    }

    if (parts.length === 0) {
      return reply.code(400).send({ code: "NO_FILES", message: "No files uploaded" });
    }

    try {
      const job = await engine.createJobFromUpload({
        parts,
        sourceHint,
        autoConfirmScope: autoScope,
      });
      return reply.code(202).send(toView(job));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ingestion failed";
      return reply.code(400).send({ code: "INGEST_CREATE_FAILED", message });
    }
  });

  app.post<{ Params: { id: string }; Body: { scope?: IngestScope } }>(
    "/api/v1/ingestion/jobs/:id/confirm",
    async (request, reply) => {
      const scope = request.body?.scope ?? "cv";
      try {
        const job = await engine.confirmJob(request.params.id, scope);
        return reply.code(202).send(toView(job));
      } catch (err) {
        if (err instanceof IngestionError && err.code === "NOT_FOUND") {
          return reply.code(404).send({ code: "NOT_FOUND", message: err.message });
        }
        throw err;
      }
    },
  );

  app.get<{ Params: { id: string } }>("/api/v1/ingestion/jobs/:id", async (request, reply) => {
    const job = await engine.getJob(request.params.id);
    if (!job) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Ingestion job not found" });
    }
    return toView(job);
  });

  app.get("/api/v1/ingestion/jobs", async (request) => {
    const q = request.query as { limit?: string };
    const limit = q.limit ? Number(q.limit) : 50;
    const items = await engine.listJobs(Number.isFinite(limit) ? limit : 50);
    return { items: items.map((j) => toView(j)) };
  });
}
