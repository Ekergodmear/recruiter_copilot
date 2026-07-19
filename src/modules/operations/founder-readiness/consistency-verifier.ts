import type { CandidateRecord } from "../../candidate/domain/candidate/candidate-record.js";
import type { CandidateRepository } from "../../candidate/infrastructure/persistence/candidate-repository.js";
import type { Submission } from "../../job/domain/types.js";
import type { SubmissionRepository } from "../../job/infrastructure/submission-repository.js";
import type { Interview } from "../../recruitment/domain/types.js";
import type { Offer } from "../../recruitment/domain/types.js";
import type { InterviewRepository } from "../../recruitment/infrastructure/interview-repository.js";
import type { OfferRepository } from "../../recruitment/infrastructure/offer-repository.js";
import type { CandidateKnowledgeSet } from "../../knowledge/domain/candidate-knowledge-set.js";
import type { KnowledgeRepository } from "../../knowledge/infrastructure/knowledge-repository.js";
import type { ConsistencyIssue } from "./types.js";

/** Optional snapshot so DataIntegrityChecker can reuse already-batched loads. */
export type ConsistencySnapshot = {
  candidates: CandidateRecord[];
  submissions: Submission[];
  offers: Offer[];
  interviews: Interview[];
  knowledgeSets: CandidateKnowledgeSet[];
};

/**
 * Reports contradictory aggregate states. Does not mutate data.
 * TECH-003: batched loads + maps (no per-row repository N+1).
 */
export class ConsistencyVerifier {
  constructor(
    private readonly deps: {
      candidateRepository: CandidateRepository;
      submissionRepository: SubmissionRepository;
      interviewRepository: InterviewRepository;
      offerRepository: OfferRepository;
      knowledgeRepository: KnowledgeRepository;
    },
  ) {}

  async verify(snapshot?: ConsistencySnapshot): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    const candidates = snapshot?.candidates ?? (await this.deps.candidateRepository.findAll());
    const submissions = snapshot?.submissions ?? (await this.deps.submissionRepository.findAll());
    const allOffers = snapshot?.offers ?? (await this.deps.offerRepository.findAll());
    const allInterviews = snapshot?.interviews ?? (await this.deps.interviewRepository.findAll());
    const knowledgeSets =
      snapshot?.knowledgeSets ?? (await this.deps.knowledgeRepository.findAll());

    const candidateIds = new Set(candidates.map((c) => c.candidateId));
    const submissionById = new Map(submissions.map((s) => [s.id, s]));
    const knowledgeByCandidate = new Map(knowledgeSets.map((k) => [k.candidateId, k]));

    const offersBySubmission = new Map<string, typeof allOffers>();
    for (const offer of allOffers) {
      const list = offersBySubmission.get(offer.submissionId) ?? [];
      list.push(offer);
      offersBySubmission.set(offer.submissionId, list);
    }

    const interviewsBySubmission = new Map<string, typeof allInterviews>();
    for (const interview of allInterviews) {
      const list = interviewsBySubmission.get(interview.submissionId) ?? [];
      list.push(interview);
      interviewsBySubmission.set(interview.submissionId, list);
    }

    for (const candidate of candidates) {
      if (candidate.knowledge.isReady && !candidateIds.has(candidate.candidateId)) {
        issues.push({
          severity: "error",
          code: "READY_WITHOUT_CANDIDATE",
          message: "Candidate Ready but candidate record missing",
          refId: candidate.candidateId,
        });
      }
    }

    for (const submission of submissions) {
      if (!candidateIds.has(submission.candidateId)) {
        issues.push({
          severity: "error",
          code: "SUBMISSION_ORPHAN_CANDIDATE",
          message: `Submission ${submission.id} references missing candidate`,
          refId: submission.id,
        });
      }

      const offers = offersBySubmission.get(submission.id) ?? [];
      const interviews = interviewsBySubmission.get(submission.id) ?? [];

      if (submission.status === "Placed") {
        const accepted = offers.some((o) => o.status === "Accepted");
        if (!accepted) {
          issues.push({
            severity: "error",
            code: "PLACEMENT_WITHOUT_ACCEPTED_OFFER",
            message: `Placement on ${submission.id} without Accepted offer`,
            refId: submission.id,
          });
        }
      }

      for (const interview of interviews) {
        if (interview.status === "Completed") {
          const sub = submissionById.get(interview.submissionId);
          if (!sub) {
            issues.push({
              severity: "error",
              code: "INTERVIEW_WITHOUT_SUBMISSION",
              message: `Completed interview ${interview.id} missing submission`,
              refId: interview.id,
            });
          }
        }
      }

      for (const offer of offers) {
        const sub = submissionById.get(offer.submissionId);
        if (!sub) {
          issues.push({
            severity: "error",
            code: "OFFER_WITHOUT_SUBMISSION",
            message: `Offer ${offer.id} missing submission`,
            refId: offer.id,
          });
        }
      }
    }

    for (const candidate of candidates) {
      const set = knowledgeByCandidate.get(candidate.candidateId);
      if (!set) continue;
      for (const obj of set.objects) {
        for (const rev of obj.revisions) {
          if (!set.findById(obj.id)) {
            issues.push({
              severity: "error",
              code: "REVISION_WITHOUT_KNOWLEDGE_OBJECT",
              message: `Revision ${rev.id} without knowledge object`,
              refId: rev.id,
            });
          }
        }
      }
    }

    for (const candidate of candidates) {
      if (candidate.knowledge.isReady && !candidateIds.has(candidate.candidateId)) {
        issues.push({
          severity: "error",
          code: "READY_WITHOUT_CANDIDATE",
          message: "Ready flag without candidate",
          refId: candidate.candidateId,
        });
      }
    }

    return issues.sort(
      (a, b) => a.code.localeCompare(b.code) || (a.refId ?? "").localeCompare(b.refId ?? ""),
    );
  }
}
