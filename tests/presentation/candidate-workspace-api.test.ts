import { describe, expect, it } from "vitest";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestDocx } from "../helpers/create-test-docx.js";

async function importCandidate(app: Awaited<ReturnType<typeof buildApp>>, lines: string[]) {
  const docx = await createTestDocx(lines);
  const boundary = "----cursorboundary";
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="c.docx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`,
    ),
    docx,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const imported = await app.inject({
    method: "POST",
    url: "/api/v1/candidates/import-resume",
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    payload: body,
  });
  expect(imported.statusCode).toBe(201);
  return imported.json().candidateId as string;
}

describe("EPIC-001 Candidate Workspace API", () => {
  it("gets workspace, patches allowed fields, persists after reload", async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "ws-api-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_api",
    });
    const app = await buildApp(createAppDependencies(config));

    const candidateId = await importCandidate(app, [
      "Workspace Person",
      "ws@example.com",
      "+84901234567",
      "Python",
      "3 years of experience",
    ]);

    const get1 = await app.inject({ method: "GET", url: `/api/v1/candidates/${candidateId}` });
    expect(get1.statusCode).toBe(200);
    const before = get1.json();
    expect(before.name).toBeTruthy();
    expect(before.email).toMatch(/example\.com/);

    const patch = await app.inject({
      method: "PATCH",
      url: `/api/v1/candidates/${candidateId}`,
      payload: {
        name: "Updated Name",
        phone: "+84909999999",
        email: "updated@example.com",
        salary: "2000 USD",
        note: "Strong backend",
      },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().name).toBe("Updated Name");
    expect(patch.json().salary).toBe("2000 USD");
    expect(patch.json().note).toBe("Strong backend");

    const get2 = await app.inject({ method: "GET", url: `/api/v1/candidates/${candidateId}` });
    expect(get2.json().name).toBe("Updated Name");
    expect(get2.json().phone).toBe("+84909999999");
    expect(get2.json().email).toBe("updated@example.com");
    expect(get2.json().salary).toBe("2000 USD");
    expect(get2.json().note).toBe("Strong backend");

    // Import path still works (AC-6 smoke)
    const again = await importCandidate(app, ["Another", "another@example.com", "Go"]);
    expect(again).toMatch(/^candidate_/);

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json().status).toBe("ok");
  });

  it("searches by name/email and sorts", async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "ws-list-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_api",
    });
    const app = await buildApp(createAppDependencies(config));

    const a = await importCandidate(app, ["Alpha One", "alpha@example.com", "Java"]);
    const b = await importCandidate(app, ["Beta Two", "beta@example.com", "Rust"]);
    await app.inject({ method: "POST", url: `/api/v1/candidates/${a}/mark-ready` });
    await app.inject({ method: "POST", url: `/api/v1/candidates/${b}/mark-ready` });

    await app.inject({
      method: "PATCH",
      url: `/api/v1/candidates/${a}`,
      payload: { note: "touched" },
    });

    const byEmail = await app.inject({
      method: "GET",
      url: "/api/v1/candidates?ready=true&q=beta@",
    });
    expect(byEmail.json().items).toHaveLength(1);
    expect(byEmail.json().items[0].candidateId).toBe(b);

    const byName = await app.inject({
      method: "GET",
      url: "/api/v1/candidates?ready=true&q=Alpha",
    });
    expect(byName.json().items[0].candidateId).toBe(a);

    const sorted = await app.inject({
      method: "GET",
      url: "/api/v1/candidates?ready=true&sort=updated",
    });
    expect(sorted.json().items[0].candidateId).toBe(a);
    expect(sorted.json().items[0]).toMatchObject({
      currentTitle: expect.any(String),
      company: expect.any(String),
      experience: expect.any(String),
      updatedAt: expect.any(String),
    });
  });
});
