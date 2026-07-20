import { describe, expect, it, afterAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { AppConfig } from "../../src/shared/config/index.js";
import { createAppDependencies } from "../../src/app/server.js";
import { InMemoryTelemetryStore } from "../../src/shared/telemetry/index.js";
import { createTestDocx } from "../helpers/create-test-docx.js";
import { disconnectPrisma } from "../../src/infrastructure/persistence/prisma/prisma-client.js";

/**
 * Requires PostgreSQL:
 *   TEST_DATABASE_URL=postgresql://recruiter:recruiter@localhost:5432/recruiter_copilot_test?schema=public
 * CI provides this via the postgres service. Local unit CI without Postgres skips.
 */
const databaseUrl = process.env.TEST_DATABASE_URL?.trim();
const describePostgres = databaseUrl?.startsWith("postgres") ? describe : describe.skip;

describePostgres("Prisma persistence (PostgreSQL integration)", () => {
  afterAll(async () => {
    await disconnectPrisma();
  });

  it("persists candidate import across repository reads", async () => {
    execSync("pnpm exec prisma migrate deploy", {
      stdio: "pipe",
      env: { ...process.env, DATABASE_URL: databaseUrl! },
    });

    const root = mkdtempSync(join(tmpdir(), "prisma-it-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: join(root, "storage"),
      TELEMETRY_PATH: join(root, "t.jsonl"),
      DEFAULT_WORKSPACE_ID: "ws_prisma",
      NODE_ENV: "development",
      PERSISTENCE_DRIVER: "prisma",
      DATABASE_URL: databaseUrl!,
    });
    const deps = createAppDependencies(config, new InMemoryTelemetryStore());
    expect(deps.persistenceDriver).toBe("prisma");

    const docx = await createTestDocx([
      "Prisma Persist Candidate",
      "prisma@example.com",
      "TypeScript",
      "3 years of experience",
    ]);
    const imported = await deps.candidateImportService.importResume({
      file: docx,
      filename: "prisma.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sourceType: "manual_upload",
      workspaceId: "ws_prisma",
      actorId: "recruiter",
    });

    const list = await deps.candidateEditService.listCandidates({});
    expect(list.items.some((c) => c.candidateId === imported.candidateId)).toBe(true);

    const review = await deps.candidateEditService.getReview(imported.candidateId);
    expect(review.candidateId).toBe(imported.candidateId);

    const integrity = await deps.dataIntegrityChecker.check();
    expect(integrity.errorCount).toBe(0);
  });
});
