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
import { ResumePreviewService } from "../../src/modules/candidate/application/resume-preview-service.js";
import { InMemoryCandidateRepository } from "../../src/modules/candidate/infrastructure/persistence/in-memory-candidate-repository.js";
import { InMemoryResumeRepository } from "../../src/modules/candidate/infrastructure/persistence/in-memory-resume-repository.js";
import { LocalStorageAdapter } from "../../src/modules/candidate/infrastructure/storage/local-storage-adapter.js";
import { createTestDocx } from "../helpers/create-test-docx.js";

describe("ResumePreviewService", () => {
  let previewService: ResumePreviewService;
  let candidateId: string;

  beforeEach(async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "preview-storage-"));
    const candidateRepository = new InMemoryCandidateRepository();
    const resumeRepository = new InMemoryResumeRepository();
    const storage = new LocalStorageAdapter(storagePath);

    const testConfig = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_test",
    });

    const importService = new CandidateImportService({
      config: testConfig,
      clock: new SystemClock(),
      idGenerator: new UuidIdGenerator(),
      storage,
      candidateRepository,
      resumeRepository,
      providerRegistry: new ProviderRegistry({
        knowledgeExtraction: "mock",
        summary: "mock",
        reasoning: "mock",
        embedding: "local",
      }),
      telemetry: new InMemoryTelemetryStore(),
    });

    previewService = new ResumePreviewService({
      candidateRepository,
      resumeRepository,
      storage,
    });

    const docx = await createTestDocx([
      "Jane Doe",
      "jane@example.com",
      "React",
      "Node.js",
      "8 years of experience",
    ]);

    const imported = await importService.importResume({
      file: docx,
      filename: "jane.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sourceType: "manual_upload",
      workspaceId: "ws_test",
    });
    candidateId = imported.candidateId;
  });

  it("returns resume metadata with docx viewer", async () => {
    const metadata = await previewService.getPreviewMetadata(candidateId);
    expect(metadata.viewerType).toBe("docx");
    expect(metadata.filename).toBe("jane.docx");
    expect(metadata.contentUrl).toContain("/resume/content");
  });

  it("renders docx preview as HTML", async () => {
    const rendered = await previewService.renderPreview(candidateId);
    expect(rendered.viewerType).toBe("docx");
    expect(rendered.contentType).toContain("text/html");
    expect(String(rendered.body)).toContain("Jane Doe");
  });
});
