import type { Job } from "../../../job/domain/types.js";
import type { JobRepository } from "../../../job/infrastructure/job-repository.js";
import type { SubmissionRepository } from "../../../job/infrastructure/submission-repository.js";
import type { InterviewRepository } from "../../../recruitment/infrastructure/interview-repository.js";
import type { KnowledgeRepository } from "../../infrastructure/knowledge-repository.js";
import { createInsight, type Insight, type InsightContext } from "../insight.js";
import type { InsightProvider } from "../insight-provider.js";

/**
 * Placement / offer / interview history and open-job similarity for candidate context.
 */
export class PlacementInsightProvider implements InsightProvider {
  readonly name = "placement";

  constructor(
    private readonly deps: {
      knowledgeRepository: KnowledgeRepository;
      jobRepository: JobRepository;
      submissionRepository: SubmissionRepository;
      interviewRepository: InterviewRepository;
    },
  ) {}

  async provide(context: InsightContext): Promise<Insight[]> {
    if (context.type !== "candidate") return [];
    const candidateId = context.candidateId;
    const insights: Insight[] = [];
    let seq = 0;
    const nextId = () => `insight_place_${candidateId}_${seq++}`;

    const set = await this.deps.knowledgeRepository.findByCandidateId(candidateId);
    if (set) {
      for (const signal of set.candidateSignals) {
        const described = await this.describeSignal(signal);
        if (!described) continue;
        insights.push(
          createInsight(
            {
              category: described.category,
              severity: described.severity,
              title: described.title,
              description: described.description,
            },
            nextId,
          ),
        );
      }
    }

    const interviews = await this.deps.interviewRepository.findByCandidateId(candidateId);
    const seenJobIds = new Set<string>();
    for (const interview of interviews) {
      if (seenJobIds.has(interview.jobId)) continue;
      seenJobIds.add(interview.jobId);
      const job = await this.deps.jobRepository.findById(interview.jobId);
      if (!job) continue;
      insights.push(
        createInsight(
          {
            category: "candidate_interview_history",
            severity: "info",
            title: "Interview history",
            description: `Previously interviewed by ${job.company} (${job.title}).`,
          },
          nextId,
        ),
      );
    }

    const skillsObject = set?.objects.find((o) => o.field === "skills");
    if (skillsObject) {
      const candidateSkills = parseSkillList(skillsObject.currentValue);
      if (candidateSkills.length > 0) {
        const submissions = await this.deps.submissionRepository.findByCandidateId(candidateId);
        const submittedJobIds = new Set(submissions.map((s) => s.jobId));
        const candidateJobs = await this.deps.jobRepository.findOpenJobsBySkills(
          candidateSkills,
          submittedJobIds,
          20,
        );
        for (const job of candidateJobs) {
          if (job.skills.length === 0) continue;
          const overlap = skillOverlap(candidateSkills, job.skills);
          const matchRatio = overlap.length / job.skills.length;
          if (overlap.length >= 2 && matchRatio >= 0.5) {
            insights.push(
              createInsight(
                {
                  category: "candidate_job_similarity",
                  severity: "info",
                  title: "Similar open job",
                  description: `Similar to ${job.title} at ${job.company} — ${overlap.length}/${job.skills.length} required skills match (${overlap.join(", ")}).`,
                },
                nextId,
              ),
            );
          }
        }
      }
    }

    return insights;
  }

  private async describeSignal(signal: {
    type: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    category: string;
    severity: Insight["severity"];
    title: string;
    description: string;
  } | null> {
    const jobId = typeof signal.metadata?.jobId === "string" ? signal.metadata.jobId : undefined;
    const job: Job | null = jobId ? await this.deps.jobRepository.findById(jobId) : null;
    const jobLabel = job ? `${job.title} at ${job.company}` : "a previous role";

    switch (signal.type) {
      case "placement":
        return {
          category: "placement",
          severity: "critical",
          title: "Previously placed",
          description: `Previously placed — ${jobLabel}.`,
        };
      case "offer_accepted":
        return {
          category: "offer",
          severity: "warning",
          title: "Offer accepted before",
          description: `Accepted an offer — ${jobLabel}.`,
        };
      case "offer_declined":
        return {
          category: "offer",
          severity: "warning",
          title: "Offer declined before",
          description: `Declined an offer — ${jobLabel}. Ask why before resubmitting.`,
        };
      case "interview_failed":
        return {
          category: "interview",
          severity: "warning",
          title: "Failed an interview",
          description:
            "Failed an interview round — worth checking notes before resubmitting elsewhere.",
        };
      default:
        return null;
    }
  }
}

function parseSkillList(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function skillOverlap(candidateSkills: string[], jobSkills: string[]): string[] {
  const candidateSet = new Set(candidateSkills);
  return jobSkills.filter((skill) => candidateSet.has(skill.trim().toLowerCase()));
}
