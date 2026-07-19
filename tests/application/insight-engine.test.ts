import { describe, expect, it, beforeEach } from "vitest";
import { SystemClock } from "../../src/shared/clock/index.js";
import { UuidIdGenerator } from "../../src/shared/id-generator/id-generator.js";
import { InMemoryTelemetryStore } from "../../src/shared/telemetry/index.js";
import { InsightEngine } from "../../src/modules/knowledge/insights/insight-engine.js";
import { JobInsightProvider } from "../../src/modules/knowledge/insights/providers/job-insight-provider.js";
import { SubmissionInsightProvider } from "../../src/modules/knowledge/insights/providers/submission-insight-provider.js";
import { InterviewInsightProvider } from "../../src/modules/knowledge/insights/providers/interview-insight-provider.js";
import { InMemoryJobRepository } from "../../src/modules/job/infrastructure/in-memory-job-repository.js";
import { InMemorySubmissionRepository } from "../../src/modules/job/infrastructure/in-memory-submission-repository.js";
import { InMemoryInterviewRepository } from "../../src/modules/recruitment/infrastructure/in-memory-interview-repository.js";
import { InMemoryOfferRepository } from "../../src/modules/recruitment/infrastructure/in-memory-offer-repository.js";
import { InMemoryCandidateRepository } from "../../src/modules/candidate/infrastructure/persistence/in-memory-candidate-repository.js";
import { InMemoryKnowledgeRepository } from "../../src/modules/knowledge/infrastructure/knowledge-repository.js";
import { KnowledgeEvolutionService } from "../../src/modules/knowledge/application/knowledge-evolution-service.js";
import { Candidate } from "../../src/modules/candidate/domain/candidate/candidate.js";
import { CandidateId } from "../../src/modules/candidate/domain/candidate/candidate-id.js";
import { CandidateProfile } from "../../src/modules/candidate/domain/candidate/candidate-profile.js";
import { CandidateRecord } from "../../src/modules/candidate/domain/candidate/candidate-record.js";
import { VerifiedKnowledge } from "../../src/modules/candidate/domain/knowledge/verified-knowledge.js";
import type { Job } from "../../src/modules/job/domain/types.js";
import { sortInsightsBySeverity } from "../../src/modules/knowledge/insights/insight.js";

const WORKSPACE = "ws_insight";
const now = () => new Date().toISOString();

function makeJob(overrides: Partial<Job>): Job {
  return {
    id: "job_main",
    workspaceId: WORKSPACE,
    title: "Frontend Engineer",
    company: "Acme",
    department: "Eng",
    employmentType: "full_time",
    location: "Remote",
    salaryMin: null,
    salaryMax: null,
    currency: "USD",
    experienceYears: 3,
    englishRequirement: "B2",
    skills: ["React", "TypeScript", "Node"],
    description: "",
    responsibilities: "",
    requirements: "",
    benefits: "",
    status: "Open",
    ready: true,
    submissionCount: 0,
    placementCount: 0,
    deletedAt: null,
    createdAt: now(),
    updatedAt: now(),
    createdBy: "recruiter_alpha",
    rawJdText: "",
    ...overrides,
  };
}

function makeReadyRecord(id: string, skills: string): CandidateRecord {
  const knowledge = VerifiedKnowledge.fromImport({
    summary: "Engineer",
    skills: skills.split(",").map((s) => ({ normalizedName: s.trim(), confidence: 0.9 })),
    englishLevel: "B2",
    yearsOfExperience: 5,
    uploadedAt: now(),
    importTraceId: `trace_${id}`,
    summaryProvenance: { source: "Resume", confidence: 0.8 },
    skillsProvenance: { source: "Resume", confidence: 0.8 },
    englishProvenance: { source: "Resume", confidence: 0.8 },
    yearsProvenance: { source: "Resume", confidence: 0.8 },
  }).markReady(now(), "recruiter_alpha");

  const candidate = Candidate.create({
    id: CandidateId.create(id),
    workspaceId: WORKSPACE,
    profile: CandidateProfile.create({
      name: id,
      summary: "Engineer",
      skills: [],
      englishLevel: "B2",
    }),
    createdAt: now(),
  });

  return CandidateRecord.create({
    candidate,
    knowledge,
    resumeVersion: 1,
    resumeId: `resume_${id}`,
  });
}

describe("InsightEngine severity ordering", () => {
  it("sorts critical before warning before info", () => {
    const sorted = sortInsightsBySeverity([
      {
        id: "1",
        category: "a",
        severity: "info",
        title: "i",
        description: "i",
      },
      {
        id: "2",
        category: "b",
        severity: "critical",
        title: "c",
        description: "c",
      },
      {
        id: "3",
        category: "d",
        severity: "warning",
        title: "w",
        description: "w",
      },
    ]);
    expect(sorted.map((i) => i.severity)).toEqual(["critical", "warning", "info"]);
  });
});

describe("JobInsightProvider", () => {
  let jobRepository: InMemoryJobRepository;
  let submissionRepository: InMemorySubmissionRepository;
  let candidateRepository: InMemoryCandidateRepository;
  let provider: JobInsightProvider;

  beforeEach(() => {
    jobRepository = new InMemoryJobRepository();
    submissionRepository = new InMemorySubmissionRepository();
    candidateRepository = new InMemoryCandidateRepository();
    provider = new JobInsightProvider({
      jobRepository,
      submissionRepository,
      candidateRepository,
    });
  });

  it("reports reviewed candidate matches when >= 5", async () => {
    const job = makeJob({ id: "job_match_5" });
    await jobRepository.save(job);
    for (let i = 0; i < 5; i++) {
      await candidateRepository.save(makeReadyRecord(`candidate_m${i}`, "React, TypeScript, Node"));
    }

    const insights = await provider.provide({ type: "job", jobId: job.id });
    expect(insights.some((i) => i.description === "5 reviewed candidates match this job.")).toBe(
      true,
    );
  });

  it("reports similar filled job and pending client feedback", async () => {
    const job = makeJob({ id: "job_open" });
    await jobRepository.save(job);
    await jobRepository.save(
      makeJob({
        id: "job_filled",
        title: "React Dev",
        status: "Filled",
        placementCount: 1,
        skills: ["React", "TypeScript"],
      }),
    );
    await submissionRepository.save({
      id: "sub_1",
      candidateId: "candidate_x",
      jobId: job.id,
      submittedBy: "recruiter_alpha",
      submittedAt: now(),
      status: "Client Reviewing",
      notes: "",
      updatedAt: now(),
    });
    await submissionRepository.save({
      id: "sub_2",
      candidateId: "candidate_y",
      jobId: job.id,
      submittedBy: "recruiter_alpha",
      submittedAt: now(),
      status: "Submitted",
      notes: "",
      updatedAt: now(),
    });

    const insights = sortInsightsBySeverity(await provider.provide({ type: "job", jobId: job.id }));
    expect(
      insights.some((i) => i.description === "A similar job was successfully filled before."),
    ).toBe(true);
    expect(
      insights.some((i) => i.description === "2 candidates are awaiting client feedback."),
    ).toBe(true);
    expect(insights[0]?.severity).toBe("warning");
  });
});

describe("SubmissionInsightProvider", () => {
  let provider: SubmissionInsightProvider;
  let submissionRepository: InMemorySubmissionRepository;
  let jobRepository: InMemoryJobRepository;
  let knowledgeRepository: InMemoryKnowledgeRepository;
  let offerRepository: InMemoryOfferRepository;
  let evolution: KnowledgeEvolutionService;

  beforeEach(async () => {
    submissionRepository = new InMemorySubmissionRepository();
    jobRepository = new InMemoryJobRepository();
    knowledgeRepository = new InMemoryKnowledgeRepository();
    offerRepository = new InMemoryOfferRepository();
    const clock = new SystemClock();
    const idGenerator = new UuidIdGenerator();
    evolution = new KnowledgeEvolutionService({
      clock,
      idGenerator,
      knowledgeRepository,
      telemetry: new InMemoryTelemetryStore(),
    });
    provider = new SubmissionInsightProvider({
      submissionRepository,
      jobRepository,
      knowledgeRepository,
      offerRepository,
    });

    await jobRepository.save(makeJob({ id: "job_a", company: "ClientCo" }));
    await jobRepository.save(
      makeJob({ id: "job_b", company: "ClientCo", skills: ["React", "Node"] }),
    );
    await evolution.seedFromVerifiedKnowledge({
      candidateId: "candidate_sub",
      workspaceId: WORKSPACE,
      knowledge: VerifiedKnowledge.fromImport({
        summary: "S",
        skills: [{ normalizedName: "React" }, { normalizedName: "Node" }],
        englishLevel: "B1",
        yearsOfExperience: 3,
        uploadedAt: now(),
        importTraceId: "t1",
        summaryProvenance: { source: "Resume", confidence: 0.7 },
        skillsProvenance: { source: "Resume", confidence: 0.7 },
        englishProvenance: { source: "Resume", confidence: 0.7 },
        yearsProvenance: { source: "Resume", confidence: 0.7 },
      }),
    });
  });

  it("flags prior reject by same client, english correction, similar roles, salary change", async () => {
    await submissionRepository.save({
      id: "sub_old",
      candidateId: "candidate_sub",
      jobId: "job_b",
      submittedBy: "recruiter_alpha",
      submittedAt: now(),
      status: "Rejected",
      notes: "",
      updatedAt: now(),
    });
    await submissionRepository.save({
      id: "sub_new",
      candidateId: "candidate_sub",
      jobId: "job_a",
      submittedBy: "recruiter_alpha",
      submittedAt: now(),
      status: "Submitted",
      notes: "",
      updatedAt: now(),
    });
    await evolution.recordReviewEvolution({
      candidateId: "candidate_sub",
      field: "english",
      action: "edit",
      actorId: "recruiter_alpha",
      oldValue: "B1",
      newValue: "C1",
      reason: "Wrong English",
    });
    await offerRepository.save({
      id: "offer_1",
      submissionId: "sub_old",
      jobId: "job_b",
      candidateId: "candidate_sub",
      salary: "1000",
      startDate: "",
      benefits: "",
      notes: "",
      status: "Declined",
      createdAt: now(),
      updatedAt: now(),
      createdBy: "recruiter_alpha",
    });
    await offerRepository.save({
      id: "offer_2",
      submissionId: "sub_new",
      jobId: "job_a",
      candidateId: "candidate_sub",
      salary: "2000",
      startDate: "",
      benefits: "",
      notes: "",
      status: "Draft",
      createdAt: now(),
      updatedAt: now(),
      createdBy: "recruiter_alpha",
    });

    const insights = await provider.provide({ type: "submission", submissionId: "sub_new" });
    expect(
      insights.some((i) => i.description === "Candidate was previously rejected by this client."),
    ).toBe(true);
    expect(insights.some((i) => i.description === "English level was manually corrected.")).toBe(
      true,
    );
    expect(
      insights.some((i) => i.description === "Candidate has prior submissions for similar roles."),
    ).toBe(true);
    expect(insights.some((i) => i.description === "Salary expectation changed recently.")).toBe(
      true,
    );
    expect(insights[0]?.severity).toBe("critical");
  });
});

describe("InterviewInsightProvider", () => {
  it("surfaces prior notes, missed interview, and prior pass", async () => {
    const jobRepository = new InMemoryJobRepository();
    const interviewRepository = new InMemoryInterviewRepository();
    const provider = new InterviewInsightProvider({ interviewRepository, jobRepository });

    await jobRepository.save(makeJob({ id: "job_int", skills: ["React", "Node"] }));
    await jobRepository.save(
      makeJob({ id: "job_prior", skills: ["React", "Node"], title: "Similar" }),
    );

    await interviewRepository.save({
      id: "int_current",
      submissionId: "sub_1",
      jobId: "job_int",
      candidateId: "candidate_int",
      round: 2,
      type: "Technical",
      date: now(),
      interviewer: "A",
      location: "",
      meetingLink: "",
      feedback: "",
      decision: "Pending",
      status: "Scheduled",
      createdAt: now(),
      createdBy: "recruiter_alpha",
    });
    await interviewRepository.save({
      id: "int_notes",
      submissionId: "sub_0",
      jobId: "job_prior",
      candidateId: "candidate_int",
      round: 1,
      type: "Technical",
      date: now(),
      interviewer: "B",
      location: "",
      meetingLink: "",
      feedback: "Strong React fundamentals",
      decision: "Passed",
      status: "Completed",
      createdAt: now(),
      createdBy: "recruiter_beta",
    });
    await interviewRepository.save({
      id: "int_missed",
      submissionId: "sub_m",
      jobId: "job_prior",
      candidateId: "candidate_int",
      round: 1,
      type: "HR",
      date: now(),
      interviewer: "C",
      location: "",
      meetingLink: "",
      feedback: "",
      decision: "Cancelled",
      status: "Cancelled",
      createdAt: now(),
      createdBy: "recruiter_alpha",
    });

    const insights = await provider.provide({ type: "interview", interviewId: "int_current" });
    expect(insights.some((i) => i.description === "Previous interviewer left notes.")).toBe(true);
    expect(insights.some((i) => i.description === "Previous interview was missed.")).toBe(true);
    expect(
      insights.some((i) => i.description === "Candidate passed similar interviews before."),
    ).toBe(true);
  });
});

describe("InsightEngine orchestration", () => {
  it("aggregates providers and emits insight_rendered", async () => {
    const clock = new SystemClock();
    const idGenerator = new UuidIdGenerator();
    const telemetry = new InMemoryTelemetryStore();
    const jobRepository = new InMemoryJobRepository();
    const submissionRepository = new InMemorySubmissionRepository();
    const candidateRepository = new InMemoryCandidateRepository();
    await jobRepository.save(makeJob({ id: "job_eng" }));

    const engine = new InsightEngine(
      [
        new JobInsightProvider({
          jobRepository,
          submissionRepository,
          candidateRepository,
        }),
      ],
      { telemetry, clock, idGenerator },
    );

    const insights = await engine.getInsights({ type: "job", jobId: "job_eng" });
    expect(Array.isArray(insights)).toBe(true);
    expect(telemetry.getEvents().some((e) => e.event_type === "insight_rendered")).toBe(true);
  });
});
