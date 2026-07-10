import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { AppConfig } from "../shared/config/index.js";
import { SystemClock } from "../shared/clock/index.js";
import { UuidIdGenerator } from "../shared/id-generator/index.js";
import {
  getFeatureFlagsPath,
  loadFeatureFlagsFile,
  resolveFeatureFlags,
} from "../shared/feature-flags/index.js";
import { FileTelemetryStore, type TelemetryStore } from "../shared/telemetry/index.js";
import { ProviderRegistry } from "../providers/registry.js";
import { CandidateImportService } from "../modules/candidate/application/candidate-import-service.js";
import { CandidateEditService } from "../modules/candidate/application/candidate-edit-service.js";
import { ResumePreviewService } from "../modules/candidate/application/resume-preview-service.js";
import { InMemoryCandidateRepository } from "../modules/candidate/infrastructure/persistence/in-memory-candidate-repository.js";
import { InMemoryResumeRepository } from "../modules/candidate/infrastructure/persistence/in-memory-resume-repository.js";
import { LocalStorageAdapter } from "../modules/candidate/infrastructure/storage/local-storage-adapter.js";
import { registerCandidateRoutes } from "../modules/candidate/presentation/candidate-routes.js";
import { registerOperationsDashboardRoutes } from "../modules/operations/operations-dashboard-routes.js";

export type AppDependencies = {
  config: AppConfig;
  candidateImportService: CandidateImportService;
  candidateEditService: CandidateEditService;
  resumePreviewService: ResumePreviewService;
  telemetry: TelemetryStore;
  clock: SystemClock;
};

export function createAppDependencies(
  config: AppConfig,
  telemetry?: TelemetryStore,
): AppDependencies {
  const clock = new SystemClock();
  const idGenerator = new UuidIdGenerator();
  const telemetryStore = telemetry ?? new FileTelemetryStore(config.telemetryPath);
  const providerRegistry = new ProviderRegistry({
    knowledgeExtraction: config.geminiApiKey ? "gemini" : "mock",
    summary: config.geminiApiKey ? "gemini" : "mock",
    reasoning: config.geminiApiKey ? "gemini" : "mock",
    embedding: "local",
    geminiApiKey: config.geminiApiKey,
  });

  const candidateRepository = new InMemoryCandidateRepository();
  const resumeRepository = new InMemoryResumeRepository();
  const storage = new LocalStorageAdapter(config.storagePath);

  const resumePreviewService = new ResumePreviewService({
    candidateRepository,
    resumeRepository,
    storage,
  });

  const candidateImportService = new CandidateImportService({
    config,
    clock,
    idGenerator,
    storage,
    candidateRepository,
    resumeRepository,
    providerRegistry,
    telemetry: telemetryStore,
  });

  const candidateEditService = new CandidateEditService({
    clock,
    idGenerator,
    candidateRepository,
    telemetry: telemetryStore,
    resumePreviewService,
  });

  return {
    config,
    candidateImportService,
    candidateEditService,
    resumePreviewService,
    telemetry: telemetryStore,
    clock,
  };
}

export async function buildApp(deps?: AppDependencies) {
  const app = Fastify({ logger: true });
  const resolved = deps ?? createAppDependencies(AppConfig.fromEnv());

  await app.register(multipart, {
    limits: { fileSize: resolved.config.maxFileSizeBytes },
  });

  const flagsFile = loadFeatureFlagsFile(resolved.config.featureFlagsFile || getFeatureFlagsPath());
  const flags = resolveFeatureFlags(flagsFile);

  app.get("/health", async () => ({
    status: "ok",
    sprint: "1",
    mode: "product-validation",
    foundation: "v3.1-frozen",
    feature_flags: flags,
    operations_dashboard: resolved.config.operationsDashboardEnabled
      ? "/internal/operations-dashboard/ui"
      : null,
  }));

  registerCandidateRoutes(
    app,
    resolved.candidateImportService,
    resolved.candidateEditService,
    resolved.resumePreviewService,
    resolved.config.defaultWorkspaceId,
    resolved.telemetry,
    resolved.clock,
  );

  registerOperationsDashboardRoutes(app, {
    config: resolved.config,
    telemetry: resolved.telemetry,
    clock: resolved.clock,
  });

  return app;
}

export async function startServer(config = AppConfig.fromEnv()) {
  const deps = createAppDependencies(config);
  const app = await buildApp(deps);
  await app.listen({ port: config.port, host: "0.0.0.0" });
  return app;
}

import { fileURLToPath } from "node:url";

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  startServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
