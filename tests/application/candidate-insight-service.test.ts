import { describe, expect, it, beforeEach } from "vitest";
import { SystemClock } from "../../src/shared/clock/index.js";
import { UuidIdGenerator } from "../../src/shared/id-generator/id-generator.js";
import { InMemoryTelemetryStore } from "../../src/shared/telemetry/index.js";
import { InMemoryKnowledgeRepository } from "../../src/modules/knowledge/infrastructure/knowledge-repository.js";
import { KnowledgeEvolutionService } from "../../src/modules/knowledge/application/knowledge-evolution-service.js";
import { CandidateInsightService } from "../../src/modules/knowledge/application/candidate-insight-service.js";
import { InsightEngine } from "../../src/modules/knowledge/insights/insight-engine.js";
import { KnowledgeInsightProvider } from "../../src/modules/knowledge/insights/providers/knowledge-insight-provider.js";
import { PlacementInsightProvider } from "../../src/modules/knowledge/insights/providers/placement-insight-provider.js";
import { InMemoryJobRepository } from "../../src/modules/job/infrastructure/in-memory-job-repository.js";
import { InMemorySubmissionRepository } from "../../src/modules/job/infrastructure/in-memory-submission-repository.js";
import { InMemoryInterviewRepository } from "../../src/modules/recruitment/infrastructure/in-memory-interview-repository.js";
import type { Job } from "../../src/modules/job/domain/types.js";
import {
  EDITABLE_FIELDS,
  type VerifiedKnowledge,
} from "../../src/modules/candidate/domain/knowledge/verified-knowledge.js";

const CANDIDATE_ID = "candidate_insight_test";
const WORKSPACE_ID = "ws_test";

function makeVerifiedKnowledge(): VerifiedKnowledge {
  const now = new Date().toISOString();
  const fields = Object.fromEntries(
    EDITABLE_FIELDS.map((field) => [
      field,
      {
        field,
        originalAiValue: field === "skills" ? "React, Node" : "Original value",
        currentValue: field === "skills" ? "React, Node" : "Original value",
        status: "CLAIMED" as const,
        edited: false,
        provenance: { source: "Resume" as const, confidence: 0.65 },
        lastReviewedAt: null,
        lastReviewedBy: null,
      },
    ]),
  );
  return { fields, uploadedAt: now, importTraceId: "trace_1" } as unknown as VerifiedKnowledge;
}

function makeJob(overrides: Partial<Job>): Job {
  const now = new Date().toISOString();
  return {
    id: "job_1",
    workspaceId: WORKSPACE_ID,
    title: "Senior Frontend Engineer",
    company: "Acme Corp",
    department: "Engineering",
    employmentType: "full_time",
    location: "Remote",
    salaryMin: null,
    salaryMax: null,
    currency: "USD",
    experienceYears: null,
    englishRequirement: "B2",
    skills: ["React", "Node", "TypeScript"],
    description: "",
    responsibilities: "",
    requirements: "",
    benefits: "",
    status: "Open",
    ready: true,
    submissionCount: 0,
    placementCount: 0,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: "recruiter_alpha",
    rawJdText: "",
    source: "manual",
    notes: "",
    ...overrides,
  };
}

describe("CandidateInsightService (via InsightEngine)", () => {
  let knowledgeRepository: InMemoryKnowledgeRepository;
  let evolutionService: KnowledgeEvolutionService;
  let jobRepository: InMemoryJobRepository;
  let submissionRepository: InMemorySubmissionRepository;
  let interviewRepository: InMemoryInterviewRepository;
  let insightService: CandidateInsightService;
  let telemetry: InMemoryTelemetryStore;

  beforeEach(async () => {
    const clock = new SystemClock();
    const idGenerator = new UuidIdGenerator();
    telemetry = new InMemoryTelemetryStore();

    knowledgeRepository = new InMemoryKnowledgeRepository();
    evolutionService = new KnowledgeEvolutionService({
      clock,
      idGenerator,
      knowledgeRepository,
      telemetry,
    });
    jobRepository = new InMemoryJobRepository();
    submissionRepository = new InMemorySubmissionRepository();
    interviewRepository = new InMemoryInterviewRepository();

    const engine = new InsightEngine(
      [
        new KnowledgeInsightProvider(knowledgeRepository),
        new PlacementInsightProvider({
          knowledgeRepository,
          jobRepository,
          submissionRepository,
          interviewRepository,
        }),
      ],
      { telemetry, clock, idGenerator },
    );
    insightService = new CandidateInsightService(engine);

    await evolutionService.seedFromVerifiedKnowledge({
      candidateId: CANDIDATE_ID,
      workspaceId: WORKSPACE_ID,
      knowledge: makeVerifiedKnowledge(),
    });
  });

  it("flags a field corrected exactly once", async () => {
    await evolutionService.recordReviewEvolution({
      candidateId: CANDIDATE_ID,
      field: "english",
      action: "edit",
      actorId: "recruiter_alpha",
      oldValue: "Original value",
      newValue: "B2",
      reason: "Wrong English",
    });

    const insights = await insightService.getInsights(CANDIDATE_ID);
    expect(
      insights.some(
        (i) =>
          i.category === "knowledge_correction" &&
          i.description.includes("English level was manually corrected"),
      ),
    ).toBe(true);
  });

  it("flags a field corrected multiple times as volatility", async () => {
    for (const value of ["3 years", "4 years"]) {
      await evolutionService.recordReviewEvolution({
        candidateId: CANDIDATE_ID,
        field: "years_of_experience",
        action: "edit",
        actorId: "recruiter_alpha",
        oldValue: "Original value",
        newValue: value,
        reason: "Wrong years",
      });
    }

    const insights = await insightService.getInsights(CANDIDATE_ID);
    const volatility = insights.find((i) => i.category === "knowledge_volatility");
    expect(volatility?.description).toContain("Years of experience changed 2 times");
    expect(volatility?.severity).toBe("warning");
  });

  it("does not flag a field that was only verified (no value change)", async () => {
    await evolutionService.recordReviewEvolution({
      candidateId: CANDIDATE_ID,
      field: "summary",
      action: "verify",
      actorId: "recruiter_alpha",
      oldValue: "Original value",
      newValue: "Original value",
      reason: null,
    });

    const insights = await insightService.getInsights(CANDIDATE_ID);
    expect(insights.some((i) => i.title.toLowerCase().includes("summary"))).toBe(false);
  });

  it("surfaces a placement signal with job context", async () => {
    await jobRepository.save(
      makeJob({ id: "job_placed", title: "Backend Engineer", company: "Beta LLC" }),
    );
    await evolutionService.recordCandidateSignal({
      candidateId: CANDIDATE_ID,
      actorId: "recruiter_alpha",
      type: "placement",
      metadata: { jobId: "job_placed" },
    });

    const insights = await insightService.getInsights(CANDIDATE_ID);
    const placement = insights.find((i) => i.category === "placement");
    expect(placement?.description).toBe("Previously placed — Backend Engineer at Beta LLC.");
    expect(placement?.severity).toBe("critical");
  });

  it("surfaces interview history even without a recorded signal", async () => {
    const job = makeJob({
      id: "job_interviewed",
      title: "Platform Engineer",
      company: "Gamma Inc",
    });
    await jobRepository.save(job);
    await interviewRepository.save({
      id: "interview_1",
      submissionId: "sub_1",
      jobId: job.id,
      candidateId: CANDIDATE_ID,
      round: 1,
      type: "Technical",
      date: new Date().toISOString(),
      interviewer: "hm_1",
      location: "",
      meetingLink: "",
      feedback: "",
      decision: "Pending",
      status: "Completed",
      createdAt: new Date().toISOString(),
      createdBy: "recruiter_alpha",
    });

    const insights = await insightService.getInsights(CANDIDATE_ID);
    expect(
      insights.some((i) => i.description.includes("Previously interviewed by Gamma Inc")),
    ).toBe(true);
  });

  it("flags rule-based job similarity from skill overlap, excluding already-submitted jobs", async () => {
    const matchJob = makeJob({
      id: "job_match",
      title: "React Lead",
      company: "Delta Co",
      skills: ["React", "Node"],
    });
    const alreadySubmittedJob = makeJob({
      id: "job_submitted",
      title: "Node Specialist",
      company: "Epsilon Co",
      skills: ["React", "Node"],
    });
    await jobRepository.save(matchJob);
    await jobRepository.save(alreadySubmittedJob);
    await submissionRepository.save({
      id: "sub_existing",
      candidateId: CANDIDATE_ID,
      jobId: alreadySubmittedJob.id,
      submittedBy: "recruiter_alpha",
      submittedAt: new Date().toISOString(),
      status: "Submitted",
      notes: "",
      updatedAt: new Date().toISOString(),
    });

    const insights = await insightService.getInsights(CANDIDATE_ID);
    const similarity = insights.filter((i) => i.category === "candidate_job_similarity");
    expect(similarity.some((i) => i.description.includes("Delta Co"))).toBe(true);
    expect(similarity.some((i) => i.description.includes("Epsilon Co"))).toBe(false);
    expect(telemetry.getEvents().some((e) => e.event_type === "insight_rendered")).toBe(true);
  });
});
