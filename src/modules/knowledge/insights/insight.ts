export type InsightSeverity = "critical" | "warning" | "info";

export type Insight = {
  id: string;
  category: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  action?: string;
};

export type InsightScreen = "candidate" | "review" | "job" | "submission" | "interview";

export type InsightContext =
  | { type: "candidate"; candidateId: string; screen?: InsightScreen }
  | { type: "job"; jobId: string; screen?: InsightScreen }
  | { type: "submission"; submissionId: string; screen?: InsightScreen }
  | { type: "interview"; interviewId: string; screen?: InsightScreen };

const SEVERITY_RANK: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function sortInsightsBySeverity(insights: Insight[]): Insight[] {
  return [...insights].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.title.localeCompare(b.title),
  );
}

export function highestSeverity(insights: Insight[]): InsightSeverity | null {
  if (insights.length === 0) return null;
  return sortInsightsBySeverity(insights)[0]!.severity;
}

export function createInsight(
  partial: Omit<Insight, "id"> & { id?: string },
  idFactory: () => string,
): Insight {
  return {
    id: partial.id ?? idFactory(),
    category: partial.category,
    severity: partial.severity,
    title: partial.title,
    description: partial.description,
    action: partial.action,
  };
}
