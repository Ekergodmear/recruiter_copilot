import { describe, expect, it } from "vitest";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestDocx } from "../helpers/create-test-docx.js";

async function importCandidate(app: Awaited<ReturnType<typeof buildApp>>, lines: string[]) {
  const docx = await createTestDocx(lines);
  const boundary = "----match";
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="c.docx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`,
    ),
    docx,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/candidates/import-resume",
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    payload: body,
  });
  expect(res.statusCode).toBe(201);
  return res.json().candidateId as string;
}

describe("EPIC-005 Matching API", () => {
  it("returns on-demand MatchingResult with evidence then score; read-only", async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "match-api-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_match",
    });
    const app = await buildApp(createAppDependencies(config));

    const candidateId = await importCandidate(app, [
      "Match Cand",
      "match@example.com",
      "React",
      "TypeScript",
      "5 years of experience",
      "English B2",
    ]);

    const jobRes = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      payload: {
        title: "Match Job",
        company: "Match Co",
        status: "Open",
        salaryMin: 1000,
        salaryMax: 3000,
        currency: "USD",
      },
    });
    expect(jobRes.statusCode).toBe(201);
    const jobId = jobRes.json().id as string;
    const patched = await app.inject({
      method: "PATCH",
      url: `/api/v1/jobs/${jobId}`,
      payload: {
        skills: ["React", "TypeScript", "Node"],
        experienceYears: 5,
        englishRequirement: "B2",
      },
    });
    expect(patched.statusCode).toBe(200);

    await app.inject({
      method: "PATCH",
      url: `/api/v1/candidates/${candidateId}`,
      payload: { salary: "2000" },
    });

    const a = await app.inject({
      method: "GET",
      url: `/api/v1/matching?candidateId=${candidateId}&jobId=${jobId}`,
    });
    const b = await app.inject({
      method: "GET",
      url: `/api/v1/matching?candidateId=${candidateId}&jobId=${jobId}`,
    });
    expect(a.statusCode).toBe(200);
    expect(b.statusCode).toBe(200);
    const bodyA = a.json();
    const bodyB = b.json();
    expect(bodyA.evidence.matchedSkills.length).toBeGreaterThan(0);
    expect(bodyA.evidence.missingSkills.map((s: string) => s.toLowerCase())).toContain("node");
    expect(bodyA.overallMatchScore).toBe(bodyB.overallMatchScore);
    expect(bodyA.evidence).toEqual(bodyB.evidence);
    expect(bodyA.weights).toBeDefined();
    expect(bodyA.scoreBreakdown).toBeDefined();

    // Read-only: candidate / job / relationship / workflow unchanged
    const cand = await app.inject({ method: "GET", url: `/api/v1/candidates/${candidateId}` });
    expect(cand.statusCode).toBe(200);
    const job = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` });
    expect(job.statusCode).toBe(200);
    expect(job.json().title).toBe("Match Job");

    const rel = await app.inject({
      method: "POST",
      url: "/api/v1/relationships",
      payload: { candidateId, jobId },
    });
    expect(rel.statusCode).toBe(201);
    expect(rel.json().currentStage).toBe("Sourced");
    const afterMatch = await app.inject({
      method: "GET",
      url: `/api/v1/matching?candidateId=${candidateId}&jobId=${jobId}`,
    });
    expect(afterMatch.statusCode).toBe(200);
    const relReload = await app.inject({
      method: "GET",
      url: `/api/v1/relationships/${rel.json().id}`,
    });
    expect(relReload.json().currentStage).toBe("Sourced");
    expect(relReload.json().stageHistory).toHaveLength(1);

    expect((await app.inject({ method: "GET", url: "/health" })).json().status).toBe("ok");
  });
});
