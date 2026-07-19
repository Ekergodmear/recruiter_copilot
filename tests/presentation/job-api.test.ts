import { describe, expect, it, beforeEach } from "vitest";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { InMemoryTelemetryStore } from "../../src/shared/telemetry/index.js";
import { createTestDocx } from "../helpers/create-test-docx.js";

describe("Job APIs", () => {
  let telemetry: InMemoryTelemetryStore;

  beforeEach(() => {
    telemetry = new InMemoryTelemetryStore();
  });

  it("creates job from pasted JD, reviews, marks ready, matches and submits", async () => {
    const config = AppConfig.fromEnv({
      ...process.env,
      DEFAULT_WORKSPACE_ID: "ws_job_test",
    });
    const deps = createAppDependencies(config, telemetry);
    const app = await buildApp(deps);

    const jd = `React Developer
Company: Beta Soft
Location: Remote
5 years experience
Skills: React, TypeScript, Node
English B2
Salary: USD 1500 - 2500
Responsibilities:
Ship features
Requirements:
Strong React
Benefits:
Remote work`;

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      payload: { text: jd, company: "Beta Soft" },
    });
    expect(createRes.statusCode).toBe(201);
    const job = createRes.json();
    expect(job.id).toMatch(/^job_/);

    const reviewRes = await app.inject({
      method: "GET",
      url: `/api/v1/jobs/${job.id}/review`,
    });
    expect(reviewRes.statusCode).toBe(200);
    expect(reviewRes.json().diff.length).toBeGreaterThan(0);

    await app.inject({
      method: "POST",
      url: `/api/v1/jobs/${job.id}/review`,
      payload: { field: "title", action: "edit", humanValue: "Senior React Developer" },
    });

    const readyRes = await app.inject({
      method: "POST",
      url: `/api/v1/jobs/${job.id}/mark-ready`,
    });
    expect(readyRes.statusCode).toBe(200);
    expect(readyRes.json().ready).toBe(true);
    expect(readyRes.json().status).toBe("Open");

    const docx = await createTestDocx([
      "Jane Doe",
      "jane.doe@example.com",
      "React",
      "TypeScript",
      "5 years of experience",
    ]);
    const imported = await deps.candidateImportService.importResume({
      file: docx,
      filename: "jane.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sourceType: "manual_upload",
      workspaceId: "ws_job_test",
      actorId: "recruiter_alpha",
    });
    await deps.candidateEditService.markCandidateReady({
      candidateId: imported.candidateId,
      actorId: "recruiter_alpha",
    });

    const matches = await app.inject({
      method: "GET",
      url: `/api/v1/jobs/${job.id}/matches`,
    });
    expect(matches.statusCode).toBe(200);
    expect(matches.json().items.length).toBeGreaterThanOrEqual(1);
    expect(matches.json().items[0].score).toBeGreaterThan(0);

    const submit = await app.inject({
      method: "POST",
      url: `/api/v1/jobs/${job.id}/submissions`,
      payload: { candidateId: imported.candidateId, notes: "Good fit" },
    });
    expect(submit.statusCode).toBe(201);
    expect(submit.json().status).toBe("Submitted");

    const list = await app.inject({ method: "GET", url: "/api/v1/jobs" });
    expect(list.json().items.some((j: { id: string }) => j.id === job.id)).toBe(true);

    const subs = await app.inject({
      method: "GET",
      url: `/api/v1/jobs/${job.id}/submissions`,
    });
    expect(subs.json().total).toBe(1);

    expect(telemetry.getEvents().some((e) => e.event_type === "job_created")).toBe(true);
    expect(telemetry.getEvents().some((e) => e.event_type === "job_ready")).toBe(true);
  });

  it("soft deletes job", async () => {
    const config = AppConfig.fromEnv();
    const deps = createAppDependencies(config, telemetry);
    const app = await buildApp(deps);

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      payload: { text: "Backend Engineer\nCompany: Z\nPython 3 years" },
    });
    const id = created.json().id;

    const del = await app.inject({ method: "DELETE", url: `/api/v1/jobs/${id}` });
    expect(del.statusCode).toBe(204);

    const get = await app.inject({ method: "GET", url: `/api/v1/jobs/${id}` });
    expect(get.statusCode).toBe(404);
  });
});
