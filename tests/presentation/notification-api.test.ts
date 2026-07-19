import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { createTestDocx } from "../helpers/create-test-docx.js";

async function importCandidate(app: Awaited<ReturnType<typeof buildApp>>) {
  const docx = await createTestDocx([
    "Notif Cand",
    "notif@example.com",
    "React",
    "5 years of experience",
    "English B2",
  ]);
  const boundary = "----notif";
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

describe("EPIC-010 Notification API", () => {
  it("assignment / workflow / automation / mention + read immutability + authz", async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "notif-api-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_notif",
      GEMINI_API_KEY: "",
    });
    const app = await buildApp(createAppDependencies(config));

    const candidateId = await importCandidate(app);
    const jobRes = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { title: "Notif Job", company: "N Co", status: "Open" },
    });
    const jobId = jobRes.json().id as string;
    const relRes = await app.inject({
      method: "POST",
      url: "/api/v1/relationships",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { candidateId, jobId },
    });
    const relationshipId = relRes.json().id as string;

    // AC-5 Assignment → assignee inbox
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

    const betaFeed = await app.inject({
      method: "GET",
      url: "/api/v1/notifications",
      headers: { "x-actor-id": "recruiter_beta" },
    });
    expect(betaFeed.statusCode).toBe(200);
    const betaItems = betaFeed.json().items as Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      createdAt: string;
      readAt: string | null;
      source: unknown;
      recipientId: string;
    }>;
    expect(betaItems.some((n) => n.type === "assignment")).toBe(true);

    // AC-7 Automation completed for actor
    const alphaFeed = await app.inject({
      method: "GET",
      url: "/api/v1/notifications",
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    expect(
      (alphaFeed.json().items as Array<{ type: string }>).some(
        (n) => n.type === "automation.completed",
      ),
    ).toBe(true);

    // AC-6 Workflow stage change → assignee
    const stage = await app.inject({
      method: "PATCH",
      url: `/api/v1/relationships/${relationshipId}`,
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: { stage: "Screening" },
    });
    expect(stage.statusCode).toBe(200);
    const betaAfterStage = await app.inject({
      method: "GET",
      url: "/api/v1/notifications?status=unread",
      headers: { "x-actor-id": "recruiter_beta" },
    });
    expect(
      (betaAfterStage.json().items as Array<{ type: string }>).some(
        (n) => n.type === "workflow.stage_changed",
      ),
    ).toBe(true);

    // AC-8 Mention
    const note = await app.inject({
      method: "POST",
      url: "/api/v1/collaboration/notes",
      headers: { "x-actor-id": "recruiter_alpha" },
      payload: {
        body: "Please check @recruiter_beta on this role",
        relationshipId,
      },
    });
    expect(note.statusCode).toBe(201);
    expect(note.json().mentionNotifications).toBe(1);

    // Viewer cannot create mentions
    const viewerNote = await app.inject({
      method: "POST",
      url: "/api/v1/collaboration/notes",
      headers: { "x-actor-id": "viewer_alpha" },
      payload: { body: "Hi @recruiter_alpha", relationshipId },
    });
    expect(viewerNote.statusCode).toBe(403);

    // AC-3 / AC-3b mark read immutability
    const assignment = betaItems.find((n) => n.type === "assignment")!;
    const marked = await app.inject({
      method: "POST",
      url: `/api/v1/notifications/${assignment.id}/read`,
      headers: { "x-actor-id": "recruiter_beta" },
    });
    expect(marked.statusCode).toBe(200);
    const markedBody = marked.json();
    expect(markedBody.readAt).toBeTruthy();
    expect(markedBody.type).toBe(assignment.type);
    expect(markedBody.title).toBe(assignment.title);
    expect(markedBody.body).toBe(assignment.body);
    expect(markedBody.createdAt).toBe(assignment.createdAt);
    expect(markedBody.source).toEqual(assignment.source);

    // Viewer can read feed + mark read
    const viewerFeed = await app.inject({
      method: "GET",
      url: "/api/v1/notifications",
      headers: { "x-actor-id": "viewer_alpha" },
    });
    expect(viewerFeed.statusCode).toBe(200);

    // AC-4 mark all
    const markAll = await app.inject({
      method: "POST",
      url: "/api/v1/notifications/read-all",
      headers: { "x-actor-id": "recruiter_beta" },
    });
    expect(markAll.statusCode).toBe(200);
    const afterAll = await app.inject({
      method: "GET",
      url: "/api/v1/notifications?status=unread",
      headers: { "x-actor-id": "recruiter_beta" },
    });
    expect(afterAll.json().items).toHaveLength(0);

    // /health public
    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json().status).toBe("ok");
  });
});
