/**
 * EPIC-015 — Ingestion Job aggregate (durable, queryable).
 * HTTP creates jobs; workers mutate status; Assistant only reads.
 */

export type IngestionJobStatus =
  | "Created"
  | "Queued"
  | "Running"
  | "AwaitingConfirmation"
  | "Completed"
  | "CompletedWithWarnings"
  | "Failed";

export type SourceKind = "zip" | "folder" | "multi_file";

export type DocumentClass = "cv" | "jd" | "salary" | "other" | "unsupported";

export type IngestScope = "cv" | "cv_jd" | "all";

export type ClassifiedDocument = {
  path: string;
  filename: string;
  mimeType: string;
  contentHash: string;
  bytes: number;
  classification: DocumentClass;
  /** Present while job owns buffers (cleared after persist phases). */
  bufferBase64?: string;
};

export type PreviewSummary = {
  cv: number;
  jd: number;
  salary: number;
  other: number;
  unsupported: number;
  total: number;
};

export type IngestionReport = {
  imported: number;
  duplicate: number;
  skipped: number;
  unsupported: number;
  failed: number;
  durationMs: number;
  candidateIds: string[];
  jobIds: string[];
  failures: { path: string; reason: string }[];
};

export type IngestionJob = {
  id: string;
  workspaceId: string;
  status: IngestionJobStatus;
  sourceKind: SourceKind;
  sourceLabel: string;
  packageFingerprint: string;
  documents: ClassifiedDocument[];
  preview: PreviewSummary;
  scope?: IngestScope;
  progress: { processed: number; total: number; percent: number };
  report?: IngestionReport;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export function buildPreview(docs: ClassifiedDocument[]): PreviewSummary {
  const preview: PreviewSummary = {
    cv: 0,
    jd: 0,
    salary: 0,
    other: 0,
    unsupported: 0,
    total: docs.length,
  };
  for (const d of docs) {
    preview[d.classification] += 1;
  }
  return preview;
}

export function needsConfirmation(preview: PreviewSummary): boolean {
  const classes = (["cv", "jd", "salary", "other"] as const).filter((k) => preview[k] > 0);
  return classes.length > 1 || preview.salary > 0 || preview.other > 0;
}

export function documentsForScope(
  docs: ClassifiedDocument[],
  scope: IngestScope,
): ClassifiedDocument[] {
  if (scope === "all") {
    return docs.filter((d) => d.classification !== "unsupported");
  }
  if (scope === "cv") {
    return docs.filter((d) => d.classification === "cv");
  }
  return docs.filter((d) => d.classification === "cv" || d.classification === "jd");
}
