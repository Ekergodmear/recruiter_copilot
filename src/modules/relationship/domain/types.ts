/**
 * EPIC-003 — Relationship Intelligence (not Application, not Matching).
 * EPIC-004 — Recruiter Workflow (Current Stage + Stage History on the relationship).
 */

/** EPIC-003 association statuses (subset of workflow stages). */
export type RelationshipStatus = "Sourced" | "Applied" | "Screening";

export const RELATIONSHIP_STATUSES: RelationshipStatus[] = ["Sourced", "Applied", "Screening"];

/** EPIC-004 default workflow stages (no transition matrix). */
export type WorkflowStage =
  | "Sourced"
  | "Applied"
  | "Screening"
  | "Technical Interview"
  | "Hiring Manager Interview"
  | "Offer"
  | "Hired"
  | "Rejected"
  | "Withdrawn";

export const WORKFLOW_STAGES: WorkflowStage[] = [
  "Sourced",
  "Applied",
  "Screening",
  "Technical Interview",
  "Hiring Manager Interview",
  "Offer",
  "Hired",
  "Rejected",
  "Withdrawn",
];

export type StageHistoryEntry = {
  previousStage: WorkflowStage | null;
  newStage: WorkflowStage;
  changedAt: string;
};

export type CandidateJobRelationship = {
  id: string;
  candidateId: string;
  jobId: string;
  /**
   * EPIC-003 field — kept for API compatibility.
   * Always equals `currentStage` (single progress model).
   */
  status: WorkflowStage;
  currentStage: WorkflowStage;
  stageHistory: StageHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  /** EPIC-008 — assigned recruiter identity (optional). */
  assigneeId: string | null;
};

export function isWorkflowStage(value: string): value is WorkflowStage {
  return (WORKFLOW_STAGES as string[]).includes(value);
}
