import type { KnowledgeRepository } from "../../infrastructure/knowledge-repository.js";
import type { JobRepository } from "../../../job/infrastructure/job-repository.js";
import type { SubmissionRepository } from "../../../job/infrastructure/submission-repository.js";
import type { OfferRepository } from "../../../recruitment/infrastructure/offer-repository.js";
import { createInsight, type Insight, type InsightContext } from "../insight.js";
import type { InsightProvider } from "../insight-provider.js";

/** Submission-context insights from prior client outcomes and knowledge. */
export class SubmissionInsightProvider implements InsightProvider {
  readonly name = "submission";

  constructor(
    private readonly deps: {
      submissionRepository: SubmissionRepository;
      jobRepository: JobRepository;
      knowledgeRepository: KnowledgeRepository;
      offerRepository: OfferRepository;
    },
  ) {}

  async provide(context: InsightContext): Promise<Insight[]> {
    if (context.type !== "submission") return [];
    const submission = await this.deps.submissionRepository.findById(context.submissionId);
    if (!submission) return [];

    const job = await this.deps.jobRepository.findById(submission.jobId);
    const insights: Insight[] = [];
    let seq = 0;
    const nextId = () => `insight_sub_${submission.id}_${seq++}`;

    const allSubs = await this.deps.submissionRepository.findByCandidateId(submission.candidateId);

    if (job) {
      for (const other of allSubs) {
        if (other.id === submission.id) continue;
        if (other.status !== "Rejected") continue;
        const otherJob = await this.deps.jobRepository.findById(other.jobId);
        if (!otherJob) continue;
        if (normalizeCompany(otherJob.company) === normalizeCompany(job.company)) {
          insights.push(
            createInsight(
              {
                category: "submission_client_reject",
                severity: "critical",
                title: "Previously rejected by client",
                description: "Candidate was previously rejected by this client.",
              },
              nextId,
            ),
          );
          break;
        }
      }
    }

    const salaryChanged = await this.salaryExpectationChanged(allSubs);
    if (salaryChanged) {
      insights.push(
        createInsight(
          {
            category: "submission_salary_change",
            severity: "warning",
            title: "Salary expectation changed",
            description: "Salary expectation changed recently.",
          },
          nextId,
        ),
      );
    }

    const knowledge = await this.deps.knowledgeRepository.findByCandidateId(submission.candidateId);
    const english = knowledge?.findByField("english");
    if (english) {
      const corrected = english.revisions.some((r) => r.oldValue !== r.newValue);
      if (corrected) {
        insights.push(
          createInsight(
            {
              category: "submission_english_correction",
              severity: "warning",
              title: "English was corrected",
              description: "English level was manually corrected.",
            },
            nextId,
          ),
        );
      }
    }

    if (job) {
      const similarPrior = await this.hasSimilarPriorSubmission(submission.id, job.skills, allSubs);
      if (similarPrior) {
        insights.push(
          createInsight(
            {
              category: "submission_similar_roles",
              severity: "info",
              title: "Prior similar submissions",
              description: "Candidate has prior submissions for similar roles.",
            },
            nextId,
          ),
        );
      }
    }

    return insights;
  }

  private async salaryExpectationChanged(submissions: { id: string }[]): Promise<boolean> {
    const salaries = new Set<string>();
    for (const sub of submissions) {
      const offers = await this.deps.offerRepository.findBySubmissionId(sub.id);
      for (const offer of offers) {
        const normalized = offer.salary.trim().toLowerCase();
        if (normalized) salaries.add(normalized);
      }
    }
    return salaries.size >= 2;
  }

  private async hasSimilarPriorSubmission(
    currentId: string,
    skills: string[],
    allSubs: { id: string; jobId: string }[],
  ): Promise<boolean> {
    for (const other of allSubs) {
      if (other.id === currentId) continue;
      const otherJob = await this.deps.jobRepository.findById(other.jobId);
      if (!otherJob) continue;
      if (skillOverlapCount(skills, otherJob.skills) >= 2) return true;
    }
    return false;
  }
}

function normalizeCompany(value: string): string {
  return value.trim().toLowerCase();
}

function skillOverlapCount(a: string[], b: string[]): number {
  const set = new Set(a.map((s) => s.trim().toLowerCase()).filter(Boolean));
  return b.filter((s) => set.has(s.trim().toLowerCase())).length;
}
