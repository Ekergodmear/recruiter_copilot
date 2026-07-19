-- EPIC-003 table (if missing from earlier drift) + EPIC-004 workflow columns

CREATE TABLE IF NOT EXISTS "CandidateJobRelationship" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentStage" TEXT NOT NULL DEFAULT 'Sourced',
    "stageHistory" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "CandidateJobRelationship_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CandidateJobRelationship_candidateId_jobId_key"
  ON "CandidateJobRelationship"("candidateId", "jobId");
CREATE INDEX IF NOT EXISTS "CandidateJobRelationship_jobId_idx"
  ON "CandidateJobRelationship"("jobId");
CREATE INDEX IF NOT EXISTS "CandidateJobRelationship_candidateId_idx"
  ON "CandidateJobRelationship"("candidateId");
CREATE INDEX IF NOT EXISTS "CandidateJobRelationship_updatedAt_idx"
  ON "CandidateJobRelationship"("updatedAt");

-- Additive columns when table already existed without workflow fields
ALTER TABLE "CandidateJobRelationship" ADD COLUMN IF NOT EXISTS "currentStage" TEXT NOT NULL DEFAULT 'Sourced';
ALTER TABLE "CandidateJobRelationship" ADD COLUMN IF NOT EXISTS "stageHistory" TEXT NOT NULL DEFAULT '[]';

UPDATE "CandidateJobRelationship"
SET "currentStage" = "status"
WHERE "currentStage" IS NULL OR "currentStage" = '';

CREATE INDEX IF NOT EXISTS "CandidateJobRelationship_currentStage_idx"
  ON "CandidateJobRelationship"("currentStage");
