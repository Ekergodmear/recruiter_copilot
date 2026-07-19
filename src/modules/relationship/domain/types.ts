/** EPIC-003 — Relationship Intelligence (not Application, not Matching). */

export type RelationshipStatus = "Sourced" | "Applied" | "Screening";

export const RELATIONSHIP_STATUSES: RelationshipStatus[] = ["Sourced", "Applied", "Screening"];

export type CandidateJobRelationship = {
  id: string;
  candidateId: string;
  jobId: string;
  status: RelationshipStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};
