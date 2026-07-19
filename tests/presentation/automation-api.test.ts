import { describe, expect, it } from "vitest";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestDocx } from "../helpers/create-test-docx.js";

async function importCandidate(app: Awaited<ReturnType<typeof buildApp>>, lines: string[]) {
  const docx = await createTestDocx(lines);
  const boundary = "----auto";
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

describe("EPIC-008 Automation API", () => {
  it("executes confirmed stage move, assign, send; auth + idempotency + Action Result", async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "automation-api-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_automation",
    });
    const app = await buildApp(createAppDependencies(config));

    const candidateId = await importCandidate(app, [
      "Auto Cand",
      "auto@example.com",
      "React",
      "5 years of experience",
      "English B2",
    ]);
    const jobRes = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      payload: { title: "Auto Job", company: "Auto Co", status: "Open" },
    });
    const jobId = jobRes.json().id as string;
    const relRes = await app.inject({
      method: "POST",
      url: "/api/v1/relationships",
      payload: { candidateId, jobId },
    });
    const relationshipId = relRes.json().id as string;
    expect(relRes.json().assigneeId).toBeNull();

    // Auth: missing confirmation
    const unconfirmed = await app.inject({
      method: "POST",
      url: "/api/v1/automation/stage-move",
      payload: {
        relationshipId,
        targetStage: "Screening",
        actorId: "recruiter_alpha",
      },
    });
    expect(unconfirmed.statusCode).toBe(403);

    // Auth: missing actor
    const noActor = await app.inject({
      method: "POST",
      url: "/api/v1/automation/stage-move",
      payload: {
        relationshipId,
        targetStage: "Screening",
        confirmed: true,
      },
    });
    expect(noActor.statusCode).toBe(403);

    const move = await app.inject({
      method: "POST",
      url: "/api/v1/automation/stage-move",
      payload: {
        relationshipId,
        targetStage: "Screening",
        actorId: "recruiter_alpha",
        confirmed: true,
      },
    });
    expect(move.statusCode).toBe(200);
    const moveBody = move.json();
    expect(moveBody.success).toBe(true);
    expect(moveBody.actionType).toBe("stage_move");
    expect(moveBody.actorId).toBe("recruiter_alpha");
    expect(moveBody.actionId).toBeTruthy();
    expect(moveBody.executedAt).toBeTruthy();
    expect(moveBody.noop).toBe(false);

    const relAfterMove = await app.inject({
      method: "GET",
      url: `/api/v1/relationships/${relationshipId}`,
    });
    expect(relAfterMove.json().currentStage).toBe("Screening");
    const historyLen = relAfterMove.json().stageHistory.length as number;

    // Idempotent stage move
    const moveSame = await app.inject({
      method: "POST",
      url: "/api/v1/automation/stage-move",
      payload: {
        relationshipId,
        targetStage: "Screening",
        actorId: "recruiter_alpha",
        confirmed: true,
      },
    });
    expect(moveSame.statusCode).toBe(200);
    expect(moveSame.json().success).toBe(true);
    expect(moveSame.json().noop).toBe(true);
    const relAgain = await app.inject({
      method: "GET",
      url: `/api/v1/relationships/${relationshipId}`,
    });
    expect(relAgain.json().stageHistory.length).toBe(historyLen);

    const assign = await app.inject({
      method: "POST",
      url: "/api/v1/automation/assign",
      payload: {
        relationshipId,
        assigneeId: "recruiter_beta",
        actorId: "recruiter_alpha",
        confirmed: true,
      },
    });
    expect(assign.statusCode).toBe(200);
    expect(assign.json().success).toBe(true);
    expect(assign.json().noop).toBe(false);
    expect(
      (
        await app.inject({
          method: "GET",
          url: `/api/v1/relationships/${relationshipId}`,
        })
      ).json().assigneeId,
    ).toBe("recruiter_beta");

    const assignSame = await app.inject({
      method: "POST",
      url: "/api/v1/automation/assign",
      payload: {
        relationshipId,
        assigneeId: "recruiter_beta",
        actorId: "recruiter_alpha",
        confirmed: true,
      },
    });
    expect(assignSame.statusCode).toBe(200);
    expect(assignSame.json().noop).toBe(true);

    const draft = await app.inject({
      method: "POST",
      url: "/api/v1/copilot/draft-outreach",
      payload: { candidateId, jobId },
    });
    expect(draft.statusCode).toBe(200);
    const draftBody = draft.json().aiSuggestion as string;
    expect(draftBody.length).toBeGreaterThan(0);

    const send = await app.inject({
      method: "POST",
      url: "/api/v1/automation/send-outreach",
      payload: {
        relationshipId,
        draftBody,
        actorId: "recruiter_alpha",
        confirmed: true,
      },
    });
    expect(send.statusCode).toBe(200);
    expect(send.json().success).toBe(true);
    expect(send.json().target.draftFingerprint).toBeTruthy();

    const sendAgain = await app.inject({
      method: "POST",
      url: "/api/v1/automation/send-outreach",
      payload: {
        relationshipId,
        draftBody,
        actorId: "recruiter_alpha",
        confirmed: true,
      },
    });
    expect(sendAgain.statusCode).toBe(409);
    expect(sendAgain.json().success).toBe(false);
    expect(sendAgain.json().error.code).toBe("ALREADY_SENT");

    // Matching / analytics still work (smoke)
    const match = await app.inject({
      method: "GET",
      url: `/api/v1/matching?candidateId=${candidateId}&jobId=${jobId}`,
    });
    expect(match.statusCode).toBe(200);
    const analytics = await app.inject({ method: "GET", url: "/api/v1/analytics/overview" });
    expect(analytics.statusCode).toBe(200);
  });
});
