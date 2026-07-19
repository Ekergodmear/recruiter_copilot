#!/usr/bin/env tsx
/**
 * TECH-005 — Security smoke (standalone).
 *
 *   pnpm security:smoke
 */
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildApp, createAppDependencies } from "../src/app/server.js";
import { AppConfig } from "../src/shared/config/index.js";
import { InMemoryTelemetryStore } from "../src/shared/telemetry/index.js";

type Step = { name: string; ok: boolean; detail: string };
const steps: Step[] = [];

function log(name: string, ok: boolean, detail: string) {
  steps.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name} — ${detail}`);
}

function noLeak(body: unknown): boolean {
  const s = JSON.stringify(body);
  return !/at\s+\S+\s+\(|node_modules|stack|\\\\Users\\\\|C:\\\\/i.test(s);
}

async function main() {
  const root = mkdtempSync(join(tmpdir(), "sec-smoke-"));
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: join(root, "storage"),
    TELEMETRY_PATH: join(root, "t.jsonl"),
    DEFAULT_WORKSPACE_ID: "ws_sec_smoke",
    NODE_ENV: "development",
    RATE_LIMIT_ENABLED: "true",
    RATE_LIMIT_MAX: "5",
    RATE_LIMIT_WINDOW_MS: "60000",
    MAX_FILE_SIZE_BYTES: "2048",
  });
  const app = await buildApp(createAppDependencies(config, new InMemoryTelemetryStore()));

  {
    const res = await app.inject({ method: "GET", url: "/health" });
    log(
      "security headers",
      res.statusCode === 200 &&
        res.headers["x-content-type-options"] === "nosniff" &&
        !res.headers["x-powered-by"],
      `status=${res.statusCode}`,
    );
  }

  {
    const boundary = "----s";
    const payload = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="x.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
      ),
      Buffer.from("not-pdf"),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/candidates/import-resume",
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    log(
      "corrupt pdf",
      res.statusCode === 422 && res.json().error === "CORRUPT_FILE" && noLeak(res.json()),
      `${res.statusCode} ${res.json().error}`,
    );
  }

  {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/candidates/not-a-valid-id/review",
    });
    log(
      "invalid id",
      res.statusCode === 400 && res.json().error === "INVALID_ID" && noLeak(res.json()),
      `${res.statusCode} ${res.json().error ?? "?"}`,
    );
  }

  {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/candidates/candidate_aaaaaaaaaaaa/mark-ready",
      payload: { reviewMode: "focus", evil: 1 },
    });
    log(
      "unexpected field",
      res.statusCode === 400 && res.json().error === "UNEXPECTED_FIELD" && noLeak(res.json()),
      `${res.statusCode} ${res.json().error}`,
    );
  }

  {
    let limited = false;
    for (let i = 0; i < 8; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/telemetry",
        payload: { event_type: "entry_screen", screen: "Home" },
      });
      if (res.statusCode === 429) {
        limited = res.json().error === "RATE_LIMITED";
        break;
      }
    }
    const health = await app.inject({ method: "GET", url: "/health" });
    log(
      "rate limit + health excluded",
      limited && health.statusCode === 200,
      `limited=${limited} health=${health.statusCode}`,
    );
  }

  await app.close();
  const failed = steps.filter((s) => !s.ok).length;
  console.log(`\n=== SECURITY SMOKE: ${steps.length - failed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
