import { describe, expect, it } from "vitest";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestDocx } from "../helpers/create-test-docx.js";

async function importCandidate(app: Awaited<ReturnType<typeof buildApp>>, lines: string[]) {
  const docx = await createTestDocx(lines);
  const boundary = "----wf";
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

describe("EPIC-004 Recruiter Workflow API", () => {
  it("inits Sourced + history, moves stage, filters/groups by stage", async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "wf-api-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_wf",
    });
    const app = await buildApp(createAppDependencies(config));

    const c1 = await importCandidate(app, ["Wf Cand One", "wf1@example.com", "Go"]);
    const c2 = await importCandidate(app, ["Wf Cand Two", "wf2@example.com", "Rust"]);

    const jobRes = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      payload: { title: "Wf Job", company: "Wf Co", status: "Open" },
    });
    const jobId = jobRes.json().id as string;

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/relationships",
      payload: { candidateId: c1, jobId },
    });
    expect(created.statusCode).toBe(201);
    const body = created.json();
    expect(body.currentStage).toBe("Sourced");
    expect(body.status).toBe("Sourced");
    expect(body.stageHistory).toHaveLength(1);
    expect(body.stageHistory[0].previousStage).toBeNull();
    expect(body.stageHistory[0].newStage).toBe("Sourced");
    const relId = body.id as string;

    const moved = await app.inject({
      method: "PATCH",
      url: `/api/v1/relationships/${relId}`,
      payload: { stage: "Technical Interview" },
    });
    expect(moved.statusCode).toBe(200);
    expect(moved.json().currentStage).toBe("Technical Interview");
    expect(moved.json().status).toBe("Technical Interview");
    expect(moved.json().stageHistory).toHaveLength(2);
    expect(moved.json().stageHistory[1].previousStage).toBe("Sourced");
    expect(moved.json().stageHistory[1].newStage).toBe("Technical Interview");

    const latest = moved.json().stageHistory.at(-1);
    expect(moved.json().currentStage).toBe(latest.newStage);

    // EPIC-003 status alias still moves stage + appends history
    const viaStatus = await app.inject({
      method: "PATCH",
      url: `/api/v1/relationships/${relId}`,
      payload: { status: "Offer" },
    });
    expect(viaStatus.statusCode).toBe(200);
    expect(viaStatus.json().stageHistory).toHaveLength(3);
    expect(viaStatus.json().currentStage).toBe("Offer");

    await app.inject({
      method: "POST",
      url: "/api/v1/relationships",
      payload: { candidateId: c2, jobId, status: "Screening" },
    });

    const filtered = await app.inject({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/relationships?stage=Offer`,
    });
    expect(filtered.statusCode).toBe(200);
    expect(filtered.json().items).toHaveLength(1);
    expect(filtered.json().items[0].id).toBe(relId);

    const grouped = await app.inject({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/relationships?groupBy=stage`,
    });
    expect(grouped.statusCode).toBe(200);
    expect(grouped.json().groups.Offer).toHaveLength(1);
    expect(grouped.json().groups.Screening).toHaveLength(1);
    expect(grouped.json().total).toBe(2);

    const detail = await app.inject({
      method: "GET",
      url: `/api/v1/relationships/${relId}`,
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().stageHistory.length).toBeGreaterThanOrEqual(3);

    // Regression smokes
    expect((await app.inject({ method: "GET", url: `/api/v1/candidates/${c1}` })).statusCode).toBe(
      200,
    );
    expect((await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` })).statusCode).toBe(
      200,
    );
    expect(
      (await app.inject({ method: "GET", url: `/api/v1/candidates/${c1}/relationships` }))
        .statusCode,
    ).toBe(200);
    expect((await app.inject({ method: "GET", url: "/health" })).json().status).toBe("ok");
  });
});
