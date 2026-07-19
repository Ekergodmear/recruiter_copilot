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

  it("builds field review stats from knowledge_reviewed events (Alpha Validation Q1-Q3)", () => {
    const reviewedEvent = (
      partial: Partial<TelemetryEvent> & { field_name: string; review_action: string },
    ): TelemetryEvent => ({
      event_type: "knowledge_reviewed",
      trace_id: "trace_review",
      latency_ms: 0,
      timestamp: TODAY_MORNING,
      ...partial,
    });

    const events: TelemetryEvent[] = [
      reviewedEvent({ field_name: "languages", review_action: "edit" }),
      reviewedEvent({ field_name: "languages", review_action: "edit" }),
      reviewedEvent({ field_name: "languages", review_action: "accept" }),
      reviewedEvent({ field_name: "summary", review_action: "verify" }),
      reviewedEvent({ field_name: "summary", review_action: "verify" }),
    ];

    const dashboard = buildOperationsDashboard(events, NOW);
    const languages = dashboard.ai.field_review_stats.find((r) => r.field === "languages");
    const summary = dashboard.ai.field_review_stats.find((r) => r.field === "summary");

    expect(languages).toEqual({
      field: "languages",
      reviewed_count: 3,
      override_count: 2,
      override_rate: 0.667,
      accepted_count: 1,
      acceptance_rate: 0.333,
    });
    expect(summary).toEqual({
      field: "summary",
      reviewed_count: 2,
      override_count: 0,
      override_rate: 0,
      accepted_count: 2,
      acceptance_rate: 1,
    });
  });

  it("builds average edit duration per field (Alpha Validation Q5)", () => {
    const events: TelemetryEvent[] = [
      {
        event_type: "knowledge_reviewed",
        trace_id: "t1",
        latency_ms: 0,
        timestamp: TODAY_MORNING,
        field_name: "languages",
        review_action: "edit",
        edit_duration_ms: 4000,
      },
      {
        event_type: "knowledge_reviewed",
        trace_id: "t2",
        latency_ms: 0,
        timestamp: TODAY_MORNING,
        field_name: "languages",
        review_action: "edit",
        edit_duration_ms: 6000,
      },
    ];

    const dashboard = buildOperationsDashboard(events, NOW);
    const languages = dashboard.ai.field_edit_duration.find((r) => r.field === "languages");

    expect(languages?.avg_duration_ms).toBe(5000);
    expect(languages?.avg_duration_formatted).toBe("5.0s");
    expect(languages?.count).toBe(2);
  });

  it("builds review activity by priority tier (Alpha Validation Q4)", () => {
    const events: TelemetryEvent[] = [
      {
        event_type: "knowledge_reviewed",
        trace_id: "p1",
        latency_ms: 0,
        timestamp: TODAY_MORNING,
        field_name: "languages",
        review_action: "edit",
        review_priority: "HIGH",
      },
      {
        event_type: "knowledge_reviewed",
        trace_id: "p2",
        latency_ms: 0,
        timestamp: TODAY_MORNING,
        field_name: "summary",
        review_action: "verify",
        review_priority: "HIGH",
      },
      {
        event_type: "knowledge_reviewed",
        trace_id: "p3",
        latency_ms: 0,
        timestamp: TODAY_MORNING,
        field_name: "skills",
        review_action: "verify",
        review_priority: "LOW",
      },
    ];

    const dashboard = buildOperationsDashboard(events, NOW);
    const high = dashboard.ai.review_by_priority.find((r) => r.priority === "HIGH");
    const low = dashboard.ai.review_by_priority.find((r) => r.priority === "LOW");

    expect(high).toEqual({
      priority: "HIGH",
      reviewed_count: 2,
      percent_of_reviews: 0.667,
      override_rate: 0.5,
    });
    expect(low).toEqual({
      priority: "LOW",
      reviewed_count: 1,
      percent_of_reviews: 0.333,
      override_rate: 0,
    });
    // CRITICAL/MEDIUM had zero events and should not clutter the table.
    expect(dashboard.ai.review_by_priority.find((r) => r.priority === "CRITICAL")).toBeUndefined();
  });

  it("builds Focus vs Flexible mode split with abandon rate (EPIC-002)", () => {
    const events: TelemetryEvent[] = [
      {
        event_type: "review_mode_used",
        trace_id: "m1",
        latency_ms: 0,
        timestamp: TODAY_MORNING,
        review_mode: "focus",
        candidate_id: "c1",
      },
      {
        event_type: "review_mode_used",
        trace_id: "m2",
        latency_ms: 0,
        timestamp: TODAY_MORNING,
        review_mode: "focus",
        candidate_id: "c2",
      },
      {
        event_type: "review_mode_used",
        trace_id: "m3",
        latency_ms: 0,
        timestamp: TODAY_MORNING,
        review_mode: "flexible",
        candidate_id: "c3",
      },
      {
        event_type: "abandon_reason",
        trace_id: "a1",
        latency_ms: 0,
        timestamp: TODAY_MORNING,
        review_mode: "focus",
        abandon_reason: "review_back_not_ready",
        candidate_id: "c1",
      },
    ];

    const dashboard = buildOperationsDashboard(events, NOW);
    const focus = dashboard.usage.review_mode_split.find((r) => r.mode === "focus");
    const flexible = dashboard.usage.review_mode_split.find((r) => r.mode === "flexible");

    expect(focus).toEqual({
      mode: "focus",
      count: 2,
      percent_of_reviews: 0.667,
      abandon_count: 1,
      abandon_rate: 0.5,
    });
    expect(flexible).toEqual({
      mode: "flexible",
      count: 1,
      percent_of_reviews: 0.333,
      abandon_count: 0,
      abandon_rate: 0,
    });
  });

  it("builds TTQC (time-per-CV) split by mode (EPIC-002)", () => {
    const events: TelemetryEvent[] = [
      {
        event_type: "candidate_qualified",
        trace_id: "q1",
        latency_ms: 60000,
        timestamp: TODAY_MORNING,
        ttqc_ms: 60000,
        review_mode: "focus",
      },
      {
        event_type: "candidate_qualified",
        trace_id: "q2",
        latency_ms: 120000,
        timestamp: TODAY_MORNING,
        ttqc_ms: 120000,
        review_mode: "focus",
      },
      {
        event_type: "candidate_qualified",
        trace_id: "q3",
        latency_ms: 300000,
        timestamp: TODAY_MORNING,
        ttqc_ms: 300000,
        review_mode: "flexible",
      },
    ];

    const dashboard = buildOperationsDashboard(events, NOW);
    const focus = dashboard.business.ttqc_by_mode.find((r) => r.mode === "focus");
    const flexible = dashboard.business.ttqc_by_mode.find((r) => r.mode === "flexible");

    expect(focus?.avg_ttqc_ms).toBe(90000);
    expect(focus?.count).toBe(2);
    expect(flexible?.avg_ttqc_ms).toBe(300000);
    expect(flexible?.count).toBe(1);
  });
});
