import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { createTestDocx } from "../helpers/create-test-docx.js";

async function importCandidate(
  app: Awaited<ReturnType<typeof buildApp>>,
  lines: string[],
  filename = "c.docx",
) {
  const docx = await createTestDocx(lines);
  const boundary = "----search";
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`,
    ),
    docx,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/candidates/import-resume",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
      "x-actor-id": "recruiter_alpha",
    },
    payload: body,
  });
  expect(res.statusCode).toBe(201);
  return res.json().candidateId as string;
}

describe("EPIC-013 Search API", () => {
  it("searches, filters, paginates deterministically; saved searches; read-only SoT", async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "search-api-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_search",
      GEMINI_API_KEY: "",
    });
    const app = await buildApp(createAppDependencies(config));

    const c1 = await importCandidate(
      app,
      ["Alice Search", "alice@example.com", "React", "5 years of experience", "English B2"],
      "a.docx",
    );
    const c2 = await importCandidate(
      app,
      ["Bob Search", "bob@example.com", "Java", "8 years of experience", "English C1"],
      "b.docx",
    );

    const jobOpen = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: {
        title: "React Engineer",
        company: "Search Co",
        status: "Open",
        salaryMin: 1000,
        salaryMax: 3000,
      },
    });
    expect(jobOpen.statusCode).toBe(201);
    const jobId = jobOpen.json().id as string;
    await app.inject({
      method: "PATCH",
      url: `/api/v1/jobs/${jobId}`,
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { skills: ["React"] },
    });

    const jobPaused = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: {
        title: "Java Lead",
        company: "Other Co",
        status: "Paused",
      },
    });
    const pausedId = jobPaused.json().id as string;
    await app.inject({
      method: "PATCH",
      url: `/api/v1/jobs/${pausedId}`,
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { skills: ["Java"] },
    });

    const rel = await app.inject({
      method: "POST",
      url: "/api/v1/relationships",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { candidateId: c1, jobId },
    });
    const relationshipId = rel.json().id as string;
    await app.inject({
      method: "PATCH",
      url: `/api/v1/relationships/${relationshipId}`,
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { stage: "Screening" },
    });

    // Global text search
    const byQ = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=React",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(byQ.statusCode).toBe(200);
    const qItems = byQ.json().items as Array<{ type: string; id: string }>;
    expect(qItems.some((i) => i.type === "candidate" && i.id === c1)).toBe(true);
    expect(qItems.some((i) => i.type === "job" && i.id === jobId)).toBe(true);

    // Candidate skills filter
    const bySkill = await app.inject({
      method: "GET",
      url: "/api/v1/search?type=candidate&skills=React",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    const skillIds = (bySkill.json().items as Array<{ id: string }>).map((i) => i.id);
    expect(skillIds).toContain(c1);
    expect(skillIds).not.toContain(c2);

    // Job status filter
    const byStatus = await app.inject({
      method: "GET",
      url: "/api/v1/search?type=job&jobStatus=Paused",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(byStatus.json().items).toHaveLength(1);
    expect(byStatus.json().items[0].id).toBe(pausedId);

    // Workflow stage filter
    const byStage = await app.inject({
      method: "GET",
      url: "/api/v1/search?type=candidate&stage=Screening",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect((byStage.json().items as Array<{ id: string }>).map((i) => i.id)).toEqual([c1]);

    // Matching filter (read-only score on hit)
    const byMatch = await app.inject({
      method: "GET",
      url: `/api/v1/search?type=candidate&jobId=${jobId}&minMatchScore=0`,
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(byMatch.statusCode).toBe(200);
    const matchHit = (byMatch.json().items as Array<{ id: string; score: number | null }>).find(
      (i) => i.id === c1,
    );
    expect(matchHit).toBeTruthy();
    expect(typeof matchHit!.score).toBe("number");

    // Determinism: same query twice → same ordered ids
    const d1 = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=Search",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    const d2 = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=Search",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    const ids1 = (d1.json().items as Array<{ type: string; id: string }>).map(
      (i) => `${i.type}:${i.id}`,
    );
    const ids2 = (d2.json().items as Array<{ type: string; id: string }>).map(
      (i) => `${i.type}:${i.id}`,
    );
    expect(ids1).toEqual(ids2);
    // Default order: candidate before job, then id asc within type
    for (let i = 1; i < ids1.length; i++) {
      expect(ids1[i - 1]! <= ids1[i]!).toBe(true);
    }

    // Pagination stability
    const page1 = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=Search&limit=1&offset=0",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    const page2 = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=Search&limit=1&offset=1",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    const p1 = page1.json().items[0] as { id: string };
    const p2 = page2.json().items[0] as { id: string };
    expect(p1.id).not.toBe(p2.id);
    const allPaged = [p1.id, p2.id];
    expect(new Set(allPaged).size).toBe(2);
    expect(page1.json().total).toBe(page2.json().total);

    // Saved searches — definition only
    const saved = await app.inject({
      method: "POST",
      url: "/api/v1/search/saved",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { name: "React people", query: { type: "candidate", skills: ["React"] } },
    });
    expect(saved.statusCode).toBe(201);
    const savedId = saved.json().savedSearchId as string;
    expect(saved.json().query.skills).toEqual(["React"]);

    const listed = await app.inject({
      method: "GET",
      url: "/api/v1/search/saved",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(listed.json().total).toBe(1);

    const otherList = await app.inject({
      method: "GET",
      url: "/api/v1/search/saved",
      headers: { "x-actor-id": "recruiter_beta" },
    });
    expect(otherList.json().total).toBe(0);

    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/search/saved/${savedId}`,
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(del.statusCode).toBe(204);

    // AuthZ: unknown actor denied; Viewer allowed
    const ghost = await app.inject({
      method: "GET",
      url: "/api/v1/search",
      headers: { "x-actor-id": "ghost_unknown" },
    });
    expect(ghost.statusCode).toBe(403);
    const viewer = await app.inject({
      method: "GET",
      url: "/api/v1/search?type=job",
      headers: { "x-actor-id": "viewer_alpha" },
    });
    expect(viewer.statusCode).toBe(200);

    // Read-only SoT: search does not change job status
    const jobAfter = await app.inject({
      method: "GET",
      url: `/api/v1/jobs/${jobId}`,
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(jobAfter.json().status).toBe("Open");

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json().status).toBe("ok");
  });
});
