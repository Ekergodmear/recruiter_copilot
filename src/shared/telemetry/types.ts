export type TelemetryEventType =
  | "inference_started"
  | "inference_completed"
  | "inference_failed"
  | "knowledge_accepted"
  | "knowledge_rejected"
  | "knowledge_edited"
  | "knowledge_verified"
  | "knowledge_reviewed"
  | "knowledge_revision_created"
  | "knowledge_confidence_changed"
  | "knowledge_evidence_added"
  | "knowledge_signal_recorded"
  | "insight_rendered"
  | "insight_clicked"
  | "candidate_duplicate_detected"
  | "candidate_name_extracted"
  | "review_session_completed"
  | "operation_failed"
  | "resume_import_completed"
  | "resume_import_failed"
  | "candidate_qualified"
  | "recruiter_feedback"
  | "entry_screen"
  | "abandon_reason"
  | "review_mode_used"
  | "job_created"
  | "job_reviewed"
  | "job_ready"
  | "submission_created"
  | "interview_created"
  | "interview_completed"
  | "offer_sent"
  | "offer_accepted"
  | "placement_created";

export type TelemetryEvent = {
  event_type: TelemetryEventType;
  contract_id?: string;
  trace_id: string;
  model_id?: string;
  provider_id?: string;
  latency_ms: number;
  timestamp: string;
  correlation_id?: string;
  workspace_id?: string;
  actor_id?: string;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
  confidence_avg?: number;
  outcome?: "accepted" | "rejected" | "edited" | "pending" | "failed";
  edit_delta_percent?: number;
  human_override_rate?: number;
  ai_acceptance_rate?: number;
  verification_rate?: number;
  review_completion_rate?: number;
  fields_verified?: number;
  fields_reviewed?: number;
  review_action?: string;
  fields_extracted?: number;
  fields_overridden?: number;
  candidate_id?: string;
  field_name?: string;
  ai_value?: string;
  human_value?: string;
  edit_duration_ms?: number;
  parse_time_ms?: number;
  llm_used?: boolean;
  gap_count?: number;
  knowledge_object_count?: number;
  missing_fields?: string[];
  ocr_applied?: boolean;
  ttqc_ms?: number;
  override_reason?: string;
  /** Rule-based review priority of the field at the moment of review (AH-004). */
  review_priority?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  feedback_rating?: "positive" | "negative";
  error_code?: string;
  /** UX: first screen in session (Home, Import, Review, …) */
  screen?: string;
  /** UX: why recruiter left a flow before completing */
  abandon_reason?: string;
  /** EPIC-002: which Review Workspace hypothesis was in use (focus session vs flexible inbox) */
  review_mode?: "focus" | "flexible";
  /** Browser session id for correlating UX events */
  session_id?: string;
  /** EPIC-006: screen where insights were shown */
  insight_count?: number;
  highest_severity?: "critical" | "warning" | "info";
  insight_id?: string;
  /** EPIC-007 duplicate detection */
  duplicate_count?: number;
  highest_score?: number;
  /** EPIC-007 name extraction */
  name_confidence?: number;
  name_source?: "header" | "heuristic";
};

export function createTelemetryEvent(
  partial: Omit<TelemetryEvent, "timestamp"> & { timestamp?: string },
  clock: { nowIso(): string },
): TelemetryEvent {
  return {
    ...partial,
    timestamp: partial.timestamp ?? clock.nowIso(),
  };
}

export function computeHumanOverrideRate(extracted: number, overridden: number): number {
  if (extracted <= 0) return 0;
  return Math.min(1, overridden / extracted);
}

export function computeAiAcceptanceRate(overridden: number, totalFields: number): number {
  if (totalFields <= 0) return 1;
  return Math.max(0, Math.min(1, (totalFields - overridden) / totalFields));
}

export function computeVerificationRate(verified: number, totalFields: number): number {
  if (totalFields <= 0) return 1;
  return Math.max(0, Math.min(1, verified / totalFields));
}

export function computeReviewCompletionRate(reviewed: number, totalFields: number): number {
  if (totalFields <= 0) return 1;
  return Math.max(0, Math.min(1, reviewed / totalFields));
}
