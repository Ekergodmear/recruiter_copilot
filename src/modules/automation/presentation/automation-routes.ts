import type { FastifyInstance } from "fastify";
import { pickAllowedFields } from "../../../shared/security/index.js";
import { AutomationService, AutomationServiceError } from "../application/automation-service.js";
import type { ActionResult } from "../domain/types.js";

function sendAuthError(
  reply: {
    status: (code: number) => { send: (body: unknown) => unknown };
  },
  err: AutomationServiceError,
) {
  const status = err.code === "UNAUTHORIZED" || err.code === "CONFIRMATION_REQUIRED" ? 403 : 400;
  return reply.status(status).send({ error: { code: err.code, message: err.message } });
}

function statusForResult(result: ActionResult): number {
  if (result.success) return 200;
  if (result.error?.code === "NOT_FOUND") return 404;
  if (result.error?.code === "ALREADY_SENT") return 409;
  return 400;
}

/**
 * EPIC-008 — Automation execute endpoints (mutation with confirmation + attribution).
 */
export function registerAutomationRoutes(
  app: FastifyInstance,
  automationService: AutomationService,
): void {
  app.post("/api/v1/automation/stage-move", async (request, reply) => {
    try {
      const body = pickAllowedFields<{
        relationshipId?: string;
        targetStage?: string;
        actorId?: string;
        confirmed?: boolean;
      }>(request.body, ["relationshipId", "targetStage", "actorId", "confirmed"]);
      if (!body.relationshipId?.trim() || !body.targetStage?.trim()) {
        return reply.status(400).send({
          error: { code: "INVALID_BODY", message: "relationshipId and targetStage are required" },
        });
      }
      const result = await automationService.stageMove({
        relationshipId: body.relationshipId.trim(),
        targetStage: body.targetStage.trim(),
        actorId: body.actorId,
        confirmed: body.confirmed,
      });
      return reply.status(statusForResult(result)).send(result);
    } catch (err) {
      if (err instanceof AutomationServiceError) return sendAuthError(reply, err);
      throw err;
    }
  });

  app.post("/api/v1/automation/send-outreach", async (request, reply) => {
    try {
      const body = pickAllowedFields<{
        relationshipId?: string;
        draftBody?: string;
        to?: string;
        subject?: string;
        actorId?: string;
        confirmed?: boolean;
      }>(request.body, ["relationshipId", "draftBody", "to", "subject", "actorId", "confirmed"]);
      if (!body.relationshipId?.trim()) {
        return reply.status(400).send({
          error: { code: "INVALID_BODY", message: "relationshipId is required" },
        });
      }
      const result = await automationService.sendOutreach({
        relationshipId: body.relationshipId.trim(),
        draftBody: body.draftBody ?? "",
        to: body.to,
        subject: body.subject,
        actorId: body.actorId,
        confirmed: body.confirmed,
      });
      return reply.status(statusForResult(result)).send(result);
    } catch (err) {
      if (err instanceof AutomationServiceError) return sendAuthError(reply, err);
      throw err;
    }
  });

  app.post("/api/v1/automation/assign", async (request, reply) => {
    try {
      const body = pickAllowedFields<{
        relationshipId?: string;
        assigneeId?: string;
        actorId?: string;
        confirmed?: boolean;
      }>(request.body, ["relationshipId", "assigneeId", "actorId", "confirmed"]);
      if (!body.relationshipId?.trim() || !body.assigneeId?.trim()) {
        return reply.status(400).send({
          error: { code: "INVALID_BODY", message: "relationshipId and assigneeId are required" },
        });
      }
      const result = await automationService.assign({
        relationshipId: body.relationshipId.trim(),
        assigneeId: body.assigneeId.trim(),
        actorId: body.actorId,
        confirmed: body.confirmed,
      });
      return reply.status(statusForResult(result)).send(result);
    } catch (err) {
      if (err instanceof AutomationServiceError) return sendAuthError(reply, err);
      throw err;
    }
  });
}
