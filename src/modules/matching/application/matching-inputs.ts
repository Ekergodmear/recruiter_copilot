import type { CandidateRecord } from "../../candidate/domain/candidate/candidate-record.js";
import type { Job } from "../../job/domain/types.js";
import type { MatchingCandidateInput, MatchingJobInput } from "../domain/types.js";

export function parseCandidateYears(record: CandidateRecord): number | null {
  const raw = record.knowledge.currentValue("years_of_experience");
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parse free-text workspace salary into a number when possible. */
export function parseExpectedSalary(raw: string | undefined | null): number | null {
  if (!raw?.trim()) return null;
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function toMatchingCandidateInput(record: CandidateRecord): MatchingCandidateInput {
  const skills = record.knowledge
    .currentValue("skills")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    candidateId: record.candidateId,
    skills,
    yearsOfExperience: parseCandidateYears(record),
    englishLevel: record.knowledge.currentValue("english") || "unknown",
    expectedSalary: parseExpectedSalary(record.workspace.salary),
  };
}

export function toMatchingJobInput(job: Job): MatchingJobInput {
  return {
    jobId: job.id,
    skills: job.skills,
    experienceYears: job.experienceYears,
    englishRequirement: job.englishRequirement || "unknown",
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    currency: job.currency || "USD",
  };
}
