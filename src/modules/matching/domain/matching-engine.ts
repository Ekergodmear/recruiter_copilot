/**
 * Deterministic Matching Engine — Evidence first, Score second.
 * Same input → same output. No AI, no hidden heuristics.
 */
import {
  MATCHING_WEIGHTS,
  type MatchingCandidateInput,
  type MatchingEvidence,
  type MatchingJobInput,
  type MatchingResult,
} from "./types.js";

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

function buildSkillsEvidence(
  jobSkills: string[],
  candidateSkills: string[],
): Pick<MatchingEvidence, "matchedSkills" | "missingSkills" | "skillsDimensionScore"> {
  if (jobSkills.length === 0) {
    return { matchedSkills: [], missingSkills: [], skillsDimensionScore: 1 };
  }
  const cand = new Set(candidateSkills.map(normalizeSkill));
  const matchedSkills = jobSkills.filter((s) => cand.has(normalizeSkill(s)));
  const missingSkills = jobSkills.filter((s) => !cand.has(normalizeSkill(s)));
  return {
    matchedSkills,
    missingSkills,
    skillsDimensionScore: matchedSkills.length / jobSkills.length,
  };
}

function buildExperienceEvidence(
  requiredYears: number | null,
  actualYears: number | null,
): MatchingEvidence["experience"] {
  if (requiredYears == null) {
    return {
      requiredYears,
      actualYears,
      status: "not_required",
      dimensionScore: 1,
    };
  }
  if (actualYears == null) {
    return {
      requiredYears,
      actualYears,
      status: "unknown",
      dimensionScore: 0.3,
    };
  }
  if (actualYears >= requiredYears) {
    return {
      requiredYears,
      actualYears,
      status: "meets",
      dimensionScore: 1,
    };
  }
  return {
    requiredYears,
    actualYears,
    status: "below",
    dimensionScore: Math.max(0, actualYears / requiredYears),
  };
}

function buildEnglishEvidence(required: string, actual: string): MatchingEvidence["english"] {
  const reqKey = required.toLowerCase();
  const actKey = actual.toLowerCase();
  const req = ENGLISH_RANK[reqKey] ?? 0;
  if (req === 0) {
    return {
      required,
      actual,
      status: "not_required",
      dimensionScore: 1,
    };
  }
  const act = ENGLISH_RANK[actKey] ?? 0;
  if (act >= req) {
    return {
      required,
      actual,
      status: "meets",
      dimensionScore: 1,
    };
  }
  if (act === 0) {
    return {
      required,
      actual,
      status: "unknown",
      dimensionScore: 0.2,
    };
  }
  return {
    required,
    actual,
    status: "below",
    dimensionScore: Math.max(0, act / req),
  };
}

/**
 * Documented salary rules (Matching Stability):
 * - No job budget → not_required (full credit)
 * - No candidate expectation → unknown (0.3)
 * - Above max → above_budget (0.4)
 * - Below min → below_range (0.8)
 * - Within [min, max] (inclusive; open bounds allowed) → within_budget (1)
 */
function buildSalaryEvidence(
  expectedSalary: number | null,
  salaryMin: number | null,
  salaryMax: number | null,
  currency: string,
): MatchingEvidence["salary"] {
  if (salaryMin == null && salaryMax == null) {
    return {
      expectedSalary,
      jobSalaryMin: salaryMin,
      jobSalaryMax: salaryMax,
      currency,
      status: "not_required",
      dimensionScore: 1,
    };
  }
  if (expectedSalary == null) {
    return {
      expectedSalary,
      jobSalaryMin: salaryMin,
      jobSalaryMax: salaryMax,
      currency,
      status: "unknown",
      dimensionScore: 0.3,
    };
  }
  if (salaryMax != null && expectedSalary > salaryMax) {
    return {
      expectedSalary,
      jobSalaryMin: salaryMin,
      jobSalaryMax: salaryMax,
      currency,
      status: "above_budget",
      dimensionScore: 0.4,
    };
  }
  if (salaryMin != null && expectedSalary < salaryMin) {
    return {
      expectedSalary,
      jobSalaryMin: salaryMin,
      jobSalaryMax: salaryMax,
      currency,
      status: "below_range",
      dimensionScore: 0.8,
    };
  }
  return {
    expectedSalary,
    jobSalaryMin: salaryMin,
    jobSalaryMax: salaryMax,
    currency,
    status: "within_budget",
    dimensionScore: 1,
  };
}

function computeEvidence(
  candidate: MatchingCandidateInput,
  job: MatchingJobInput,
): MatchingEvidence {
  const skills = buildSkillsEvidence(job.skills, candidate.skills);
  return {
    ...skills,
    experience: buildExperienceEvidence(job.experienceYears, candidate.yearsOfExperience),
    english: buildEnglishEvidence(
      job.englishRequirement || "unknown",
      candidate.englishLevel || "unknown",
    ),
    salary: buildSalaryEvidence(
      candidate.expectedSalary,
      job.salaryMin,
      job.salaryMax,
      job.currency || "USD",
    ),
  };
}

function scoreFromEvidence(evidence: MatchingEvidence): {
  overallMatchScore: number;
  scoreBreakdown: MatchingResult["scoreBreakdown"];
} {
  const w = MATCHING_WEIGHTS;
  const overall =
    evidence.skillsDimensionScore * w.skills +
    evidence.experience.dimensionScore * w.experience +
    evidence.english.dimensionScore * w.english +
    evidence.salary.dimensionScore * w.salary;

  return {
    overallMatchScore: Math.round(overall * 100),
    scoreBreakdown: {
      skills: Math.round(evidence.skillsDimensionScore * 100),
      experience: Math.round(evidence.experience.dimensionScore * 100),
      english: Math.round(evidence.english.dimensionScore * 100),
      salary: Math.round(evidence.salary.dimensionScore * 100),
    },
  };
}

/**
 * Pure matching: evidence → score. No I/O. Deterministic.
 */
export function computeMatchingResult(
  candidate: MatchingCandidateInput,
  job: MatchingJobInput,
  computedAt: string,
): MatchingResult {
  const evidence = computeEvidence(candidate, job);
  const { overallMatchScore, scoreBreakdown } = scoreFromEvidence(evidence);
  return {
    candidateId: candidate.candidateId,
    jobId: job.jobId,
    evidence,
    weights: MATCHING_WEIGHTS,
    scoreBreakdown,
    overallMatchScore,
    computedAt,
  };
}
