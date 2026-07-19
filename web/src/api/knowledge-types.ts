export type KnowledgeAnalytics = {
  confidence: number;
  evidenceCount: number;
  revisionCount: number;
  verifiedCount: number;
  lastUpdated: string;
};

export type KnowledgeRevision = {
  id: string;
  actor: string;
  timestamp: string;
  oldValue: string;
  newValue: string;
  reason: string | null;
  source: string;
};

export type KnowledgeEvidence = {
  id: string;
  source: string;
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
  type: string;
  actor: string;
  timestamp: string;
  field: string | null;
};

export type KnowledgeObject = {
  id: string;
  candidateId: string;
  field: string;
  originalValue: string;
  currentValue: string;
  revisions: KnowledgeRevision[];
  revisionNumber: number;
  evidence: KnowledgeEvidence[];
  confidence: number;
  confidenceHistory: ConfidencePoint[];
  signals: KnowledgeSignal[];
  status: string;
  lastUpdated: string;
  verifiedCount: number;
  analytics: KnowledgeAnalytics;
};

export type KnowledgeTimelineEvent = {
  id: string;
  kind: string;
  field: string | null;
  label: string;
  value: string | null;
  confidence: number | null;
  actor: string | null;
  source: string | null;
  timestamp: string;
};

export type CandidateKnowledgeResponse = {
  candidateId: string;
  workspaceId: string;
  objects: KnowledgeObject[];
  signals: KnowledgeSignal[];
  timeline: KnowledgeTimelineEvent[];
};

export type KnowledgeHistoryResponse = {
  candidateId: string;
  timeline: KnowledgeTimelineEvent[];
  confidenceByField: Record<string, ConfidencePoint[]>;
};
