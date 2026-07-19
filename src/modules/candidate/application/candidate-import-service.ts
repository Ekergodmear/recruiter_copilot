import { processResume } from "../../resume-processing/pipeline.js";
import type { AppConfig } from "../../../shared/config/index.js";
import type { Clock } from "../../../shared/clock/index.js";
import type { IdGenerator } from "../../../shared/id-generator/index.js";
import { validateAgainstContract } from "../../../shared/contracts/validator.js";
import {
  computeAiAcceptanceRate,
  computeHumanOverrideRate,
  createTelemetryEvent,
  type TelemetryStore,
} from "../../../shared/telemetry/index.js";
import {
  isEnabled,
  loadFeatureFlagsFile,
  resolveFeatureFlags,
} from "../../../shared/feature-flags/index.js";
import type { ProviderRegistry } from "../../../providers/registry.js";
import { Candidate } from "../domain/candidate/candidate.js";
import { CandidateId } from "../domain/candidate/candidate-id.js";
import { CandidateProfile } from "../domain/candidate/candidate-profile.js";
import { Resume } from "../domain/resume/resume.js";
import { ResumeId } from "../domain/resume/resume-id.js";
import { ResumeMetadata } from "../domain/resume/resume-metadata.js";
import { ResumeVersion } from "../domain/resume/resume-version.js";
import type { CandidateRepository } from "../infrastructure/persistence/candidate-repository.js";
import type { ResumeRepository } from "../infrastructure/persistence/resume-repository.js";
import type { StoragePort } from "../infrastructure/storage/storage-port.js";
import { KnowledgeContractExecutor } from "./knowledge-contract-executor.js";
import {
  ImportResumeError,
  type ImportResumeCommand,
  type ImportResumeResult,
} from "./import-resume-command.js";
import { CandidateRecord } from "../domain/candidate/candidate-record.js";
import { VerifiedKnowledge } from "../domain/knowledge/verified-knowledge.js";
import { toCandidateProfileView } from "../presentation/candidate-profile-view.js";
import type { KnowledgeEvolutionService } from "../../knowledge/application/knowledge-evolution-service.js";
import { CandidateIdentityService } from "./identity/candidate-identity-service.js";
import { createHash } from "node:crypto";
import { emitOperationFailed } from "../../operations/founder-readiness/operation-failed.js";

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export class CandidateImportService {
  private readonly contractExecutor = new KnowledgeContractExecutor();
  private readonly identityService = new CandidateIdentityService();
  /** In-flight dedupe: retry of the same payload in the same request does not create a second record. */
  private readonly inflight = new Map<string, Promise<ImportResumeResult>>();

  constructor(
    private readonly deps: {
      config: AppConfig;
      clock: Clock;
      idGenerator: IdGenerator;
      storage: StoragePort;
      candidateRepository: CandidateRepository;
      resumeRepository: ResumeRepository;
      providerRegistry: ProviderRegistry;
      telemetry: TelemetryStore;
      knowledgeEvolution?: KnowledgeEvolutionService;
    },
  ) {}

  async importResume(command: ImportResumeCommand): Promise<ImportResumeResult> {
    const key = `${command.workspaceId}:${createHash("sha256").update(command.file).digest("hex")}:${command.filename}`;
    const existing = this.inflight.get(key);
    if (existing) return existing;

    const promise = this.runImport(command).finally(() => {
      this.inflight.delete(key);
    });
    this.inflight.set(key, promise);
    return promise;
  }

  private async runImport(command: ImportResumeCommand): Promise<ImportResumeResult> {
    const startedAt = this.deps.clock.now();
    try {
      return await this.executeImport(command, startedAt);
    } catch (error) {
      const code = error instanceof ImportResumeError ? error.code : "INTERNAL_ERROR";
      const traceId = this.deps.idGenerator.generateId("trace");
      const correlationId = this.deps.idGenerator.generateId("corr");
      this.deps.telemetry.record(
        createTelemetryEvent(
          {
            event_type: "resume_import_failed",
            trace_id: traceId,
            correlation_id: correlationId,
            workspace_id: command.workspaceId,
            actor_id: command.actorId ?? "recruiter_alpha",
            latency_ms: Math.max(0, this.deps.clock.now().getTime() - startedAt.getTime()),
            error_code: code,
            outcome: "failed",
          },
          this.deps.clock,
        ),
      );
      emitOperationFailed(this.deps, {
        operation: "import_resume",
        errorCode: code,
        traceId,
        correlationId,
        workspaceId: command.workspaceId,
        actorId: command.actorId ?? "recruiter_alpha",
      });
      throw error;
    }
  }

  private async executeImport(
    command: ImportResumeCommand,
    startedAt: Date,
  ): Promise<ImportResumeResult> {
    this.validate(command);

    const traceId = this.deps.idGenerator.generateId("trace");
    const correlationId = this.deps.idGenerator.generateId("corr");
    const candidateId = CandidateId.create(this.deps.idGenerator.generateId("candidate"));
    const resumeId = ResumeId.create(this.deps.idGenerator.generateId("resume"));
    const knowledgeIdPrefix = this.deps.idGenerator.generateId("know");

    const stored = await this.deps.storage.store({
      workspaceId: command.workspaceId,
      resumeId: resumeId.toString(),
      filename: command.filename,
      buffer: command.file,
    });

    const flags = resolveFeatureFlags(loadFeatureFlagsFile(this.deps.config.featureFlagsFile));
    const allowLlm = isEnabled(flags, "ai.parsing.enabled");
    const knowledgeProvider = this.deps.providerRegistry.getKnowledgeExtractionProvider();
    const summaryProvider = this.deps.providerRegistry.getSummaryProvider();

    const processing = await processResume(
      {
        buffer: command.file,
        mimeType: command.mimeType,
        traceId,
        correlationId,
        workspaceId: command.workspaceId,
        resumeId: resumeId.toString(),
      },
      { knowledgeProvider, allowLlm },
    );

    const parseTimeMs = this.deps.clock.now().getTime() - startedAt.getTime();
    const executedAt = this.deps.clock.nowIso();
    const extractionMethod = processing.llmInvoked
      ? (processing.providerId ?? knowledgeProvider.providerId)
      : "deterministic";

    const rawSkills = processing.deterministic.fields.skills ?? [];
    const kc001 = this.contractExecutor.executeKc001(
      {
        traceId,
        workspaceId: command.workspaceId,
        candidateId: candidateId.toString(),
        resumeId: resumeId.toString(),
        executedAt,
        extractionMethod,
        knowledgeIdPrefix,
      },
      rawSkills.length > 0 ? rawSkills : ["communication"],
    );

    const kc002 = this.contractExecutor.executeKc002(
      {
        traceId,
        workspaceId: command.workspaceId,
        candidateId: candidateId.toString(),
        resumeId: resumeId.toString(),
        executedAt,
        extractionMethod,
        knowledgeIdPrefix,
      },
      processing.parsed.rawText,
    );

    const kc001Validation = validateAgainstContract("KC-001", kc001);
    const kc002Validation = validateAgainstContract("KC-002", kc002);
    if (!kc001Validation.valid || !kc002Validation.valid) {
      throw new ImportResumeError(
        "CONTRACT_VALIDATION_FAILED",
        [...kc001Validation.errors, ...kc002Validation.errors].join("; "),
      );
    }

    const summaryResult = await summaryProvider.generateSummary({
      traceId,
      workspaceId: command.workspaceId,
      candidateId: candidateId.toString(),
      rawText: processing.parsed.rawText,
      deterministicFields: processing.deterministic.fields,
    });

    const skills = kc001.skills.map((skill) => {
      const value = skill.value as { skill_id: string; normalized_name: string };
      return {
        skillId: value.skill_id,
        normalizedName: value.normalized_name,
        confidence: skill.confidence as number,
      };
    });

    const englishValue = kc002.english.value as { level: string };

    const parsedName = this.identityService.extractName(processing.parsed.rawText);
    const email = processing.deterministic.fields.email ?? null;
    const phone = processing.deterministic.fields.phone ?? null;
    const identity = this.identityService.buildIdentity({
      name: parsedName.value,
      email,
      phone,
      parsedName,
    });

    this.deps.telemetry.record(
      createTelemetryEvent(
        {
          event_type: "candidate_name_extracted",
          trace_id: traceId,
          correlation_id: correlationId,
          workspace_id: command.workspaceId,
          actor_id: command.actorId ?? "recruiter_alpha",
          candidate_id: candidateId.toString(),
          latency_ms: 0,
          name_confidence: parsedName.confidence,
          name_source: parsedName.source,
          confidence_avg: parsedName.confidence,
        },
        this.deps.clock,
      ),
    );

    const existing = await this.deps.candidateRepository.findAll();
    const duplicates = this.identityService.findDuplicates(
      {
        candidateId: candidateId.toString(),
        name: parsedName.value,
        email,
        phone,
        fingerprint: identity.fingerprint,
      },
      existing.map((r) => ({
        candidateId: r.candidateId,
        name: r.candidate.profile.name,
        email: r.identity?.email ?? null,
        phone: r.identity?.phone ?? null,
        fingerprint: r.identity?.fingerprint ?? null,
      })),
    );

    if (duplicates.length > 0) {
      this.deps.telemetry.record(
        createTelemetryEvent(
          {
            event_type: "candidate_duplicate_detected",
            trace_id: traceId,
            correlation_id: correlationId,
            workspace_id: command.workspaceId,
            actor_id: command.actorId ?? "recruiter_alpha",
            candidate_id: candidateId.toString(),
            latency_ms: 0,
            duplicate_count: duplicates.length,
            highest_score: duplicates[0]!.score,
          },
          this.deps.clock,
        ),
      );
    }

    const profile = CandidateProfile.create({
      name: parsedName.value,
      summary: summaryResult.summary,
      skills,
      englishLevel: englishValue.level,
    });

    const candidate = Candidate.create({
      id: candidateId,
      workspaceId: command.workspaceId,
      profile,
      createdAt: executedAt,
    });

    const resume = Resume.create({
      id: resumeId,
      candidateId: candidateId.toString(),
      workspaceId: command.workspaceId,
      version: ResumeVersion.initial(),
      storageRef: stored.storageRef,
      metadata: ResumeMetadata.create({
        filename: command.filename,
        mimeType: command.mimeType,
        fileSizeBytes: command.file.length,
        sourceType: command.sourceType,
        uploadedAt: executedAt,
      }),
    });

    const englishConfidence = (kc002.english.confidence as number) ?? 0.7;
    const skillsConfidence =
      skills.reduce((sum, s) => sum + s.confidence, 0) / Math.max(skills.length, 1);

    const knowledge = VerifiedKnowledge.fromImport({
      summary: summaryResult.summary,
      skills,
      englishLevel: englishValue.level,
      yearsOfExperience: processing.deterministic.fields.yearsOfExperience,
      uploadedAt: executedAt,
      importTraceId: traceId,
      summaryProvenance: {
        source: summaryResult.providerId === "mock" ? "Deterministic" : "Gemini",
        providerId: summaryResult.providerId,
        confidence: 0.82,
      },
      skillsProvenance: {
        source: "Resume",
        confidence: skillsConfidence,
      },
      englishProvenance: {
        source: "Resume",
        confidence: englishConfidence,
      },
      yearsProvenance: {
        source: "Resume",
        confidence: processing.deterministic.fields.yearsOfExperience !== undefined ? 0.9 : 0.5,
      },
    });

    const record = CandidateRecord.create({
      candidate,
      knowledge,
      resumeVersion: resume.version.toNumber(),
      resumeId: resumeId.toString(),
      identity,
    });

    await this.deps.candidateRepository.save(record);
    await this.deps.resumeRepository.save(resume);

    if (this.deps.knowledgeEvolution) {
      try {
        await this.deps.knowledgeEvolution.seedFromVerifiedKnowledge({
          candidateId: candidate.idValue,
          workspaceId: command.workspaceId,
          knowledge,
        });
      } catch (err) {
        emitOperationFailed(this.deps, {
          operation: "knowledge_seed",
          errorCode: (err as Error).name || "SEED_FAILED",
          traceId,
          correlationId,
          candidateId: candidate.idValue,
          workspaceId: command.workspaceId,
          actorId: command.actorId ?? "recruiter_alpha",
        });
      }
    }

    const fieldsExtracted = knowledge.totalEditableFields();
    const fieldsOverridden = 0;
    const knowledgeObjectCount = kc001.skills.length + 1;
    const totalLatencyMs = this.deps.clock.now().getTime() - startedAt.getTime();

    this.deps.telemetry.record(
      createTelemetryEvent(
        {
          event_type: "resume_import_completed",
          trace_id: traceId,
          correlation_id: correlationId,
          workspace_id: command.workspaceId,
          actor_id: command.actorId ?? "recruiter_alpha",
          candidate_id: candidate.idValue,
          provider_id: summaryResult.providerId,
          latency_ms: totalLatencyMs,
          parse_time_ms: parseTimeMs,
          llm_used: processing.llmInvoked,
          gap_count: processing.knowledgeGaps.length,
          missing_fields: processing.knowledgeGaps,
          ocr_applied: processing.parsed.ocrApplied,
          knowledge_object_count: knowledgeObjectCount,
          fields_extracted: fieldsExtracted,
          fields_overridden: fieldsOverridden,
          human_override_rate: computeHumanOverrideRate(fieldsExtracted, fieldsOverridden),
          ai_acceptance_rate: computeAiAcceptanceRate(fieldsOverridden, fieldsExtracted),
          outcome: "accepted",
          confidence_avg:
            skills.reduce((sum, s) => sum + s.confidence, 0) / Math.max(skills.length, 1),
        },
        this.deps.clock,
      ),
    );

    const view = toCandidateProfileView({
      candidateId: candidate.idValue,
      profile,
      resumeVersion: resume.version.toNumber(),
    });

    return {
      candidateId: view.candidateId,
      name: view.name,
      summary: view.summary,
      skills: [...view.skills],
      resumeVersion: view.resumeVersion,
    };
  }

  private validate(command: ImportResumeCommand): void {
    if (!SUPPORTED_MIME_TYPES.has(command.mimeType)) {
      throw new ImportResumeError(
        "UNSUPPORTED_FORMAT",
        `Unsupported mime type: ${command.mimeType}`,
      );
    }
    if (command.file.length > this.deps.config.maxFileSizeBytes) {
      throw new ImportResumeError("FILE_TOO_LARGE", "File exceeds maximum size");
    }
    if (command.file.length === 0) {
      throw new ImportResumeError("EMPTY_FILE", "Uploaded file is empty");
    }
  }
}
