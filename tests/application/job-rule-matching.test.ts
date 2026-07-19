import { describe, expect, it } from "vitest";
import { extractJdFields } from "../../src/modules/job/application/jd-parse.js";
import { scoreCandidateAgainstJob } from "../../src/modules/job/application/rule-matching.js";
import type { Job } from "../../src/modules/job/domain/types.js";
import { Candidate } from "../../src/modules/candidate/domain/candidate/candidate.js";
import { CandidateId } from "../../src/modules/candidate/domain/candidate/candidate-id.js";
import { CandidateProfile } from "../../src/modules/candidate/domain/candidate/candidate-profile.js";
import { CandidateRecord } from "../../src/modules/candidate/domain/candidate/candidate-record.js";
import { VerifiedKnowledge } from "../../src/modules/candidate/domain/knowledge/verified-knowledge.js";

const provenance = {
  source: "Deterministic" as const,
  confidence: 0.9,
};

describe("extractJdFields", () => {
  it("extracts title skills experience english from JD text", () => {
    const text = `Senior React Engineer
Company: Acme Corp
Location: Ho Chi Minh
Requirements:
- 5 years experience
- React, TypeScript, Node
- English B2
Salary: USD 2000 - 3000
Responsibilities:
Build product features
Benefits:
Health insurance`;

    const parsed = extractJdFields(text);
    expect(parsed.title).toContain("Senior React Engineer");
    expect(parsed.company).toContain("Acme");
    expect(parsed.skills.map((s) => s.toLowerCase())).toEqual(
      expect.arrayContaining(["react", "typescript", "node"]),
    );
    expect(parsed.experienceYears).toBe(5);
    expect(parsed.englishRequirement.toLowerCase()).toBe("b2");
    expect(parsed.salaryMin).toBe(2000);
    expect(parsed.salaryMax).toBe(3000);
  });
});

describe("rule matching", () => {
  it("scores skills heavily and returns matched skills", () => {
    const job: Job = {
      id: "job_1",
      workspaceId: "ws",
      title: "React Dev",
      company: "Acme",
      department: "",
      employmentType: "full_time",
      location: "HCM",
      salaryMin: 1000,
      salaryMax: 2000,
      currency: "USD",
      experienceYears: 5,
      englishRequirement: "B2",
      skills: ["React", "TypeScript", "Node"],
      description: "",
      responsibilities: "",
      requirements: "",
      benefits: "",
      status: "Open",
      ready: true,
      submissionCount: 0,
      placementCount: 0,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "recruiter",
      rawJdText: "",
      source: "manual",
      notes: "",
    };

    const knowledge = VerifiedKnowledge.fromImport({
      summary: "Dev",
      skills: [
        { normalizedName: "React", confidence: 0.9 },
        { normalizedName: "TypeScript", confidence: 0.9 },
      ],
      englishLevel: "B2",
      yearsOfExperience: 5,
      uploadedAt: new Date().toISOString(),
      importTraceId: "trace_1",
      summaryProvenance: provenance,
      englishProvenance: provenance,
      skillsProvenance: provenance,
      yearsProvenance: provenance,
    });

    const record = CandidateRecord.create({
      candidate: Candidate.create({
        id: CandidateId.create("candidate_1"),
        workspaceId: "ws",
        profile: CandidateProfile.create({
          name: "Jane",
          summary: "Dev",
          skills: [],
          englishLevel: "B2",
        }),
        createdAt: new Date(),
      }),
      knowledge,
      resumeVersion: 1,
      resumeId: "resume_1",
    });

    const result = scoreCandidateAgainstJob(job, record);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.matchedSkills.map((s) => s.toLowerCase())).toEqual(
      expect.arrayContaining(["react", "typescript"]),
    );
  });
});
