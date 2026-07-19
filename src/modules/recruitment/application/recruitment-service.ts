import type { Clock } from "../../../shared/clock/index.js";
import type { IdGenerator } from "../../../shared/id-generator/index.js";
import { createTelemetryEvent, type TelemetryStore } from "../../../shared/telemetry/index.js";
import type { CandidateRepository } from "../../candidate/infrastructure/persistence/candidate-repository.js";
import type { JobRepository } from "../../job/infrastructure/job-repository.js";
import type { SubmissionRepository } from "../../job/infrastructure/submission-repository.js";
import {
  SUBMISSION_STATUSES,
  type Submission,
  type SubmissionStatus,
} from "../../job/domain/types.js";
import type {
  Interview,
  InterviewDecision,
  Offer,
  OfferStatus,
  PipelineActivity,
} from "../domain/types.js";
import type { ActivityRepository } from "../infrastructure/activity-repository.js";
import type { InterviewRepository } from "../infrastructure/interview-repository.js";
import type { OfferRepository } from "../infrastructure/offer-repository.js";
import type { KnowledgeEvolutionService } from "../../knowledge/application/knowledge-evolution-service.js";
import type { KnowledgeSignalType } from "../../knowledge/domain/types.js";

export class RecruitmentError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RecruitmentError";
  }
}

const INTERVIEWING_STATUSES = new Set<SubmissionStatus>([
  "Interview Scheduled",
  "Interview Passed",
  "Interview Failed",
]);

const OFFER_STATUSES = new Set<SubmissionStatus>([
  "Offer Preparing",
  "Offer Sent",
  "Offer Accepted",
  "Offer Declined",
]);

export class RecruitmentService {
  constructor(
    private readonly deps: {
      clock: Clock;
      idGenerator: IdGenerator;
      jobRepository: JobRepository;
      submissionRepository: SubmissionRepository;
      candidateRepository: CandidateRepository;
      interviewRepository: InterviewRepository;
      offerRepository: OfferRepository;
      activityRepository: ActivityRepository;
      telemetry: TelemetryStore;
      workspaceId: string;
      knowledgeEvolution?: KnowledgeEvolutionService;
    },
  ) {}

  async onSubmissionCreated(submission: Submission, actorId: string): Promise<void> {
    await this.appendActivity({
      jobId: submission.jobId,
      submissionId: submission.id,
      candidateId: submission.candidateId,
      type: "candidate_submitted",
      message: "Candidate submitted",
      actorId,
    });
    this.deps.telemetry.record(
      createTelemetryEvent(
        {
          event_type: "submission_created",
          trace_id: this.deps.idGenerator.generateId("trace"),
          correlation_id: `corr_${submission.id}`,
          workspace_id: this.deps.workspaceId,
          actor_id: actorId,
          latency_ms: 0,
          candidate_id: submission.candidateId,
        },
        this.deps.clock,
      ),
    );
  }

  async onJobCreated(jobId: string, actorId: string): Promise<void> {
    await this.appendActivity({
      jobId,
      submissionId: null,
      candidateId: null,
      type: "job_created",
      message: "Job created",
      actorId,
    });
  }

  async getSubmissionDetail(submissionId: string) {
    const submission = await this.requireSubmission(submissionId);
    const job = await this.deps.jobRepository.findById(submission.jobId);
    const records = await this.deps.candidateRepository.findAll();
    const candidate = records.find((r) => r.candidateId === submission.candidateId);
    const interviews = await this.deps.interviewRepository.findBySubmissionId(submissionId);
    const offers = await this.deps.offerRepository.findBySubmissionId(submissionId);
    const activities = await this.deps.activityRepository.findBySubmissionId(submissionId);

    return {
      submission: {
        ...submission,
        candidateName: candidate?.candidate.profile.name ?? submission.candidateId,
      },
      job: job ? { id: job.id, title: job.title, company: job.company, status: job.status } : null,
      candidate: candidate
        ? {
            id: candidate.candidateId,
            name: candidate.candidate.profile.name,
            skills: candidate.knowledge.currentValue("skills"),
            english: candidate.knowledge.currentValue("english"),
          }
        : null,
      interviews,
      offers,
      activities,
    };
  }

  async searchSubmissions(params: {
    status?: string;
    recruiter?: string;
    jobId?: string;
    candidateId?: string;
    q?: string;
    from?: string;
    to?: string;
  }) {
    let items = await this.deps.submissionRepository.findAll();
    if (params.status) items = items.filter((s) => s.status === params.status);
    if (params.recruiter) items = items.filter((s) => s.submittedBy === params.recruiter);
    if (params.jobId) items = items.filter((s) => s.jobId === params.jobId);
    if (params.candidateId) items = items.filter((s) => s.candidateId === params.candidateId);
    if (params.from) items = items.filter((s) => s.submittedAt >= params.from!);
    if (params.to) items = items.filter((s) => s.submittedAt <= params.to!);

    const records = await this.deps.candidateRepository.findAll();
    const jobs = await this.deps.jobRepository.findAll();
    const nameById = new Map(records.map((r) => [r.candidateId, r.candidate.profile.name]));
    const jobById = new Map(jobs.map((j) => [j.id, j]));

    let mapped = items.map((s) => ({
      ...s,
      candidateName: nameById.get(s.candidateId) ?? s.candidateId,
      jobTitle: jobById.get(s.jobId)?.title ?? s.jobId,
      company: jobById.get(s.jobId)?.company ?? "",
    }));

    const q = params.q?.trim().toLowerCase();
    if (q) {
      mapped = mapped.filter(
        (s) =>
          s.candidateName.toLowerCase().includes(q) ||
          s.jobTitle.toLowerCase().includes(q) ||
          s.company.toLowerCase().includes(q) ||
          s.status.toLowerCase().includes(q),
      );
    }

    return { items: mapped, total: mapped.length };
  }

  async jobPipelineStats(jobId: string) {
    const submissions = await this.deps.submissionRepository.findByJobId(jobId);
    const counts = {
      submitted: 0,
      interviewing: 0,
      offers: 0,
      placements: 0,
      rejected: 0,
      withdrawn: 0,
      clientReviewing: 0,
      other: 0,
    };
    for (const s of submissions) {
      if (s.status === "Submitted") counts.submitted += 1;
      else if (s.status === "Client Reviewing") counts.clientReviewing += 1;
      else if (INTERVIEWING_STATUSES.has(s.status)) counts.interviewing += 1;
      else if (OFFER_STATUSES.has(s.status)) counts.offers += 1;
      else if (s.status === "Placed") counts.placements += 1;
      else if (s.status === "Rejected") counts.rejected += 1;
      else if (s.status === "Withdrawn") counts.withdrawn += 1;
      else counts.other += 1;
    }
    return { jobId, ...counts, total: submissions.length };
  }

  async updateStatus(params: {
    submissionId: string;
    status: SubmissionStatus;
    actorId: string;
    notes?: string;
  }) {
    if (!SUBMISSION_STATUSES.includes(params.status)) {
      throw new RecruitmentError("INVALID_STATUS", `Invalid status: ${params.status}`);
    }
    const submission = await this.requireSubmission(params.submissionId);
    if (submission.status === "Placed") {
      throw new RecruitmentError("ALREADY_PLACED", "Submission already placed");
    }
    const next: Submission = {
      ...submission,
      status: params.status,
      notes: params.notes !== undefined ? params.notes : submission.notes,
      updatedAt: this.deps.clock.nowIso(),
    };
    await this.deps.submissionRepository.save(next);
    await this.appendActivity({
      jobId: submission.jobId,
      submissionId: submission.id,
      candidateId: submission.candidateId,
      type: "status_changed",
      message: `Status → ${params.status}`,
      actorId: params.actorId,
    });
    return next;
  }

  async reject(submissionId: string, actorId: string, notes?: string) {
    const next = await this.updateStatus({
      submissionId,
      status: "Rejected",
      actorId,
      notes,
    });
    await this.appendActivity({
      jobId: next.jobId,
      submissionId: next.id,
      candidateId: next.candidateId,
      type: "rejected",
      message: "Candidate rejected",
      actorId,
    });
    return next;
  }

  async withdraw(submissionId: string, actorId: string, notes?: string) {
    const next = await this.updateStatus({
      submissionId,
      status: "Withdrawn",
      actorId,
      notes,
    });
    await this.appendActivity({
      jobId: next.jobId,
      submissionId: next.id,
      candidateId: next.candidateId,
      type: "withdrawn",
      message: "Candidate withdrawn",
      actorId,
    });
    return next;
  }

  async scheduleInterview(params: {
    submissionId: string;
    actorId: string;
    round?: number;
    type?: string;
    date: string;
    interviewer?: string;
    location?: string;
    meetingLink?: string;
  }): Promise<Interview> {
    const submission = await this.requireSubmission(params.submissionId);
    const existing = await this.deps.interviewRepository.findBySubmissionId(params.submissionId);
    const round = params.round ?? existing.length + 1;
    const interview: Interview = {
      id: this.deps.idGenerator.generateId("interview"),
      submissionId: submission.id,
      jobId: submission.jobId,
      candidateId: submission.candidateId,
      round,
      type: params.type?.trim() || "Interview",
      date: params.date,
      interviewer: params.interviewer?.trim() ?? "",
      location: params.location?.trim() ?? "",
      meetingLink: params.meetingLink?.trim() ?? "",
      feedback: "",
      decision: "Pending",
      status: "Scheduled",
      createdAt: this.deps.clock.nowIso(),
      createdBy: params.actorId,
    };
    await this.deps.interviewRepository.save(interview);
    await this.deps.submissionRepository.save({
      ...submission,
      status: "Interview Scheduled",
      updatedAt: this.deps.clock.nowIso(),
    });
    await this.appendActivity({
      jobId: submission.jobId,
      submissionId: submission.id,
      candidateId: submission.candidateId,
      type: "interview_scheduled",
      message: `Interview round ${round} scheduled`,
      actorId: params.actorId,
    });
    this.deps.telemetry.record(
      createTelemetryEvent(
        {
          event_type: "interview_created",
          trace_id: this.deps.idGenerator.generateId("trace"),
          workspace_id: this.deps.workspaceId,
          actor_id: params.actorId,
          latency_ms: 0,
          candidate_id: submission.candidateId,
        },
        this.deps.clock,
      ),
    );
    return interview;
  }

  async completeInterview(params: {
    interviewId: string;
    actorId: string;
    decision: InterviewDecision;
    feedback?: string;
  }): Promise<Interview> {
    const interview = await this.deps.interviewRepository.findById(params.interviewId);
    if (!interview) throw new RecruitmentError("NOT_FOUND", "Interview not found");
    if (params.decision === "Pending") {
      throw new RecruitmentError(
        "INVALID_DECISION",
        "Decision must be Passed, Failed, or Cancelled",
      );
    }

    const next: Interview = {
      ...interview,
      decision: params.decision,
      feedback: params.feedback ?? interview.feedback,
      status: params.decision === "Cancelled" ? "Cancelled" : "Completed",
    };
    await this.deps.interviewRepository.save(next);

    const submission = await this.requireSubmission(interview.submissionId);
    const status: SubmissionStatus =
      params.decision === "Passed"
        ? "Interview Passed"
        : params.decision === "Failed"
          ? "Interview Failed"
          : submission.status;

    if (params.decision === "Passed" || params.decision === "Failed") {
      await this.deps.submissionRepository.save({
        ...submission,
        status,
        updatedAt: this.deps.clock.nowIso(),
      });
    }

    await this.appendActivity({
      jobId: interview.jobId,
      submissionId: interview.submissionId,
      candidateId: interview.candidateId,
      type: "interview_completed",
      message: `Interview round ${interview.round}: ${params.decision}`,
      actorId: params.actorId,
    });
    this.deps.telemetry.record(
      createTelemetryEvent(
        {
          event_type: "interview_completed",
          trace_id: this.deps.idGenerator.generateId("trace"),
          correlation_id: `corr_${interview.submissionId}`,
          workspace_id: this.deps.workspaceId,
          actor_id: params.actorId,
          latency_ms: 0,
          candidate_id: interview.candidateId,
          review_action: params.decision,
        },
        this.deps.clock,
      ),
    );

    if (params.decision === "Passed" || params.decision === "Failed") {
      await this.recordKnowledgeSignal(
        interview.candidateId,
        params.actorId,
        params.decision === "Passed" ? "interview_passed" : "interview_failed",
        { interviewId: interview.id, round: interview.round },
      );
    }

    return next;
  }

  async createOffer(params: {
    submissionId: string;
    actorId: string;
    salary: string;
    startDate?: string;
    benefits?: string;
    notes?: string;
  }): Promise<Offer> {
    const submission = await this.requireSubmission(params.submissionId);
    const now = this.deps.clock.nowIso();
    const offer: Offer = {
      id: this.deps.idGenerator.generateId("offer"),
      submissionId: submission.id,
      jobId: submission.jobId,
      candidateId: submission.candidateId,
      salary: params.salary.trim(),
      startDate: params.startDate?.trim() ?? "",
      benefits: params.benefits?.trim() ?? "",
      notes: params.notes?.trim() ?? "",
      status: "Draft",
      createdAt: now,
      updatedAt: now,
      createdBy: params.actorId,
    };
    await this.deps.offerRepository.save(offer);
    await this.deps.submissionRepository.save({
      ...submission,
      status: "Offer Preparing",
      updatedAt: now,
    });
    await this.appendActivity({
      jobId: submission.jobId,
      submissionId: submission.id,
      candidateId: submission.candidateId,
      type: "offer_created",
      message: "Offer drafted",
      actorId: params.actorId,
    });
    return offer;
  }

  async updateOfferStatus(params: {
    offerId: string;
    status: OfferStatus;
    actorId: string;
  }): Promise<Offer> {
    const offer = await this.deps.offerRepository.findById(params.offerId);
    if (!offer) throw new RecruitmentError("NOT_FOUND", "Offer not found");

    const next: Offer = {
      ...offer,
      status: params.status,
      updatedAt: this.deps.clock.nowIso(),
    };
    await this.deps.offerRepository.save(next);

    const submission = await this.requireSubmission(offer.submissionId);
    let submissionStatus: SubmissionStatus = submission.status;
    let activityType: PipelineActivity["type"] = "offer_sent";
    let message = `Offer ${params.status}`;

    if (params.status === "Sent") {
      submissionStatus = "Offer Sent";
      activityType = "offer_sent";
      message = "Offer sent";
      this.deps.telemetry.record(
        createTelemetryEvent(
          {
            event_type: "offer_sent",
            trace_id: this.deps.idGenerator.generateId("trace"),
            correlation_id: `corr_${offer.submissionId}`,
            workspace_id: this.deps.workspaceId,
            actor_id: params.actorId,
            latency_ms: 0,
            candidate_id: offer.candidateId,
          },
          this.deps.clock,
        ),
      );
    } else if (params.status === "Accepted") {
      submissionStatus = "Offer Accepted";
      activityType = "offer_accepted";
      message = "Offer accepted";
      this.deps.telemetry.record(
        createTelemetryEvent(
          {
            event_type: "offer_accepted",
            trace_id: this.deps.idGenerator.generateId("trace"),
            correlation_id: `corr_${offer.submissionId}`,
            workspace_id: this.deps.workspaceId,
            actor_id: params.actorId,
            latency_ms: 0,
            candidate_id: offer.candidateId,
          },
          this.deps.clock,
        ),
      );
      await this.recordKnowledgeSignal(offer.candidateId, params.actorId, "offer_accepted", {
        offerId: offer.id,
      });
    } else if (params.status === "Declined") {
      submissionStatus = "Offer Declined";
      activityType = "offer_declined";
      message = "Offer declined";
      await this.recordKnowledgeSignal(offer.candidateId, params.actorId, "offer_declined", {
        offerId: offer.id,
      });
    }

    await this.deps.submissionRepository.save({
      ...submission,
      status: submissionStatus,
      updatedAt: this.deps.clock.nowIso(),
    });
    await this.appendActivity({
      jobId: offer.jobId,
      submissionId: offer.submissionId,
      candidateId: offer.candidateId,
      type: activityType,
      message,
      actorId: params.actorId,
    });
    return next;
  }

  async markPlaced(submissionId: string, actorId: string) {
    const submission = await this.requireSubmission(submissionId);
    if (submission.status === "Placed") {
      throw new RecruitmentError("ALREADY_PLACED", "Already placed");
    }
    const job = await this.deps.jobRepository.findById(submission.jobId);
    if (!job || job.deletedAt) {
      throw new RecruitmentError("JOB_NOT_FOUND", "Job not found");
    }

    const now = this.deps.clock.nowIso();
    const nextSubmission: Submission = {
      ...submission,
      status: "Placed",
      updatedAt: now,
    };
    await this.deps.submissionRepository.save(nextSubmission);
    await this.deps.jobRepository.save({
      ...job,
      placementCount: job.placementCount + 1,
      status: "Filled",
      updatedAt: now,
    });
    await this.appendActivity({
      jobId: submission.jobId,
      submissionId: submission.id,
      candidateId: submission.candidateId,
      type: "placement",
      message: "Candidate placed",
      actorId,
    });
    this.deps.telemetry.record(
      createTelemetryEvent(
        {
          event_type: "placement_created",
          trace_id: this.deps.idGenerator.generateId("trace"),
          correlation_id: `corr_${submission.id}`,
          workspace_id: this.deps.workspaceId,
          actor_id: actorId,
          latency_ms: 0,
          candidate_id: submission.candidateId,
        },
        this.deps.clock,
      ),
    );
    await this.recordKnowledgeSignal(submission.candidateId, actorId, "placement", {
      submissionId: submission.id,
      jobId: submission.jobId,
    });
    return nextSubmission;
  }

  private async recordKnowledgeSignal(
    candidateId: string,
    actorId: string,
    type: KnowledgeSignalType,
    metadata?: Record<string, unknown>,
  ) {
    if (!this.deps.knowledgeEvolution) return;
    await this.deps.knowledgeEvolution.recordCandidateSignal({
      candidateId,
      actorId,
      type,
      metadata,
    });
  }

  async jobTimeline(jobId: string) {
    return this.deps.activityRepository.findByJobId(jobId);
  }

  private async requireSubmission(id: string): Promise<Submission> {
    const submission = await this.deps.submissionRepository.findById(id);
    if (!submission) throw new RecruitmentError("NOT_FOUND", "Submission not found");
    return submission;
  }

  private async appendActivity(params: {
    jobId: string;
    submissionId: string | null;
    candidateId: string | null;
    type: PipelineActivity["type"];
    message: string;
    actorId: string;
  }) {
    await this.deps.activityRepository.append({
      id: this.deps.idGenerator.generateId("activity"),
      jobId: params.jobId,
      submissionId: params.submissionId,
      candidateId: params.candidateId,
      type: params.type,
      message: params.message,
      actorId: params.actorId,
      createdAt: this.deps.clock.nowIso(),
    });
  }
}
