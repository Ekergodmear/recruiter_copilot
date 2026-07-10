import { describe, expect, it } from "vitest";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestDocx } from "../helpers/create-test-docx.js";

describe("POST /api/v1/candidates/import-resume", () => {
  it("returns candidate profile on multipart upload", async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "api-storage-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_api",
    });
    const app = await buildApp(createAppDependencies(config));

    const docx = await createTestDocx([
      "John Smith",
      "john@example.com",
      "Python",
      "Docker",
      "5 years of experience",
    ]);

    const boundary = "----cursorboundary";
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="john.docx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`,
      ),
      docx,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/candidates/import-resume",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    expect(response.statusCode).toBe(201);
    const json = response.json();
    expect(json.candidateId).toMatch(/^candidate_/);
    expect(json.name).toBeTruthy();
    expect(json.skills).toEqual(expect.arrayContaining(["Python", "Docker"]));
    expect(json.resumeVersion).toBe(1);
    expect(json.reviewUrl).toContain(`/api/v1/candidates/${json.candidateId}/review/ui`);
  });

  it("supports manual edit flow and mark ready", async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "api-edit-storage-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_api",
    });
    const app = await buildApp(createAppDependencies(config));

    const docx = await createTestDocx([
      "Alex Lee",
      "alex@example.com",
      "TypeScript",
      "React",
      "6 years of experience",
    ]);

    const boundary = "----cursorboundary";
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="alex.docx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`,
      ),
      docx,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const importResponse = await app.inject({
      method: "POST",
      url: "/api/v1/candidates/import-resume",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    const imported = importResponse.json();
    const candidateId = imported.candidateId as string;

    const reviewResponse = await app.inject({
      method: "GET",
      url: `/api/v1/candidates/${candidateId}/review`,
    });
    expect(reviewResponse.statusCode).toBe(200);
    const review = reviewResponse.json();
    expect(review.ready).toBe(false);
    expect(review.diff).toHaveLength(4);
    expect(review.diff[0]?.provenance?.source).toBeTruthy();
    expect(review.resume?.contentUrl).toContain("/resume/content");

    const resumeMeta = await app.inject({
      method: "GET",
      url: `/api/v1/candidates/${candidateId}/resume`,
    });
    expect(resumeMeta.statusCode).toBe(200);
    expect(resumeMeta.json().viewerType).toBe("docx");

    const resumeContent = await app.inject({
      method: "GET",
      url: `/api/v1/candidates/${candidateId}/resume/content`,
    });
    expect(resumeContent.statusCode).toBe(200);
    expect(resumeContent.headers["content-type"]).toContain("text/html");

    const editResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/candidates/${candidateId}/knowledge`,
      payload: {
        field: "english",
        humanValue: "C1",
        reason: "Wrong English",
        editDurationMs: 1000,
      },
    });
    expect(editResponse.statusCode).toBe(200);
    const edited = editResponse.json();
    expect(edited.diff.find((row: { field: string }) => row.field === "english")?.human).toBe("C1");

    const readyResponse = await app.inject({
      method: "POST",
      url: `/api/v1/candidates/${candidateId}/mark-ready`,
    });
    expect(readyResponse.statusCode).toBe(200);
    expect(readyResponse.json().ready).toBe(true);
  });
});
