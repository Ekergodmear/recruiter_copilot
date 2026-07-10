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

export type OperationsDashboardResponse = {
  business: {
    resumes_imported_today: TrendMetric;
    resumes_imported_this_week: number;
    qualified_candidates_created: TrendMetric;
    average_ttqc: DurationTrendMetric;
    median_ttqc: DurationTrendMetric;
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
  };
  generated_at: string;
};
