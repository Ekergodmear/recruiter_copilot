import type { Clock } from "../../../shared/clock/index.js";
import type { IdGenerator } from "../../../shared/id-generator/index.js";
import {
  computeHumanOverrideRate,
  createTelemetryEvent,
  type TelemetryStore,
} from "../../../shared/telemetry/index.js";
import { CandidateId } from "../domain/candidate/candidate-id.js";
import type { CandidateRepository } from "../infrastructure/persistence/candidate-repository.js";
import {
  EDITABLE_FIELDS,
  KNOWLEDGE_REVIEW_ACTIONS,
  OVERRIDE_REASONS,
  type EditableFieldName,
  type KnowledgeReviewAction,
  type OverrideReason,
} from "../domain/knowledge/verified-knowledge.js";
import type { ResumePreviewService } from "../application/resume-preview-service.js";
import type { CandidateRecord } from "../domain/candidate/candidate-record.js";
import { toCandidateReviewView } from "../presentation/candidate-review-view.js";
import { filterCandidateList, toCandidateListItem } from "../presentation/candidate-list-view.js";
import type { KnowledgeEvolutionService } from "../../knowledge/application/knowledge-evolution-service.js";
import { computeReviewPriority } from "../domain/knowledge/review-priority.js";
import { CandidateIdentityService } from "./identity/candidate-identity-service.js";
import type { ReviewSessionMetricsService } from "../../operations/founder-readiness/review-session-metrics-service.js";
import { emitOperationFailed } from "../../operations/founder-readiness/operation-failed.js";

export class CandidateEditError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CandidateEditError";
  }
}

export type EditKnowledgeCommand = {
  candidateId: string;
  field: EditableFieldName;
  humanValue: string;
  reason?: OverrideReason | string | null;
  actorId: string;
  editDurationMs?: number;
};

export type KnowledgeReviewCommand = {
  candidateId: string;
  field: EditableFieldName;
  action: KnowledgeReviewAction;
  humanValue?: string;
  reason?: OverrideReason | string | null;
  actorId: string;
  editDurationMs?: number;
};

export type MarkReadyCommand = {
  candidateId: string;
  actorId: string;
  /** EPIC-002: which Review Workspace mode was used for this review, for TTQC-by-mode. */
  reviewMode?: "focus" | "flexible";
};

export class CandidateEditService {
  private readonly identityService = new CandidateIdentityService();

  constructor(
    private readonly deps: {
      clock: Clock;
      idGenerator: IdGenerator;
      candidateRepository: CandidateRepository;
      telemetry: TelemetryStore;
      resumePreviewService?: ResumePreviewService;
      knowledgeEvolution?: KnowledgeEvolutionService;
      reviewSessionMetrics?: ReviewSessionMetricsService;
    },
  ) {}

  async getReview(candidateId: string) {
    const record = await this.findRecord(candidateId);
    this.deps.reviewSessionMetrics?.startSession(candidateId, record.knowledge.importTraceId);
    const resume = await this.loadResumeMetadata(candidateId);
    const duplicates = await this.findDuplicatesFor(record);
    return toCandidateReviewView(record, resume, duplicates);
  }

  async listCandidates(params: { ready?: boolean; q?: string }) {
    const records = await this.deps.candidateRepository.findAll();
    const items = filterCandidateList(records.map(toCandidateListItem), params);
    return { items, total: items.length };
  }

  async reviewKnowledge(command: KnowledgeReviewCommand) {
    this.validateField(command.field);
    this.validateAction(command.action);
    this.validateReason(command.reason);

    if (command.action === "edit" && command.humanValue === undefined) {
      throw new CandidateEditError("INVALID_BODY", "humanValue is required for edit action");
    }

    const record = await this.findRecord(command.candidateId);
    const recordedAt = this.deps.clock.nowIso();
    const previousValue = record.knowledge.currentValue(command.field);
    // Priority as it stood *before* this review action — what the Review Queue showed the recruiter.
    const priorityAtReviewTime = computeReviewPriority(record.knowledge.fields[command.field]);

    const { knowledge, field, revision, changed } = record.knowledge.applyReview({
      field: command.field,
      action: command.action,
      actorId: command.actorId,
      recordedAt,
      humanValue: command.humanValue,
      reason: command.reason,
    });

    const updated = record.withKnowledge(knowledge);
    await this.deps.candidateRepository.save(updated);

    // Knowledge review must not roll back the candidate if evolution side-effects fail.
    if (this.deps.knowledgeEvolution) {
      try {
        await this.deps.knowledgeEvolution.recordReviewEvolution({
          candidateId: command.candidateId,
          field: command.field,
          action: command.action,
          actorId: command.actorId,
          oldValue: previousValue,
          newValue: revision.value,
          reason: command.reason,
        });
      } catch (err) {
        emitOperationFailed(this.deps, {
          operation: "knowledge_evolution",
          errorCode: (err as Error).name || "EVOLUTION_FAILED",
          traceId: knowledge.importTraceId,
          correlationId: knowledge.importTraceId,
          candidateId: command.candidateId,
          workspaceId: record.candidate.workspaceId,
          actorId: command.actorId,
        });
      }
    }

    this.deps.reviewSessionMetrics?.recordKnowledgeAction(command.candidateId, command.action);

    const traceId = this.deps.idGenerator.generateId("trace");
    this.recordKnowledgeReviewed({
      traceId,
      record: updated,
      field,
      revision,
      command,
      changed,
      reviewPriority: priorityAtReviewTime,
    });

    if (command.action === "edit") {
      this.deps.telemetry.record(
        createTelemetryEvent(
          {
            event_type: "knowledge_edited",
            trace_id: traceId,
            correlation_id: knowledge.importTraceId,
            workspace_id: record.candidate.workspaceId,
            actor_id: command.actorId,
            candidate_id: record.candidateId,
            field_name: command.field,
            ai_value: field.originalAiValue,
            human_value: revision.value,
            override_reason: command.reason ?? undefined,
            review_priority: priorityAtReviewTime,
            edit_duration_ms: command.editDurationMs ?? 0,
            latency_ms: command.editDurationMs ?? 0,
            fields_extracted: knowledge.totalEditableFields(),
            fields_overridden: knowledge.editedFieldCount(),
            human_override_rate: computeHumanOverrideRate(
              knowledge.totalEditableFields(),
              knowledge.editedFieldCount(),
            ),
            ai_acceptance_rate: knowledge.acceptanceRate(),
            verification_rate: knowledge.verificationRate(),
            review_completion_rate: knowledge.reviewCompletionRate(),
            fields_verified: knowledge.verifiedFieldCount(),
            fields_reviewed: knowledge.reviewedFieldCount(),
            outcome: changed ? "edited" : "accepted",
          },
          this.deps.clock,
        ),
      );
    }

    return toCandidateReviewView(
      updated,
      await this.loadResumeMetadata(command.candidateId),
      await this.findDuplicatesFor(updated),
    );
  }

  async editKnowledge(command: EditKnowledgeCommand) {
    return this.reviewKnowledge({
      candidateId: command.candidateId,
      field: command.field,
      action: "edit",
      humanValue: command.humanValue,
      reason: command.reason,
      actorId: command.actorId,
      editDurationMs: command.editDurationMs,
    });
  }

  async verifyKnowledge(command: {
    candidateId: string;
    field: EditableFieldName;
    actorId: string;
  }) {
    return this.reviewKnowledge({
      candidateId: command.candidateId,
      field: command.field,
      action: "verify",
      actorId: command.actorId,
    });
  }

  private recordKnowledgeReviewed(params: {
    traceId: string;
    record: CandidateRecord;
    field: { originalAiValue: string; currentValue: string };
    revision: { value: string };
    command: KnowledgeReviewCommand;
    changed: boolean;
    reviewPriority: ReturnType<typeof computeReviewPriority>;
  }) {
    const knowledge = params.record.knowledge;
    this.deps.telemetry.record(
      createTelemetryEvent(
        {
          event_type: "knowledge_reviewed",
          trace_id: params.traceId,
          correlation_id: knowledge.importTraceId,
          workspace_id: params.record.candidate.workspaceId,
          actor_id: params.command.actorId,
          candidate_id: params.record.candidateId,
          field_name: params.command.field,
          review_action: params.command.action,
          ai_value: params.field.originalAiValue,
          human_value: params.revision.value,
          override_reason: params.command.reason ?? undefined,
          review_priority: params.reviewPriority,
          edit_duration_ms: params.command.editDurationMs ?? 0,
          latency_ms: params.command.editDurationMs ?? 0,
          fields_extracted: knowledge.totalEditableFields(),
          fields_overridden: knowledge.editedFieldCount(),
          fields_reviewed: knowledge.reviewedFieldCount(),
          fields_verified: knowledge.verifiedFieldCount(),
          human_override_rate: computeHumanOverrideRate(
            knowledge.totalEditableFields(),
            knowledge.editedFieldCount(),
          ),
          ai_acceptance_rate: knowledge.acceptanceRate(),
          verification_rate: knowledge.verificationRate(),
          review_completion_rate: knowledge.reviewCompletionRate(),
          outcome:
            params.command.action === "reject"
              ? "rejected"
              : params.changed
                ? "edited"
                : "accepted",
        },
        this.deps.clock,
      ),
    );
  }

  async markCandidateReady(command: MarkReadyCommand) {
    const record = await this.findRecord(command.candidateId);
    if (record.knowledge.isReady) {
      throw new CandidateEditError("ALREADY_READY", "Candidate is already marked ready");
    }

    const readyAt = this.deps.clock.nowIso();
    const before = record.knowledge;
    const knowledge = record.knowledge.markReady(readyAt, command.actorId);
    const updated = record.withKnowledge(knowledge);
    await this.deps.candidateRepository.save(updated);

    if (this.deps.knowledgeEvolution) {
      for (const field of EDITABLE_FIELDS) {
        if (before.fields[field].status !== "HUMAN_VERIFIED") {
          try {
            await this.deps.knowledgeEvolution.recordReviewEvolution({
              candidateId: command.candidateId,
              field,
              action: "verify",
              actorId: command.actorId,
              oldValue: before.currentValue(field),
              newValue: knowledge.currentValue(field),
              reason: null,
            });
          } catch (err) {
            emitOperationFailed(this.deps, {
              operation: "knowledge_evolution",
              errorCode: (err as Error).name || "EVOLUTION_FAILED",
              traceId: record.knowledge.importTraceId,
              correlationId: record.knowledge.importTraceId,
              candidateId: command.candidateId,
              workspaceId: record.candidate.workspaceId,
              actorId: command.actorId,
            });
          }
        }
      }
    }

    this.deps.reviewSessionMetrics?.completeReady(command.candidateId);

    const uploadedAt = new Date(record.knowledge.uploadedAt).getTime();
    const ttqcMs = this.deps.clock.now().getTime() - uploadedAt;

    this.deps.telemetry.record(
      createTelemetryEvent(
        {
          event_type: "candidate_qualified",
          trace_id: record.knowledge.importTraceId,
          correlation_id: record.knowledge.importTraceId,
          workspace_id: record.candidate.workspaceId,
          actor_id: command.actorId,
          candidate_id: record.candidateId,
          latency_ms: ttqcMs,
          ttqc_ms: ttqcMs,
          review_mode: command.reviewMode,
          fields_extracted: knowledge.totalEditableFields(),
          fields_overridden: knowledge.editedFieldCount(),
          human_override_rate: computeHumanOverrideRate(
            knowledge.totalEditableFields(),
            knowledge.editedFieldCount(),
          ),
          ai_acceptance_rate: knowledge.acceptanceRate(),
          verification_rate: knowledge.verificationRate(),
          review_completion_rate: knowledge.reviewCompletionRate(),
          fields_verified: knowledge.verifiedFieldCount(),
          fields_reviewed: knowledge.reviewedFieldCount(),
          outcome: "accepted",
        },
        this.deps.clock,
      ),
    );

    return toCandidateReviewView(
      updated,
      await this.loadResumeMetadata(command.candidateId),
      await this.findDuplicatesFor(updated),
    );
  }

  private async findDuplicatesFor(record: CandidateRecord) {
    const all = await this.deps.candidateRepository.findAll();
    return this.identityService.findDuplicates(
      {
        candidateId: record.candidateId,
        name: record.candidate.profile.name,
        email: record.identity?.email ?? null,
        phone: record.identity?.phone ?? null,
        fingerprint: record.identity?.fingerprint ?? null,
      },
      all.map((r) => ({
        candidateId: r.candidateId,
        name: r.candidate.profile.name,
        email: r.identity?.email ?? null,
        phone: r.identity?.phone ?? null,
        fingerprint: r.identity?.fingerprint ?? null,
      })),
    );
  }

  private async loadResumeMetadata(candidateId: string) {
    if (!this.deps.resumePreviewService) {
      return null;
    }
    try {
      return await this.deps.resumePreviewService.getPreviewMetadata(candidateId);
    } catch {
      return null;
    }
  }

  private async findRecord(candidateId: string) {
    const id = CandidateId.create(candidateId);
    const record = await this.deps.candidateRepository.findById(id);
    if (!record) {
      throw new CandidateEditError("NOT_FOUND", `Candidate not found: ${candidateId}`);
    }
    return record;
  }

  private validateField(field: EditableFieldName): void {
    if (!EDITABLE_FIELDS.includes(field)) {
      throw new CandidateEditError("FIELD_NOT_EDITABLE", `Field not editable: ${field}`);
    }
  }

  private validateAction(action: KnowledgeReviewAction): void {
    if (!KNOWLEDGE_REVIEW_ACTIONS.includes(action)) {
      throw new CandidateEditError("INVALID_ACTION", `Invalid review action: ${action}`);
    }
  }

  private validateReason(reason?: string | null): void {
    if (!reason) return;
    if (!OVERRIDE_REASONS.includes(reason as OverrideReason)) {
      throw new CandidateEditError("INVALID_REASON", `Invalid override reason: ${reason}`);
    }
  }
}
