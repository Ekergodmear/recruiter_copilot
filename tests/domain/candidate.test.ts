import { describe, expect, it } from "vitest";
import { Candidate } from "../../src/modules/candidate/domain/candidate/candidate.js";
import { CandidateId } from "../../src/modules/candidate/domain/candidate/candidate-id.js";
import { CandidateProfile } from "../../src/modules/candidate/domain/candidate/candidate-profile.js";
import { CandidateStatus } from "../../src/modules/candidate/domain/candidate/candidate-status.js";

describe("Candidate aggregate", () => {
  it("creates immutable candidate with active status", () => {
    const profile = CandidateProfile.create({
      name: "Jane Doe",
      summary: "Engineer",
      skills: [{ skillId: "skill_react", normalizedName: "React", confidence: 0.9 }],
      englishLevel: "B2",
    });

    const candidate = Candidate.create({
      id: CandidateId.create("candidate_001"),
      workspaceId: "ws_001",
      profile,
      createdAt: "2026-07-09T00:00:00.000Z",
    });

    expect(candidate.status).toEqual(CandidateStatus.active());
    expect(candidate.profile.name).toBe("Jane Doe");
    expect(candidate.idValue).toBe("candidate_001");
  });

  it("rejects empty candidate id", () => {
    expect(() => CandidateId.create("")).toThrow();
  });
});
