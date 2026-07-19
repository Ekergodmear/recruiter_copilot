export type ReviewSessionMetrics = {
  sessionId: string;
  candidateId: string;
  startedAt: Date;
  completedAt?: Date;
  durationMs: number;
  fieldsEdited: number;
  knowledgeAccepted: number;
  knowledgeRejected: number;
  knowledgeCorrected: number;
  ready: boolean;
};

export type AuditTimelineStep = {
  kind:
    | "import"
    | "knowledge_review"
    | "ready"
    | "submission"
    | "interview"
    | "offer"
    | "placement"
    | "activity";
  label: string;
  timestamp: string;
  refId?: string;
  detail?: string;
};

export type AuditReplayResult = {
  candidateId: string;
  steps: AuditTimelineStep[];
};

export type ConsistencyIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  refId?: string;
};

export type DataIntegrityFinding = {
  severity: "error" | "warning";
  code: string;
  message: string;
  refId?: string;
};

export type DataIntegrityReport = {
  sections: { name: string; ok: boolean; warnings: number; errors: number; notes: string[] }[];
  findings: DataIntegrityFinding[];
  errorCount: number;
  warningCount: number;
};
