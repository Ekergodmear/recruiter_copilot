import type { CandidateRecord } from "../../candidate/domain/candidate/candidate-record.js";
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
  english: string;
  experienceYears: number | null;
  readyAt: string | null;
  breakdown: MatchBreakdown;
};

const ENGLISH_RANK: Record<string, number> = {
  unknown: 0,
  a1: 1,
  a2: 2,
  b1: 3,
  b2: 4,
  c1: 5,
  c2: 6,
  fluent: 5,
  native: 6,
};

function normalizeSkill(s: string): string {
  return s.trim().toLowerCase();
}

function parseCandidateYears(record: CandidateRecord): number | null {
  const raw = record.knowledge.currentValue("years_of_experience");
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function skillScore(
  jobSkills: string[],
  candidateSkills: string[],
): { score: number; matched: string[] } {
  if (jobSkills.length === 0) return { score: 1, matched: [] };
  const cand = new Set(candidateSkills.map(normalizeSkill));
  const matched = jobSkills.filter((s) => cand.has(normalizeSkill(s)));
  return { score: matched.length / jobSkills.length, matched };
}

function experienceScore(required: number | null, actual: number | null): number {
  if (required == null) return 1;
  if (actual == null) return 0.3;
  if (actual >= required) return 1;
  return Math.max(0, actual / required);
}

function englishScore(required: string, actual: string): number {
  const req = ENGLISH_RANK[required.toLowerCase()] ?? 0;
  if (req === 0) return 1;
  const act = ENGLISH_RANK[actual.toLowerCase()] ?? 0;
  if (act >= req) return 1;
  if (act === 0) return 0.2;
  return Math.max(0, act / req);
}

function salaryScore(): number {
  // Candidate salary not tracked yet — neutral full credit
  return 1;
}

export function scoreCandidateAgainstJob(job: Job, record: CandidateRecord): RuleMatchResult {
  const candidateSkills = record.knowledge
    .currentValue("skills")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const years = parseCandidateYears(record);
  const english = record.knowledge.currentValue("english") || "unknown";

  const skills = skillScore(job.skills, candidateSkills);
  const experience = experienceScore(job.experienceYears, years);
  const englishPart = englishScore(job.englishRequirement, english);
  const salary = salaryScore();

  const score = skills.score * 0.6 + experience * 0.2 + englishPart * 0.1 + salary * 0.1;

  return {
    candidateId: record.candidateId,
    name: record.candidate.profile.name,
    score: Math.round(score * 100),
    matchedSkills: skills.matched,
    english,
    experienceYears: years,
    readyAt: record.knowledge.readyAt,
    breakdown: {
      skills: Math.round(skills.score * 100),
      experience: Math.round(experience * 100),
      english: Math.round(englishPart * 100),
      salary: Math.round(salary * 100),
    },
  };
}

export function rankReadyCandidates(job: Job, records: CandidateRecord[]): RuleMatchResult[] {
  return records
    .filter((r) => r.knowledge.isReady)
    .map((r) => scoreCandidateAgainstJob(job, r))
    .sort((a, b) => b.score - a.score);
}

/**
 * TECH-003 — same score math as scoreCandidateAgainstJob, no result object allocation.
 * Used by JobInsightProvider match counting.
 */
export function scoreCandidateAgainstJobValue(job: Job, record: CandidateRecord): number {
  const candidateSkills = record.knowledge
    .currentValue("skills")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const years = parseCandidateYears(record);
  const english = record.knowledge.currentValue("english") || "unknown";

  const skills = skillScore(job.skills, candidateSkills);
  const experience = experienceScore(job.experienceYears, years);
  const englishPart = englishScore(job.englishRequirement, english);
  const salary = salaryScore();
  return Math.round(
    (skills.score * 0.6 + experience * 0.2 + englishPart * 0.1 + salary * 0.1) * 100,
  );
}
