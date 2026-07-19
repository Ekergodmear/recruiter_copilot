import { describe, expect, it } from "vitest";
import { computeMatchingResult } from "../../src/modules/matching/domain/matching-engine.js";
import type {
  MatchingCandidateInput,
  MatchingJobInput,
} from "../../src/modules/matching/domain/types.js";

const job: MatchingJobInput = {
  jobId: "job_1",
  skills: ["React", "TypeScript", "Node"],
  experienceYears: 5,
  englishRequirement: "B2",
  salaryMin: 1000,
  salaryMax: 2000,
  currency: "USD",
};

const candidate: MatchingCandidateInput = {
  candidateId: "candidate_1",
  skills: ["React", "TypeScript"],
  yearsOfExperience: 5,
  englishLevel: "B2",
  expectedSalary: 1500,
};

describe("EPIC-005 Matching Engine", () => {
  it("computes evidence before score: matched/missing skills", () => {
    const result = computeMatchingResult(candidate, job, "2026-07-19T00:00:00.000Z");
    expect(result.evidence.matchedSkills.map((s) => s.toLowerCase())).toEqual(
      expect.arrayContaining(["react", "typescript"]),
    );
    expect(result.evidence.missingSkills.map((s) => s.toLowerCase())).toEqual(["node"]);
    expect(result.evidence.experience.status).toBe("meets");
    expect(result.evidence.english.status).toBe("meets");
    expect(result.evidence.salary.status).toBe("within_budget");
    expect(result.overallMatchScore).toBe(
      Math.round((2 / 3) * 0.6 * 100 + 1 * 0.2 * 100 + 1 * 0.1 * 100 + 1 * 0.1 * 100),
    );
    expect(result.weights).toEqual({
      skills: 0.6,
      experience: 0.2,
      english: 0.1,
      salary: 0.1,
    });
  });

  it("is deterministic — same inputs → same score and evidence", () => {
    const a = computeMatchingResult(candidate, job, "2026-07-19T00:00:00.000Z");
    const b = computeMatchingResult(candidate, job, "2026-07-19T00:00:00.000Z");
    expect(a.overallMatchScore).toBe(b.overallMatchScore);
    expect(a.evidence).toEqual(b.evidence);
    expect(a.scoreBreakdown).toEqual(b.scoreBreakdown);
  });

  it("marks salary above_budget when expectation exceeds max", () => {
    const result = computeMatchingResult(
      { ...candidate, expectedSalary: 5000 },
      job,
      "2026-07-19T00:00:00.000Z",
    );
    expect(result.evidence.salary.status).toBe("above_budget");
    expect(result.evidence.salary.dimensionScore).toBe(0.4);
  });

  it("marks experience below when years short", () => {
    const result = computeMatchingResult(
      { ...candidate, yearsOfExperience: 2 },
      job,
      "2026-07-19T00:00:00.000Z",
    );
    expect(result.evidence.experience.status).toBe("below");
    expect(result.evidence.experience.dimensionScore).toBeCloseTo(0.4);
  });
});
