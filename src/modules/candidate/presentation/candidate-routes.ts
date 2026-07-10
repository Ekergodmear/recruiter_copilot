import type { FastifyInstance } from "fastify";
import type { CandidateImportService } from "../application/candidate-import-service.js";
import {
  CandidateEditError,
  type CandidateEditService,
} from "../application/candidate-edit-service.js";
import {
  ResumePreviewError,
  type ResumePreviewService,
} from "../application/resume-preview-service.js";
import { ImportResumeError } from "../application/import-resume-command.js";
import type { Clock } from "../../../shared/clock/index.js";
import { createTelemetryEvent, type TelemetryStore } from "../../../shared/telemetry/index.js";
import { renderCandidateReviewPage } from "./candidate-review-page.js";
import {
  EDITABLE_FIELDS,
  KNOWLEDGE_REVIEW_ACTIONS,
} from "../domain/knowledge/verified-knowledge.js";

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function detectMimeType(filename: string, reported?: string): string {
  if (reported && reported !== "application/octet-stream") {
    return reported;
  }
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? reported ?? "application/octet-stream";
}

export function registerCandidateRoutes(
  app: FastifyInstance,
  importService: CandidateImportService,
  editService: CandidateEditService,
  resumePreviewService: ResumePreviewService,
  defaultWorkspaceId: string,
  telemetry: TelemetryStore,
  clock: Clock,
): void {
  app.post("/api/v1/candidates/import-resume", async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "FILE_REQUIRED", message: "file is required" });
    }

    const buffer = await data.toBuffer();
    const filename = data.filename;
    const mimeType = detectMimeType(filename, data.mimetype);
    const traceId = `trace_route_${Date.now()}`;

    try {
      const result = await importService.importResume({
        file: buffer,
        filename,
        mimeType,
        sourceType: "manual_upload",
        workspaceId: defaultWorkspaceId,
        actorId: "recruiter_alpha",
      });

      return reply.status(201).send({
        ...result,
        reviewUrl: `/api/v1/candidates/${result.candidateId}/review/ui`,
      });
    } catch (error) {
      if (error instanceof ImportResumeError) {
        telemetry.record(
          createTelemetryEvent(
            {
              event_type: "resume_import_failed",
              trace_id: traceId,
              workspace_id: defaultWorkspaceId,
              actor_id: "recruiter_alpha",
              latency_ms: 0,
              error_code: error.code,
              outcome: "failed",
            },
            clock,
          ),
        );
        const status = error.code === "UNSUPPORTED_FORMAT" ? 400 : 422;
        return reply.status(status).send({ error: error.code, message: error.message });
      }
      telemetry.record(
        createTelemetryEvent(
          {
            event_type: "resume_import_failed",
            trace_id: traceId,
            workspace_id: defaultWorkspaceId,
            actor_id: "recruiter_alpha",
            latency_ms: 0,
            error_code: "INTERNAL_ERROR",
            outcome: "failed",
          },
          clock,
        ),
      );
      request.log.error(error);
      return reply.status(500).send({ error: "INTERNAL_ERROR", message: "Import failed" });
    }
  });

  app.get("/api/v1/candidates/:id/resume", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await resumePreviewService.getPreviewMetadata(id);
    } catch (error) {
      if (error instanceof ResumePreviewError) {
        const status = error.code === "NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({ error: error.code, message: error.message });
      }
      throw error;
    }
  });

  app.get("/api/v1/candidates/:id/resume/content", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const rendered = await resumePreviewService.renderPreview(id);
      const body = rendered.body;
      return reply
        .header("Content-Type", rendered.contentType)
        .header("Content-Disposition", `inline; filename="${rendered.filename}"`)
        .send(body);
    } catch (error) {
      if (error instanceof ResumePreviewError) {
        const status = error.code === "NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({ error: error.code, message: error.message });
      }
      throw error;
    }
  });

  app.get("/api/v1/candidates/:id/review", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await editService.getReview(id);
    } catch (error) {
      if (error instanceof CandidateEditError && error.code === "NOT_FOUND") {
        return reply.status(404).send({ error: error.code, message: error.message });
      }
      throw error;
    }
  });

  app.get("/api/v1/candidates/:id/review/ui", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await editService.getReview(id);
      return reply.type("text/html").send(renderCandidateReviewPage(id));
    } catch (error) {
      if (error instanceof CandidateEditError && error.code === "NOT_FOUND") {
        return reply.status(404).send({ error: error.code, message: error.message });
      }
      throw error;
    }
  });

  app.post("/api/v1/candidates/:id/knowledge/review", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      field?: string;
      action?: string;
      humanValue?: string;
      reason?: string | null;
      editDurationMs?: number;
    };

    if (!body?.field || !body?.action) {
      return reply.status(400).send({
        error: "INVALID_BODY",
        message: "field and action are required",
      });
    }

    if (!EDITABLE_FIELDS.includes(body.field as (typeof EDITABLE_FIELDS)[number])) {
      return reply.status(400).send({
        error: "FIELD_NOT_EDITABLE",
        message: `Field not editable: ${body.field}`,
      });
    }

    if (
      !KNOWLEDGE_REVIEW_ACTIONS.includes(body.action as (typeof KNOWLEDGE_REVIEW_ACTIONS)[number])
    ) {
      return reply.status(400).send({
        error: "INVALID_ACTION",
        message: `Invalid review action: ${body.action}`,
      });
    }

    try {
      const review = await editService.reviewKnowledge({
        candidateId: id,
        field: body.field as (typeof EDITABLE_FIELDS)[number],
        action: body.action as (typeof KNOWLEDGE_REVIEW_ACTIONS)[number],
        humanValue: body.humanValue,
        reason: body.reason,
        actorId: "recruiter_alpha",
        editDurationMs: body.editDurationMs,
      });
      return review;
    } catch (error) {
      if (error instanceof CandidateEditError) {
        const status = error.code === "NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({ error: error.code, message: error.message });
      }
      throw error;
    }
  });

  app.patch("/api/v1/candidates/:id/knowledge", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      field?: string;
      humanValue?: string;
      reason?: string | null;
      editDurationMs?: number;
    };

    if (!body?.field || body.humanValue === undefined) {
      return reply.status(400).send({
        error: "INVALID_BODY",
        message: "field and humanValue are required",
      });
    }

    if (!EDITABLE_FIELDS.includes(body.field as (typeof EDITABLE_FIELDS)[number])) {
      return reply.status(400).send({
        error: "FIELD_NOT_EDITABLE",
        message: `Field not editable: ${body.field}`,
      });
    }

    try {
      const review = await editService.editKnowledge({
        candidateId: id,
        field: body.field as (typeof EDITABLE_FIELDS)[number],
        humanValue: body.humanValue,
        reason: body.reason,
        actorId: "recruiter_alpha",
        editDurationMs: body.editDurationMs,
      });
      return review;
    } catch (error) {
      if (error instanceof CandidateEditError) {
        const status = error.code === "NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({ error: error.code, message: error.message });
      }
      throw error;
    }
  });

  app.post("/api/v1/candidates/:id/knowledge/verify", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { field?: string };

    if (!body?.field) {
      return reply.status(400).send({
        error: "INVALID_BODY",
        message: "field is required",
      });
    }

    if (!EDITABLE_FIELDS.includes(body.field as (typeof EDITABLE_FIELDS)[number])) {
      return reply.status(400).send({
        error: "FIELD_NOT_EDITABLE",
        message: `Field not editable: ${body.field}`,
      });
    }

    try {
      const review = await editService.verifyKnowledge({
        candidateId: id,
        field: body.field as (typeof EDITABLE_FIELDS)[number],
        actorId: "recruiter_alpha",
      });
      return review;
    } catch (error) {
      if (error instanceof CandidateEditError) {
        const status = error.code === "NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({ error: error.code, message: error.message });
      }
      throw error;
    }
  });

  app.post("/api/v1/candidates/:id/mark-ready", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const review = await editService.markCandidateReady({
        candidateId: id,
        actorId: "recruiter_alpha",
      });
      return review;
    } catch (error) {
      if (error instanceof CandidateEditError) {
        const status =
          error.code === "NOT_FOUND" ? 404 : error.code === "ALREADY_READY" ? 409 : 400;
        return reply.status(status).send({ error: error.code, message: error.message });
      }
      throw error;
    }
  });
}
