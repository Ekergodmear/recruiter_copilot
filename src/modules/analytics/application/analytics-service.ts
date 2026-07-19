import type { Clock } from "../../../shared/clock/index.js";
import type { CandidateRepository } from "../../candidate/infrastructure/persistence/candidate-repository.js";
import type { JobRepository } from "../../job/infrastructure/job-repository.js";
import {
  MatchingService,
  MatchingServiceError,
} from "../../matching/application/matching-service.js";
import {
  WORKFLOW_STAGES,
  type CandidateJobRelationship,
  type WorkflowStage,
} from "../../relationship/domain/types.js";
import type { RelationshipRepository } from "../../relationship/infrastructure/relationship-repository.js";
import {
  MATCH_SCORE_BUCKETS,
  type AnalyticsSnapshot,
  type FunnelMetrics,
  type MatchScoreDistribution,
  type MatchScoreItem,
  type StageConversion,
  type StageDistribution,
  type TimeToStageMetrics,
} from "../domain/types.js";

export class AnalyticsServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AnalyticsServiceError";
  }
}

/**
 * EPIC-007 — read-only aggregates over existing capabilities.
 * Does not mutate Candidate / Job / Relationship / Workflow / Matching.
 * Match scores come only from MatchingService (on-demand).
 */
export class AnalyticsService {
  constructor(
    private readonly deps: {
      clock: Clock;
      candidateRepository: CandidateRepository;
      jobRepository: JobRepository;
      relationshipRepository: RelationshipRepository;
      matchingService: MatchingService;
    },
  ) {}

  async getOverview(): Promise<AnalyticsSnapshot> {
    const relationships = await this.deps.relationshipRepository.findAll();
    return this.buildSnapshot("global", null, relationships);
  }

  async getJobSnapshot(jobId: string): Promise<AnalyticsSnapshot> {
    const job = await this.deps.jobRepository.findById(jobId);
    if (!job || job.deletedAt) {
      throw new AnalyticsServiceError("JOB_NOT_FOUND", "Job not found");
    }
    const relationships = await this.deps.relationshipRepository.findByJobId(jobId);
    return this.buildSnapshot("job", jobId, relationships);
  }

  private async buildSnapshot(
    scope: "global" | "job",
    jobId: string | null,
    relationships: CandidateJobRelationship[],
  ): Promise<AnalyticsSnapshot> {
    const [candidates, jobs] = await Promise.all([
      this.deps.candidateRepository.findAll(),
      this.deps.jobRepository.findAll(),
    ]);
    const activeJobs = jobs.filter((j) => !j.deletedAt);

    const stageDistribution = this.stageDistribution(relationships);
    const funnel = this.funnelMetrics(relationships);
    const matchScoreDistribution = await this.matchScoreDistribution(relationships);
    const timeToStage = this.timeToStage(relationships);

    return {
      scope,
      jobId,
      generatedAt: this.deps.clock.nowIso(),
      sourceCapabilities: ["candidate", "job", "relationship", "workflow", "matching"],
      counts: {
        candidates: candidates.length,
        jobs: activeJobs.length,
        relationships: relationships.length,
      },
      stageDistribution,
      funnel,
      matchScoreDistribution,
      timeToStage,
    };
  }

  private stageDistribution(relationships: CandidateJobRelationship[]): StageDistribution {
    const byStage = new Map<WorkflowStage, string[]>();
    for (const stage of WORKFLOW_STAGES) {
      byStage.set(stage, []);
    }
    for (const r of relationships) {
      const list = byStage.get(r.currentStage) ?? [];
      list.push(r.id);
      byStage.set(r.currentStage, list);
    }
    const stages = WORKFLOW_STAGES.map((stage) => {
      const relationshipIds = byStage.get(stage) ?? [];
      return { stage, count: relationshipIds.length, relationshipIds };
    });
    return { stages, total: relationships.length };
  }

  private funnelMetrics(relationships: CandidateJobRelationship[]): FunnelMetrics {
    const transitionMap = new Map<
      string,
      { from: WorkflowStage | null; to: WorkflowStage; ids: string[] }
    >();

    for (const r of relationships) {
      for (const entry of r.stageHistory) {
        const key = `${entry.previousStage ?? "null"}→${entry.newStage}`;
        const existing = transitionMap.get(key);
        if (existing) {
          if (!existing.ids.includes(r.id)) existing.ids.push(r.id);
        } else {
          transitionMap.set(key, {
            from: entry.previousStage,
            to: entry.newStage,
            ids: [r.id],
          });
        }
      }
    }

    const transitions = [...transitionMap.values()].map((t) => ({
      from: t.from,
      to: t.to,
      count: t.ids.length,
      relationshipIds: t.ids,
    }));

    /** Adjacent pairs along default stage order (excluding terminal-only edges). */
    const pairs: Array<[WorkflowStage, WorkflowStage]> = [];
    for (let i = 0; i < WORKFLOW_STAGES.length - 1; i++) {
      const from = WORKFLOW_STAGES[i]!;
      const to = WORKFLOW_STAGES[i + 1]!;
      if (from === "Rejected" || from === "Withdrawn" || from === "Hired") continue;
      pairs.push([from, to]);
    }

    const conversions: StageConversion[] = pairs.map(([from, to]) => {
      const reachedIds = relationships
        .filter((r) => r.currentStage === from || r.stageHistory.some((h) => h.newStage === from))
        .map((r) => r.id);
      const movedIds = relationships
        .filter((r) => r.stageHistory.some((h) => h.previousStage === from && h.newStage === to))
        .map((r) => r.id);
      const reachedFrom = reachedIds.length;
      const movedTo = movedIds.length;
      return {
        from,
        to,
        reachedFrom,
        movedTo,
        rate: reachedFrom === 0 ? null : movedTo / reachedFrom,
        relationshipIdsReachedFrom: reachedIds,
        relationshipIdsMovedTo: movedIds,
      };
    });

    return { transitions, conversions };
  }

  private async matchScoreDistribution(
    relationships: CandidateJobRelationship[],
  ): Promise<MatchScoreDistribution> {
    const items: MatchScoreItem[] = [];
    for (const r of relationships) {
      try {
        const result = await this.deps.matchingService.match({
          candidateId: r.candidateId,
          jobId: r.jobId,
        });
        items.push({
          relationshipId: r.id,
          candidateId: r.candidateId,
          jobId: r.jobId,
          overallMatchScore: result.overallMatchScore,
          computedAt: result.computedAt,
        });
      } catch (err) {
        if (err instanceof MatchingServiceError) {
          // Skip pairs that cannot match (missing candidate/job); do not fabricate scores.
          continue;
        }
        throw err;
      }
    }

    const buckets = MATCH_SCORE_BUCKETS.map((b) => {
      const bucketItems = items.filter(
        (i) => i.overallMatchScore >= b.min && i.overallMatchScore <= b.max,
      );
      return {
        label: b.label,
        min: b.min,
        max: b.max,
        count: bucketItems.length,
        items: bucketItems,
      };
    });

    return {
      buckets,
      totalComputed: items.length,
      source: "matching_on_demand",
    };
  }

  private timeToStage(relationships: CandidateJobRelationship[]): TimeToStageMetrics {
    const durations = new Map<WorkflowStage, { days: number[]; relationshipIds: string[] }>();
    for (const stage of WORKFLOW_STAGES) {
      durations.set(stage, { days: [], relationshipIds: [] });
    }

    for (const r of relationships) {
      const history = [...r.stageHistory].sort(
        (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime(),
      );
      for (let i = 0; i < history.length - 1; i++) {
        const current = history[i]!;
        const next = history[i + 1]!;
        const ms = new Date(next.changedAt).getTime() - new Date(current.changedAt).getTime();
        if (!Number.isFinite(ms) || ms < 0) continue;
        const days = ms / (1000 * 60 * 60 * 24);
        const bucket = durations.get(current.newStage);
        if (!bucket) continue;
        bucket.days.push(days);
        if (!bucket.relationshipIds.includes(r.id)) {
          bucket.relationshipIds.push(r.id);
        }
      }
    }

    const byStage = WORKFLOW_STAGES.map((stage) => {
      const bucket = durations.get(stage)!;
      const sampleSize = bucket.days.length;
      if (sampleSize === 0) {
        return {
          stage,
          sampleSize: 0,
          averageDays: null,
          medianDays: null,
          relationshipIds: [],
        };
      }
      const sorted = [...bucket.days].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
      return {
        stage,
        sampleSize,
        averageDays: Math.round((sum / sampleSize) * 1000) / 1000,
        medianDays: Math.round(median * 1000) / 1000,
        relationshipIds: bucket.relationshipIds,
      };
    });

    return { byStage };
  }
}
