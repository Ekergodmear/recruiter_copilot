import type { FastifyInstance } from "fastify";
import type { TelemetryStore } from "../../shared/telemetry/index.js";
import type { AppConfig } from "../../shared/config/index.js";
import type { Clock } from "../../shared/clock/index.js";
import { buildOperationsDashboard } from "./operations-dashboard-aggregator.js";
import { assertInternalOperationsAccess } from "./internal-access.js";
import { renderOperationsDashboardPage } from "./operations-dashboard-page.js";

export function registerOperationsDashboardRoutes(
  app: FastifyInstance,
  deps: {
    config: AppConfig;
    telemetry: TelemetryStore;
    clock: Clock;
  },
): void {
  app.get("/internal/operations-dashboard", async (request, reply) => {
    try {
      assertInternalOperationsAccess(request, deps.config);
    } catch (error) {
      const err = error as { statusCode?: number; message?: string };
      return reply.status(err.statusCode ?? 500).send({ error: err.message });
    }

    const dashboard = buildOperationsDashboard(deps.telemetry.getEvents(), deps.clock.now());
    return reply.send(dashboard);
  });

  app.get("/internal/operations-dashboard/ui", async (request, reply) => {
    try {
      assertInternalOperationsAccess(request, deps.config);
    } catch (error) {
      const err = error as { statusCode?: number; message?: string };
      return reply
        .status(err.statusCode ?? 500)
        .type("text/plain")
        .send(err.message);
    }

    return reply.type("text/html").send(renderOperationsDashboardPage());
  });
}
