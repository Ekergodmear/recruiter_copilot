import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { createTestDocx } from "../helpers/create-test-docx.js";

async function importCandidate(app: Awaited<ReturnType<typeof buildApp>>) {
  const docx = await createTestDocx([
    "Report Cand",
    "report@example.com",
    "React",
    "5 years of experience",
    "English B2",
  ]);
  const boundary = "----report";
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
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
      "x-actor-id": "recruiter_alpha",
    },
    payload: body,
  });
  expect(res.statusCode).toBe(201);
  return res.json().candidateId as string;
}

describe("EPIC-014 Report API", () => {
  it("overview + CSV export deterministic; read-only; authz", async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "report-api-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_report",
      GEMINI_API_KEY: "",
    });
    const app = await buildApp(createAppDependencies(config));

    const candidateId = await importCandidate(app);
    const job = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { title: "Report Job", company: "R Co", status: "Open" },
    });
    const jobId = job.json().id as string;
    const rel = await app.inject({
      method: "POST",
      url: "/api/v1/relationships",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { candidateId, jobId },
    });
    await app.inject({
      method: "PATCH",
      url: `/api/v1/relationships/${rel.json().id}`,
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { stage: "Screening" },
    });

    const overview = await app.inject({
      method: "GET",
      url: "/api/v1/reports/overview",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(overview.statusCode).toBe(200);
    expect(overview.json().counts.candidates).toBeGreaterThanOrEqual(1);
    expect(overview.json().counts.jobs).toBeGreaterThanOrEqual(1);

    const csv1 = await app.inject({
      method: "GET",
      url: "/api/v1/reports/export?kind=overview",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    const csv2 = await app.inject({
      method: "GET",
      url: "/api/v1/reports/export?kind=overview",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(csv1.statusCode).toBe(200);
    expect(csv1.headers["content-type"]).toContain("text/csv");
    expect(csv1.body).toBe(csv2.body);
    expect(csv1.body.startsWith("metric,value\n")).toBe(true);

    const candCsv = await app.inject({
      method: "GET",
      url: "/api/v1/reports/export?kind=candidates",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(candCsv.statusCode).toBe(200);
    expect(candCsv.body).toContain(candidateId);

    const jobCsv = await app.inject({
      method: "GET",
      url: "/api/v1/reports/export?kind=jobs",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(jobCsv.body).toContain(jobId);

    const auditCsv = await app.inject({
      method: "GET",
      url: "/api/v1/reports/export?kind=audit",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(auditCsv.statusCode).toBe(200);
    expect(auditCsv.body.startsWith("auditId,")).toBe(true);
    expect(auditCsv.body).toContain("workflow.stage_changed");

    const bad = await app.inject({
      method: "GET",
      url: "/api/v1/reports/export?kind=pdf",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(bad.statusCode).toBe(400);

    const ghost = await app.inject({
      method: "GET",
      url: "/api/v1/reports/overview",
      headers: { "x-actor-id": "ghost_unknown" },
    });
    expect(ghost.statusCode).toBe(403);

    const viewer = await app.inject({
      method: "GET",
      url: "/api/v1/reports/export?kind=jobs",
      headers: { "x-actor-id": "viewer_alpha" },
    });
    expect(viewer.statusCode).toBe(200);

    const jobAfter = await app.inject({
      method: "GET",
      url: `/api/v1/jobs/${jobId}`,
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(jobAfter.json().status).toBe("Open");

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
  });
});
