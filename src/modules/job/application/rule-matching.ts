import type { CandidateRecord } from "../../candidate/domain/candidate/candidate-record.js";
import { computeMatchingResult } from "../../matching/domain/matching-engine.js";
import {
  toMatchingCandidateInput,
  toMatchingJobInput,
} from "../../matching/application/matching-inputs.js";
import type { Job } from "../domain/types.js";

export type MatchBreakdown = {
  skills: number;
  experience: number;
  english: number;
  salary: number;
};

export type RuleMatchResult = {
  candidateId: string;
  name: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  english: string;
  experienceYears: number | null;
  readyAt: string | null;
  breakdown: MatchBreakdown;
};

/**
 * Legacy job-matches list adapter — score/evidence from EPIC-005 Matching Engine.
 * Ranking of ready candidates remains existing product surface; EPIC-005 does not expand it.
 */
export function scoreCandidateAgainstJob(job: Job, record: CandidateRecord): RuleMatchResult {
  const result = computeMatchingResult(
    toMatchingCandidateInput(record),
    toMatchingJobInput(job),
    record.knowledge.readyAt ?? new Date(0).toISOString(),
  );
  return {
    candidateId: record.candidateId,
    name: record.candidate.profile.name,
    score: result.overallMatchScore,
    matchedSkills: result.evidence.matchedSkills,
    missingSkills: result.evidence.missingSkills,
    english: result.evidence.english.actual,
    experienceYears: result.evidence.experience.actualYears,
    readyAt: record.knowledge.readyAt,
    breakdown: result.scoreBreakdown,
  };
}

export function rankReadyCandidates(job: Job, records: CandidateRecord[]): RuleMatchResult[] {
  return records
    .filter((r) => r.knowledge.isReady)
    .map((r) => scoreCandidateAgainstJob(job, r))
    .sort((a, b) => b.score - a.score);
}

/**
 * TECH-003 — same score math as Matching Engine (no result object allocation beyond compute).
 */
export function scoreCandidateAgainstJobValue(job: Job, record: CandidateRecord): number {
  return scoreCandidateAgainstJob(job, record).score;
}
