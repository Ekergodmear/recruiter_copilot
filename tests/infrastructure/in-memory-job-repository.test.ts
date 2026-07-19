import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryJobRepository } from "../../src/modules/job/infrastructure/in-memory-job-repository.js";
import type { Job } from "../../src/modules/job/domain/types.js";

function makeJob(overrides: Partial<Job>): Job {
  const now = new Date().toISOString();
  return {
    id: "job",
    workspaceId: "ws_test",
    title: "Engineer",
    company: "Acme",
    department: "Eng",
    employmentType: "full_time",
    location: "Remote",
    salaryMin: null,
    salaryMax: null,
    currency: "USD",
    experienceYears: null,
    englishRequirement: "B2",
    skills: [],
    description: "",
    responsibilities: "",
    requirements: "",
    benefits: "",
    status: "Open",
    ready: true,
    submissionCount: 0,
    placementCount: 0,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: "recruiter_alpha",
    rawJdText: "",
    ...overrides,
  };
}

describe("InMemoryJobRepository — inverted skill index", () => {
  let repo: InMemoryJobRepository;

  beforeEach(() => {
    repo = new InMemoryJobRepository();
  });

  it("ranks jobs by skill overlap count, descending", async () => {
    await repo.save(makeJob({ id: "low", skills: ["React"] }));
    await repo.save(makeJob({ id: "high", skills: ["React", "Node", "TypeScript"] }));

    const results = await repo.findOpenJobsBySkills(["React", "Node", "TypeScript"], new Set());
    expect(results.map((j) => j.id)).toEqual(["high", "low"]);
  });

  it("excludes jobs the candidate already applied to", async () => {
    await repo.save(makeJob({ id: "excluded", skills: ["React"] }));
    const results = await repo.findOpenJobsBySkills(["React"], new Set(["excluded"]));
    expect(results).toHaveLength(0);
  });

  it("excludes non-open and soft-deleted jobs even if skills match", async () => {
    await repo.save(makeJob({ id: "closed", skills: ["React"], status: "Closed" }));
    await repo.save(
      makeJob({ id: "deleted", skills: ["React"], deletedAt: new Date().toISOString() }),
    );
    const results = await repo.findOpenJobsBySkills(["React"], new Set());
    expect(results).toHaveLength(0);
  });

  it("updates the index when a job is re-saved with different skills", async () => {
    await repo.save(makeJob({ id: "job1", skills: ["React"] }));
    await repo.save(makeJob({ id: "job1", skills: ["Python"] }));

    expect(await repo.findOpenJobsBySkills(["React"], new Set())).toHaveLength(0);
    const matches = await repo.findOpenJobsBySkills(["Python"], new Set());
    expect(matches.map((j) => j.id)).toEqual(["job1"]);
  });

  it("matches skills case-insensitively and trims whitespace", async () => {
    await repo.save(makeJob({ id: "job1", skills: [" React " as string] }));
    const results = await repo.findOpenJobsBySkills(["react"], new Set());
    expect(results.map((j) => j.id)).toEqual(["job1"]);
  });

  it("respects the limit parameter", async () => {
    for (let i = 0; i < 5; i++) {
      await repo.save(makeJob({ id: `job${i}`, skills: ["React"] }));
    }
    const results = await repo.findOpenJobsBySkills(["React"], new Set(), 2);
    expect(results).toHaveLength(2);
  });
});
