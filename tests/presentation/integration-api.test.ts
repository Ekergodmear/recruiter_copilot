import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";

describe("EPIC-011 Integration API", () => {
  it("registry, preview/confirm/execute, atomicity, authz, providers", async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "intg-api-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_intg",
      GEMINI_API_KEY: "",
    });
    const app = await buildApp(createAppDependencies(config));

    // Register CSV
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/integrations",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { provider: "csv", displayName: "CSV Jobs" },
    });
    expect(created.statusCode).toBe(201);
    const integrationId = created.json().integrationId as string;
    expect(created.json().status).toBe("Enabled");

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/integrations",
      headers: { "x-actor-id": "viewer_alpha" },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().total).toBe(1);

    const csv = [
      "title,company,location,status,notes",
      "Platform Engineer,Acme,Remote,Open,from csv",
      "Data Analyst,Acme,Hanoi,Draft,from csv 2",
    ].join("\n");

    // Preview does not persist
    const preview = await app.inject({
      method: "POST",
      url: `/api/v1/integrations/${integrationId}/import/preview`,
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { payload: csv },
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().rowCount).toBe(2);

    const jobsBefore = await app.inject({
      method: "GET",
      url: "/api/v1/jobs",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    const totalBefore = jobsBefore.json().total as number;

    // Execute without confirm
    const noConfirm = await app.inject({
      method: "POST",
      url: `/api/v1/integrations/${integrationId}/import/execute`,
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { payload: csv },
    });
    expect(noConfirm.statusCode).toBe(403);

    // Execute success
    const exec = await app.inject({
      method: "POST",
      url: `/api/v1/integrations/${integrationId}/import/execute`,
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { payload: csv, confirmed: true },
    });
    expect(exec.statusCode).toBe(200);
    expect(exec.json().success).toBe(true);
    expect(exec.json().createdIds).toHaveLength(2);

    const jobsAfter = await app.inject({
      method: "GET",
      url: "/api/v1/jobs",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(jobsAfter.json().total).toBe(totalBefore + 2);

    // Atomicity — second row invalid status; first must be rolled back
    const badCsv = [
      "title,company,location,status,notes",
      "Should Rollback,Acme,Remote,Open,ok",
      "Bad Status Job,Acme,Remote,NotARealStatus,bad",
    ].join("\n");
    const beforeAtomic = (
      await app.inject({
        method: "GET",
        url: "/api/v1/jobs",
        headers: { "x-actor-id": "recruiter_alpha" },
      })
    ).json().total as number;

    const atomic = await app.inject({
      method: "POST",
      url: `/api/v1/integrations/${integrationId}/import/execute`,
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { payload: badCsv, confirmed: true },
    });
    expect(atomic.statusCode).toBe(400);
    expect(atomic.json().success).toBe(false);
    expect(atomic.json().createdIds).toEqual([]);

    const afterAtomic = (
      await app.inject({
        method: "GET",
        url: "/api/v1/jobs",
        headers: { "x-actor-id": "recruiter_alpha" },
      })
    ).json().total as number;
    expect(afterAtomic).toBe(beforeAtomic);

    // Disable blocks execute
    await app.inject({
      method: "PATCH",
      url: `/api/v1/integrations/${integrationId}`,
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { status: "Disabled" },
    });
    const disabledExec = await app.inject({
      method: "POST",
      url: `/api/v1/integrations/${integrationId}/import/execute`,
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { payload: csv, confirmed: true },
    });
    expect(disabledExec.statusCode).toBe(403);

    // Re-enable for export + other providers
    await app.inject({
      method: "PATCH",
      url: `/api/v1/integrations/${integrationId}`,
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { status: "Enabled" },
    });

    const exportExec = await app.inject({
      method: "POST",
      url: `/api/v1/integrations/${integrationId}/export/execute`,
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { confirmed: true, format: "csv" },
    });
    expect(exportExec.statusCode).toBe(200);
    expect(exportExec.json().exportedPayload).toContain("title,company");

    // ATS Mock
    const ats = await app.inject({
      method: "POST",
      url: "/api/v1/integrations",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { provider: "ats_mock", displayName: "ATS Mock" },
    });
    const atsId = ats.json().integrationId as string;
    const atsTest = await app.inject({
      method: "POST",
      url: `/api/v1/integrations/${atsId}/test-connection`,
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(atsTest.json().ok).toBe(true);
    const atsExec = await app.inject({
      method: "POST",
      url: `/api/v1/integrations/${atsId}/import/execute`,
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { payload: "mock", confirmed: true },
    });
    expect(atsExec.statusCode).toBe(200);
    expect(atsExec.json().createdIds.length).toBeGreaterThan(0);

    // Webhook export
    const wh = await app.inject({
      method: "POST",
      url: "/api/v1/integrations",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { provider: "webhook", config: { webhookUrl: "https://example.com/hook" } },
    });
    const whId = wh.json().integrationId as string;
    const whExport = await app.inject({
      method: "POST",
      url: `/api/v1/integrations/${whId}/export/execute`,
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { confirmed: true },
    });
    expect(whExport.statusCode).toBe(200);
    expect(JSON.parse(whExport.json().exportedPayload as string).provider).toBe("webhook");

    // Viewer cannot execute
    const viewerCreate = await app.inject({
      method: "POST",
      url: "/api/v1/integrations",
      headers: { "x-actor-id": "viewer_alpha" },
      payload: { provider: "csv" },
    });
    expect(viewerCreate.statusCode).toBe(403);

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json().status).toBe("ok");
  });
});
