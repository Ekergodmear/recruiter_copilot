import type { Clock } from "../../../shared/clock/index.js";
import type { IdGenerator } from "../../../shared/id-generator/index.js";
import { CandidateId } from "../../candidate/domain/candidate/candidate-id.js";
import type { CandidateRepository } from "../../candidate/infrastructure/persistence/candidate-repository.js";
import type { JobRepository } from "../../job/infrastructure/job-repository.js";
import {
  WORKFLOW_STAGES,
  isWorkflowStage,
  type CandidateJobRelationship,
  type StageHistoryEntry,
  type WorkflowStage,
} from "../domain/types.js";
import type { RelationshipRepository } from "../infrastructure/relationship-repository.js";
import type { NotificationService } from "../../notification/application/notification-service.js";
import type { AuditService } from "../../audit/application/audit-service.js";

export class RelationshipServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RelationshipServiceError";
  }
}

function assertStage(stage: string): WorkflowStage {
  if (!isWorkflowStage(stage)) {
    throw new RelationshipServiceError("INVALID_STAGE", `Invalid stage: ${stage}`);
  }
  return stage;
}

export class RelationshipService {
  constructor(
    private readonly deps: {
      clock: Clock;
      idGenerator: IdGenerator;
      relationshipRepository: RelationshipRepository;
      candidateRepository: CandidateRepository;
      jobRepository: JobRepository;
      /** EPIC-010 — optional fan-out; Notifications never execute domain rules. */
      notificationService?: NotificationService;
      /** EPIC-012 — optional audit; suppress when Automation will record once. */
      auditService?: AuditService;
    },
  ) {}

  /**
   * Create relationship with Workflow init:
   * Current Stage = Sourced (or optional initial stage for EPIC-003 compat) + first history entry.
   */
  async create(params: {
    candidateId: string;
    jobId: string;
    /** EPIC-003 compat — optional initial stage; default Sourced. */
    status?: string;
    actorId: string;
  }): Promise<CandidateJobRelationship> {
    const initialStage = assertStage(params.status ?? "Sourced");

    const candidate = await this.deps.candidateRepository.findById(
      CandidateId.create(params.candidateId),
    );
    if (!candidate) {
      throw new RelationshipServiceError("CANDIDATE_NOT_FOUND", "Candidate not found");
    }

    const job = await this.deps.jobRepository.findById(params.jobId);
    if (!job || job.deletedAt) {
      throw new RelationshipServiceError("JOB_NOT_FOUND", "Job not found");
    }

    const existing = await this.deps.relationshipRepository.findByCandidateAndJob(
      params.candidateId,
      params.jobId,
    );
    if (existing) {
      throw new RelationshipServiceError(
        "DUPLICATE_RELATIONSHIP",
        "A relationship already exists for this candidate and job",
      );
    }

    const now = this.deps.clock.nowIso();
    const initHistory: StageHistoryEntry = {
      previousStage: null,
      newStage: initialStage,
      changedAt: now,
    };
    const relationship: CandidateJobRelationship = {
      id: this.deps.idGenerator.generateId("rel"),
      candidateId: params.candidateId,
      jobId: params.jobId,
      status: initialStage,
      currentStage: initialStage,
      stageHistory: [initHistory],
      createdAt: now,
      updatedAt: now,
      createdBy: params.actorId,
      assigneeId: null,
    };
    await this.deps.relationshipRepository.save(relationship);
    return relationship;
  }

  /** EPIC-008 — assign recruiter; same assignee is a no-op success. */
  async assign(params: {
    id: string;
    assigneeId: string;
    actorId?: string;
    /** When true, caller (e.g. Automation) records the single Audit entry. */
    suppressAudit?: boolean;
  }): Promise<{ relationship: CandidateJobRelationship; changed: boolean }> {
    const current = await this.deps.relationshipRepository.findById(params.id);
    if (!current) {
      throw new RelationshipServiceError("NOT_FOUND", "Relationship not found");
    }
    const assigneeId = params.assigneeId.trim();
    if (!assigneeId) {
      throw new RelationshipServiceError("INVALID_ASSIGNEE", "assigneeId is required");
    }
    if (current.assigneeId === assigneeId) {
      return { relationship: current, changed: false };
    }
    const now = this.deps.clock.nowIso();
    const next: CandidateJobRelationship = {
      ...current,
      assigneeId,
      updatedAt: now,
    };
    await this.deps.relationshipRepository.save(next);
    await this.deps.notificationService?.onAssignment({
      assigneeId,
      relationshipId: next.id,
      candidateId: next.candidateId,
      jobId: next.jobId,
      actorId: params.actorId,
    });
    if (!params.suppressAudit && params.actorId) {
      await this.deps.auditService?.record({
        actorId: params.actorId,
        action: "relationship.assign",
        source: "relationship",
        outcome: "success",
        target: {
          relationshipId: next.id,
          candidateId: next.candidateId,
          jobId: next.jobId,
          assigneeId,
        },
        summary: `Assigned relationship ${next.id} to ${assigneeId}`,
      });
    }
    return { relationship: next, changed: true };
  }

  /** EPIC-003 compat — updates current stage (any valid workflow stage) + appends history. */
  async updateStatus(params: { id: string; status: string }): Promise<CandidateJobRelationship> {
    return this.moveStage({ id: params.id, stage: params.status });
  }

  /** EPIC-004 — move Current Stage; append-only history; no transition matrix. */
  async moveStage(params: {
    id: string;
    stage: string;
    actorId?: string;
    /** When true, caller (e.g. Automation) records the single Audit entry. */
    suppressAudit?: boolean;
  }): Promise<CandidateJobRelationship> {
    const nextStage = assertStage(params.stage);
    const current = await this.deps.relationshipRepository.findById(params.id);
    if (!current) {
      throw new RelationshipServiceError("NOT_FOUND", "Relationship not found");
    }
    if (current.currentStage === nextStage) {
      return current;
    }

    const now = this.deps.clock.nowIso();
    const previousStage = current.currentStage;
    const entry: StageHistoryEntry = {
      previousStage,
      newStage: nextStage,
      changedAt: now,
    };
    const next: CandidateJobRelationship = {
      ...current,
      status: nextStage,
      currentStage: nextStage,
      stageHistory: [...current.stageHistory, entry],
      updatedAt: now,
    };
    await this.deps.relationshipRepository.save(next);
    await this.deps.notificationService?.onStageChanged({
      relationshipId: next.id,
      candidateId: next.candidateId,
      jobId: next.jobId,
      previousStage,
      newStage: nextStage,
      assigneeId: next.assigneeId,
      actorId: params.actorId,
    });
    if (!params.suppressAudit && params.actorId) {
      await this.deps.auditService?.record({
        actorId: params.actorId,
        action: "workflow.stage_changed",
        source: "workflow",
        outcome: "success",
        target: {
          relationshipId: next.id,
          candidateId: next.candidateId,
          jobId: next.jobId,
          stage: nextStage,
        },
        summary: `Stage ${previousStage} → ${nextStage}`,
      });
    }
    return next;
  }

  async getById(id: string): Promise<CandidateJobRelationship> {
    const current = await this.deps.relationshipRepository.findById(id);
    if (!current) {
      throw new RelationshipServiceError("NOT_FOUND", "Relationship not found");
    }
    return current;
  }

  async listByCandidate(candidateId: string) {
    const candidate = await this.deps.candidateRepository.findById(CandidateId.create(candidateId));
    if (!candidate) {
      throw new RelationshipServiceError("CANDIDATE_NOT_FOUND", "Candidate not found");
    }

    const items = await this.deps.relationshipRepository.findByCandidateId(candidateId);
    const enriched = await Promise.all(
      items.map(async (r) => {
        const job = await this.deps.jobRepository.findById(r.jobId);
        return {
          ...r,
          jobTitle: job?.title ?? r.jobId,
          jobCompany: job?.company ?? "",
          jobStatus: job?.status ?? null,
        };
      }),
    );
    return { items: enriched, total: enriched.length };
  }

  async listByJob(jobId: string, options?: { stage?: string; groupByStage?: boolean }) {
    const job = await this.deps.jobRepository.findById(jobId);
    if (!job || job.deletedAt) {
      throw new RelationshipServiceError("JOB_NOT_FOUND", "Job not found");
    }

    if (options?.stage !== undefined) {
      assertStage(options.stage);
    }

    let items = await this.deps.relationshipRepository.findByJobId(jobId);
    if (options?.stage) {
      items = items.filter((r) => r.currentStage === options.stage);
    }

    const enriched = await Promise.all(
      items.map(async (r) => {
        const record = await this.deps.candidateRepository.findById(
          CandidateId.create(r.candidateId),
        );
        return {
          ...r,
          candidateName: record?.candidate.profile.name ?? r.candidateId,
        };
      }),
    );

    if (options?.groupByStage) {
      const groups: Record<string, typeof enriched> = {};
      for (const stage of WORKFLOW_STAGES) {
        groups[stage] = [];
      }
      for (const item of enriched) {
        const bucket = groups[item.currentStage] ?? (groups[item.currentStage] = []);
        bucket.push(item);
      }
      return { groups, total: enriched.length, stages: WORKFLOW_STAGES };
    }

    return { items: enriched, total: enriched.length };
  }
}
