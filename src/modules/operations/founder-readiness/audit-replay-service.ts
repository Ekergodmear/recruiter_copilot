import { CandidateId } from "../../candidate/domain/candidate/candidate-id.js";
import type { CandidateRepository } from "../../candidate/infrastructure/persistence/candidate-repository.js";
import type { SubmissionRepository } from "../../job/infrastructure/submission-repository.js";
import type { InterviewRepository } from "../../recruitment/infrastructure/interview-repository.js";
import type { OfferRepository } from "../../recruitment/infrastructure/offer-repository.js";
import type { ActivityRepository } from "../../recruitment/infrastructure/activity-repository.js";
import type { KnowledgeRepository } from "../../knowledge/infrastructure/knowledge-repository.js";
import type { AuditReplayResult, AuditTimelineStep } from "./types.js";

export class AuditReplayService {
  constructor(
    private readonly deps: {
      candidateRepository: CandidateRepository;
      submissionRepository: SubmissionRepository;
      interviewRepository: InterviewRepository;
      offerRepository: OfferRepository;
      activityRepository: ActivityRepository;
      knowledgeRepository: KnowledgeRepository;
    },
  ) {}

  async replay(candidateId: string): Promise<AuditReplayResult> {
    const steps: AuditTimelineStep[] = [];
    // TECH-003: keyed lookup instead of findAll + filter.
    const candidate = await this.deps.candidateRepository.findById(CandidateId.create(candidateId));

    if (candidate) {
      steps.push({
        kind: "import",
        label: "Import",
        timestamp: candidate.knowledge.uploadedAt,
        refId: candidate.candidateId,
        detail: candidate.candidate.profile.name,
      });

      const fieldNames = Object.keys(candidate.knowledge.fields).sort();
      for (const fieldName of fieldNames) {
        const field =
          candidate.knowledge.fields[fieldName as keyof typeof candidate.knowledge.fields];
        for (const rev of field.revisions) {
          steps.push({
            kind: "knowledge_review",
            label: "Knowledge Review",
            timestamp: rev.recordedAt,
            refId: fieldName,
            detail: `${rev.action}:${rev.value}`,
          });
        }
      }

      if (candidate.knowledge.isReady && candidate.knowledge.readyAt) {
        steps.push({
          kind: "ready",
          label: "Ready",
          timestamp: candidate.knowledge.readyAt,
          refId: candidate.candidateId,
        });
      }
    }

    const knowledgeSet = await this.deps.knowledgeRepository.findByCandidateId(candidateId);
    if (knowledgeSet) {
      for (const ev of knowledgeSet.buildTimeline()) {
        if (ev.kind === "original_ai") continue;
        steps.push({
          kind: "knowledge_review",
          label: "Knowledge Review",
          timestamp: ev.timestamp,
          refId: ev.field ?? undefined,
          detail: `${ev.kind}:${String(ev.value ?? "")}`,
        });
      }
    }

    const submissions = (await this.deps.submissionRepository.findByCandidateId(candidateId)).sort(
      (a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.id.localeCompare(b.id),
    );

    for (const submission of submissions) {
      steps.push({
        kind: "submission",
        label: "Submission",
        timestamp: submission.submittedAt,
        refId: submission.id,
        detail: submission.status,
      });

      const interviews = (
        await this.deps.interviewRepository.findBySubmissionId(submission.id)
      ).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      for (const interview of interviews) {
        steps.push({
          kind: "interview",
          label: "Interview",
          timestamp: interview.createdAt,
          refId: interview.id,
          detail: `${interview.status}/${interview.decision}`,
        });
      }

      const offers = (await this.deps.offerRepository.findBySubmissionId(submission.id)).sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
      );
      for (const offer of offers) {
        steps.push({
          kind: "offer",
          label: "Offer",
          timestamp: offer.createdAt,
          refId: offer.id,
          detail: offer.status,
        });
      }

      if (submission.status === "Placed") {
        steps.push({
          kind: "placement",
          label: "Placement",
          timestamp: submission.updatedAt,
          refId: submission.id,
        });
      }

      const activities = (
        await this.deps.activityRepository.findBySubmissionId(submission.id)
      ).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      for (const activity of activities) {
        steps.push({
          kind: "activity",
          label: activity.type,
          timestamp: activity.createdAt,
          refId: activity.id,
          detail: activity.message,
        });
      }
    }

    steps.sort((a, b) => {
      const t = a.timestamp.localeCompare(b.timestamp);
      if (t !== 0) return t;
      return `${a.kind}:${a.refId}:${a.detail}`.localeCompare(`${b.kind}:${b.refId}:${b.detail}`);
    });

    const seen = new Set<string>();
    const deduped: AuditTimelineStep[] = [];
    for (const step of steps) {
      const key = `${step.kind}|${step.timestamp}|${step.refId}|${step.detail}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(step);
    }

    return { candidateId, steps: deduped };
  }
}
