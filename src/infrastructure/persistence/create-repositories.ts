import type { AppConfig } from "../../shared/config/index.js";
import type { CandidateRepository } from "../../modules/candidate/infrastructure/persistence/candidate-repository.js";
import type { ResumeRepository } from "../../modules/candidate/infrastructure/persistence/resume-repository.js";
import type { JobRepository } from "../../modules/job/infrastructure/job-repository.js";
import type { SubmissionRepository } from "../../modules/job/infrastructure/submission-repository.js";
import type { InterviewRepository } from "../../modules/recruitment/infrastructure/interview-repository.js";
import type { OfferRepository } from "../../modules/recruitment/infrastructure/offer-repository.js";
import type { ActivityRepository } from "../../modules/recruitment/infrastructure/activity-repository.js";
import type { KnowledgeRepository } from "../../modules/knowledge/infrastructure/knowledge-repository.js";
import { InMemoryCandidateRepository } from "../../modules/candidate/infrastructure/persistence/in-memory-candidate-repository.js";
import { InMemoryResumeRepository } from "../../modules/candidate/infrastructure/persistence/in-memory-resume-repository.js";
import { InMemoryJobRepository } from "../../modules/job/infrastructure/in-memory-job-repository.js";
import { InMemorySubmissionRepository } from "../../modules/job/infrastructure/in-memory-submission-repository.js";
import { InMemoryInterviewRepository } from "../../modules/recruitment/infrastructure/in-memory-interview-repository.js";
import { InMemoryOfferRepository } from "../../modules/recruitment/infrastructure/in-memory-offer-repository.js";
import { InMemoryActivityRepository } from "../../modules/recruitment/infrastructure/in-memory-activity-repository.js";
import { InMemoryKnowledgeRepository } from "../../modules/knowledge/infrastructure/knowledge-repository.js";
import { getPrismaClient } from "./prisma/prisma-client.js";
import { PrismaCandidateRepository } from "./prisma/prisma-candidate-repository.js";
import { PrismaResumeRepository } from "./prisma/prisma-resume-repository.js";
import { PrismaJobRepository } from "./prisma/prisma-job-repository.js";
import { PrismaSubmissionRepository } from "./prisma/prisma-submission-repository.js";
import { PrismaInterviewRepository } from "./prisma/prisma-interview-repository.js";
import { PrismaOfferRepository } from "./prisma/prisma-offer-repository.js";
import { PrismaActivityRepository } from "./prisma/prisma-activity-repository.js";
import { PrismaKnowledgeRepository } from "./prisma/prisma-knowledge-repository.js";

export type PersistenceDriver = "memory" | "prisma";

export type AppRepositories = {
  driver: PersistenceDriver;
  candidateRepository: CandidateRepository;
  resumeRepository: ResumeRepository;
  jobRepository: JobRepository;
  submissionRepository: SubmissionRepository;
  interviewRepository: InterviewRepository;
  offerRepository: OfferRepository;
  activityRepository: ActivityRepository;
  knowledgeRepository: KnowledgeRepository;
};

/**
 * DI factory — application layer depends only on repository interfaces.
 * Development / unit tests: memory. Production / Alpha smoke: prisma.
 */
export function createRepositories(config: AppConfig): AppRepositories {
  const driver = config.persistenceDriver;

  if (driver === "prisma") {
    if (!config.databaseUrl) {
      throw new Error("DATABASE_URL is required when PERSISTENCE_DRIVER=prisma");
    }
    const prisma = getPrismaClient(config.databaseUrl);
    return {
      driver,
      candidateRepository: new PrismaCandidateRepository(prisma),
      resumeRepository: new PrismaResumeRepository(prisma),
      jobRepository: new PrismaJobRepository(prisma),
      submissionRepository: new PrismaSubmissionRepository(prisma),
      interviewRepository: new PrismaInterviewRepository(prisma),
      offerRepository: new PrismaOfferRepository(prisma),
      activityRepository: new PrismaActivityRepository(prisma),
      knowledgeRepository: new PrismaKnowledgeRepository(prisma),
    };
  }

  return {
    driver: "memory",
    candidateRepository: new InMemoryCandidateRepository(),
    resumeRepository: new InMemoryResumeRepository(),
    jobRepository: new InMemoryJobRepository(),
    submissionRepository: new InMemorySubmissionRepository(),
    interviewRepository: new InMemoryInterviewRepository(),
    offerRepository: new InMemoryOfferRepository(),
    activityRepository: new InMemoryActivityRepository(),
    knowledgeRepository: new InMemoryKnowledgeRepository(),
  };
}
