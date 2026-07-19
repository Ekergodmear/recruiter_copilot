import { describe, expect, it } from "vitest";
import { ConsistencyVerifier } from "../../src/modules/operations/founder-readiness/consistency-verifier.js";
import { InMemoryCandidateRepository } from "../../src/modules/candidate/infrastructure/persistence/in-memory-candidate-repository.js";
import { InMemorySubmissionRepository } from "../../src/modules/job/infrastructure/in-memory-submission-repository.js";
import { InMemoryInterviewRepository } from "../../src/modules/recruitment/infrastructure/in-memory-interview-repository.js";
import { InMemoryOfferRepository } from "../../src/modules/recruitment/infrastructure/in-memory-offer-repository.js";
import { InMemoryKnowledgeRepository } from "../../src/modules/knowledge/infrastructure/knowledge-repository.js";

describe("ConsistencyVerifier", () => {
  it("flags placement without accepted offer", async () => {
    const submissionRepository = new InMemorySubmissionRepository();
    await submissionRepository.save({
      id: "sub_1",
      jobId: "job_1",
      candidateId: "cand_1",
      status: "Placed",
      submittedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      submittedBy: "r",
      notes: "",
    });

    const offerRepository = new InMemoryOfferRepository();
    await offerRepository.save({
      id: "offer_1",
      submissionId: "sub_1",
      jobId: "job_1",
      candidateId: "cand_1",
      salary: "1",
      startDate: "",
      benefits: "",
      notes: "",
      status: "Sent",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      createdBy: "r",
    });

    const verifier = new ConsistencyVerifier({
      candidateRepository: new InMemoryCandidateRepository(),
      submissionRepository,
      interviewRepository: new InMemoryInterviewRepository(),
      offerRepository,
      knowledgeRepository: new InMemoryKnowledgeRepository(),
    });

    const issues = await verifier.verify();
    expect(issues.some((i) => i.code === "PLACEMENT_WITHOUT_ACCEPTED_OFFER")).toBe(true);
  });

  it("passes clean empty workspace", async () => {
    const verifier = new ConsistencyVerifier({
      candidateRepository: new InMemoryCandidateRepository(),
      submissionRepository: new InMemorySubmissionRepository(),
      interviewRepository: new InMemoryInterviewRepository(),
      offerRepository: new InMemoryOfferRepository(),
      knowledgeRepository: new InMemoryKnowledgeRepository(),
    });
    expect(await verifier.verify()).toEqual([]);
  });
});
