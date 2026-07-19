import { detectDocument } from "../../resume-processing/document-detector.js";
import { getParser } from "../../resume-processing/document-parsers.js";
import type { Clock } from "../../../shared/clock/index.js";
import type { IdGenerator } from "../../../shared/id-generator/index.js";
import { createTelemetryEvent, type TelemetryStore } from "../../../shared/telemetry/index.js";
import type { CandidateRepository } from "../../candidate/infrastructure/persistence/candidate-repository.js";
import type {
  EmploymentType,
  Job,
  JobReviewField,
  JobStatus,
  Submission,
} from "../domain/types.js";
import { JOB_REVIEW_FIELDS, JOB_STATUSES } from "../domain/types.js";
import { applyJobFieldEdit, extractJdFields, jobFieldValue } from "./jd-parse.js";
import { rankReadyCandidates, type RuleMatchResult } from "./rule-matching.js";
import type { JobRepository } from "../infrastructure/job-repository.js";
import type { SubmissionRepository } from "../infrastructure/submission-repository.js";

export class JobServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "JobServiceError";
  }
}

export class JobService {
  constructor(
    private readonly deps: {
      clock: Clock;
      idGenerator: IdGenerator;
      jobRepository: JobRepository;
      submissionRepository: SubmissionRepository;
      candidateRepository: CandidateRepository;
      telemetry: TelemetryStore;
      workspaceId: string;
      onJobCreated?: (jobId: string, actorId: string) => Promise<void>;
      onSubmissionCreated?: (submission: Submission, actorId: string) => Promise<void>;
    },
  ) {}

  async createFromText(params: { text: string; actorId: string; company?: string }): Promise<Job> {
    return this.createFromParsed(params.text, params.actorId, params.company);
  }

  async createFromFile(params: {
    file: Buffer;
    filename: string;
    mimeType: string;
    actorId: string;
    company?: string;
  }): Promise<Job> {
    const detection = detectDocument(params.mimeType);
    if (detection.format === "unknown" || detection.format === "image") {
      throw new JobServiceError("UNSUPPORTED_FORMAT", "Only PDF and DOCX are supported");
    }
    const parser = getParser(detection.format);
    if (!parser) {
      throw new JobServiceError("UNSUPPORTED_FORMAT", "No parser for document");
    }
    const text = await parser.parse(params.file);
    if (!text.trim()) {
      throw new JobServiceError("EMPTY_DOCUMENT", "Could not extract text from JD");
    }
    return this.createFromParsed(text, params.actorId, params.company);
  }

  private async createFromParsed(text: string, actorId: string, company?: string): Promise<Job> {
    const started = this.deps.clock.now();
    const parsed = extractJdFields(text);
    const now = this.deps.clock.nowIso();
    const job: Job = {
      id: this.deps.idGenerator.generateId("job"),
      workspaceId: this.deps.workspaceId,
      title: parsed.title,
      company: company?.trim() || parsed.company || "Unknown company",
      department: "",
      employmentType: "full_time",
      location: parsed.location,
      salaryMin: parsed.salaryMin,
      salaryMax: parsed.salaryMax,
      currency: parsed.currency,
      experienceYears: parsed.experienceYears,
      englishRequirement: parsed.englishRequirement,
      skills: parsed.skills,
      description: parsed.description,
      responsibilities: parsed.responsibilities,
      requirements: parsed.requirements,
      benefits: parsed.benefits,
      status: "Draft",
      ready: false,
      submissionCount: 0,
      placementCount: 0,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
      rawJdText: text,
      source: "manual",
      notes: "",
    };
    await this.deps.jobRepository.save(job);
    const parseTimeMs = this.deps.clock.now().getTime() - started.getTime();
    this.deps.telemetry.record(
      createTelemetryEvent(
        {
          event_type: "job_created",
          trace_id: this.deps.idGenerator.generateId("trace"),
          workspace_id: this.deps.workspaceId,
          actor_id: actorId,
          latency_ms: parseTimeMs,
          parse_time_ms: parseTimeMs,
          candidate_id: job.id,
        },
        this.deps.clock,
      ),
    );
    if (this.deps.onJobCreated) {
      await this.deps.onJobCreated(job.id, actorId);
    }
    return job;
  }

  /**
   * EPIC-002 — manual create (source=manual, immutable thereafter).
   */
  async createManual(params: {
    actorId: string;
    title: string;
    company: string;
    location?: string;
    employmentType?: EmploymentType;
    salaryMin?: number | null;
    salaryMax?: number | null;
    currency?: string;
    status?: JobStatus;
    notes?: string;
    description?: string;
    requirements?: string;
    benefits?: string;
  }): Promise<Job> {
    const title = params.title.trim();
    const company = params.company.trim();
    if (!title) throw new JobServiceError("INVALID_BODY", "title is required");
    if (!company) throw new JobServiceError("INVALID_BODY", "company is required");
    if (params.status && !JOB_STATUSES.includes(params.status)) {
      throw new JobServiceError("INVALID_STATUS", `Invalid status: ${params.status}`);
    }
    const now = this.deps.clock.nowIso();
    const job: Job = {
      id: this.deps.idGenerator.generateId("job"),
      workspaceId: this.deps.workspaceId,
      title,
      company,
      department: "",
      employmentType: params.employmentType ?? "full_time",
      location: params.location?.trim() ?? "",
      salaryMin: params.salaryMin ?? null,
      salaryMax: params.salaryMax ?? null,
      currency: params.currency?.trim() || "USD",
      experienceYears: null,
      englishRequirement: "",
      skills: [],
      description: params.description?.trim() ?? "",
      responsibilities: "",
      requirements: params.requirements?.trim() ?? "",
      benefits: params.benefits?.trim() ?? "",
      status: params.status ?? "Draft",
      ready: true,
      submissionCount: 0,
      placementCount: 0,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: params.actorId,
      rawJdText: "",
      source: "manual",
      notes: params.notes?.trim() ?? "",
    };
    await this.deps.jobRepository.save(job);
    if (this.deps.onJobCreated) {
      await this.deps.onJobCreated(job.id, params.actorId);
    }
    return job;
  }

  async list(params: {
    status?: string;
    q?: string;
    company?: string;
    location?: string;
    sort?: "updated" | "created";
  }) {
    let jobs = await this.deps.jobRepository.findAll();
    if (params.status) {
      jobs = jobs.filter((j) => j.status === params.status);
    }
    if (params.company) {
      const c = params.company.toLowerCase();
      jobs = jobs.filter((j) => j.company.toLowerCase().includes(c));
    }
    if (params.location) {
      const loc = params.location.toLowerCase();
      jobs = jobs.filter((j) => j.location.toLowerCase().includes(loc));
    }
    const q = params.q?.trim().toLowerCase();
    if (q) {
      // EPIC-002: search by title and company
      jobs = jobs.filter(
        (j) => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q),
      );
    }
    const sort = params.sort === "created" ? "created" : "updated";
    jobs = [...jobs].sort((a, b) => {
      const key = sort === "created" ? "createdAt" : "updatedAt";
      return new Date(b[key]).getTime() - new Date(a[key]).getTime();
    });
    return {
      items: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        status: j.status,
        location: j.location,
        employmentType: j.employmentType,
        source: j.source,
        ready: j.ready,
        submissionCount: j.submissionCount,
        placementCount: j.placementCount,
        candidates: j.submissionCount,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      })),
      total: jobs.length,
    };
  }

  async getById(id: string): Promise<Job> {
    const job = await this.deps.jobRepository.findById(id);
    if (!job || job.deletedAt) {
      throw new JobServiceError("NOT_FOUND", "Job not found");
    }
    return job;
  }

  async update(id: string, patch: Partial<Job>): Promise<Job> {
    const job = await this.getById(id);
    const next: Job = {
      ...job,
      ...sanitizePatch(patch),
      id: job.id,
      workspaceId: job.workspaceId,
      createdAt: job.createdAt,
      createdBy: job.createdBy,
      rawJdText: job.rawJdText,
      submissionCount: job.submissionCount,
      placementCount: job.placementCount,
      deletedAt: job.deletedAt,
      // EPIC-002: source is immutable after creation
      source: job.source,
      updatedAt: this.deps.clock.nowIso(),
    };
    await this.deps.jobRepository.save(next);
    return next;
  }

  async softDelete(id: string): Promise<void> {
    const job = await this.getById(id);
    await this.deps.jobRepository.save({
      ...job,
      deletedAt: this.deps.clock.nowIso(),
      updatedAt: this.deps.clock.nowIso(),
      status: "Closed",
    });
  }

  getReviewView(job: Job) {
    return {
      jobId: job.id,
      title: job.title,
      company: job.company,
      status: job.status,
      ready: job.ready,
      rawJdText: job.rawJdText,
      diff: JOB_REVIEW_FIELDS.map((field) => ({
        field,
        label: fieldLabel(field),
        current: jobFieldValue(job, field),
      })),
    };
  }

  async reviewField(params: {
    jobId: string;
    field: string;
    action: "accept" | "edit" | "reject";
    humanValue?: string;
    actorId: string;
  }): Promise<Job> {
    if (!JOB_REVIEW_FIELDS.includes(params.field as JobReviewField)) {
      throw new JobServiceError("INVALID_FIELD", `Unknown field: ${params.field}`);
    }
    const field = params.field as JobReviewField;
    let job = await this.getById(params.jobId);

    if (params.action === "edit") {
      if (params.humanValue === undefined) {
        throw new JobServiceError("INVALID_BODY", "humanValue required for edit");
      }
      job = {
        ...job,
        ...applyJobFieldEdit(job, field, params.humanValue),
        updatedAt: this.deps.clock.nowIso(),
      };
    }

    await this.deps.jobRepository.save(job);
    this.deps.telemetry.record(
      createTelemetryEvent(
        {
          event_type: "job_reviewed",
          trace_id: this.deps.idGenerator.generateId("trace"),
          workspace_id: this.deps.workspaceId,
          actor_id: params.actorId,
          latency_ms: 0,
          review_action: params.action,
          field_name: field,
          candidate_id: job.id,
          human_override_rate: params.action === "edit" ? 1 : 0,
        },
        this.deps.clock,
      ),
    );
    return job;
  }

  async markReady(jobId: string, actorId: string): Promise<Job> {
    const job = await this.getById(jobId);
    const next: Job = {
      ...job,
      ready: true,
      status: job.status === "Draft" ? "Open" : job.status,
      updatedAt: this.deps.clock.nowIso(),
    };
    await this.deps.jobRepository.save(next);
    this.deps.telemetry.record(
      createTelemetryEvent(
        {
          event_type: "job_ready",
          trace_id: this.deps.idGenerator.generateId("trace"),
          workspace_id: this.deps.workspaceId,
          actor_id: actorId,
          latency_ms: 0,
          candidate_id: job.id,
        },
        this.deps.clock,
      ),
    );
    return next;
  }

  async matchedCandidates(jobId: string): Promise<RuleMatchResult[]> {
    const job = await this.getById(jobId);
    const records = await this.deps.candidateRepository.findAll();
    return rankReadyCandidates(job, records);
  }

  async submitCandidate(params: {
    jobId: string;
    candidateId: string;
    actorId: string;
    notes?: string;
  }): Promise<Submission> {
    const job = await this.getById(params.jobId);
    const records = await this.deps.candidateRepository.findAll();
    const record = records.find((r) => r.candidateId === params.candidateId);
    if (!record) {
      throw new JobServiceError("CANDIDATE_NOT_FOUND", "Candidate not found");
    }
    if (!record.knowledge.isReady) {
      throw new JobServiceError("CANDIDATE_NOT_READY", "Only Ready candidates can be submitted");
    }

    const existing = await this.deps.submissionRepository.findByCandidateAndJob(
      params.candidateId,
      params.jobId,
    );
    if (existing) {
      throw new JobServiceError("ALREADY_SUBMITTED", "Candidate already submitted to this job");
    }

    const now = this.deps.clock.nowIso();
    const submission: Submission = {
      id: this.deps.idGenerator.generateId("submission"),
      candidateId: params.candidateId,
      jobId: params.jobId,
      submittedBy: params.actorId,
      submittedAt: now,
      status: "Submitted",
      notes: params.notes?.trim() ?? "",
      updatedAt: now,
    };
    await this.deps.submissionRepository.save(submission);
    await this.deps.jobRepository.save({
      ...job,
      submissionCount: job.submissionCount + 1,
      updatedAt: now,
    });
    if (this.deps.onSubmissionCreated) {
      await this.deps.onSubmissionCreated(submission, params.actorId);
    }
    return submission;
  }

  async listSubmissions(jobId: string) {
    await this.getById(jobId);
    const submissions = await this.deps.submissionRepository.findByJobId(jobId);
    const records = await this.deps.candidateRepository.findAll();
    const nameById = new Map(records.map((r) => [r.candidateId, r.candidate.profile.name]));
    return {
      items: submissions.map((s) => ({
        ...s,
        candidateName: nameById.get(s.candidateId) ?? s.candidateId,
      })),
      total: submissions.length,
    };
  }
}

function fieldLabel(field: JobReviewField): string {
  const labels: Record<JobReviewField, string> = {
    title: "Title",
    skills: "Skills",
    englishRequirement: "English",
    experienceYears: "Experience",
    salary: "Salary",
    responsibilities: "Responsibilities",
    requirements: "Requirements",
    benefits: "Benefits",
  };
  return labels[field];
}

function sanitizePatch(patch: Partial<Job>): Partial<Job> {
  const next: Partial<Job> = {};
  if (patch.title !== undefined) next.title = String(patch.title);
  if (patch.company !== undefined) next.company = String(patch.company);
  if (patch.department !== undefined) next.department = String(patch.department);
  if (patch.location !== undefined) next.location = String(patch.location);
  if (patch.employmentType !== undefined) next.employmentType = patch.employmentType;
  if (patch.salaryMin !== undefined) next.salaryMin = patch.salaryMin;
  if (patch.salaryMax !== undefined) next.salaryMax = patch.salaryMax;
  if (patch.currency !== undefined) next.currency = String(patch.currency);
  if (patch.experienceYears !== undefined) next.experienceYears = patch.experienceYears;
  if (patch.englishRequirement !== undefined)
    next.englishRequirement = String(patch.englishRequirement);
  if (patch.skills !== undefined) next.skills = patch.skills;
  if (patch.description !== undefined) next.description = String(patch.description);
  if (patch.responsibilities !== undefined) next.responsibilities = String(patch.responsibilities);
  if (patch.requirements !== undefined) next.requirements = String(patch.requirements);
  if (patch.benefits !== undefined) next.benefits = String(patch.benefits);
  if (patch.status !== undefined) {
    if (!JOB_STATUSES.includes(patch.status as JobStatus)) {
      throw new JobServiceError("INVALID_STATUS", `Invalid status: ${patch.status}`);
    }
    next.status = patch.status;
  }
  if (patch.notes !== undefined) next.notes = String(patch.notes);
  // source intentionally omitted — immutable
  return next;
}
