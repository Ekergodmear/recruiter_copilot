export type TrendMetric = {
  today: number;
  yesterday: number;
  delta_percent: number | null;
};

export type DurationTrendMetric = {
  today_ms: number;
  yesterday_ms: number;
  delta_percent: number | null;
  today_formatted: string;
  yesterday_formatted: string;
};

export type RankedField = {
  field: string;
  count: number;
};

export type RankedReason = {
  reason: string;
  count: number;
};

export type RecruiterImportCount = {
  recruiter_id: string;
  count: number;
};

/**
 * Alpha Validation Readiness — Q1/Q2/Q3:
 * "Recruiter sửa gì nhiều nhất?" / "Field nào AI luôn đúng?" / "Field nào AI luôn sai?"
 */
export type FieldReviewStat = {
  field: string;
  reviewed_count: number;
  override_count: number;
  override_rate: number;
  accepted_count: number;
  acceptance_rate: number;
};

/** Alpha Validation Readiness — Q5: "TTQC tăng vì sao?" (time-on-field by field name). */
export type FieldDurationStat = {
  field: string;
  count: number;
  avg_duration_ms: number;
  avg_duration_formatted: string;
};

/** Alpha Validation Readiness — Q4: "Review Queue có hoạt động không?" (HIGH vs LOW review rate). */
export type PriorityReviewStat = {
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  reviewed_count: number;
  percent_of_reviews: number;
  override_rate: number;
};

/** EPIC-002 — Review Workspace hypothesis validation: which mode do recruiters actually use? */
export type ReviewModeStat = {
  mode: "focus" | "flexible";
  count: number;
  percent_of_reviews: number;
  abandon_count: number;
  abandon_rate: number;
};

/** EPIC-002 — "time per CV" per mode, not just overall TTQC. */
export type TtqcByModeStat = {
  mode: "focus" | "flexible";
  count: number;
  avg_ttqc_ms: number;
  avg_ttqc_formatted: string;
};

/** EPIC-008 — Founder Alpha review-session KPIs from review_session_completed. */
export type ReviewSessionKpis = {
  sessions: number;
  ready_rate: number;
  median_time_to_ready_ms: number;
  median_time_to_ready_formatted: string;
  p95_time_to_ready_ms: number;
  p95_time_to_ready_formatted: string;
  average_corrections: number;
};

export type OperationsDashboardResponse = {
  business: {
    resumes_imported_today: TrendMetric;
    resumes_imported_this_week: number;
    qualified_candidates_created: TrendMetric;
    average_ttqc: DurationTrendMetric;
    median_ttqc: DurationTrendMetric;
    /** EPIC-002: time-per-CV split by Focus vs Flexible mode. */
    ttqc_by_mode: TtqcByModeStat[];
    /** EPIC-008: session-level Time to Ready / corrections / ready rate. */
    review_session_kpis: ReviewSessionKpis;
  };
  ai: {
    average_parse_time: DurationTrendMetric;
    llm_usage_rate: TrendMetric;
    average_human_override_rate: TrendMetric;
    average_ai_acceptance_rate: TrendMetric;
    average_verification_rate: TrendMetric;
    average_review_completion_rate: TrendMetric;
    average_confidence: TrendMetric;
    top_missing_fields: RankedField[];
    why_people_override_ai: RankedReason[];
    /** Override / acceptance rate per field — answers "what does AI get right/wrong?" */
    field_review_stats: FieldReviewStat[];
    /** Average time-on-field per field — answers "why is TTQC high?" */
    field_edit_duration: FieldDurationStat[];
    /** Review activity by rule-based priority tier — answers "is the Review Queue working?" */
    review_by_priority: PriorityReviewStat[];
  };
  reliability: {
    import_success_rate: TrendMetric;
    import_failure_rate: TrendMetric;
    average_processing_time: DurationTrendMetric;
    ocr_usage_rate: TrendMetric;
    llm_failure_rate: TrendMetric;
  };
  usage: {
    daily_active_recruiters: TrendMetric;
    imports_per_recruiter: RecruiterImportCount[];
    average_cvs_imported_per_day: TrendMetric;
    /** EPIC-002: Focus session vs Flexible inbox — % usage and abandon rate per mode. */
    review_mode_split: ReviewModeStat[];
  };
  generated_at: string;
};
