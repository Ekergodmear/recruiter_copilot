import type { Clock } from "../../../shared/clock/index.js";
import type { IdGenerator } from "../../../shared/id-generator/index.js";
import { createTelemetryEvent, type TelemetryStore } from "../../../shared/telemetry/index.js";
import type { VerifiedKnowledge } from "../../candidate/domain/knowledge/verified-knowledge.js";
import {
  EDITABLE_FIELDS,
  type EditableFieldName,
  type KnowledgeReviewAction,
} from "../../candidate/domain/knowledge/verified-knowledge.js";
import type { ProvenanceSource } from "../../candidate/domain/knowledge/knowledge-provenance.js";
import { CandidateKnowledgeSet } from "../domain/candidate-knowledge-set.js";
import { KnowledgeObject } from "../domain/knowledge-object.js";
import {
  CONFIDENCE_LADDER,
  type KnowledgeEvidence,
  type KnowledgeSignal,
  type KnowledgeSignalType,
} from "../domain/types.js";
import type { KnowledgeRepository } from "../infrastructure/knowledge-repository.js";

export class KnowledgeEvolutionError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "KnowledgeEvolutionError";
  }
}

const ACTION_TO_SIGNAL: Record<KnowledgeReviewAction, KnowledgeSignalType> = {
  accept: "accept",
  reject: "reject",
  edit: "correct",
  verify: "verify",
};

export class KnowledgeEvolutionService {
  constructor(
    private readonly deps: {
      clock: Clock;
      idGenerator: IdGenerator;
      knowledgeRepository: KnowledgeRepository;
      telemetry: TelemetryStore;
    },
  ) {}

  async seedFromVerifiedKnowledge(params: {
    candidateId: string;
    workspaceId: string;
    knowledge: VerifiedKnowledge;
  }): Promise<CandidateKnowledgeSet> {
    const createdAt = this.deps.clock.nowIso();
    const objects = EDITABLE_FIELDS.map((field) => {
      const fieldKnowledge = params.knowledge.fields[field];
      const initialConfidence = fieldKnowledge.provenance.confidence ?? CONFIDENCE_LADDER.resume;
      return KnowledgeObject.createFromImport({
        id: this.deps.idGenerator.generateId("know"),
        candidateId: params.candidateId,
        workspaceId: params.workspaceId,
        field,
        originalValue: fieldKnowledge.originalAiValue,
        currentValue: fieldKnowledge.currentValue,
        initialConfidence,
        initialSource: fieldKnowledge.provenance.source,
        createdAt,
        evidenceId: this.deps.idGenerator.generateId("evid"),
      });
    });

    const set = CandidateKnowledgeSet.create({
      candidateId: params.candidateId,
      workspaceId: params.workspaceId,
      objects,
    });
    await this.deps.knowledgeRepository.save(set);
    return set;
  }

  async getCandidateKnowledge(candidateId: string) {
    const set = await this.requireSet(candidateId);
    return {
      candidateId: set.candidateId,
      workspaceId: set.workspaceId,
      objects: set.objects.map((o) => o.toSnapshot()),
      signals: [...set.candidateSignals],
      timeline: set.buildTimeline(),
    };
  }

  async getHistory(candidateId: string) {
    const set = await this.requireSet(candidateId);
    return {
      candidateId: set.candidateId,
      timeline: set.buildTimeline(),
      confidenceByField: Object.fromEntries(
        set.objects.map((o) => [o.field, [...o.confidenceHistory]]),
      ),
    };
  }

  async patchKnowledge(params: {
    knowledgeId: string;
    actorId: string;
    newValue: string;
    reason?: string | null;
  }) {
    const found = await this.deps.knowledgeRepository.findObjectById(params.knowledgeId);
    if (!found) {
      throw new KnowledgeEvolutionError("NOT_FOUND", `Knowledge not found: ${params.knowledgeId}`);
    }

    const current = found.set.findById(params.knowledgeId)!;
    const updated = current.applyRevision({
      revisionId: this.deps.idGenerator.generateId("krev"),
      actor: params.actorId,
      timestamp: this.deps.clock.nowIso(),
      newValue: params.newValue,
      reason: params.reason ?? null,
      source: "Recruiter Review",
      confidence: CONFIDENCE_LADDER.recruiter,
      signalId: this.deps.idGenerator.generateId("ksig"),
      signalType: "correct",
    });

    const nextSet = found.set.replace(updated);
    await this.deps.knowledgeRepository.save(nextSet);
    this.emitRevisionTelemetry(updated, params.actorId, current.confidence);
    this.emitSignalTelemetry(updated.candidateId, params.actorId, "correct", updated.field);
    return updated.toSnapshot();
  }

  async addEvidence(params: {
    knowledgeId: string;
    actorId: string;
    source: ProvenanceSource;
    confidence: number;
    note?: string | null;
  }) {
    const found = await this.deps.knowledgeRepository.findObjectById(params.knowledgeId);
    if (!found) {
      throw new KnowledgeEvolutionError("NOT_FOUND", `Knowledge not found: ${params.knowledgeId}`);
    }

    const current = found.set.findById(params.knowledgeId)!;
    const evidence: KnowledgeEvidence = {
      id: this.deps.idGenerator.generateId("evid"),
      source: params.source,
      confidence: Math.max(0, Math.min(1, params.confidence)),
      createdAt: this.deps.clock.nowIso(),
      note: params.note ?? null,
    };

    const updated = current.addEvidence({ evidence, raiseConfidence: true });
    const nextSet = found.set.replace(updated);
    await this.deps.knowledgeRepository.save(nextSet);

    this.deps.telemetry.record(
      createTelemetryEvent(
        {
          event_type: "knowledge_evidence_added",
          trace_id: this.deps.idGenerator.generateId("trace"),
          workspace_id: updated.workspaceId,
          actor_id: params.actorId,
          candidate_id: updated.candidateId,
          field_name: updated.field,
          latency_ms: 0,
          confidence_avg: updated.confidence,
        },
        this.deps.clock,
      ),
    );

    if (updated.confidence !== current.confidence) {
      this.emitConfidenceChanged(updated, params.actorId, current.confidence);
    }

    return updated.toSnapshot();
  }

  /** Sync evolution from existing review workflow without changing ATS UX. */
  async recordReviewEvolution(params: {
    candidateId: string;
    field: EditableFieldName;
    action: KnowledgeReviewAction;
    actorId: string;
    oldValue: string;
    newValue: string;
    reason?: string | null;
  }): Promise<void> {
    const set = await this.deps.knowledgeRepository.findByCandidateId(params.candidateId);
    if (!set) return;

    const current = set.findByField(params.field);
    if (!current) return;

    const signalType = ACTION_TO_SIGNAL[params.action];
    const timestamp = this.deps.clock.nowIso();
    const previousConfidence = current.confidence;

    const updated = current.applyRevision({
      revisionId: this.deps.idGenerator.generateId("krev"),
      actor: params.actorId,
      timestamp,
      newValue: params.newValue,
      reason: params.reason ?? null,
      source: "Recruiter Review",
      confidence: CONFIDENCE_LADDER.recruiter,
      signalId: this.deps.idGenerator.generateId("ksig"),
      signalType,
    });

    await this.deps.knowledgeRepository.save(set.replace(updated));
    this.emitRevisionTelemetry(updated, params.actorId, previousConfidence);
    this.emitSignalTelemetry(params.candidateId, params.actorId, signalType, params.field);

    if (params.action === "verify" || params.action === "accept") {
      this.deps.telemetry.record(
        createTelemetryEvent(
          {
            event_type: "knowledge_verified",
            trace_id: this.deps.idGenerator.generateId("trace"),
            workspace_id: updated.workspaceId,
            actor_id: params.actorId,
            candidate_id: params.candidateId,
            field_name: params.field,
            latency_ms: 0,
            confidence_avg: updated.confidence,
          },
          this.deps.clock,
        ),
      );
    }
  }

  async recordCandidateSignal(params: {
    candidateId: string;
    actorId: string;
    type: KnowledgeSignalType;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const set = await this.deps.knowledgeRepository.findByCandidateId(params.candidateId);
    if (!set) return;

    const timestamp = this.deps.clock.nowIso();
    const signal: KnowledgeSignal = {
      id: this.deps.idGenerator.generateId("ksig"),
      type: params.type,
      actor: params.actorId,
      timestamp,
      field: null,
      metadata: params.metadata,
    };

    const bump =
      params.type === "interview_passed" || params.type === "interview_failed"
        ? CONFIDENCE_LADDER.interview
        : params.type === "offer_accepted" ||
            params.type === "offer_declined" ||
            params.type === "placement"
          ? CONFIDENCE_LADDER.client
          : undefined;

    const objects = set.objects.map((obj) => {
      const previous = obj.confidence;
      const next = obj.recordSignal(
        { ...signal, id: this.deps.idGenerator.generateId("ksig"), field: obj.field },
        bump,
      );
      if (bump !== undefined && next.confidence !== previous) {
        this.emitConfidenceChanged(next, params.actorId, previous);
      }
      return next;
    });

    const nextSet = set.withObjects(objects).withCandidateSignal(signal);
    await this.deps.knowledgeRepository.save(nextSet);
    this.emitSignalTelemetry(params.candidateId, params.actorId, params.type, null);
  }

  private async requireSet(candidateId: string): Promise<CandidateKnowledgeSet> {
    const set = await this.deps.knowledgeRepository.findByCandidateId(candidateId);
    if (!set) {
      throw new KnowledgeEvolutionError(
        "NOT_FOUND",
        `Knowledge not found for candidate: ${candidateId}`,
      );
    }
    return set;
  }

  private emitRevisionTelemetry(
    object: KnowledgeObject,
    actorId: string,
    previousConfidence: number,
  ) {
    this.deps.telemetry.record(
      createTelemetryEvent(
        {
          event_type: "knowledge_revision_created",
          trace_id: this.deps.idGenerator.generateId("trace"),
          workspace_id: object.workspaceId,
          actor_id: actorId,
          candidate_id: object.candidateId,
          field_name: object.field,
          latency_ms: 0,
          confidence_avg: object.confidence,
          human_value: object.currentValue,
          ai_value: object.originalValue,
        },
        this.deps.clock,
      ),
    );

    if (object.confidence !== previousConfidence) {
      this.emitConfidenceChanged(object, actorId, previousConfidence);
    }
  }

  private emitConfidenceChanged(
    object: KnowledgeObject,
    actorId: string,
    previousConfidence: number,
  ) {
    this.deps.telemetry.record(
      createTelemetryEvent(
        {
          event_type: "knowledge_confidence_changed",
          trace_id: this.deps.idGenerator.generateId("trace"),
          workspace_id: object.workspaceId,
          actor_id: actorId,
          candidate_id: object.candidateId,
          field_name: object.field,
          latency_ms: 0,
          confidence_avg: object.confidence,
          edit_delta_percent: Math.round(Math.abs(object.confidence - previousConfidence) * 100),
        },
        this.deps.clock,
      ),
    );
  }

  private emitSignalTelemetry(
    candidateId: string,
    actorId: string,
    type: KnowledgeSignalType,
    field: EditableFieldName | null,
  ) {
    this.deps.telemetry.record(
      createTelemetryEvent(
        {
          event_type: "knowledge_signal_recorded",
          trace_id: this.deps.idGenerator.generateId("trace"),
          actor_id: actorId,
          candidate_id: candidateId,
          field_name: field ?? undefined,
          review_action: type,
          latency_ms: 0,
        },
        this.deps.clock,
      ),
    );
  }
}
