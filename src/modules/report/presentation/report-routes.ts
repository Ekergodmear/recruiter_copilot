import type { FastifyInstance } from "fastify";
import { resolveActorId } from "../../authorization/presentation/resolve-actor.js";
import { ReportService, ReportServiceError } from "../application/report-service.js";

/**
 * EPIC-014 — Reporting & Export API (read-only).
 */
export function registerReportRoutes(app: FastifyInstance, reportService: ReportService): void {
  app.get("/api/v1/reports/overview", async (request, reply) => {
    try {
      const actorId = resolveActorId(request);
      return reply.status(200).send(await reportService.getOverview(actorId));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/reports/export", async (request, reply) => {
    try {
      const actorId = resolveActorId(request);
      const q = request.query as Record<string, string | undefined>;
      const result = await reportService.exportCsv(actorId, q.kind ?? "", {
        actorId: q.actorId,
        action: q.action,
        source: q.source,
        from: q.from,
        to: q.to,
      });
      return reply
        .status(200)
        .header("Content-Type", result.contentType)
        .header("Content-Disposition", `attachment; filename="${result.filename}"`)
        .send(result.body);
    } catch (error) {
      return sendError(reply, error);
    }
  });
}

function sendError(
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (error instanceof ReportServiceError) {
    const status =
      error.code === "FORBIDDEN" ||
      error.code === "UNKNOWN_ACTOR" ||
      error.code === "UNKNOWN_PERMISSION"
        ? 403
        : 400;
    return reply.status(status).send({ error: { code: error.code, message: error.message } });
  }
  throw error;
}
