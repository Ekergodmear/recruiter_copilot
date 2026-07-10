import { describe, expect, it, beforeEach } from "vitest";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { InMemoryTelemetryStore } from "../../src/shared/telemetry/index.js";
import type { TelemetryEvent } from "../../src/shared/telemetry/types.js";

describe("GET /internal/operations-dashboard", () => {
  let telemetry: InMemoryTelemetryStore;

  beforeEach(() => {
    telemetry = new InMemoryTelemetryStore();
  });

  it("returns 404 when operations dashboard disabled", async () => {
    const config = AppConfig.fromEnv({
      NODE_ENV: "production",
      OPERATIONS_DASHBOARD_ENABLED: "false",
    });
    const app = await buildApp(createAppDependencies(config, telemetry));

    const response = await app.inject({
      method: "GET",
      url: "/internal/operations-dashboard",
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns dashboard json in development", async () => {
    const config = AppConfig.fromEnv({
      NODE_ENV: "development",
      OPERATIONS_DASHBOARD_ENABLED: "true",
    });

    telemetry.record({
      event_type: "resume_import_completed",
      trace_id: "t1",
      latency_ms: 1800,
      timestamp: "2026-07-09T11:00:00.000Z",
      parse_time_ms: 1200,
      llm_used: true,
      human_override_rate: 0.12,
      confidence_avg: 0.91,
      missing_fields: ["languages"],
      ttqc_ms: 1800,
      actor_id: "recruiter_alpha",
      outcome: "accepted",
    } satisfies TelemetryEvent);

    const deps = createAppDependencies(config, telemetry);
    const app = await buildApp(deps);

    const response = await app.inject({
      method: "GET",
      url: "/internal/operations-dashboard",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.business).toBeDefined();
    expect(body.ai).toBeDefined();
    expect(body.reliability).toBeDefined();
    expect(body.usage).toBeDefined();
    expect(body.ai.why_people_override_ai).toEqual([]);
  });
});
