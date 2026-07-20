import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { InMemoryTelemetryStore } from "../../src/shared/telemetry/index.js";
import { createTestDocx } from "../helpers/create-test-docx.js";
import { sanitizeUploadFilename, validateResumeUpload } from "../../src/shared/security/index.js";

function testConfig(overrides: Record<string, string> = {}) {
  const root = mkdtempSync(join(tmpdir(), "sec-"));
  return AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: join(root, "storage"),
    TELEMETRY_PATH: join(root, "t.jsonl"),
    DEFAULT_WORKSPACE_ID: "ws_sec",
    NODE_ENV: "development",
    RATE_LIMIT_ENABLED: "false",
    ...overrides,
  });
}

function multipartPayload(
  filename: string,
  contentType: string,
  file: Buffer,
): { headers: Record<string, string>; payload: Buffer } {
  const boundary = "----secboundary";
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
    ),
    file,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return {
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    payload,
  };
}

describe("TECH-005 security hardening", () => {
  it("sets security headers and hides powered-by", async () => {
    const app = await buildApp(createAppDependencies(testConfig(), new InMemoryTelemetryStore()));
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'self'");
    expect(res.headers["content-security-policy"]).toContain("frame-src 'self'");
    expect(res.headers["permissions-policy"]).toContain("camera=()");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    await app.close();
  });

  it("rejects bad mime / extension mismatch and empty upload", async () => {
    await expect(
      validateResumeUpload({
        buffer: Buffer.from(""),
        filename: "a.pdf",
        maxFileSizeBytes: 1024,
      }),
    ).rejects.toMatchObject({ code: "EMPTY_FILE" });

    await expect(
      validateResumeUpload({
        buffer: Buffer.from("%PDF-1.4"),
        filename: "a.exe",
        maxFileSizeBytes: 1024,
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_FORMAT" });

    await expect(
      validateResumeUpload({
        buffer: Buffer.from("%PDF-1.4"),
        filename: "a.pdf",
        reportedMime: "application/x-msdownload",
        maxFileSizeBytes: 1024,
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_FORMAT" });
  });

  it("rejects corrupted PDF and DOCX", async () => {
    await expect(
      validateResumeUpload({
        buffer: Buffer.from("not a pdf"),
        filename: "bad.pdf",
        reportedMime: "application/pdf",
        maxFileSizeBytes: 1024,
      }),
    ).rejects.toMatchObject({ code: "CORRUPT_FILE" });

    await expect(
      validateResumeUpload({
        buffer: Buffer.from("PK\x03\x04notzip"),
        filename: "bad.docx",
        reportedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        maxFileSizeBytes: 1024,
      }),
    ).rejects.toMatchObject({ code: "CORRUPT_FILE" });
  });

  it("sanitizes path traversal filenames", () => {
    expect(sanitizeUploadFilename("../../etc/passwd.pdf")).toBe("passwd.pdf");
    expect(sanitizeUploadFilename("..\\..\\secret.docx")).toBe("secret.docx");
  });

  it("rejects invalid resource id and unexpected JSON fields via API", async () => {
    const app = await buildApp(createAppDependencies(testConfig(), new InMemoryTelemetryStore()));

    const badId = await app.inject({
      method: "GET",
      url: "/api/v1/candidates/not-a-valid-id/review",
    });
    expect(badId.statusCode).toBe(400);
    expect(badId.json().error).toBe("INVALID_ID");
    expect(JSON.stringify(badId.json())).not.toMatch(/stack|node_modules|\\\\/);

    const unexpected = await app.inject({
      method: "POST",
      url: "/api/v1/candidates/candidate_aaaaaaaaaaaa/knowledge/review",
      payload: { field: "summary", action: "accept", hacker: true },
    });
    expect(unexpected.statusCode).toBe(400);
    expect(unexpected.json().error).toBe("UNEXPECTED_FIELD");

    await app.close();
  });

  it("rejects oversized uploads without leaking stack", async () => {
    const app = await buildApp(
      createAppDependencies(
        testConfig({ MAX_FILE_SIZE_BYTES: "512" }),
        new InMemoryTelemetryStore(),
      ),
    );

    const huge = Buffer.alloc(2048, 1);
    const oversized = await app.inject({
      method: "POST",
      url: "/api/v1/candidates/import-resume",
      ...multipartPayload("big.pdf", "application/pdf", huge),
    });
    expect([400, 413, 500]).toContain(oversized.statusCode);
    const overBody = oversized.json() as { error?: string; message?: string; stack?: string };
    expect(overBody.stack).toBeUndefined();
    expect(JSON.stringify(overBody)).not.toMatch(/at\s+\S+\s+\(/);
    await app.close();
  });

  it("rejects corrupt PDF and accepts valid DOCX at HTTP boundary", async () => {
    const app = await buildApp(createAppDependencies(testConfig(), new InMemoryTelemetryStore()));

    const corrupt = await app.inject({
      method: "POST",
      url: "/api/v1/candidates/import-resume",
      ...multipartPayload("x.pdf", "application/pdf", Buffer.from("nope")),
    });
    expect(corrupt.statusCode).toBe(422);
    expect(corrupt.json().error).toBe("CORRUPT_FILE");

    const okDocx = await createTestDocx(["Security Candidate", "sec@example.com", "TypeScript"]);
    const ok = await app.inject({
      method: "POST",
      url: "/api/v1/candidates/import-resume",
      ...multipartPayload(
        "ok.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        okDocx,
      ),
    });
    expect(ok.statusCode).toBe(201);

    await app.close();
  });

  it("rate limits mutating endpoints and excludes /health", async () => {
    const app = await buildApp(
      createAppDependencies(
        testConfig({
          RATE_LIMIT_ENABLED: "true",
          RATE_LIMIT_MAX: "3",
          RATE_LIMIT_WINDOW_MS: "60000",
        }),
        new InMemoryTelemetryStore(),
      ),
    );

    for (let i = 0; i < 3; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/telemetry",
        payload: { event_type: "entry_screen", screen: "Home" },
      });
      expect(res.statusCode).toBe(200);
    }
    const limited = await app.inject({
      method: "POST",
      url: "/api/v1/telemetry",
      payload: { event_type: "entry_screen", screen: "Home" },
    });
    expect(limited.statusCode).toBe(429);
    expect(limited.json().error).toBe("RATE_LIMITED");

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);

    await app.close();
  });
});
