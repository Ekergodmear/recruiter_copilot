#!/usr/bin/env tsx
/**
 * EPIC-008 — Data integrity verification.
 *
 * Usage:
 *   pnpm verify:data
 *
 * Exit 0 when no errors (warnings allowed). Non-zero when errors found.
 *
 * Note: default process uses a fresh in-memory workspace. Smoke E2E invokes
 * DataIntegrityChecker against the populated demo workspace after workflow.
 */
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { AppConfig } from "../src/shared/config/index.js";
import { createAppDependencies } from "../src/app/server.js";
import { InMemoryTelemetryStore } from "../src/shared/telemetry/index.js";
import type { DataIntegrityReport } from "../src/modules/operations/founder-readiness/index.js";
import { getLogger, withOperation } from "../src/shared/logging/index.js";

export function formatIntegrityReport(report: DataIntegrityReport): string {
  const lines: string[] = [];
  for (const section of report.sections) {
    if (section.errors > 0) {
      lines.push(`✗ ${section.name} (${section.errors} error(s))`);
      for (const note of section.notes.slice(0, 5)) lines.push(`    - ${note}`);
    } else if (section.warnings > 0) {
      lines.push(`⚠ ${section.name} (${section.warnings} warning(s))`);
      for (const note of section.notes.slice(0, 5)) lines.push(`    - ${note}`);
    } else {
      lines.push(`✔ ${section.name}`);
    }
  }
  lines.push("");
  lines.push("Summary");
  lines.push(`Errors: ${report.errorCount}`);
  lines.push(`Warnings: ${report.warningCount}`);
  return lines.join("\n");
}

export async function runVerifyData(checker = createDefaultChecker()) {
  const logger = getLogger();
  const report = await withOperation(logger, "verify:data", async () => checker.check());
  console.log(formatIntegrityReport(report));
  return report;
}

function createDefaultChecker() {
  const root = mkdtempSync(join(tmpdir(), "verify-data-"));
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: join(root, "storage"),
    TELEMETRY_PATH: join(root, "telemetry.jsonl"),
    DEFAULT_WORKSPACE_ID: "ws_verify",
    NODE_ENV: "development",
  });
  const deps = createAppDependencies(config, new InMemoryTelemetryStore());
  return deps.dataIntegrityChecker;
}

const isDirect =
  process.argv[1] &&
  (process.argv[1].endsWith("verify-data.ts") || process.argv[1].endsWith("verify-data.js"));

if (isDirect) {
  runVerifyData()
    .then((report) => {
      process.exit(report.errorCount > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(2);
    });
}
