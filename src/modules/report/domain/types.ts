/**
 * EPIC-014 — Reporting & Export (read-only composition).
 * Reports present information; they do not change information.
 */

export type ReportKind = "overview" | "audit" | "candidates" | "jobs";

export const REPORT_KINDS: ReportKind[] = ["overview", "audit", "candidates", "jobs"];

export type OverviewReport = {
  generatedAt: string;
  scope: "global";
  counts: { candidates: number; jobs: number; relationships: number };
  stageDistribution: Array<{ stage: string; count: number }>;
  matchScoreBuckets: Array<{ label: string; count: number }>;
  sourceCapabilities: string[];
};

export type AuditExportQuery = {
  actorId?: string;
  action?: string;
  source?: string;
  from?: string;
  to?: string;
};

export type CsvExportResult = {
  kind: ReportKind;
  filename: string;
  contentType: "text/csv; charset=utf-8";
  body: string;
};
