/**
 * EPIC-012 — Audit & Governance (record-only, immutable).
 * Audit records what happened; it never changes what happened.
 */

export type AuditOutcome = "success" | "failure";

export type AuditSource = "automation" | "integration" | "workflow" | "relationship" | "system";

export type AuditTarget = {
  relationshipId?: string;
  candidateId?: string;
  jobId?: string;
  integrationId?: string;
  actionId?: string;
  assigneeId?: string;
  stage?: string;
};

export type AuditRecord = {
  auditId: string;
  occurredAt: string;
  actorId: string;
  action: string;
  source: AuditSource;
  outcome: AuditOutcome;
  target: AuditTarget;
  summary: string;
  error: { code: string; message: string } | null;
  correlation: { actionId?: string } | null;
};

export type AuditListQuery = {
  actorId?: string;
  action?: string;
  source?: string;
  from?: string;
  to?: string;
};
