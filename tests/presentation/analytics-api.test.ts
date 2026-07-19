import { describe, expect, it } from "vitest";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestDocx } from "../helpers/create-test-docx.js";

async function importCandidate(app: Awaited<ReturnType<typeof buildApp>>, lines: string[]) {
  const docx = await createTestDocx(lines);
  const boundary = "----analytics";
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

describe("EPIC-007 Analytics API", () => {
  it("returns overview + job snapshot with traceability; matching on-demand; read-only", async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "analytics-api-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_analytics",
    });
    const app = await buildApp(createAppDependencies(config));

    const candidateId = await importCandidate(app, [
      "Analytics Cand",
      "analytics@example.com",
      "React",
      "TypeScript",
      "5 years of experience",
      "English B2",
    ]);

    const jobRes = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      payload: {
        title: "Analytics Job",
        company: "Analytics Co",
        status: "Open",
        salaryMin: 1000,
        salaryMax: 3000,
        currency: "USD",
      },
    });
    expect(jobRes.statusCode).toBe(201);
    const jobId = jobRes.json().id as string;

    await app.inject({
      method: "PATCH",
      url: `/api/v1/jobs/${jobId}`,
      payload: {
        skills: ["React", "TypeScript", "Node"],
        experienceYears: 5,
        englishRequirement: "B2",
      },
    });
    await app.inject({
      method: "PATCH",
      url: `/api/v1/candidates/${candidateId}`,
      payload: { salary: "2000" },
    });

    const relRes = await app.inject({
      method: "POST",
      url: "/api/v1/relationships",
      payload: { candidateId, jobId },
    });
    expect(relRes.statusCode).toBe(201);
    const relationshipId = relRes.json().id as string;

    const moved = await app.inject({
      method: "PATCH",
      url: `/api/v1/relationships/${relationshipId}`,
      payload: { stage: "Screening" },
    });
    expect(moved.statusCode).toBe(200);

    const beforeCand = await app.inject({
      method: "GET",
      url: `/api/v1/candidates/${candidateId}`,
    });
    const beforeJob = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` });
    const beforeRel = await app.inject({
      method: "GET",
      url: `/api/v1/relationships/${relationshipId}`,
    });
    const beforeMatch = await app.inject({
      method: "GET",
      url: `/api/v1/matching?candidateId=${candidateId}&jobId=${jobId}`,
    });
    expect(beforeMatch.statusCode).toBe(200);
    const matchScore = beforeMatch.json().overallMatchScore as number;

    const overview = await app.inject({ method: "GET", url: "/api/v1/analytics/overview" });
    expect(overview.statusCode).toBe(200);
    const body = overview.json();
    expect(body.scope).toBe("global");
    expect(body.sourceCapabilities).toContain("matching");
    expect(body.counts.candidates).toBeGreaterThanOrEqual(1);
    expect(body.counts.relationships).toBeGreaterThanOrEqual(1);
    expect(body.stageDistribution.total).toBeGreaterThanOrEqual(1);

    const screening = body.stageDistribution.stages.find(
      (s: { stage: string }) => s.stage === "Screening",
    );
    expect(screening.count).toBeGreaterThanOrEqual(1);
    expect(screening.relationshipIds).toContain(relationshipId);

    expect(body.funnel.conversions.length).toBeGreaterThan(0);
    expect(body.matchScoreDistribution.source).toBe("matching_on_demand");
    expect(body.matchScoreDistribution.totalComputed).toBeGreaterThanOrEqual(1);
    const matchItems = body.matchScoreDistribution.buckets.flatMap(
      (b: { items: Array<{ relationshipId: string; overallMatchScore: number }> }) => b.items,
    );
    const traced = matchItems.find(
      (i: { relationshipId: string }) => i.relationshipId === relationshipId,
    );
    expect(traced).toBeDefined();
    expect(traced.overallMatchScore).toBe(matchScore);

    const jobSnap = await app.inject({
      method: "GET",
      url: `/api/v1/analytics/jobs/${jobId}`,
    });
    expect(jobSnap.statusCode).toBe(200);
    const jobBody = jobSnap.json();
    expect(jobBody.scope).toBe("job");
    expect(jobBody.jobId).toBe(jobId);
    expect(jobBody.stageDistribution.total).toBe(1);
    expect(jobBody.matchScoreDistribution.source).toBe("matching_on_demand");

    const missing = await app.inject({
      method: "GET",
      url: "/api/v1/analytics/jobs/job_doesnotexist99",
    });
    expect(missing.statusCode).toBe(404);

    // Read-only: no domain mutation
    const afterCand = await app.inject({
      method: "GET",
      url: `/api/v1/candidates/${candidateId}`,
    });
    const afterJob = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` });
    const afterRel = await app.inject({
      method: "GET",
      url: `/api/v1/relationships/${relationshipId}`,
    });
    const afterMatch = await app.inject({
      method: "GET",
      url: `/api/v1/matching?candidateId=${candidateId}&jobId=${jobId}`,
    });
    expect(afterCand.json()).toEqual(beforeCand.json());
    expect(afterJob.json()).toEqual(beforeJob.json());
    expect(afterRel.json().currentStage).toBe(beforeRel.json().currentStage);
    expect(afterRel.json().stageHistory).toEqual(beforeRel.json().stageHistory);
    expect(afterMatch.json().overallMatchScore).toBe(matchScore);

    // Copilot still works (regression smoke)
    const copilot = await app.inject({
      method: "POST",
      url: "/api/v1/copilot/explain-match",
      payload: { candidateId, jobId },
    });
    expect(copilot.statusCode).toBe(200);
    expect(copilot.json().aiSuggestion).toBeTruthy();
    expect(copilot.json().evidence).toBeTruthy();
  });
});
