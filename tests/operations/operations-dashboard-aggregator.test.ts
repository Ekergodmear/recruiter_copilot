import { describe, expect, it } from "vitest";
import {
  buildOperationsDashboard,
  deltaPercent,
  formatDuration,
  mapMissingFieldLabel,
} from "../../src/modules/operations/operations-dashboard-aggregator.js";
import type { TelemetryEvent } from "../../src/shared/telemetry/types.js";

const NOW = new Date("2026-07-09T15:00:00.000Z");
const TODAY_MORNING = "2026-07-09T10:00:00.000Z";
const YESTERDAY_MORNING = "2026-07-08T10:00:00.000Z";

function importEvent(partial: Partial<TelemetryEvent> & { timestamp: string }): TelemetryEvent {
  return {
    event_type: "resume_import_completed",
    trace_id: "trace_test",
    latency_ms: 2000,
    timestamp: partial.timestamp,
    parse_time_ms: 1500,
    llm_used: false,
    human_override_rate: 0.1,
    confidence_avg: 0.9,
    missing_fields: ["languages"],
    ocr_applied: false,
    ttqc_ms: 2000,
    actor_id: "recruiter_alpha",
    outcome: "accepted",
    ...partial,
  };
}

describe("operations dashboard aggregator", () => {
  it("computes delta percent", () => {
    expect(deltaPercent(80, 100)).toBe(-20);
    expect(deltaPercent(0, 0)).toBe(0);
  });

  it("formats duration", () => {
    expect(formatDuration(500)).toBe("500ms");
    expect(formatDuration(3800)).toBe("3.8s");
    expect(formatDuration(105000)).toBe("1m45s");
  });

  it("maps missing field labels", () => {
    expect(mapMissingFieldLabel("languages")).toBe("English");
  });

  it("aggregates business and ai metrics with trends", () => {
    const events: TelemetryEvent[] = [
      importEvent({ timestamp: TODAY_MORNING, latency_ms: 2100, ttqc_ms: 2100 }),
      importEvent({ timestamp: TODAY_MORNING, latency_ms: 1700, ttqc_ms: 1700 }),
      importEvent({ timestamp: YESTERDAY_MORNING, latency_ms: 3000, ttqc_ms: 3000 }),
      {
        event_type: "candidate_qualified",
        trace_id: "q1",
        latency_ms: 2000,
        ttqc_ms: 2000,
        timestamp: TODAY_MORNING,
        human_override_rate: 0.25,
        ai_acceptance_rate: 0.75,
        verification_rate: 1,
        review_completion_rate: 0.75,
        outcome: "accepted",
      },
      {
        event_type: "knowledge_edited",
        trace_id: "ke1",
        latency_ms: 500,
        edit_duration_ms: 500,
        timestamp: TODAY_MORNING,
        override_reason: "Wrong English",
        outcome: "edited",
      },
      {
        event_type: "recruiter_feedback",
        trace_id: "f1",
        latency_ms: 0,
        timestamp: TODAY_MORNING,
        override_reason: "Wrong Summary",
        feedback_rating: "negative",
        outcome: "rejected",
      },
      {
        event_type: "resume_import_failed",
        trace_id: "fail1",
        latency_ms: 0,
        timestamp: TODAY_MORNING,
        error_code: "UNSUPPORTED_FORMAT",
        outcome: "failed",
      },
    ];

    const dashboard = buildOperationsDashboard(events, NOW);

    expect(dashboard.business.resumes_imported_today.today).toBe(2);
    expect(dashboard.business.resumes_imported_today.yesterday).toBe(1);
    expect(dashboard.business.qualified_candidates_created.today).toBe(1);
    expect(dashboard.ai.top_missing_fields[0]?.field).toBe("English");
    expect(dashboard.ai.why_people_override_ai[0]).toEqual({
      reason: "Wrong English",
      count: 1,
    });
    expect(dashboard.ai.average_ai_acceptance_rate.today).toBe(0.75);
    expect(dashboard.ai.average_verification_rate.today).toBe(1);
    expect(dashboard.ai.average_review_completion_rate.today).toBe(0.75);
    expect(dashboard.reliability.import_failure_rate.today).toBeGreaterThan(0);
    expect(dashboard.usage.daily_active_recruiters.today).toBe(1);
  });
});
