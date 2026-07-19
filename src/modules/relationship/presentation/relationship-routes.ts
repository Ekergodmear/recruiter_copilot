import type { FastifyInstance } from "fastify";
import { pickAllowedFields, SecurityError } from "../../../shared/security/index.js";
import { RELATIONSHIP_STATUSES, type RelationshipStatus } from "../domain/types.js";
import {
  RelationshipService,
  RelationshipServiceError,
} from "../application/relationship-service.js";

export function registerRelationshipRoutes(
  app: FastifyInstance,
  relationshipService: RelationshipService,
  actorId = "recruiter_alpha",
): void {
  app.post("/api/v1/relationships", async (request, reply) => {
    try {
      const body = pickAllowedFields<{
        candidateId?: string;
        jobId?: string;
        status?: string;
      }>(request.body, ["candidateId", "jobId", "status"]);
      if (!body.candidateId?.trim() || !body.jobId?.trim()) {
        return reply.status(400).send({
          error: "INVALID_BODY",
          message: "candidateId and jobId are required",
        });
      }
      if (body.status && !RELATIONSHIP_STATUSES.includes(body.status as RelationshipStatus)) {
        return reply.status(400).send({
          error: "INVALID_STATUS",
          message: `Invalid status: ${body.status}`,
        });
      }
      const created = await relationshipService.create({
        candidateId: body.candidateId.trim(),
        jobId: body.jobId.trim(),
        status: body.status as RelationshipStatus | undefined,
        actorId,
      });
      return reply.status(201).send(created);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/api/v1/relationships/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = pickAllowedFields<{ status?: string }>(request.body, ["status"]);
      if (!body.status) {
        return reply.status(400).send({
          error: "INVALID_BODY",
          message: "status is required",
        });
      }
      if (!RELATIONSHIP_STATUSES.includes(body.status as RelationshipStatus)) {
        return reply.status(400).send({
          error: "INVALID_STATUS",
          message: `Invalid status: ${body.status}`,
        });
      }
      return await relationshipService.updateStatus({
        id,
        status: body.status as RelationshipStatus,
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/candidates/:id/relationships", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return await relationshipService.listByCandidate(id);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/jobs/:id/relationships", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return await relationshipService.listByJob(id);
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
  if (error instanceof RelationshipServiceError) {
    const status =
      error.code === "NOT_FOUND" ||
      error.code === "CANDIDATE_NOT_FOUND" ||
      error.code === "JOB_NOT_FOUND"
        ? 404
        : error.code === "DUPLICATE_RELATIONSHIP"
          ? 409
          : 400;
    return reply.status(status).send({ error: error.code, message: error.message });
  }
  throw error;
}
