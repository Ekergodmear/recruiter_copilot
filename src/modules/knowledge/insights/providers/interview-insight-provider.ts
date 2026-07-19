import type { JobRepository } from "../../../job/infrastructure/job-repository.js";
import type { InterviewRepository } from "../../../recruitment/infrastructure/interview-repository.js";
import { createInsight, type Insight, type InsightContext } from "../insight.js";
import type { InsightProvider } from "../insight-provider.js";

/** Interview-context insights from prior rounds and interviewer notes. */
export class InterviewInsightProvider implements InsightProvider {
  readonly name = "interview";

  constructor(
    private readonly deps: {
      interviewRepository: InterviewRepository;
      jobRepository: JobRepository;
    },
  ) {}

  async provide(context: InsightContext): Promise<Insight[]> {
    if (context.type !== "interview") return [];
    const interview = await this.deps.interviewRepository.findById(context.interviewId);
    if (!interview) return [];

    const insights: Insight[] = [];
    let seq = 0;
    const nextId = () => `insight_int_${interview.id}_${seq++}`;

    const history = await this.deps.interviewRepository.findByCandidateId(interview.candidateId);
    const others = history.filter((i) => i.id !== interview.id);

    const withNotes = others.find((i) => i.feedback.trim().length > 0);
    if (withNotes) {
      insights.push(
        createInsight(
          {
            category: "interview_prior_notes",
            severity: "info",
            title: "Prior interviewer notes",
            description: "Previous interviewer left notes.",
            action: "Read feedback",
          },
          nextId,
        ),
      );
    }

    const missed = others.find(
      (i) =>
        i.status === "Cancelled" ||
        i.decision === "Cancelled" ||
        /no[- ]?show|missed|absent/i.test(i.feedback),
    );
    if (missed) {
      insights.push(
        createInsight(
          {
            category: "interview_no_show",
            severity: "critical",
            title: "Previous interview missed",
            description: "Previous interview was missed.",
          },
          nextId,
        ),
      );
    }

    const job = await this.deps.jobRepository.findById(interview.jobId);
    if (job) {
      for (const prior of others) {
        if (prior.decision !== "Passed") continue;
        const priorJob = await this.deps.jobRepository.findById(prior.jobId);
        if (!priorJob) continue;
        if (
          priorJob.id === job.id ||
          skillOverlapCount(job.skills, priorJob.skills) >= 2 ||
          prior.type.toLowerCase() === interview.type.toLowerCase()
        ) {
          insights.push(
            createInsight(
              {
                category: "interview_prior_pass",
                severity: "info",
                title: "Passed similar interviews",
                description: "Candidate passed similar interviews before.",
              },
              nextId,
            ),
          );
          break;
        }
      }
    }

    return insights;
  }
}

function skillOverlapCount(a: string[], b: string[]): number {
  const set = new Set(a.map((s) => s.trim().toLowerCase()).filter(Boolean));
  return b.filter((s) => set.has(s.trim().toLowerCase())).length;
}
