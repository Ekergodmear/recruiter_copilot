import type { FastifyInstance } from "fastify";
import { AnalyticsService, AnalyticsServiceError } from "../application/analytics-service.js";

/**
 * EPIC-007 — read-only Analytics API.
 * GET only; no mutations.
 */
export function registerAnalyticsRoutes(
  app: FastifyInstance,
  analyticsService: AnalyticsService,
): void {
  app.get("/api/v1/analytics/overview", async (_req, reply) => {
    const snapshot = await analyticsService.getOverview();
    return reply.status(200).send(snapshot);
  });

  app.get<{ Params: { jobId: string } }>("/api/v1/analytics/jobs/:jobId", async (req, reply) => {
    try {
      const snapshot = await analyticsService.getJobSnapshot(req.params.jobId);
      return reply.status(200).send(snapshot);
    } catch (err) {
      if (err instanceof AnalyticsServiceError && err.code === "JOB_NOT_FOUND") {
        return reply.status(404).send({ error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });
}
