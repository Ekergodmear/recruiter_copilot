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
import { CandidateEditService } from "../../src/modules/candidate/application/candidate-edit-service.js";
import { ResumePreviewService } from "../../src/modules/candidate/application/resume-preview-service.js";
import { InMemoryCandidateRepository } from "../../src/modules/candidate/infrastructure/persistence/in-memory-candidate-repository.js";
import { InMemoryResumeRepository } from "../../src/modules/candidate/infrastructure/persistence/in-memory-resume-repository.js";
import { LocalStorageAdapter } from "../../src/modules/candidate/infrastructure/storage/local-storage-adapter.js";
import { createTestDocx } from "../helpers/create-test-docx.js";

describe("CandidateEditService", () => {
  let importService: CandidateImportService;
  let editService: CandidateEditService;
  let telemetry: InMemoryTelemetryStore;
  let candidateId: string;

  beforeEach(async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "edit-storage-"));
    telemetry = new InMemoryTelemetryStore();
    const candidateRepository = new InMemoryCandidateRepository();
    const resumeRepository = new InMemoryResumeRepository();
    const storage = new LocalStorageAdapter(storagePath);

    const testConfig = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      DEFAULT_WORKSPACE_ID: "ws_test",
    });

    const clock = new SystemClock();
    const idGenerator = new UuidIdGenerator();
    const providerRegistry = new ProviderRegistry({
      knowledgeExtraction: "mock",
      summary: "mock",
      reasoning: "mock",
      embedding: "local",
    });

    importService = new CandidateImportService({
      config: testConfig,
      clock,
      idGenerator,
      storage,
      candidateRepository,
      resumeRepository,
      providerRegistry,
      telemetry,
    });

    editService = new CandidateEditService({
      clock,
      idGenerator,
      candidateRepository,
      telemetry,
      resumePreviewService: new ResumePreviewService({
        candidateRepository,
        resumeRepository,
        storage,
      }),
    });

    const docx = await createTestDocx([
      "Jane Doe",
      "jane.doe@example.com",
      "JavaScript",
      "React",
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

  it("records knowledge revision without losing AI value", async () => {
    const review = await editService.editKnowledge({
      candidateId,
      field: "english",
      humanValue: "C1",
      reason: "Wrong English",
      actorId: "recruiter_alpha",
      editDurationMs: 4200,
    });

    const english = review.diff.find((row) => row.field === "english");
    expect(english?.ai).toBeTruthy();
    expect(english?.human).toBe("C1");
    expect(english?.provenance.source).toBe("Recruiter Review");
    expect(english?.status).toBe("HUMAN_VERIFIED");
    expect(review.aiAcceptanceRate).toBe(0.75);
    expect(review.resume?.viewerType).toBe("docx");

    const edited = telemetry.getEvents().find((e) => e.event_type === "knowledge_edited");
    const reviewed = telemetry.getEvents().find((e) => e.event_type === "knowledge_reviewed");
    expect(edited?.candidate_id).toBe(candidateId);
    expect(reviewed?.review_action).toBe("edit");
    expect(edited?.field_name).toBe("english");
    expect(edited?.ai_value).toBe(english?.ai);
    expect(edited?.human_value).toBe("C1");
    expect(edited?.override_reason).toBe("Wrong English");
    expect(edited?.edit_duration_ms).toBe(4200);
  });

  it("emits candidate_qualified only when marked ready", async () => {
    expect(telemetry.getEvents().some((e) => e.event_type === "candidate_qualified")).toBe(false);

    const review = await editService.markCandidateReady({
      candidateId,
      actorId: "recruiter_alpha",
    });

    expect(review.ready).toBe(true);
    expect(review.ttqcMs).toBeGreaterThanOrEqual(0);

    const qualified = telemetry.getEvents().find((e) => e.event_type === "candidate_qualified");
    expect(qualified?.candidate_id).toBe(candidateId);
    expect(qualified?.ai_acceptance_rate).toBe(1);
    expect(qualified?.verification_rate).toBe(1);
    expect(qualified?.review_completion_rate).toBe(0);
    expect(qualified?.ttqc_ms).toBeGreaterThanOrEqual(0);
  });
});
