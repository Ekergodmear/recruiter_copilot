import type { InsightEngine } from "../insights/insight-engine.js";
import type { Insight, InsightScreen } from "../insights/insight.js";

/**
 * Thin orchestration facade for candidate/review screens.
 * Does not touch repositories — InsightEngine + providers own data access.
 */
export class CandidateInsightService {
  constructor(private readonly engine: InsightEngine) {}

  async getInsights(candidateId: string, screen: InsightScreen = "candidate"): Promise<Insight[]> {
    return this.engine.getInsights({ type: "candidate", candidateId, screen });
  }
}

/** @deprecated Use Insight — kept as alias during EPIC-006 migration. */
export type CandidateInsight = Insight;
export type CandidateInsightKind = string;
