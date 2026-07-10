import type { TelemetryEvent } from "../../shared/telemetry/types.js";
import type {
  DurationTrendMetric,
  OperationsDashboardResponse,
  RankedField,
  RankedReason,
  TrendMetric,
} from "./operations-dashboard-types.js";

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
    },
    generated_at: now.toISOString(),
  };
}
