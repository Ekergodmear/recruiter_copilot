import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { InMemoryTelemetryStore } from "../../src/shared/telemetry/index.js";

describe("POST /api/v1/telemetry", () => {
  let telemetry: InMemoryTelemetryStore;

  beforeEach(() => {
    telemetry = new InMemoryTelemetryStore();
  });

  afterEach(() => {
    telemetry.clear();
  });

  it("records entry_screen", async () => {
    const config = AppConfig.fromEnv();
    const app = await buildApp(createAppDependencies(config, telemetry));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/telemetry",
      payload: {
        event_type: "entry_screen",
        screen: "Home",
        session_id: "sess-001",
      },
    });

    expect(res.statusCode).toBe(200);
    const events = telemetry.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.event_type).toBe("entry_screen");
    expect(events[0]?.screen).toBe("Home");
    expect(events[0]?.session_id).toBe("sess-001");
  });

  it("records abandon_reason", async () => {
    const config = AppConfig.fromEnv();
    const app = await buildApp(createAppDependencies(config, telemetry));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/telemetry",
      payload: {
        event_type: "abandon_reason",
        abandon_reason: "review_back_not_ready",
        session_id: "sess-002",
        candidate_id: "candidate_abc",
      },
    });

    expect(res.statusCode).toBe(200);
    const event = telemetry.getEvents()[0];
    expect(event?.event_type).toBe("abandon_reason");
    expect(event?.abandon_reason).toBe("review_back_not_ready");
    expect(event?.candidate_id).toBe("candidate_abc");
  });

  it("rejects invalid screen", async () => {
    const config = AppConfig.fromEnv();
    const app = await buildApp(createAppDependencies(config, telemetry));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/telemetry",
      payload: {
        event_type: "entry_screen",
        screen: "Dashboard",
        session_id: "sess-003",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(telemetry.getEvents()).toHaveLength(0);
  });

  it("records review_mode_used (EPIC-002 Focus vs Flexible)", async () => {
    const config = AppConfig.fromEnv();
    const app = await buildApp(createAppDependencies(config, telemetry));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/telemetry",
      payload: {
        event_type: "review_mode_used",
        review_mode: "focus",
        session_id: "sess-004",
        candidate_id: "candidate_xyz",
      },
    });

    expect(res.statusCode).toBe(200);
    const event = telemetry.getEvents()[0];
    expect(event?.event_type).toBe("review_mode_used");
    expect(event?.review_mode).toBe("focus");
    expect(event?.candidate_id).toBe("candidate_xyz");
  });

  it("rejects review_mode_used with an invalid mode", async () => {
    const config = AppConfig.fromEnv();
    const app = await buildApp(createAppDependencies(config, telemetry));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/telemetry",
      payload: {
        event_type: "review_mode_used",
        review_mode: "hybrid",
        session_id: "sess-005",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(telemetry.getEvents()).toHaveLength(0);
  });

  it("carries review_mode on abandon_reason for friction-by-mode analysis", async () => {
    const config = AppConfig.fromEnv();
    const app = await buildApp(createAppDependencies(config, telemetry));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/telemetry",
      payload: {
        event_type: "abandon_reason",
        abandon_reason: "review_back_not_ready",
        review_mode: "flexible",
        session_id: "sess-006",
        candidate_id: "candidate_def",
      },
    });

    expect(res.statusCode).toBe(200);
    const event = telemetry.getEvents()[0];
    expect(event?.review_mode).toBe("flexible");
  });
});
