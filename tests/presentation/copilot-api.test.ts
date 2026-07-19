import { describe, expect, it } from "vitest";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestDocx } from "../helpers/create-test-docx.js";

async function importCandidate(app: Awaited<ReturnType<typeof buildApp>>, lines: string[]) {
  const docx = await createTestDocx(lines);
  const boundary = "----copilot";
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

describe("EPIC-006 Copilot API", () => {
  it("explains match with transparency; does not change score; read-only", async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "copilot-api-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_copilot",
      GEMINI_API_KEY: "",
    });
    const app = await buildApp(createAppDependencies(config));

    const candidateId = await importCandidate(app, [
      "Copilot Cand",
      "copilot@example.com",
      "React",
      "TypeScript",
      "5 years of experience",
      "English B2",
    ]);

    const jobRes = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      payload: { title: "Copilot Job", company: "Copilot Co", status: "Open" },
    });
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

    const matchBefore = await app.inject({
      method: "GET",
      url: `/api/v1/matching?candidateId=${candidateId}&jobId=${jobId}`,
    });
    expect(matchBefore.statusCode).toBe(200);
    const scoreBefore = matchBefore.json().overallMatchScore as number;

    const explained = await app.inject({
      method: "POST",
      url: "/api/v1/copilot/explain-match",
      payload: { candidateId, jobId },
    });
    expect(explained.statusCode).toBe(200);
    const body = explained.json();
    expect(body.evidence).toBeDefined();
    expect(body.evidence.overallMatchScore).toBe(scoreBefore);
    expect(body.evidence.matchedSkills).toBeDefined();
    expect(body.evidence.missingSkills).toBeDefined();
    expect(typeof body.aiSuggestion).toBe("string");
    expect(body.aiSuggestion.length).toBeGreaterThan(0);
    expect(body.matchingResult.overallMatchScore).toBe(scoreBefore);

    const matchAfter = await app.inject({
      method: "GET",
      url: `/api/v1/matching?candidateId=${candidateId}&jobId=${jobId}`,
    });
    expect(matchAfter.json().overallMatchScore).toBe(scoreBefore);

    const candSum = await app.inject({
      method: "POST",
      url: "/api/v1/copilot/summarize-candidate",
      payload: { candidateId },
    });
    expect(candSum.statusCode).toBe(200);
    expect(candSum.json().evidence.name).toBeDefined();
    expect(candSum.json().aiSuggestion).toBeTruthy();

    const jobSum = await app.inject({
      method: "POST",
      url: "/api/v1/copilot/summarize-job",
      payload: { jobId },
    });
    expect(jobSum.statusCode).toBe(200);
    expect(jobSum.json().evidence.title).toBe("Copilot Job");

    const draft = await app.inject({
      method: "POST",
      url: "/api/v1/copilot/draft-outreach",
      payload: { candidateId, jobId },
    });
    expect(draft.statusCode).toBe(200);
    expect(draft.json().evidence.note).toMatch(/does not send/i);
    expect(draft.json().aiSuggestion).toBeTruthy();

    const questions = await app.inject({
      method: "POST",
      url: "/api/v1/copilot/suggest-interview-questions",
      payload: { candidateId, jobId },
    });
    expect(questions.statusCode).toBe(200);
    expect(questions.json().evidence.missingSkills).toBeDefined();
    expect(questions.json().aiSuggestion.toLowerCase()).toContain("node");

    // Read-only: create relationship + stage, then copilot must not mutate
    const rel = await app.inject({
      method: "POST",
      url: "/api/v1/relationships",
      payload: { candidateId, jobId },
    });
    expect(rel.statusCode).toBe(201);
    const relId = rel.json().id as string;
    await app.inject({
      method: "PATCH",
      url: `/api/v1/relationships/${relId}`,
      payload: { stage: "Screening" },
    });

    await app.inject({
      method: "POST",
      url: "/api/v1/copilot/explain-match",
      payload: { candidateId, jobId },
    });

    const relReload = await app.inject({
      method: "GET",
      url: `/api/v1/relationships/${relId}`,
    });
    expect(relReload.json().currentStage).toBe("Screening");
    expect(relReload.json().stageHistory).toHaveLength(2);

    const cand = await app.inject({ method: "GET", url: `/api/v1/candidates/${candidateId}` });
    expect(cand.statusCode).toBe(200);
    const job = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` });
    expect(job.statusCode).toBe(200);
    expect(job.json().title).toBe("Copilot Job");
    expect((await app.inject({ method: "GET", url: "/health" })).json().status).toBe("ok");
  });
});
