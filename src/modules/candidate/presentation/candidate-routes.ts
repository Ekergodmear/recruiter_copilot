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
import { renderCandidateReviewPage } from "./candidate-review-page.js";
import {
  EDITABLE_FIELDS,
  KNOWLEDGE_REVIEW_ACTIONS,
} from "../domain/knowledge/verified-knowledge.js";
import {
  getLogger,
  setRequestCandidateId,
  withOperation,
  type Logger,
} from "../../../shared/logging/index.js";
import {
  cleanupMultipartTemp,
  pickAllowedFields,
  SecurityError,
  validateResumeUpload,
} from "../../../shared/security/index.js";

export function registerCandidateRoutes(
  app: FastifyInstance,
  importService: CandidateImportService,
  editService: CandidateEditService,
  resumePreviewService: ResumePreviewService,
  defaultWorkspaceId: string,
  logger: Logger = getLogger(),
  maxFileSizeBytes = 10 * 1024 * 1024,
): void {
  app.get("/api/v1/candidates", async (request) => {
    const query = request.query as { ready?: string; q?: string };
    let ready: boolean | undefined;
    if (query.ready === "true") ready = true;
    if (query.ready === "false") ready = false;
    return editService.listCandidates({ ready, q: query.q });
  });

  app.post("/api/v1/candidates/import-resume", async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "FILE_REQUIRED", message: "file is required" });
    }

    try {
      const buffer = await data.toBuffer();
      const validated = await validateResumeUpload({
        buffer,
        filename: data.filename,
        reportedMime: data.mimetype,
        maxFileSizeBytes,
      });

      const result = await withOperation(logger, "resume_import", async () =>
        importService.importResume({
          file: validated.buffer,
          filename: validated.filename,
          mimeType: validated.mimeType,
          sourceType: "manual_upload",
          workspaceId: defaultWorkspaceId,
          actorId: "recruiter_alpha",
        }),
      );
      setRequestCandidateId(result.candidateId);

      return reply.status(201).send({
        ...result,
        reviewUrl: `/api/v1/candidates/${result.candidateId}/review/ui`,
      });
    } catch (error) {
      if (error instanceof SecurityError) {
        return reply.status(error.statusCode).send({ error: error.code, message: error.message });
      }
      if (error instanceof ImportResumeError) {
        const status =
          error.code === "UNSUPPORTED_FORMAT" || error.code === "EMPTY_FILE"
            ? 400
            : error.code === "FILE_TOO_LARGE"
              ? 413
              : 422;
        return reply.status(status).send({ error: error.code, message: error.message });
      }
      return reply.status(500).send({ error: "INTERNAL_ERROR", message: "Import failed" });
    } finally {
      await cleanupMultipartTemp(data as { filepath?: string });
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
    setRequestCandidateId(id);
    try {
      return await withOperation(logger, "review_session", async () => editService.getReview(id), {
        candidateId: id,
      });
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
    let body: {
      field?: string;
      action?: string;
      humanValue?: string;
      reason?: string | null;
      editDurationMs?: number;
    };
    try {
      body = pickAllowedFields(request.body, [
        "field",
        "action",
        "humanValue",
        "reason",
        "editDurationMs",
      ]);
    } catch (error) {
      if (error instanceof SecurityError) {
        return reply.status(error.statusCode).send({ error: error.code, message: error.message });
      }
      throw error;
    }

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
    let body: {
      field?: string;
      humanValue?: string;
      reason?: string | null;
      editDurationMs?: number;
    };
    try {
      body = pickAllowedFields(request.body, ["field", "humanValue", "reason", "editDurationMs"]);
    } catch (error) {
      if (error instanceof SecurityError) {
        return reply.status(error.statusCode).send({ error: error.code, message: error.message });
      }
      throw error;
    }

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
    let body: { field?: string };
    try {
      body = pickAllowedFields(request.body, ["field"]);
    } catch (error) {
      if (error instanceof SecurityError) {
        return reply.status(error.statusCode).send({ error: error.code, message: error.message });
      }
      throw error;
    }

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
    let body: { reviewMode?: "focus" | "flexible" };
    try {
      body = pickAllowedFields(request.body, ["reviewMode"]);
    } catch (error) {
      if (error instanceof SecurityError) {
        return reply.status(error.statusCode).send({ error: error.code, message: error.message });
      }
      throw error;
    }
    try {
      const review = await editService.markCandidateReady({
        candidateId: id,
        actorId: "recruiter_alpha",
        reviewMode:
          body.reviewMode === "focus" || body.reviewMode === "flexible"
            ? body.reviewMode
            : undefined,
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
