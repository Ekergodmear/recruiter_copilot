import type { FastifyInstance } from "fastify";
import { resolveActorId } from "../../authorization/presentation/resolve-actor.js";
import { AuditService, AuditServiceError } from "../application/audit-service.js";

/**
 * EPIC-012 — read-only Audit Query API.
 * No POST/PATCH/DELETE — immutability + no free-form client writes.
 */
export function registerAuditRoutes(app: FastifyInstance, auditService: AuditService): void {
  app.get("/api/v1/audit", async (request, reply) => {
    try {
      const actorId = resolveActorId(request);
      const q = request.query as {
        actorId?: string;
        action?: string;
        source?: string;
        from?: string;
        to?: string;
      };
      const result = await auditService.list(actorId, {
        actorId: q.actorId,
        action: q.action,
        source: q.source,
        from: q.from,
        to: q.to,
      });
      return reply.status(200).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/audit/:id", async (request, reply) => {
    try {
      const actorId = resolveActorId(request);
      const { id } = request.params as { id: string };
      return reply.status(200).send(await auditService.getById(id, actorId));
    } catch (error) {
      return sendError(reply, error);
    }
  });
}

function sendError(
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (error instanceof AuditServiceError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "FORBIDDEN" ||
            error.code === "UNKNOWN_ACTOR" ||
            error.code === "UNKNOWN_PERMISSION"
          ? 403
          : 400;
    return reply.status(status).send({ error: { code: error.code, message: error.message } });
  }
  throw error;
}
