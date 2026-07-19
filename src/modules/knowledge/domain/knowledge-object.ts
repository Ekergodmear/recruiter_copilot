import type {
  EditableFieldName,
  KnowledgeStatusValue,
} from "../../candidate/domain/knowledge/verified-knowledge.js";
import type { ProvenanceSource } from "../../candidate/domain/knowledge/knowledge-provenance.js";
import {
  CONFIDENCE_LADDER,
  type ConfidencePoint,
  type KnowledgeAnalytics,
  type KnowledgeEvidence,
  type KnowledgeObjectSnapshot,
  type KnowledgeRevision,
  type KnowledgeSignal,
  type KnowledgeSignalType,
} from "./types.js";

export type CreateKnowledgeObjectParams = {
  id: string;
  candidateId: string;
  workspaceId: string;
  field: EditableFieldName;
  originalValue: string;
  currentValue?: string;
  initialConfidence: number;
  initialSource: ProvenanceSource;
  createdAt: string;
  evidenceId: string;
};

export class KnowledgeObject {
  private constructor(
    readonly id: string,
    readonly candidateId: string,
    readonly workspaceId: string,
    readonly field: EditableFieldName,
    readonly originalValue: string,
    readonly currentValue: string,
    readonly revisions: readonly KnowledgeRevision[],
    readonly revisionNumber: number,
    readonly evidence: readonly KnowledgeEvidence[],
    readonly confidence: number,
    readonly confidenceHistory: readonly ConfidencePoint[],
    readonly signals: readonly KnowledgeSignal[],
    readonly status: KnowledgeStatusValue,
    readonly lastUpdated: string,
    readonly verifiedCount: number,
  ) {}

  static createFromImport(params: CreateKnowledgeObjectParams): KnowledgeObject {
    const confidence = clampConfidence(params.initialConfidence);
    const evidence: KnowledgeEvidence = {
      id: params.evidenceId,
      source: params.initialSource,
      confidence,
      createdAt: params.createdAt,
      note: "Initial extraction",
    };
    const confidencePoint: ConfidencePoint = {
      confidence,
      source: params.initialSource,
      recordedAt: params.createdAt,
      reason: "Import from resume",
    };

    return new KnowledgeObject(
      params.id,
      params.candidateId,
      params.workspaceId,
      params.field,
      params.originalValue,
      params.currentValue ?? params.originalValue,
      [],
      0,
      [evidence],
      confidence,
      [confidencePoint],
      [],
      "CLAIMED",
      params.createdAt,
      0,
    );
  }

  applyRevision(params: {
    revisionId: string;
    actor: string;
    timestamp: string;
    newValue: string;
    reason: string | null;
    source: ProvenanceSource | string;
    confidence?: number;
    signalId?: string;
    signalType?: KnowledgeSignalType;
  }): KnowledgeObject {
    const revision: KnowledgeRevision = {
      id: params.revisionId,
      actor: params.actor,
      timestamp: params.timestamp,
      oldValue: this.currentValue,
      newValue: params.newValue,
      reason: params.reason,
      source: params.source,
    };

    const nextConfidence = clampConfidence(params.confidence ?? confidenceForSource(params.source));
    const confidencePoint: ConfidencePoint = {
      confidence: nextConfidence,
      source: String(params.source),
      recordedAt: params.timestamp,
      reason: params.reason,
    };

    const signals =
      params.signalId && params.signalType
        ? [
            ...this.signals,
            {
              id: params.signalId,
              type: params.signalType,
              actor: params.actor,
              timestamp: params.timestamp,
              field: this.field,
            } satisfies KnowledgeSignal,
          ]
        : this.signals;

    const verifiedBump =
      params.signalType === "verify" ||
      params.signalType === "accept" ||
      params.source === "Recruiter Review"
        ? 1
        : 0;

    return new KnowledgeObject(
      this.id,
      this.candidateId,
      this.workspaceId,
      this.field,
      this.originalValue,
      params.newValue,
      [...this.revisions, revision],
      this.revisionNumber + 1,
      this.evidence,
      nextConfidence,
      [...this.confidenceHistory, confidencePoint],
      signals,
      "HUMAN_VERIFIED",
      params.timestamp,
      this.verifiedCount + verifiedBump,
    );
  }

  addEvidence(params: { evidence: KnowledgeEvidence; raiseConfidence?: boolean }): KnowledgeObject {
    const nextConfidence = params.raiseConfidence
      ? clampConfidence(Math.max(this.confidence, confidenceForSource(params.evidence.source)))
      : this.confidence;

    const confidenceHistory =
      nextConfidence !== this.confidence
        ? [
            ...this.confidenceHistory,
            {
              confidence: nextConfidence,
              source: params.evidence.source,
              recordedAt: params.evidence.createdAt,
              reason: params.evidence.note ?? "Evidence added",
            } satisfies ConfidencePoint,
          ]
        : this.confidenceHistory;

    return new KnowledgeObject(
      this.id,
      this.candidateId,
      this.workspaceId,
      this.field,
      this.originalValue,
      this.currentValue,
      this.revisions,
      this.revisionNumber,
      [...this.evidence, params.evidence],
      nextConfidence,
      confidenceHistory,
      this.signals,
      this.status,
      params.evidence.createdAt,
      this.verifiedCount,
    );
  }

  recordSignal(signal: KnowledgeSignal, confidenceBump?: number): KnowledgeObject {
    const nextConfidence =
      confidenceBump !== undefined
        ? clampConfidence(Math.max(this.confidence, confidenceBump))
        : this.confidence;

    const confidenceHistory =
      nextConfidence !== this.confidence
        ? [
            ...this.confidenceHistory,
            {
              confidence: nextConfidence,
              source: signal.type,
              recordedAt: signal.timestamp,
              reason: `Signal: ${signal.type}`,
            } satisfies ConfidencePoint,
          ]
        : this.confidenceHistory;

    return new KnowledgeObject(
      this.id,
      this.candidateId,
      this.workspaceId,
      this.field,
      this.originalValue,
      this.currentValue,
      this.revisions,
      this.revisionNumber,
      this.evidence,
      nextConfidence,
      confidenceHistory,
      [...this.signals, signal],
      this.status,
      signal.timestamp,
      this.verifiedCount,
    );
  }

  analytics(): KnowledgeAnalytics {
    return {
      confidence: this.confidence,
      evidenceCount: this.evidence.length,
      revisionCount: this.revisionNumber,
      verifiedCount: this.verifiedCount,
      lastUpdated: this.lastUpdated,
    };
  }

  toSnapshot(): KnowledgeObjectSnapshot {
    return {
      id: this.id,
      candidateId: this.candidateId,
      workspaceId: this.workspaceId,
      field: this.field,
      originalValue: this.originalValue,
      currentValue: this.currentValue,
      revisions: [...this.revisions],
      revisionNumber: this.revisionNumber,
      evidence: [...this.evidence],
      confidence: this.confidence,
      confidenceHistory: [...this.confidenceHistory],
      signals: [...this.signals],
      status: this.status,
      lastUpdated: this.lastUpdated,
      verifiedCount: this.verifiedCount,
      analytics: this.analytics(),
    };
  }

  /** Persistence rehydrate from stored snapshot. */
  static fromSnapshot(snapshot: Omit<KnowledgeObjectSnapshot, "analytics">): KnowledgeObject {
    return new KnowledgeObject(
      snapshot.id,
      snapshot.candidateId,
      snapshot.workspaceId,
      snapshot.field,
      snapshot.originalValue,
      snapshot.currentValue,
      snapshot.revisions,
      snapshot.revisionNumber,
      snapshot.evidence,
      snapshot.confidence,
      snapshot.confidenceHistory,
      snapshot.signals,
      snapshot.status,
      snapshot.lastUpdated,
      snapshot.verifiedCount,
    );
  }
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function confidenceForSource(source: string): number {
  switch (source) {
    case "Recruiter Review":
    case "recruiter":
      return CONFIDENCE_LADDER.recruiter;
    case "Interview":
    case "interview_passed":
    case "interview_failed":
      return CONFIDENCE_LADDER.interview;
    case "Client Feedback":
    case "offer_accepted":
    case "offer_declined":
    case "placement":
      return CONFIDENCE_LADDER.client;
    case "Resume":
    case "Gemini":
    case "Deterministic":
    default:
      return CONFIDENCE_LADDER.resume;
  }
}
