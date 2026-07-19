import { describe, expect, it } from "vitest";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestDocx } from "../helpers/create-test-docx.js";

async function importCandidate(app: Awaited<ReturnType<typeof buildApp>>) {
  const docx = await createTestDocx([
    "Auth Cand",
    "authz@example.com",
    "React",
    "5 years of experience",
  ]);
  const boundary = "----authz";
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

describe("EPIC-009 Authorization API gate", () => {
  it("allows Recruiter; denies Viewer on automation/write; health stays open", async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "authz-api-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_authz",
    });
    const app = await buildApp(createAppDependencies(config));

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);

    const candidateId = await importCandidate(app);
    const jobRes = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { title: "Auth Job", company: "Auth Co", status: "Open" },
    });
    expect(jobRes.statusCode).toBe(201);
    const jobId = jobRes.json().id as string;

    const relRes = await app.inject({
      method: "POST",
      url: "/api/v1/relationships",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { candidateId, jobId },
    });
    expect(relRes.statusCode).toBe(201);
    const relationshipId = relRes.json().id as string;

    // Viewer can read analytics / candidates
    const viewerRead = await app.inject({
      method: "GET",
      url: "/api/v1/analytics/overview",
      headers: { "x-actor-id": "viewer_alpha" },
    });
    expect(viewerRead.statusCode).toBe(200);

    const viewerCand = await app.inject({
      method: "GET",
      url: `/api/v1/candidates/${candidateId}`,
      headers: { "x-actor-id": "viewer_alpha" },
    });
    expect(viewerCand.statusCode).toBe(200);

    // Viewer denied automation
    const viewerAuto = await app.inject({
      method: "POST",
      url: "/api/v1/automation/stage-move",
      headers: { "x-actor-id": "viewer_alpha" },
      payload: {
        relationshipId,
        targetStage: "Screening",
        actorId: "viewer_alpha",
        confirmed: true,
      },
    });
    expect(viewerAuto.statusCode).toBe(403);

    // Viewer denied candidate write
    const viewerWrite = await app.inject({
      method: "PATCH",
      url: `/api/v1/candidates/${candidateId}`,
      headers: { "x-actor-id": "viewer_alpha" },
      payload: { name: "Hacked" },
    });
    expect(viewerWrite.statusCode).toBe(403);

    // Recruiter can automate
    const recruiterAuto = await app.inject({
      method: "POST",
      url: "/api/v1/automation/stage-move",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: {
        relationshipId,
        targetStage: "Screening",
        actorId: "recruiter_alpha",
        confirmed: true,
      },
    });
    expect(recruiterAuto.statusCode).toBe(200);
    expect(recruiterAuto.json().success).toBe(true);

    // Copilot protected but allowed for viewer
    const viewerCopilot = await app.inject({
      method: "POST",
      url: "/api/v1/copilot/summarize-candidate",
      headers: { "x-actor-id": "viewer_alpha" },
      payload: { candidateId },
    });
    expect(viewerCopilot.statusCode).toBe(200);

    // Unknown actor denied
    const ghost = await app.inject({
      method: "GET",
      url: "/api/v1/jobs",
      headers: { "x-actor-id": "ghost_actor" },
    });
    expect(ghost.statusCode).toBe(403);
  });
});
