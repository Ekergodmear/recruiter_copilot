-- CreateTable
CREATE TABLE "CandidateRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "resumeVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "uploadedAt" TEXT NOT NULL,
    "profileJson" TEXT NOT NULL,
    "knowledgeJson" TEXT NOT NULL,
    "identityJson" TEXT
);

-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "storageRef" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "uploadedAt" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "salaryMin" REAL,
    "salaryMax" REAL,
    "currency" TEXT NOT NULL,
    "experienceYears" REAL,
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
    "rawJdText" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "submittedAt" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PipelineActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "submissionId" TEXT,
    "candidateId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "KnowledgeSet" (
    "candidateId" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "objectsJson" TEXT NOT NULL,
    "candidateSignalsJson" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "CandidateRecord_workspaceId_idx" ON "CandidateRecord"("workspaceId");

-- CreateIndex
CREATE INDEX "CandidateRecord_uploadedAt_idx" ON "CandidateRecord"("uploadedAt");

-- CreateIndex
CREATE INDEX "Resume_candidateId_idx" ON "Resume"("candidateId");

-- CreateIndex
CREATE INDEX "Job_workspaceId_idx" ON "Job"("workspaceId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_updatedAt_idx" ON "Job"("updatedAt");

-- CreateIndex
CREATE INDEX "Submission_jobId_idx" ON "Submission"("jobId");

-- CreateIndex
CREATE INDEX "Submission_candidateId_idx" ON "Submission"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_candidateId_jobId_key" ON "Submission"("candidateId", "jobId");

-- CreateIndex
CREATE INDEX "Interview_submissionId_idx" ON "Interview"("submissionId");

-- CreateIndex
CREATE INDEX "Interview_jobId_idx" ON "Interview"("jobId");

-- CreateIndex
CREATE INDEX "Interview_candidateId_idx" ON "Interview"("candidateId");

-- CreateIndex
CREATE INDEX "Offer_submissionId_idx" ON "Offer"("submissionId");

-- CreateIndex
CREATE INDEX "PipelineActivity_jobId_idx" ON "PipelineActivity"("jobId");

-- CreateIndex
CREATE INDEX "PipelineActivity_submissionId_idx" ON "PipelineActivity"("submissionId");
