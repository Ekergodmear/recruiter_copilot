import type { FastifyInstance } from "fastify";
import { pickAllowedFields, SecurityError } from "../../../shared/security/index.js";
import { resolveActorId } from "../../authorization/presentation/resolve-actor.js";
import { isWorkflowStage } from "../domain/types.js";
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
      if (body.status && !isWorkflowStage(body.status)) {
        return reply.status(400).send({
          error: "INVALID_STATUS",
          message: `Invalid status: ${body.status}`,
        });
      }
      const created = await relationshipService.create({
        candidateId: body.candidateId.trim(),
        jobId: body.jobId.trim(),
        status: body.status,
        actorId,
      });
      return reply.status(201).send(created);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/relationships/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return await relationshipService.getById(id);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/api/v1/relationships/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = pickAllowedFields<{ status?: string; stage?: string }>(request.body, [
        "status",
        "stage",
      ]);
      const next = body.stage ?? body.status;
      if (!next) {
        return reply.status(400).send({
          error: "INVALID_BODY",
          message: "stage or status is required",
        });
      }
      if (!isWorkflowStage(next)) {
        return reply.status(400).send({
          error: "INVALID_STAGE",
          message: `Invalid stage: ${next}`,
        });
      }
      // Prefer UL `stage`; `status` remains EPIC-003 compat alias.
      const actorId = resolveActorId(request);
      return await relationshipService.moveStage({ id, stage: next, actorId });
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
      const query = request.query as { stage?: string; groupBy?: string };
      if (query.stage && !isWorkflowStage(query.stage)) {
        return reply.status(400).send({
          error: "INVALID_STAGE",
          message: `Invalid stage: ${query.stage}`,
        });
      }
      return await relationshipService.listByJob(id, {
        stage: query.stage,
        groupByStage: query.groupBy === "stage",
      });
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
