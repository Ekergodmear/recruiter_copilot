import type { FastifyInstance } from "fastify";
import { pickAllowedFields, SecurityError } from "../../../shared/security/index.js";
import { resolveActorId } from "../../authorization/presentation/resolve-actor.js";
import {
  NotificationService,
  NotificationServiceError,
} from "../application/notification-service.js";

/**
 * EPIC-010 — in-app notification feed + thin collaboration notes.
 * Mark-read uses notification.read so Viewer can clear inbox without mention-create.
 * Note create uses notification.write (Recruiter/Admin).
 */
export function registerNotificationRoutes(
  app: FastifyInstance,
  notificationService: NotificationService,
): void {
  app.get("/api/v1/notifications", async (request, reply) => {
    const actorId = resolveActorId(request);
    const q = request.query as { status?: string };
    const filter =
      q.status === "unread" || q.status === "read" || q.status === "all" ? q.status : "all";
    const result = await notificationService.listForActor(actorId, filter);
    return reply.status(200).send({
      actorId,
      unreadCount: result.unreadCount,
      items: result.items,
    });
  });

  app.post("/api/v1/notifications/:id/read", async (request, reply) => {
    try {
      const actorId = resolveActorId(request);
      const { id } = request.params as { id: string };
      const item = await notificationService.markRead(id, actorId);
      return reply.status(200).send(item);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/notifications/read-all", async (request, reply) => {
    const actorId = resolveActorId(request);
    const result = await notificationService.markAllRead(actorId);
    return reply.status(200).send({ actorId, ...result });
  });

  app.post("/api/v1/collaboration/notes", async (request, reply) => {
    try {
      const actorId = resolveActorId(request);
      const body = pickAllowedFields<{
        body?: string;
        relationshipId?: string;
        candidateId?: string;
      }>(request.body, ["body", "relationshipId", "candidateId"]);
      const created = await notificationService.createNote({
        body: body.body ?? "",
        authorId: actorId,
        relationshipId: body.relationshipId,
        candidateId: body.candidateId,
      });
      return reply.status(201).send(created);
    } catch (error) {
      return sendError(reply, error);
    }
  });
}

function sendError(
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (error instanceof NotificationServiceError) {
    const status = error.code === "NOT_FOUND" ? 404 : error.code === "UNKNOWN_ACTOR" ? 403 : 400;
    return reply.status(status).send({ error: { code: error.code, message: error.message } });
  }
  if (error instanceof SecurityError) {
    return reply.status(400).send({ error: { code: error.code, message: error.message } });
  }
  throw error;
}
