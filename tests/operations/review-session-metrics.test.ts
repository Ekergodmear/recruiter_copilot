import { describe, expect, it } from "vitest";
import { ReviewSessionMetricsService } from "../../src/modules/operations/founder-readiness/review-session-metrics-service.js";
import { InMemoryTelemetryStore } from "../../src/shared/telemetry/index.js";
import { SystemClock } from "../../src/shared/clock/index.js";
import { UuidIdGenerator } from "../../src/shared/id-generator/index.js";

describe("ReviewSessionMetricsService", () => {
  function createService() {
    const telemetry = new InMemoryTelemetryStore();
    const service = new ReviewSessionMetricsService({
      clock: new SystemClock(),
      idGenerator: new UuidIdGenerator(),
      telemetry,
      workspaceId: "ws_test",
    });
    return { service, telemetry };
  }

  it("starts on review open and completes on ready", () => {
    const { service, telemetry } = createService();
    const started = service.startSession("cand_1", "corr_1");
    expect(started.candidateId).toBe("cand_1");
    expect(started.ready).toBe(false);

    service.recordKnowledgeAction("cand_1", "accept");
    service.recordKnowledgeAction("cand_1", "edit");
    const done = service.completeReady("cand_1");
    expect(done?.ready).toBe(true);
    expect(done?.knowledgeAccepted).toBe(1);
    expect(done?.knowledgeCorrected).toBe(1);
    expect(done?.fieldsEdited).toBe(1);

    const events = telemetry.getEvents().filter((e) => e.event_type === "review_session_completed");
    expect(events).toHaveLength(1);
    expect(events[0]?.correlation_id).toBe("corr_1");
    expect(events[0]?.candidate_id).toBe("cand_1");
  });

  it("completes on abandon without ready", () => {
    const { service, telemetry } = createService();
    service.startSession("cand_2");
    const abandoned = service.abandon("cand_2");
    expect(abandoned?.ready).toBe(false);
    expect(telemetry.getEvents()[0]?.review_action).toBe("abandoned");
  });

  it("reuses active session for same candidate", () => {
    const { service } = createService();
    const a = service.startSession("cand_3");
    const b = service.startSession("cand_3");
    expect(a.sessionId).toBe(b.sessionId);
  });
});
