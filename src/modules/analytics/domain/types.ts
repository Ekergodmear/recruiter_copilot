/**
 * EPIC-007 — Analytics & Insights (read-only aggregates).
 * Consumes capabilities; does not own business rules.
 */

import type { WorkflowStage } from "../../relationship/domain/types.js";

export const MATCH_SCORE_BUCKETS = [
  { label: "0–39", min: 0, max: 39 },
  { label: "40–59", min: 40, max: 59 },
  { label: "60–79", min: 60, max: 79 },
  { label: "80–100", min: 80, max: 100 },
] as const;

export type StageCount = {
  stage: WorkflowStage;
  count: number;
  /** AC-1b Traceability */
  relationshipIds: string[];
};

export type StageDistribution = {
  stages: StageCount[];
  total: number;
};

export type FunnelTransition = {
  from: WorkflowStage | null;
  to: WorkflowStage;
  count: number;
  relationshipIds: string[];
};

export type StageConversion = {
  from: WorkflowStage;
  to: WorkflowStage;
  /** Relationships that ever reached `from` (history newStage or current). */
  reachedFrom: number;
  /** Transitions from → to observed in Stage History. */
  movedTo: number;
  /** movedTo / reachedFrom; null if reachedFrom === 0 */
  rate: number | null;
  relationshipIdsReachedFrom: string[];
  relationshipIdsMovedTo: string[];
};

export type FunnelMetrics = {
  transitions: FunnelTransition[];
  conversions: StageConversion[];
};

export type MatchScoreItem = {
  relationshipId: string;
  candidateId: string;
  jobId: string;
  overallMatchScore: number;
  computedAt: string;
};

export type MatchScoreBucket = {
  label: string;
  min: number;
  max: number;
  count: number;
  items: MatchScoreItem[];
};

export type MatchScoreDistribution = {
  buckets: MatchScoreBucket[];
  totalComputed: number;
  /** Matching computed on-demand via EPIC-005; not persisted. */
  source: "matching_on_demand";
};

export type TimeInStage = {
  stage: WorkflowStage;
  sampleSize: number;
  averageDays: number | null;
  medianDays: number | null;
  relationshipIds: string[];
};

export type TimeToStageMetrics = {
  byStage: TimeInStage[];
};

export type AnalyticsCounts = {
  candidates: number;
  jobs: number;
  relationships: number;
};

export type AnalyticsSnapshot = {
  scope: "global" | "job";
  jobId: string | null;
  generatedAt: string;
  /** Transparency: which capabilities fed this snapshot */
  sourceCapabilities: Array<"candidate" | "job" | "relationship" | "workflow" | "matching">;
  counts: AnalyticsCounts;
  stageDistribution: StageDistribution;
  funnel: FunnelMetrics;
  matchScoreDistribution: MatchScoreDistribution;
  timeToStage: TimeToStageMetrics;
};
