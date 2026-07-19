/**
 * EPIC-005 — Matching Foundation (deterministic, Evidence first → Score second).
 * Not AI. Not Recommendation. Not Ranking.
 */

/** Documented MVP weights — Matching Stability: no hidden factors. */
export const MATCHING_WEIGHTS = {
  skills: 0.6,
  experience: 0.2,
  english: 0.1,
  salary: 0.1,
} as const;

export type DimensionStatus =
  | "meets"
  | "partial"
  | "below"
  | "unknown"
  | "not_required"
  | "within_budget"
  | "above_budget"
  | "below_range";

export type ExperienceEvidence = {
  requiredYears: number | null;
  actualYears: number | null;
  status: DimensionStatus;
  /** 0..1 contribution before weight */
  dimensionScore: number;
};

export type EnglishEvidence = {
  required: string;
  actual: string;
  status: DimensionStatus;
  dimensionScore: number;
};

export type SalaryEvidence = {
  expectedSalary: number | null;
  jobSalaryMin: number | null;
  jobSalaryMax: number | null;
  currency: string;
  status: DimensionStatus;
  dimensionScore: number;
};

export type MatchingEvidence = {
  matchedSkills: string[];
  missingSkills: string[];
  /** 0..1 skills coverage before weight */
  skillsDimensionScore: number;
  experience: ExperienceEvidence;
  english: EnglishEvidence;
  salary: SalaryEvidence;
};

export type ScoreBreakdown = {
  skills: number;
  experience: number;
  english: number;
  salary: number;
};

export type MatchingResult = {
  candidateId: string;
  jobId: string;
  /** Evidence first — computed before score */
  evidence: MatchingEvidence;
  /** Documented weights used for this result */
  weights: typeof MATCHING_WEIGHTS;
  /** Per-dimension scores 0..100 after evidence (for explainability) */
  scoreBreakdown: ScoreBreakdown;
  /** Derived solely from evidence × documented weights */
  overallMatchScore: number;
  computedAt: string;
};

/** Pure inputs — no repository / AI */
export type MatchingCandidateInput = {
  candidateId: string;
  skills: string[];
  yearsOfExperience: number | null;
  englishLevel: string;
  expectedSalary: number | null;
};

export type MatchingJobInput = {
  jobId: string;
  skills: string[];
  experienceYears: number | null;
  englishRequirement: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
};
