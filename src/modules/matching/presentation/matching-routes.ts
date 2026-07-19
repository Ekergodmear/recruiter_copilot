import type { FastifyInstance } from "fastify";
import { SecurityError } from "../../../shared/security/index.js";
import { MatchingService, MatchingServiceError } from "../application/matching-service.js";

/**
 * EPIC-005 — on-demand Matching Result.
 * GET /api/v1/matching?candidateId=&jobId=
 */
export function registerMatchingRoutes(
  app: FastifyInstance,
  matchingService: MatchingService,
): void {
  app.get("/api/v1/matching", async (request, reply) => {
    try {
      const query = request.query as { candidateId?: string; jobId?: string };
      const candidateId = query.candidateId?.trim();
      const jobId = query.jobId?.trim();
      if (!candidateId || !jobId) {
        return reply.status(400).send({
          error: "INVALID_QUERY",
          message: "candidateId and jobId are required",
        });
      }
      const result = await matchingService.match({ candidateId, jobId });
      return result;
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
  if (error instanceof MatchingServiceError) {
    const status =
      error.code === "CANDIDATE_NOT_FOUND" || error.code === "JOB_NOT_FOUND" ? 404 : 400;
    return reply.status(status).send({ error: error.code, message: error.message });
  }
  throw error;
}
