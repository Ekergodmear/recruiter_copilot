-- PostgreSQL baseline — matches prisma/schema.prisma (TECH-001 + EPIC-003/004/008)

CREATE TABLE "CandidateRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "resumeVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "uploadedAt" TEXT NOT NULL,
    "profileJson" TEXT NOT NULL,
    "knowledgeJson" TEXT NOT NULL,
    "identityJson" TEXT,
    CONSTRAINT "CandidateRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "storageRef" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "uploadedAt" TEXT NOT NULL,
    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "salaryMin" DOUBLE PRECISION,
    "salaryMax" DOUBLE PRECISION,
    "currency" TEXT NOT NULL,
    "experienceYears" DOUBLE PRECISION,
    "englishRequirement" TEXT NOT NULL,
    "skillsJson" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsibilities" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "benefits" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ready" BOOLEAN NOT NULL,
    "submissionCount" INTEGER NOT NULL,
    "placementCount" INTEGER NOT NULL,
    "deletedAt" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "rawJdText" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "submittedAt" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateJobRelationship" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentStage" TEXT NOT NULL,
    "stageHistory" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "assigneeId" TEXT,
    CONSTRAINT "CandidateJobRelationship_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "interviewer" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "meetingLink" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "salary" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "benefits" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PipelineActivity" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "submissionId" TEXT,
    "candidateId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "PipelineActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeSet" (
    "candidateId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "objectsJson" TEXT NOT NULL,
    "candidateSignalsJson" TEXT NOT NULL,
    CONSTRAINT "KnowledgeSet_pkey" PRIMARY KEY ("candidateId")
);

CREATE INDEX "CandidateRecord_workspaceId_idx" ON "CandidateRecord"("workspaceId");
CREATE INDEX "CandidateRecord_uploadedAt_idx" ON "CandidateRecord"("uploadedAt");
CREATE INDEX "Resume_candidateId_idx" ON "Resume"("candidateId");
CREATE INDEX "Job_workspaceId_idx" ON "Job"("workspaceId");
CREATE INDEX "Job_status_idx" ON "Job"("status");
CREATE INDEX "Job_updatedAt_idx" ON "Job"("updatedAt");
CREATE INDEX "Submission_jobId_idx" ON "Submission"("jobId");
CREATE INDEX "Submission_candidateId_idx" ON "Submission"("candidateId");
CREATE UNIQUE INDEX "Submission_candidateId_jobId_key" ON "Submission"("candidateId", "jobId");
CREATE UNIQUE INDEX "CandidateJobRelationship_candidateId_jobId_key" ON "CandidateJobRelationship"("candidateId", "jobId");
CREATE INDEX "CandidateJobRelationship_jobId_idx" ON "CandidateJobRelationship"("jobId");
CREATE INDEX "CandidateJobRelationship_candidateId_idx" ON "CandidateJobRelationship"("candidateId");
CREATE INDEX "CandidateJobRelationship_currentStage_idx" ON "CandidateJobRelationship"("currentStage");
CREATE INDEX "CandidateJobRelationship_updatedAt_idx" ON "CandidateJobRelationship"("updatedAt");
CREATE INDEX "CandidateJobRelationship_assigneeId_idx" ON "CandidateJobRelationship"("assigneeId");
CREATE INDEX "Interview_submissionId_idx" ON "Interview"("submissionId");
CREATE INDEX "Interview_jobId_idx" ON "Interview"("jobId");
CREATE INDEX "Interview_candidateId_idx" ON "Interview"("candidateId");
CREATE INDEX "Offer_submissionId_idx" ON "Offer"("submissionId");
CREATE INDEX "PipelineActivity_jobId_idx" ON "PipelineActivity"("jobId");
CREATE INDEX "PipelineActivity_submissionId_idx" ON "PipelineActivity"("submissionId");
