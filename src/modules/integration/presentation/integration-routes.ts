import type { FastifyInstance } from "fastify";
import { pickAllowedFields, SecurityError } from "../../../shared/security/index.js";
import { resolveActorId } from "../../authorization/presentation/resolve-actor.js";
import { IntegrationService, IntegrationServiceError } from "../application/integration-service.js";

/**
 * EPIC-011 — Integrations API (manual Preview → Confirm → Execute).
 */
export function registerIntegrationRoutes(
  app: FastifyInstance,
  integrationService: IntegrationService,
): void {
  app.get("/api/v1/integrations", async (_req, reply) => {
    const items = await integrationService.list();
    return reply.status(200).send({ items, total: items.length });
  });

  app.get("/api/v1/integrations/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return reply.status(200).send(await integrationService.getById(id));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/integrations", async (request, reply) => {
    try {
      const actorId = resolveActorId(request);
      const body = pickAllowedFields<{
        provider?: string;
        displayName?: string;
        status?: "Enabled" | "Disabled";
        config?: Record<string, unknown>;
      }>(request.body, ["provider", "displayName", "status", "config"]);
      if (!body.provider?.trim()) {
        return reply.status(400).send({
          error: { code: "INVALID_BODY", message: "provider is required" },
        });
      }
      const created = await integrationService.create({
        provider: body.provider.trim(),
        displayName: body.displayName,
        status: body.status,
        config: body.config,
        actorId,
      });
      return reply.status(201).send(created);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/api/v1/integrations/:id", async (request, reply) => {
    try {
      const actorId = resolveActorId(request);
      const { id } = request.params as { id: string };
      const body = pickAllowedFields<{
        status?: "Enabled" | "Disabled";
        displayName?: string;
        config?: Record<string, unknown>;
      }>(request.body, ["status", "displayName", "config"]);
      const updated = await integrationService.update({
        id,
        status: body.status,
        displayName: body.displayName,
        config: body.config,
        actorId,
      });
      return reply.status(200).send(updated);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/integrations/:id/test-connection", async (request, reply) => {
    try {
      const actorId = resolveActorId(request);
      const { id } = request.params as { id: string };
      const result = await integrationService.testConnection({ id, actorId });
      return reply.status(200).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/integrations/:id/import/preview", async (request, reply) => {
    try {
      const actorId = resolveActorId(request);
      const { id } = request.params as { id: string };
      const body = pickAllowedFields<{ payload?: string }>(request.body, ["payload"]);
      const result = await integrationService.previewImport({
        id,
        payload: body.payload ?? "",
        actorId,
      });
      return reply.status(200).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/integrations/:id/import/execute", async (request, reply) => {
    try {
      const actorId = resolveActorId(request);
      const { id } = request.params as { id: string };
      const body = pickAllowedFields<{ payload?: string; confirmed?: boolean }>(request.body, [
        "payload",
        "confirmed",
      ]);
      const result = await integrationService.executeImport({
        id,
        payload: body.payload ?? "",
        actorId,
        confirmed: body.confirmed,
      });
      return reply.status(result.success ? 200 : 400).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/integrations/:id/export/preview", async (request, reply) => {
    try {
      const actorId = resolveActorId(request);
      const { id } = request.params as { id: string };
      const result = await integrationService.previewExport({ id, actorId });
      return reply.status(200).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/integrations/:id/export/execute", async (request, reply) => {
    try {
      const actorId = resolveActorId(request);
      const { id } = request.params as { id: string };
      const body = pickAllowedFields<{ confirmed?: boolean; format?: "csv" | "json" }>(
        request.body,
        ["confirmed", "format"],
      );
      const result = await integrationService.executeExport({
        id,
        actorId,
        confirmed: body.confirmed,
        format: body.format,
      });
      return reply.status(200).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  });
}

function sendError(
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (error instanceof IntegrationServiceError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "CONFIRMATION_REQUIRED" ||
            error.code === "FORBIDDEN" ||
            error.code === "UNKNOWN_ACTOR" ||
            error.code === "UNKNOWN_PERMISSION" ||
            error.code === "DISABLED"
          ? 403
          : 400;
    return reply.status(status).send({ error: { code: error.code, message: error.message } });
  }
  if (error instanceof SecurityError) {
    return reply.status(400).send({ error: { code: error.code, message: error.message } });
  }
  throw error;
}
