import type {
  EditableFieldName,
  KnowledgeStatusValue,
} from "../../candidate/domain/knowledge/verified-knowledge.js";
import type { ProvenanceSource } from "../../candidate/domain/knowledge/knowledge-provenance.js";

export const KNOWLEDGE_SIGNAL_TYPES = [
  "accept",
  "reject",
  "correct",
  "verify",
  "interview_passed",
  "interview_failed",
  "offer_accepted",
  "offer_declined",
  "placement",
] as const;

export type KnowledgeSignalType = (typeof KNOWLEDGE_SIGNAL_TYPES)[number];

export type KnowledgeRevision = {
  id: string;
  actor: string;
  timestamp: string;
  oldValue: string;
  newValue: string;
  reason: string | null;
  source: ProvenanceSource | string;
};

export type KnowledgeEvidence = {
  id: string;
  source: ProvenanceSource;
  confidence: number;
  createdAt: string;
  note?: string | null;
};

export type ConfidencePoint = {
  confidence: number;
  source: string;
  recordedAt: string;
  reason?: string | null;
};

export type KnowledgeSignal = {
  id: string;
  type: KnowledgeSignalType;
  actor: string;
  timestamp: string;
  field: EditableFieldName | null;
  metadata?: Record<string, unknown>;
};

export type KnowledgeAnalytics = {
  confidence: number;
  evidenceCount: number;
  revisionCount: number;
  verifiedCount: number;
  lastUpdated: string;
};

export type KnowledgeObjectSnapshot = {
  id: string;
  candidateId: string;
  workspaceId: string;
  field: EditableFieldName;
  originalValue: string;
  currentValue: string;
  revisions: KnowledgeRevision[];
  revisionNumber: number;
  evidence: KnowledgeEvidence[];
  confidence: number;
  confidenceHistory: ConfidencePoint[];
  signals: KnowledgeSignal[];
  status: KnowledgeStatusValue;
  lastUpdated: string;
  verifiedCount: number;
  analytics: KnowledgeAnalytics;
};

export type TimelineEventKind =
  | "original_ai"
  | "recruiter_edit"
  | "accept"
  | "reject"
  | "verify"
  | "interview"
  | "client_feedback"
  | "assessment"
  | "evidence"
  | "signal"
  | "current_truth";

export type KnowledgeTimelineEvent = {
  id: string;
  kind: TimelineEventKind;
  field: EditableFieldName | null;
  label: string;
  value: string | null;
  confidence: number | null;
  actor: string | null;
  source: string | null;
  timestamp: string;
};

/** Default confidence ladder for evolution (0–1). */
export const CONFIDENCE_LADDER = {
  resume: 0.65,
  recruiter: 0.9,
  interview: 0.95,
  client: 0.97,
} as const;
