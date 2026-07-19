import type { CandidateRecord } from "../../../candidate/domain/candidate/candidate-record.js";
import type { CandidateRepository } from "../../../candidate/infrastructure/persistence/candidate-repository.js";
import { scoreCandidateAgainstJobValue } from "../../../job/application/rule-matching.js";
import type { Job } from "../../../job/domain/types.js";
import type { JobRepository } from "../../../job/infrastructure/job-repository.js";
import type { SubmissionRepository } from "../../../job/infrastructure/submission-repository.js";
import { createInsight, type Insight, type InsightContext } from "../insight.js";
import type { InsightProvider } from "../insight-provider.js";

/** Job-context decision support from submissions, matches, and prior placements. */
export class JobInsightProvider implements InsightProvider {
  readonly name = "job";

  constructor(
    private readonly deps: {
      jobRepository: JobRepository;
      submissionRepository: SubmissionRepository;
      candidateRepository: CandidateRepository;
    },
  ) {}

  async provide(context: InsightContext): Promise<Insight[]> {
    if (context.type !== "job") return [];
    const job = await this.deps.jobRepository.findById(context.jobId);
    if (!job || job.deletedAt) return [];

    const insights: Insight[] = [];
    let seq = 0;
    const nextId = () => `insight_job_${job.id}_${seq++}`;

    // TECH-003: count matches without full sort / result allocation.
    const records = await this.deps.candidateRepository.findAll();
    const matchCount = countReadyMatchesAtLeast(job, records, 50);
    if (matchCount >= 5) {
      insights.push(
        createInsight(
          {
            category: "job_matches",
            severity: "info",
            title: "Reviewed candidates available",
            description: `${matchCount} reviewed candidates match this job.`,
            action: "Review matches",
          },
          nextId,
        ),
      );
    }

    const allJobs = await this.deps.jobRepository.findAll();
    const similarFilled = allJobs.find(
      (other) =>
        other.id !== job.id &&
        !other.deletedAt &&
        (other.status === "Filled" || other.placementCount > 0) &&
        skillOverlapCount(job.skills, other.skills) >= 2,
    );
    if (similarFilled) {
      insights.push(
        createInsight(
          {
            category: "job_similar_placement",
            severity: "info",
            title: "Similar job filled before",
            description: "A similar job was successfully filled before.",
            action: `See ${similarFilled.title}`,
          },
          nextId,
        ),
      );
    }

    const submissions = await this.deps.submissionRepository.findByJobId(job.id);
    const awaiting = submissions.filter(
      (s) => s.status === "Client Reviewing" || s.status === "Submitted",
    );
    if (awaiting.length > 0) {
      insights.push(
        createInsight(
          {
            category: "job_pending_feedback",
            severity: "warning",
            title: "Awaiting client feedback",
            description: `${awaiting.length} candidates are awaiting client feedback.`,
            action: "Open pipeline",
          },
          nextId,
        ),
      );
    }

    return insights;
  }
}

/**
 * Same threshold semantics as rankReadyCandidates(...).filter(score >= minScore).length.
 * Skips not-ready candidates; uses allocation-free score helper.
 */
function countReadyMatchesAtLeast(job: Job, records: CandidateRecord[], minScore: number): number {
  let count = 0;
  for (const record of records) {
    if (!record.knowledge.isReady) continue;
    if (scoreCandidateAgainstJobValue(job, record) >= minScore) {
      count += 1;
    }
  }
  return count;
}

function skillOverlapCount(a: string[], b: string[]): number {
  const set = new Set(a.map((s) => s.trim().toLowerCase()).filter(Boolean));
  return b.filter((s) => set.has(s.trim().toLowerCase())).length;
}
