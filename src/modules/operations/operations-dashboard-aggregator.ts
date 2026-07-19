import type { TelemetryEvent } from "../../shared/telemetry/types.js";
import type {
  DurationTrendMetric,
  FieldDurationStat,
  FieldReviewStat,
  OperationsDashboardResponse,
  PriorityReviewStat,
  RankedField,
  RankedReason,
  ReviewModeStat,
  TrendMetric,
  TtqcByModeStat,
} from "./operations-dashboard-types.js";

const REVIEW_MODES = ["focus", "flexible"] as const;

const REVIEW_PRIORITY_TIERS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

const GAP_LABELS: Record<string, string> = {
  languages: "English",
  seniority: "Years of Experience",
  skills: "Skills",
  salary: "Salary",
  linkedin: "LinkedIn",
  notice_period: "Notice Period",
  current_company: "Current Company",
};

export function mapMissingFieldLabel(field: string): string {
  return GAP_LABELS[field.toLowerCase()] ?? field;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = Math.round(seconds % 60);
  return `${minutes}m${rem}s`;
}

export function deltaPercent(today: number, yesterday: number): number | null {
  if (yesterday === 0) {
    return today === 0 ? 0 : null;
  }
  return Math.round(((today - yesterday) / yesterday) * 1000) / 10;
}

export function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx]!;
}

function buildReviewSessionKpis(events: readonly TelemetryEvent[]) {
  const sessions = events.filter((e) => e.event_type === "review_session_completed");
  const readySessions = sessions.filter(
    (e) => e.outcome === "accepted" || e.review_action === "ready",
  );
  const readyDurations = readySessions.map((e) => e.ttqc_ms ?? e.latency_ms);
  const corrections = sessions.map((e) => e.fields_overridden ?? 0);
  const medianReady = median(readyDurations);
  const p95Ready = percentile(readyDurations, 95);
  return {
    sessions: sessions.length,
    ready_rate:
      sessions.length === 0
        ? 0
        : Math.round((readySessions.length / sessions.length) * 1000) / 1000,
    median_time_to_ready_ms: Math.round(medianReady),
    median_time_to_ready_formatted: formatDuration(medianReady),
    p95_time_to_ready_ms: Math.round(p95Ready),
    p95_time_to_ready_formatted: formatDuration(p95Ready),
    average_corrections:
      corrections.length === 0 ? 0 : Math.round(average(corrections) * 1000) / 1000,
  };
}

function buildTrend(todayValue: number, yesterdayValue: number): TrendMetric {
  return {
    today: Math.round(todayValue * 1000) / 1000,
    yesterday: Math.round(yesterdayValue * 1000) / 1000,
    delta_percent: deltaPercent(todayValue, yesterdayValue),
  };
}

function buildDurationTrend(todayMs: number, yesterdayMs: number): DurationTrendMetric {
  return {
    today_ms: Math.round(todayMs),
    yesterday_ms: Math.round(yesterdayMs),
    delta_percent: deltaPercent(todayMs, yesterdayMs),
    today_formatted: formatDuration(todayMs),
    yesterday_formatted: formatDuration(yesterdayMs),
  };
}

function countByField(
  events: TelemetryEvent[],
  picker: (e: TelemetryEvent) => string | undefined,
): RankedField[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    const value = picker(event);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function topMissingFields(events: readonly TelemetryEvent[]): RankedField[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    for (const field of event.missing_fields ?? []) {
      const label = mapMissingFieldLabel(field);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function topOverrideReasons(events: readonly TelemetryEvent[]): RankedReason[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (
      event.override_reason &&
      (event.event_type === "knowledge_edited" || event.event_type === "recruiter_feedback")
    ) {
      counts.set(event.override_reason, (counts.get(event.override_reason) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function buildFieldReviewStats(events: readonly TelemetryEvent[]): FieldReviewStat[] {
  const reviewed = events.filter((e) => e.event_type === "knowledge_reviewed" && e.field_name);
  const byField = new Map<string, TelemetryEvent[]>();
  for (const event of reviewed) {
    const field = event.field_name!;
    const list = byField.get(field) ?? [];
    list.push(event);
    byField.set(field, list);
  }

  return [...byField.entries()]
    .map(([field, fieldEvents]) => {
      const reviewedCount = fieldEvents.length;
      const overrideCount = fieldEvents.filter((e) => e.review_action === "edit").length;
      const acceptedCount = fieldEvents.filter(
        (e) => e.review_action === "accept" || e.review_action === "verify",
      ).length;
      return {
        field,
        reviewed_count: reviewedCount,
        override_count: overrideCount,
        override_rate:
          reviewedCount === 0 ? 0 : Math.round((overrideCount / reviewedCount) * 1000) / 1000,
        accepted_count: acceptedCount,
        acceptance_rate:
          reviewedCount === 0 ? 0 : Math.round((acceptedCount / reviewedCount) * 1000) / 1000,
      };
    })
    .sort((a, b) => b.reviewed_count - a.reviewed_count);
}

function buildFieldEditDuration(events: readonly TelemetryEvent[]): FieldDurationStat[] {
  const reviewed = events.filter(
    (e) =>
      e.event_type === "knowledge_reviewed" && e.field_name && e.edit_duration_ms !== undefined,
  );
  const byField = new Map<string, number[]>();
  for (const event of reviewed) {
    const field = event.field_name!;
    const list = byField.get(field) ?? [];
    list.push(event.edit_duration_ms ?? 0);
    byField.set(field, list);
  }

  return [...byField.entries()]
    .map(([field, durations]) => {
      const avg = average(durations);
      return {
        field,
        count: durations.length,
        avg_duration_ms: Math.round(avg),
        avg_duration_formatted: formatDuration(avg),
      };
    })
    .sort((a, b) => b.avg_duration_ms - a.avg_duration_ms);
}

function buildReviewByPriority(events: readonly TelemetryEvent[]): PriorityReviewStat[] {
  const reviewed = events.filter((e) => e.event_type === "knowledge_reviewed" && e.review_priority);
  const total = reviewed.length;
  const byPriority = new Map<string, TelemetryEvent[]>();
  for (const event of reviewed) {
    const priority = event.review_priority!;
    const list = byPriority.get(priority) ?? [];
    list.push(event);
    byPriority.set(priority, list);
  }

  return REVIEW_PRIORITY_TIERS.map((priority) => {
    const tierEvents = byPriority.get(priority) ?? [];
    const reviewedCount = tierEvents.length;
    const overrideCount = tierEvents.filter((e) => e.review_action === "edit").length;
    return {
      priority,
      reviewed_count: reviewedCount,
      percent_of_reviews: total === 0 ? 0 : Math.round((reviewedCount / total) * 1000) / 1000,
      override_rate:
        reviewedCount === 0 ? 0 : Math.round((overrideCount / reviewedCount) * 1000) / 1000,
    };
  }).filter((row) => row.reviewed_count > 0);
}

function buildReviewModeSplit(events: readonly TelemetryEvent[]): ReviewModeStat[] {
  const modeUsed = events.filter((e) => e.event_type === "review_mode_used" && e.review_mode);
  const abandons = events.filter((e) => e.event_type === "abandon_reason" && e.review_mode);
  const total = modeUsed.length;

  return REVIEW_MODES.map((mode) => {
    const count = modeUsed.filter((e) => e.review_mode === mode).length;
    const abandonCount = abandons.filter((e) => e.review_mode === mode).length;
    return {
      mode,
      count,
      percent_of_reviews: total === 0 ? 0 : Math.round((count / total) * 1000) / 1000,
      abandon_count: abandonCount,
      abandon_rate: count === 0 ? 0 : Math.round((abandonCount / count) * 1000) / 1000,
    };
  }).filter((row) => row.count > 0 || row.abandon_count > 0);
}

function buildTtqcByMode(events: readonly TelemetryEvent[]): TtqcByModeStat[] {
  const qualified = events.filter((e) => e.event_type === "candidate_qualified" && e.review_mode);
  const byMode = new Map<string, number[]>();
  for (const event of qualified) {
    const mode = event.review_mode!;
    const list = byMode.get(mode) ?? [];
    list.push(event.ttqc_ms ?? event.latency_ms ?? 0);
    byMode.set(mode, list);
  }

  return REVIEW_MODES.map((mode) => {
    const durations = byMode.get(mode) ?? [];
    const avg = average(durations);
    return {
      mode,
      count: durations.length,
      avg_ttqc_ms: Math.round(avg),
      avg_ttqc_formatted: formatDuration(avg),
    };
  }).filter((row) => row.count > 0);
}

export function buildOperationsDashboard(
  events: readonly TelemetryEvent[],
  now: Date = new Date(),
): OperationsDashboardResponse {
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const weekStart = new Date(today);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);

  const imports = events.filter(
    (e) => e.event_type === "resume_import_completed" || e.event_type === "resume_import_failed",
  );
  const successes = events.filter((e) => e.event_type === "resume_import_completed");
  const failures = events.filter((e) => e.event_type === "resume_import_failed");
  const qualified = events.filter((e) => e.event_type === "candidate_qualified");
  const knowledgeEdits = events.filter((e) => e.event_type === "knowledge_edited");
  const llmFailures = events.filter((e) => e.event_type === "inference_failed");

  const filterDay = (day: Date, list: readonly TelemetryEvent[]) =>
    list.filter((e) => isSameUtcDay(new Date(e.timestamp), day));

  const todaySuccess = filterDay(today, successes);
  const yesterdaySuccess = filterDay(yesterday, successes);
  const todayFailures = filterDay(today, failures);
  const yesterdayFailures = filterDay(yesterday, failures);
  const todayImports = filterDay(today, imports);
  const yesterdayImports = filterDay(yesterday, imports);

  const weekImports = successes.filter((e) => new Date(e.timestamp) >= weekStart);

  const todayQualified = filterDay(today, qualified);
  const yesterdayQualified = filterDay(yesterday, qualified);

  const ttqcToday = todayQualified.map((e) => e.ttqc_ms ?? e.latency_ms);
  const ttqcYesterday = yesterdayQualified.map((e) => e.ttqc_ms ?? e.latency_ms);

  const parseToday = todaySuccess.map((e) => e.parse_time_ms ?? 0);
  const parseYesterday = yesterdaySuccess.map((e) => e.parse_time_ms ?? 0);

  const overrideToday = todayQualified.map((e) => e.human_override_rate ?? 0);
  const overrideYesterday = yesterdayQualified.map((e) => e.human_override_rate ?? 0);

  const acceptanceToday = todayQualified.map(
    (e) => e.ai_acceptance_rate ?? 1 - (e.human_override_rate ?? 0),
  );
  const acceptanceYesterday = yesterdayQualified.map(
    (e) => e.ai_acceptance_rate ?? 1 - (e.human_override_rate ?? 0),
  );

  const verificationToday = todayQualified.map((e) => e.verification_rate ?? 0);
  const verificationYesterday = yesterdayQualified.map((e) => e.verification_rate ?? 0);

  const completionToday = todayQualified.map((e) => e.review_completion_rate ?? 0);
  const completionYesterday = yesterdayQualified.map((e) => e.review_completion_rate ?? 0);

  const confidenceToday = todaySuccess.map((e) => e.confidence_avg ?? 0);
  const confidenceYesterday = yesterdaySuccess.map((e) => e.confidence_avg ?? 0);

  const llmTodayRate =
    todaySuccess.length === 0
      ? 0
      : todaySuccess.filter((e) => e.llm_used).length / todaySuccess.length;
  const llmYesterdayRate =
    yesterdaySuccess.length === 0
      ? 0
      : yesterdaySuccess.filter((e) => e.llm_used).length / yesterdaySuccess.length;

  const ocrTodayRate =
    todaySuccess.length === 0
      ? 0
      : todaySuccess.filter((e) => e.ocr_applied).length / todaySuccess.length;
  const ocrYesterdayRate =
    yesterdaySuccess.length === 0
      ? 0
      : yesterdaySuccess.filter((e) => e.ocr_applied).length / yesterdaySuccess.length;

  const processingToday = todaySuccess.map((e) => e.latency_ms);
  const processingYesterday = yesterdaySuccess.map((e) => e.latency_ms);

  const todaySuccessRate =
    todayImports.length === 0 ? 1 : todaySuccess.length / todayImports.length;
  const yesterdaySuccessRate =
    yesterdayImports.length === 0 ? 1 : yesterdaySuccess.length / yesterdayImports.length;

  const todayFailureRate =
    todayImports.length === 0 ? 0 : todayFailures.length / todayImports.length;
  const yesterdayFailureRate =
    yesterdayImports.length === 0 ? 0 : yesterdayFailures.length / yesterdayImports.length;

  const todayLlmFailureRate =
    todaySuccess.length === 0 ? 0 : filterDay(today, llmFailures).length / todaySuccess.length;
  const yesterdayLlmFailureRate =
    yesterdaySuccess.length === 0
      ? 0
      : filterDay(yesterday, llmFailures).length / yesterdaySuccess.length;

  const recruitersToday = new Set(todaySuccess.map((e) => e.actor_id ?? "unknown").filter(Boolean));
  const recruitersYesterday = new Set(
    yesterdaySuccess.map((e) => e.actor_id ?? "unknown").filter(Boolean),
  );

  const importsPerRecruiter = countByField(successes, (e) => e.actor_id ?? "unknown")
    .map((row) => ({ recruiter_id: row.field, count: row.count }))
    .slice(0, 20);

  const activeDays = new Set(successes.map((e) => startOfDay(new Date(e.timestamp)).toISOString()));
  const avgCvsPerDay = activeDays.size === 0 ? 0 : successes.length / activeDays.size;

  const yesterdayActiveDays = new Set(
    filterDay(yesterday, successes).map((e) => startOfDay(new Date(e.timestamp)).toISOString()),
  );
  const avgCvsYesterday =
    yesterdayActiveDays.size === 0 ? 0 : yesterdaySuccess.length / yesterdayActiveDays.size;

  return {
    business: {
      resumes_imported_today: buildTrend(todaySuccess.length, yesterdaySuccess.length),
      resumes_imported_this_week: weekImports.length,
      qualified_candidates_created: buildTrend(todayQualified.length, yesterdayQualified.length),
      average_ttqc: buildDurationTrend(average(ttqcToday), average(ttqcYesterday)),
      median_ttqc: buildDurationTrend(median(ttqcToday), median(ttqcYesterday)),
      ttqc_by_mode: buildTtqcByMode(events),
      review_session_kpis: buildReviewSessionKpis(events),
    },
    ai: {
      average_parse_time: buildDurationTrend(average(parseToday), average(parseYesterday)),
      llm_usage_rate: buildTrend(llmTodayRate, llmYesterdayRate),
      average_human_override_rate: buildTrend(average(overrideToday), average(overrideYesterday)),
      average_ai_acceptance_rate: buildTrend(
        average(acceptanceToday),
        average(acceptanceYesterday),
      ),
      average_verification_rate: buildTrend(
        average(verificationToday),
        average(verificationYesterday),
      ),
      average_review_completion_rate: buildTrend(
        average(completionToday),
        average(completionYesterday),
      ),
      average_confidence: buildTrend(average(confidenceToday), average(confidenceYesterday)),
      top_missing_fields: topMissingFields(successes),
      why_people_override_ai: topOverrideReasons([
        ...knowledgeEdits,
        ...events.filter((e) => e.event_type === "recruiter_feedback"),
      ]),
      field_review_stats: buildFieldReviewStats(events),
      field_edit_duration: buildFieldEditDuration(events),
      review_by_priority: buildReviewByPriority(events),
    },
    reliability: {
      import_success_rate: buildTrend(todaySuccessRate, yesterdaySuccessRate),
      import_failure_rate: buildTrend(todayFailureRate, yesterdayFailureRate),
      average_processing_time: buildDurationTrend(
        average(processingToday),
        average(processingYesterday),
      ),
      ocr_usage_rate: buildTrend(ocrTodayRate, ocrYesterdayRate),
      llm_failure_rate: buildTrend(todayLlmFailureRate, yesterdayLlmFailureRate),
    },
    usage: {
      daily_active_recruiters: buildTrend(recruitersToday.size, recruitersYesterday.size),
      imports_per_recruiter: importsPerRecruiter,
      average_cvs_imported_per_day: buildTrend(avgCvsPerDay, avgCvsYesterday),
      review_mode_split: buildReviewModeSplit(events),
    },
    generated_at: now.toISOString(),
  };
}
