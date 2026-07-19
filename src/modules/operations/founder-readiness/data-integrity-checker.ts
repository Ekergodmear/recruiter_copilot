import type { CandidateRepository } from "../../candidate/infrastructure/persistence/candidate-repository.js";
import type { ResumeRepository } from "../../candidate/infrastructure/persistence/resume-repository.js";
import type { SubmissionRepository } from "../../job/infrastructure/submission-repository.js";
import type { JobRepository } from "../../job/infrastructure/job-repository.js";
import type { InterviewRepository } from "../../recruitment/infrastructure/interview-repository.js";
import type { OfferRepository } from "../../recruitment/infrastructure/offer-repository.js";
import type { KnowledgeRepository } from "../../knowledge/infrastructure/knowledge-repository.js";
import { ConsistencyVerifier } from "./consistency-verifier.js";
import type { DataIntegrityFinding, DataIntegrityReport } from "./types.js";

export class DataIntegrityChecker {
  private readonly consistency: ConsistencyVerifier;

  constructor(
    private readonly deps: {
      candidateRepository: CandidateRepository;
      resumeRepository: ResumeRepository;
      submissionRepository: SubmissionRepository;
      jobRepository: JobRepository;
      interviewRepository: InterviewRepository;
      offerRepository: OfferRepository;
      knowledgeRepository: KnowledgeRepository;
    },
  ) {
    this.consistency = new ConsistencyVerifier(deps);
  }

  async check(): Promise<DataIntegrityReport> {
    const findings: DataIntegrityFinding[] = [];

    // TECH-003: single batched load per aggregate → O(n) validation with maps.
    const [candidates, submissions, jobs, knowledgeSets, allOffers, allInterviews, resumes] =
      await Promise.all([
        this.deps.candidateRepository.findAll(),
        this.deps.submissionRepository.findAll(),
        this.deps.jobRepository.findAll(),
        this.deps.knowledgeRepository.findAll(),
        this.deps.offerRepository.findAll(),
        this.deps.interviewRepository.findAll(),
        this.deps.resumeRepository.findAll(),
      ]);

    const jobIds = new Set(jobs.map((j) => j.id));
    const candidateIds = new Set(candidates.map((c) => c.candidateId));
    const knowledgeByCandidate = new Map(knowledgeSets.map((k) => [k.candidateId, k]));
    const resumeIds = new Set(resumes.map((r) => r.idValue));

    const seenCandidateIds = new Set<string>();
    for (const c of candidates) {
      if (seenCandidateIds.has(c.candidateId)) {
        findings.push({
          severity: "error",
          code: "DUPLICATE_CANDIDATE_ID",
          message: `Duplicate candidate id ${c.candidateId}`,
          refId: c.candidateId,
        });
      }
      seenCandidateIds.add(c.candidateId);
    }

    const seenSubmissionIds = new Set<string>();
    for (const s of submissions) {
      if (seenSubmissionIds.has(s.id)) {
        findings.push({
          severity: "error",
          code: "DUPLICATE_SUBMISSION_ID",
          message: `Duplicate submission id ${s.id}`,
          refId: s.id,
        });
      }
      seenSubmissionIds.add(s.id);

      if (!candidateIds.has(s.candidateId)) {
        findings.push({
          severity: "error",
          code: "SUBMISSION_ORPHAN",
          message: `Submission ${s.id} has orphan candidate ${s.candidateId}`,
          refId: s.id,
        });
      }
      if (!jobIds.has(s.jobId)) {
        findings.push({
          severity: "error",
          code: "SUBMISSION_ORPHAN_JOB",
          message: `Submission ${s.id} has orphan job ${s.jobId}`,
          refId: s.id,
        });
      }
    }

    for (const s of submissions) {
      if (s.status !== "Placed") continue;
      if (!candidateIds.has(s.candidateId) || !jobIds.has(s.jobId)) {
        findings.push({
          severity: "error",
          code: "PLACEMENT_ORPHAN",
          message: `Placement submission ${s.id} is orphan`,
          refId: s.id,
        });
      }
    }

    for (const set of knowledgeSets) {
      if (!candidateIds.has(set.candidateId)) {
        findings.push({
          severity: "error",
          code: "KNOWLEDGE_ORPHAN",
          message: `Knowledge set for missing candidate ${set.candidateId}`,
          refId: set.candidateId,
        });
      }
    }
    for (const c of candidates) {
      if (!knowledgeByCandidate.has(c.candidateId)) {
        findings.push({
          severity: "warning",
          code: "MISSING_KNOWLEDGE",
          message: `Candidate ${c.candidateId} has no knowledge set`,
          refId: c.candidateId,
        });
      }
    }

    for (const offer of allOffers) {
      if (!seenSubmissionIds.has(offer.submissionId)) {
        findings.push({
          severity: "error",
          code: "OFFER_ORPHAN",
          message: `Offer ${offer.id} orphan submission`,
          refId: offer.id,
        });
      }
    }

    for (const interview of allInterviews) {
      if (!seenSubmissionIds.has(interview.submissionId)) {
        findings.push({
          severity: "error",
          code: "INTERVIEW_ORPHAN",
          message: `Interview ${interview.id} orphan submission`,
          refId: interview.id,
        });
      }
    }

    for (const c of candidates) {
      if (!c.resumeId) continue;
      if (!resumeIds.has(c.resumeId)) {
        findings.push({
          severity: "error",
          code: "CANDIDATE_ORPHAN_RESUME",
          message: `Candidate ${c.candidateId} missing resume ${c.resumeId}`,
          refId: c.candidateId,
        });
      }
    }

    const fpMap = new Map<string, string[]>();
    for (const c of candidates) {
      const fp = c.identity?.fingerprint;
      if (!fp) continue;
      const list = fpMap.get(fp) ?? [];
      list.push(c.candidateId);
      fpMap.set(fp, list);
    }
    for (const [fp, ids] of fpMap) {
      if (ids.length > 1) {
        findings.push({
          severity: "warning",
          code: "DUPLICATE_FINGERPRINT",
          message: `Fingerprint ${fp} shared by ${ids.length} candidates`,
          refId: ids.join(","),
        });
      }
    }

    const consistencyIssues = await this.consistency.verify({
      candidates,
      submissions,
      offers: allOffers,
      interviews: allInterviews,
      knowledgeSets,
    });
    for (const issue of consistencyIssues) {
      findings.push({
        severity: issue.severity,
        code: issue.code,
        message: issue.message,
        refId: issue.refId,
      });
    }

    const sectionDefs = [
      {
        name: "Candidates",
        codes: ["DUPLICATE_CANDIDATE_ID", "CANDIDATE_ORPHAN_RESUME", "READY_WITHOUT_CANDIDATE"],
      },
      {
        name: "Submissions",
        codes: ["SUBMISSION_ORPHAN", "SUBMISSION_ORPHAN_JOB", "DUPLICATE_SUBMISSION_ID"],
      },
      {
        name: "Knowledge",
        codes: ["MISSING_KNOWLEDGE", "KNOWLEDGE_ORPHAN", "REVISION_WITHOUT_KNOWLEDGE_OBJECT"],
      },
      { name: "Offers", codes: ["OFFER_ORPHAN", "OFFER_WITHOUT_SUBMISSION"] },
      { name: "Placements", codes: ["PLACEMENT_ORPHAN", "PLACEMENT_WITHOUT_ACCEPTED_OFFER"] },
      { name: "Interviews", codes: ["INTERVIEW_ORPHAN", "INTERVIEW_WITHOUT_SUBMISSION"] },
      { name: "Duplicate Fingerprints", codes: ["DUPLICATE_FINGERPRINT"] },
      {
        name: "Invalid Transitions",
        codes: [
          "PLACEMENT_WITHOUT_ACCEPTED_OFFER",
          "INTERVIEW_WITHOUT_SUBMISSION",
          "OFFER_WITHOUT_SUBMISSION",
        ],
      },
    ];

    const sections = sectionDefs.map((def) => {
      const related = findings.filter((f) => def.codes.includes(f.code));
      const errors = related.filter((f) => f.severity === "error").length;
      const warnings = related.filter((f) => f.severity === "warning").length;
      return {
        name: def.name,
        ok: errors === 0,
        warnings,
        errors,
        notes: related.map((f) => f.message),
      };
    });

    return {
      sections,
      findings,
      errorCount: findings.filter((f) => f.severity === "error").length,
      warningCount: findings.filter((f) => f.severity === "warning").length,
    };
  }
}
