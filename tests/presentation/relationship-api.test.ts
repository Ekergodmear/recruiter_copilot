import { describe, expect, it } from "vitest";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestDocx } from "../helpers/create-test-docx.js";

async function importCandidate(app: Awaited<ReturnType<typeof buildApp>>, lines: string[]) {
  const docx = await createTestDocx(lines);
  const boundary = "----rel";
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

describe("EPIC-003 CandidateJobRelationship API", () => {
  it("creates relationship, lists by candidate/job, updates status, enforces uniqueness", async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "rel-api-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_rel",
    });
    const app = await buildApp(createAppDependencies(config));

    const c1 = await importCandidate(app, ["Rel Cand One", "rc1@example.com", "Go"]);
    const c2 = await importCandidate(app, ["Rel Cand Two", "rc2@example.com", "Rust"]);

    const job1 = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      payload: { title: "Rel Job A", company: "Rel Co", status: "Open" },
    });
    const job2 = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      payload: { title: "Rel Job B", company: "Rel Co", status: "Open" },
    });
    const jobId1 = job1.json().id as string;
    const jobId2 = job2.json().id as string;

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/relationships",
      payload: { candidateId: c1, jobId: jobId1, status: "Sourced" },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().status).toBe("Sourced");
    const relId = created.json().id as string;

    const dup = await app.inject({
      method: "POST",
      url: "/api/v1/relationships",
      payload: { candidateId: c1, jobId: jobId1, status: "Applied" },
    });
    expect(dup.statusCode).toBe(409);

    await app.inject({
      method: "POST",
      url: "/api/v1/relationships",
      payload: { candidateId: c1, jobId: jobId2, status: "Applied" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/relationships",
      payload: { candidateId: c2, jobId: jobId1, status: "Screening" },
    });

    const byCand = await app.inject({
      method: "GET",
      url: `/api/v1/candidates/${c1}/relationships`,
    });
    expect(byCand.statusCode).toBe(200);
    expect(byCand.json().items).toHaveLength(2);

    const byJob = await app.inject({
      method: "GET",
      url: `/api/v1/jobs/${jobId1}/relationships`,
    });
    expect(byJob.statusCode).toBe(200);
    expect(byJob.json().items).toHaveLength(2);

    const patched = await app.inject({
      method: "PATCH",
      url: `/api/v1/relationships/${relId}`,
      payload: { status: "Screening" },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().status).toBe("Screening");

    // Workspace + Job + Import regression smokes
    const ws = await app.inject({ method: "GET", url: `/api/v1/candidates/${c1}` });
    expect(ws.statusCode).toBe(200);
    const job = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId1}` });
    expect(job.statusCode).toBe(200);
    expect(job.json().source).toBe("manual");
    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.json().status).toBe("ok");
  });
});
