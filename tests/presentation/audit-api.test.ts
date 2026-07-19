import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { createTestDocx } from "../helpers/create-test-docx.js";

async function importCandidate(app: Awaited<ReturnType<typeof buildApp>>) {
  const docx = await createTestDocx([
    "Audit Cand",
    "audit@example.com",
    "React",
    "5 years of experience",
    "English B2",
  ]);
  const boundary = "----audit";
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

describe("EPIC-012 Audit API", () => {
  it("records automation/workflow/integration once; query + authz + immutability", async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "audit-api-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_audit",
      GEMINI_API_KEY: "",
    });
    const app = await buildApp(createAppDependencies(config));

    const candidateId = await importCandidate(app);
    const jobRes = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { title: "Audit Job", company: "A Co", status: "Open" },
    });
    const jobId = jobRes.json().id as string;
    const relRes = await app.inject({
      method: "POST",
      url: "/api/v1/relationships",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { candidateId, jobId },
    });
    const relationshipId = relRes.json().id as string;

    // Automation assign → exactly one automation.* audit (not relationship.assign)
    const assign = await app.inject({
      method: "POST",
      url: "/api/v1/automation/assign",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: {
        relationshipId,
        assigneeId: "recruiter_beta",
        actorId: "recruiter_alpha",
        confirmed: true,
      },
    });
    expect(assign.statusCode).toBe(200);
    const actionId = assign.json().actionId as string;

    let feed = await app.inject({
      method: "GET",
      url: "/api/v1/audit",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(feed.statusCode).toBe(200);
    let items = feed.json().items as Array<{
      auditId: string;
      action: string;
      source: string;
      outcome: string;
      correlation: { actionId?: string } | null;
    }>;
    const assignAudits = items.filter((a) => a.action === "automation.assign");
    expect(assignAudits).toHaveLength(1);
    expect(assignAudits[0]!.correlation?.actionId).toBe(actionId);
    expect(items.filter((a) => a.action === "relationship.assign")).toHaveLength(0);

    // Direct workflow PATCH → workflow.stage_changed once
    const stage = await app.inject({
      method: "PATCH",
      url: `/api/v1/relationships/${relationshipId}`,
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { stage: "Screening" },
    });
    expect(stage.statusCode).toBe(200);

    feed = await app.inject({
      method: "GET",
      url: "/api/v1/audit?action=workflow.stage_changed",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    items = feed.json().items;
    expect(items).toHaveLength(1);
    expect(items[0]!.source).toBe("workflow");

    // Automation stage_move → automation.stage_move once (not second workflow audit)
    const beforeAutoStage = (
      await app.inject({
        method: "GET",
        url: "/api/v1/audit",
        headers: { "x-actor-id": "recruiter_alpha" },
      })
    ).json().total as number;

    const autoStage = await app.inject({
      method: "POST",
      url: "/api/v1/automation/stage-move",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: {
        relationshipId,
        targetStage: "Technical Interview",
        actorId: "recruiter_alpha",
        confirmed: true,
      },
    });
    expect(autoStage.statusCode).toBe(200);

    feed = await app.inject({
      method: "GET",
      url: "/api/v1/audit",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(feed.json().total).toBe(beforeAutoStage + 1);
    expect(
      (feed.json().items as Array<{ action: string }>).filter(
        (a) => a.action === "automation.stage_move",
      ),
    ).toHaveLength(1);

    // Integration execute → one audit
    const intg = await app.inject({
      method: "POST",
      url: "/api/v1/integrations",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { provider: "ats_mock" },
    });
    const intgId = intg.json().integrationId as string;
    const intgExec = await app.inject({
      method: "POST",
      url: `/api/v1/integrations/${intgId}/import/execute`,
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { payload: "mock", confirmed: true },
    });
    expect(intgExec.statusCode).toBe(200);

    feed = await app.inject({
      method: "GET",
      url: "/api/v1/audit?source=integration",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(feed.json().items.length).toBeGreaterThanOrEqual(1);
    expect(feed.json().items[0].action).toBe("integration.import.execute");

    // Newest-first
    const all = await app.inject({
      method: "GET",
      url: "/api/v1/audit",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    const times = (all.json().items as Array<{ occurredAt: string }>).map((i) => i.occurredAt);
    for (let i = 1; i < times.length; i++) {
      expect(times[i - 1]! >= times[i]!).toBe(true);
    }

    // Viewer denied; no write routes
    const viewer = await app.inject({
      method: "GET",
      url: "/api/v1/audit",
      headers: { "x-actor-id": "viewer_alpha" },
    });
    expect(viewer.statusCode).toBe(403);

    const post = await app.inject({
      method: "POST",
      url: "/api/v1/audit",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { action: "spoof" },
    });
    expect([404, 405]).toContain(post.statusCode);

    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/audit/${all.json().items[0].auditId}`,
      headers: { "x-actor-id": "admin_alpha" },
    });
    expect([404, 405]).toContain(del.statusCode);

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json().status).toBe("ok");
  });
});
