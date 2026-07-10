import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppConfig } from "../../src/shared/config/index.js";
import { SystemClock } from "../../src/shared/clock/index.js";
import { UuidIdGenerator } from "../../src/shared/id-generator/id-generator.js";
import { InMemoryTelemetryStore } from "../../src/shared/telemetry/index.js";
import { ProviderRegistry } from "../../src/providers/registry.js";
import { CandidateImportService } from "../../src/modules/candidate/application/candidate-import-service.js";
import { InMemoryCandidateRepository } from "../../src/modules/candidate/infrastructure/persistence/in-memory-candidate-repository.js";
import { InMemoryResumeRepository } from "../../src/modules/candidate/infrastructure/persistence/in-memory-resume-repository.js";
import { LocalStorageAdapter } from "../../src/modules/candidate/infrastructure/storage/local-storage-adapter.js";
import { createTestDocx } from "../helpers/create-test-docx.js";

describe("CandidateImportService", () => {
  let service: CandidateImportService;
  let telemetry: InMemoryTelemetryStore;

  beforeEach(() => {
    const storagePath = mkdtempSync(join(tmpdir(), "resume-storage-"));
    telemetry = new InMemoryTelemetryStore();

    const testConfig = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_test",
    });

    service = new CandidateImportService({
      config: testConfig,
      clock: new SystemClock(),
      idGenerator: new UuidIdGenerator(),
      storage: new LocalStorageAdapter(storagePath),
      candidateRepository: new InMemoryCandidateRepository(),
      resumeRepository: new InMemoryResumeRepository(),
      providerRegistry: new ProviderRegistry({
        knowledgeExtraction: "mock",
        summary: "mock",
        reasoning: "mock",
        embedding: "local",
      }),
      telemetry,
    });
  });

  it("imports resume synchronously and returns candidate profile", async () => {
    const docx = await createTestDocx([
      "Jane Doe",
      "jane.doe@example.com",
      "+84912345678",
      "JavaScript",
      "React",
      "8 years of experience",
    ]);

    const result = await service.importResume({
      file: docx,
      filename: "jane.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sourceType: "manual_upload",
      workspaceId: "ws_test",
    });

    expect(result.candidateId).toMatch(/^candidate_/);
    expect(result.name).toBeTruthy();
    expect(result.skills.length).toBeGreaterThan(0);
    expect(result.resumeVersion).toBe(1);
    expect(result.summary).toContain("Jane");

    const events = telemetry.getEvents();
    expect(events.some((e) => e.event_type === "resume_import_completed")).toBe(true);
    expect(events.some((e) => e.event_type === "candidate_qualified")).toBe(false);
    expect(
      events.find((e) => e.event_type === "resume_import_completed")?.human_override_rate,
    ).toBe(0);
    expect(events.find((e) => e.event_type === "resume_import_completed")?.ai_acceptance_rate).toBe(
      1,
    );
  });

  it("rejects unsupported format", async () => {
    await expect(
      service.importResume({
        file: Buffer.from("plain"),
        filename: "bad.txt",
        mimeType: "text/plain",
        sourceType: "manual_upload",
        workspaceId: "ws_test",
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_FORMAT" });
  });
});
