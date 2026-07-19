import type { FastifyInstance } from "fastify";
import { SecurityError } from "../../../shared/security/index.js";
import { MatchingServiceError } from "../../matching/application/matching-service.js";
import { CopilotService, CopilotServiceError } from "../application/copilot-service.js";

/**
 * EPIC-006 — on-demand Copilot actions (read-only).
 * Responses always separate `evidence` (platform) from `aiSuggestion` (LLM).
 */
export function registerCopilotRoutes(app: FastifyInstance, copilotService: CopilotService): void {
  app.post("/api/v1/copilot/explain-match", async (request, reply) => {
    try {
      const body = request.body as { candidateId?: string; jobId?: string };
      const candidateId = body.candidateId?.trim();
      const jobId = body.jobId?.trim();
      if (!candidateId || !jobId) {
        return reply.status(400).send({
          error: "INVALID_BODY",
          message: "candidateId and jobId are required",
        });
      }
      return await copilotService.explainMatch({ candidateId, jobId });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/copilot/summarize-candidate", async (request, reply) => {
    try {
      const body = request.body as { candidateId?: string };
      const candidateId = body.candidateId?.trim();
      if (!candidateId) {
        return reply.status(400).send({
          error: "INVALID_BODY",
          message: "candidateId is required",
        });
      }
      return await copilotService.summarizeCandidate({ candidateId });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/copilot/summarize-job", async (request, reply) => {
    try {
      const body = request.body as { jobId?: string };
      const jobId = body.jobId?.trim();
      if (!jobId) {
        return reply.status(400).send({
          error: "INVALID_BODY",
          message: "jobId is required",
        });
      }
      return await copilotService.summarizeJob({ jobId });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/copilot/draft-outreach", async (request, reply) => {
    try {
      const body = request.body as { candidateId?: string; jobId?: string };
      const candidateId = body.candidateId?.trim();
      const jobId = body.jobId?.trim();
      if (!candidateId || !jobId) {
        return reply.status(400).send({
          error: "INVALID_BODY",
          message: "candidateId and jobId are required",
        });
      }
      return await copilotService.draftOutreach({ candidateId, jobId });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/copilot/suggest-interview-questions", async (request, reply) => {
    try {
      const body = request.body as { candidateId?: string; jobId?: string };
      const candidateId = body.candidateId?.trim();
      const jobId = body.jobId?.trim();
      if (!candidateId || !jobId) {
        return reply.status(400).send({
          error: "INVALID_BODY",
          message: "candidateId and jobId are required",
        });
      }
      return await copilotService.suggestInterviewQuestions({ candidateId, jobId });
    } catch (error) {
      return sendError(reply, error);
    }
  });
}

function sendError(
  reply: {
    status: (code: number) => { send: (body: unknown) => unknown };
  },
  error: unknown,
) {
  if (error instanceof SecurityError) {
    return reply.status(error.statusCode).send({ error: error.code, message: error.message });
  }
  if (error instanceof CopilotServiceError || error instanceof MatchingServiceError) {
    const code = error.code;
    const status =
      code === "CANDIDATE_NOT_FOUND" || code === "JOB_NOT_FOUND"
        ? 404
        : code === "PROVIDER_UNAVAILABLE"
          ? 503
          : 400;
    return reply.status(status).send({ error: code, message: error.message });
  }
  throw error;
}
