/**
 * EPIC-008 — Automation / Actions (controlled execution).
 * Consumes capabilities; executes authorized actions only.
 */

export type AutomationActionType = "stage_move" | "send_outreach" | "assign";

export type ActionTarget = {
  relationshipId?: string;
  candidateId?: string;
  jobId?: string;
  assigneeId?: string;
  stage?: string;
  draftFingerprint?: string;
};

export type ActionResult = {
  actionId: string;
  actionType: AutomationActionType;
  actorId: string;
  executedAt: string;
  success: boolean;
  error: { code: string; message: string } | null;
  target: ActionTarget;
  /** True when request was accepted but no state change (idempotent no-op). */
  noop?: boolean;
};
