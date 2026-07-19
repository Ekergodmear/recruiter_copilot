-- EPIC-008 — additive assignee on Relationship
ALTER TABLE "CandidateJobRelationship" ADD COLUMN "assigneeId" TEXT;

CREATE INDEX IF NOT EXISTS "CandidateJobRelationship_assigneeId_idx"
  ON "CandidateJobRelationship"("assigneeId");
