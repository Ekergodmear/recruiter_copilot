import type { FieldKnowledge } from "./verified-knowledge.js";

export const REVIEW_PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

export type ReviewPriority = (typeof REVIEW_PRIORITIES)[number];

const PRIORITY_RANK: Record<ReviewPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const MISSING_VALUES = new Set(["unknown", "n/a", "na", ""]);

export function isMissingKnowledgeValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return MISSING_VALUES.has(normalized);
}

/**
 * Rule-based review priority. No LLM.
 *
 * - Missing value → CRITICAL
 * - Human verified → LOW
 * - Confidence < 60% → HIGH
 * - Confidence < 85% → MEDIUM
 * - Otherwise → LOW
 */
export function computeReviewPriority(field: FieldKnowledge): ReviewPriority {
  if (isMissingKnowledgeValue(field.currentValue)) {
    return "CRITICAL";
  }

  if (field.status === "HUMAN_VERIFIED") {
    return "LOW";
  }

  const confidence = field.provenance.confidence;
  if (confidence !== undefined) {
    if (confidence < 0.6) return "HIGH";
    if (confidence < 0.85) return "MEDIUM";
    return "LOW";
  }

  if (field.status === "CLAIMED") {
    return "HIGH";
  }

  return "MEDIUM";
}

export function compareReviewPriority(a: ReviewPriority, b: ReviewPriority): number {
  return PRIORITY_RANK[a] - PRIORITY_RANK[b];
}

export function reviewPriorityLabel(priority: ReviewPriority): string {
  switch (priority) {
    case "CRITICAL":
      return "🔴 CRITICAL";
    case "HIGH":
      return "🔥 HIGH";
    case "MEDIUM":
      return "🟡 MEDIUM";
    case "LOW":
      return "🟢 LOW";
  }
}

export type ReviewQueueItem = {
  field: string;
  label: string;
  priority: ReviewPriority;
  priorityLabel: string;
  confidenceLabel: string;
  reviewed: boolean;
};

export function buildReviewQueue(
  rows: Array<{
    field: string;
    label: string;
    reviewed: boolean;
    reviewPriority: ReviewPriority;
    provenance: { confidenceLabel: string };
  }>,
): ReviewQueueItem[] {
  return rows
    .filter((row) => !row.reviewed && row.reviewPriority !== "LOW")
    .sort((a, b) => compareReviewPriority(a.reviewPriority, b.reviewPriority))
    .map((row) => ({
      field: row.field,
      label: row.label,
      priority: row.reviewPriority,
      priorityLabel: reviewPriorityLabel(row.reviewPriority),
      confidenceLabel: row.provenance.confidenceLabel,
      reviewed: row.reviewed,
    }));
}
