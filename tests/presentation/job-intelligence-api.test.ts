import { describe, expect, it } from "vitest";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestDocx } from "../helpers/create-test-docx.js";

describe("EPIC-002 Job Intelligence API", () => {
  it("creates manual job with source, edits, searches, sorts; source immutable", async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "job-intel-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_job_intel",
    });
    const app = await buildApp(createAppDependencies(config));

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      payload: {
        title: "Backend Engineer",
        company: "Acme Intel",
        location: "HCM",
        employmentType: "full_time",
        salaryMin: 1000,
        salaryMax: 2000,
        status: "Open",
        notes: "Priority role",
      },
    });
    expect(created.statusCode).toBe(201);
    const job = created.json();
    expect(job.source).toBe("manual");
    expect(job.notes).toBe("Priority role");
    const jobId = job.id as string;

    const detail = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().source).toBe("manual");

    const patched = await app.inject({
      method: "PATCH",
      url: `/api/v1/jobs/${jobId}`,
      payload: {
        title: "Senior Backend Engineer",
        notes: "Updated note",
        status: "Paused",
      },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().title).toBe("Senior Backend Engineer");
    expect(patched.json().notes).toBe("Updated note");
    expect(patched.json().status).toBe("Paused");
    expect(patched.json().source).toBe("manual");

    // source is not an allowed PATCH field (immutable)
    const sourceAttempt = await app.inject({
      method: "PATCH",
      url: `/api/v1/jobs/${jobId}`,
      payload: { source: "import" },
    });
    expect(sourceAttempt.statusCode).toBe(400);

    const reload = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` });
    expect(reload.json().title).toBe("Senior Backend Engineer");
    expect(reload.json().source).toBe("manual");

    await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      payload: { title: "Frontend Engineer", company: "Beta Co", status: "Open" },
    });

    const byTitle = await app.inject({
      method: "GET",
      url: "/api/v1/jobs?q=Senior%20Backend",
    });
    expect(byTitle.json().items).toHaveLength(1);
    expect(byTitle.json().items[0].employmentType).toBeTruthy();

    const byCompany = await app.inject({
      method: "GET",
      url: "/api/v1/jobs?q=Beta",
    });
    expect(byCompany.json().items).toHaveLength(1);

    const sorted = await app.inject({
      method: "GET",
      url: "/api/v1/jobs?sort=updated",
    });
    expect(sorted.statusCode).toBe(200);
    expect(sorted.json().items.length).toBeGreaterThanOrEqual(2);

    // Candidate import still works (AC-9 smoke)
    const docx = await createTestDocx(["Job Intel Cand", "jic@example.com", "Go"]);
    const boundary = "----jib";
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

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.json().status).toBe("ok");
  });
});
