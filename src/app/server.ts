import Fastify from "fastify";
import multipart from "@fastify/multipart";
import cors from "@fastify/cors";
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
import { LocalStorageAdapter } from "../modules/candidate/infrastructure/storage/local-storage-adapter.js";
import { registerCandidateRoutes } from "../modules/candidate/presentation/candidate-routes.js";
import { registerOperationsDashboardRoutes } from "../modules/operations/operations-dashboard-routes.js";
import { registerUxTelemetryRoutes } from "../modules/product/ux-telemetry-routes.js";
import { JobService } from "../modules/job/application/job-service.js";
import { registerJobRoutes } from "../modules/job/presentation/job-routes.js";
import { RelationshipService } from "../modules/relationship/application/relationship-service.js";
import { registerRelationshipRoutes } from "../modules/relationship/presentation/relationship-routes.js";
import { MatchingService } from "../modules/matching/application/matching-service.js";
import { registerMatchingRoutes } from "../modules/matching/presentation/matching-routes.js";
import { CopilotService } from "../modules/copilot/application/copilot-service.js";
import { registerCopilotRoutes } from "../modules/copilot/presentation/copilot-routes.js";
import { AnalyticsService } from "../modules/analytics/application/analytics-service.js";
import { registerAnalyticsRoutes } from "../modules/analytics/presentation/analytics-routes.js";
import { AutomationService } from "../modules/automation/application/automation-service.js";
import { registerAutomationRoutes } from "../modules/automation/presentation/automation-routes.js";
import { FileActionResultRepository } from "../modules/automation/infrastructure/action-result-repository.js";
import { MockEmailSendAdapter } from "../modules/automation/infrastructure/email-send-adapter.js";
import { ActorRegistry } from "../modules/authorization/application/actor-registry.js";
import { AuthorizationService } from "../modules/authorization/application/authorization-service.js";
import { registerAuthorizationGate } from "../modules/authorization/presentation/authorization-gate.js";
import { NotificationService } from "../modules/notification/application/notification-service.js";
import { FileNotificationRepository } from "../modules/notification/infrastructure/notification-repository.js";
import { registerNotificationRoutes } from "../modules/notification/presentation/notification-routes.js";
import { IntegrationService } from "../modules/integration/application/integration-service.js";
import { FileIntegrationRepository } from "../modules/integration/infrastructure/integration-repository.js";
import { registerIntegrationRoutes } from "../modules/integration/presentation/integration-routes.js";
import { AuditService } from "../modules/audit/application/audit-service.js";
import { FileAuditRepository } from "../modules/audit/infrastructure/audit-repository.js";
import { registerAuditRoutes } from "../modules/audit/presentation/audit-routes.js";
import { SearchService } from "../modules/search/application/search-service.js";
import { FileSavedSearchRepository } from "../modules/search/infrastructure/saved-search-repository.js";
import { registerSearchRoutes } from "../modules/search/presentation/search-routes.js";
import { ReportService } from "../modules/report/application/report-service.js";
import { registerReportRoutes } from "../modules/report/presentation/report-routes.js";
import { RecruitmentService } from "../modules/recruitment/application/recruitment-service.js";
import { join } from "node:path";
import { registerRecruitmentRoutes } from "../modules/recruitment/presentation/recruitment-routes.js";
import {
  KnowledgeEvolutionService,
  registerKnowledgeRoutes,
  registerInsightRoutes,
  CandidateInsightService,
  InsightEngine,
  KnowledgeInsightProvider,
  JobInsightProvider,
  SubmissionInsightProvider,
  InterviewInsightProvider,
  PlacementInsightProvider,
} from "../modules/knowledge/index.js";
import {
  AuditReplayService,
  ConsistencyVerifier,
  DataIntegrityChecker,
  ReviewSessionMetricsService,
} from "../modules/operations/founder-readiness/index.js";
import {
  createRepositories,
  type AppRepositories,
} from "../infrastructure/persistence/create-repositories.js";
import {
  createLogger,
  getLogger,
  setLogger,
  withOperation,
  type Logger,
} from "../shared/logging/index.js";
import { registerRequestLogging } from "./request-logging.js";
import { registerSecurityPlugin } from "./security-plugin.js";
import { buildHealthBody } from "./health.js";
import { registerGracefulShutdown } from "./graceful-shutdown.js";
import { logStartupReport } from "./startup-report.js";

export type AppDependencies = {
  config: AppConfig;
  candidateImportService: CandidateImportService;
  candidateEditService: CandidateEditService;
  resumePreviewService: ResumePreviewService;
  jobService: JobService;
  relationshipService: RelationshipService;
  matchingService: MatchingService;
  copilotService: CopilotService;
  analyticsService: AnalyticsService;
  automationService: AutomationService;
  authorizationService: AuthorizationService;
  notificationService: NotificationService;
  integrationService: IntegrationService;
  auditService: AuditService;
  searchService: SearchService;
  reportService: ReportService;
  recruitmentService: RecruitmentService;
  knowledgeEvolutionService: KnowledgeEvolutionService;
  candidateInsightService: CandidateInsightService;
  insightEngine: InsightEngine;
  reviewSessionMetrics: ReviewSessionMetricsService;
  auditReplayService: AuditReplayService;
  consistencyVerifier: ConsistencyVerifier;
  dataIntegrityChecker: DataIntegrityChecker;
  idGenerator: UuidIdGenerator;
  telemetry: TelemetryStore;
  clock: SystemClock;
  persistenceDriver: "memory" | "prisma";
  /** Exposed for ops/benchmarks — application services still depend on interfaces only. */
  repositories: AppRepositories;
  logger: Logger;
};

export type CreateAppDependenciesOptions = {
  /** Inject pre-built (optionally instrumented) repositories. Default: createRepositories(config). */
  repositories?: AppRepositories;
  logger?: Logger;
};

export function createAppDependencies(
  config: AppConfig,
  telemetry?: TelemetryStore,
  options?: CreateAppDependenciesOptions,
): AppDependencies {
  const clock = new SystemClock();
  const idGenerator = new UuidIdGenerator();
  const logger = options?.logger ?? createLogger();
  setLogger(logger);
  const telemetryStore = telemetry ?? new FileTelemetryStore(config.telemetryPath);
  const providerRegistry = new ProviderRegistry({
    knowledgeExtraction: config.geminiApiKey ? "gemini" : "mock",
    summary: config.geminiApiKey ? "gemini" : "mock",
    reasoning: config.geminiApiKey ? "gemini" : "mock",
    embedding: "local",
    geminiApiKey: config.geminiApiKey,
  });

  const repos = options?.repositories ?? createRepositories(config);
  const {
    candidateRepository,
    resumeRepository,
    jobRepository,
    submissionRepository,
    interviewRepository,
    offerRepository,
    activityRepository,
    knowledgeRepository,
    relationshipRepository,
  } = repos;
  const storage = new LocalStorageAdapter(config.storagePath);

  const knowledgeEvolutionService = new KnowledgeEvolutionService({
    clock,
    idGenerator,
    knowledgeRepository,
    telemetry: telemetryStore,
  });

  const insightEngine = new InsightEngine(
    [
      new KnowledgeInsightProvider(knowledgeRepository),
      new JobInsightProvider({
        jobRepository,
        submissionRepository,
        candidateRepository,
      }),
      new SubmissionInsightProvider({
        submissionRepository,
        jobRepository,
        knowledgeRepository,
        offerRepository,
      }),
      new InterviewInsightProvider({
        interviewRepository,
        jobRepository,
      }),
      new PlacementInsightProvider({
        knowledgeRepository,
        jobRepository,
        submissionRepository,
        interviewRepository,
      }),
    ],
    { telemetry: telemetryStore, clock, idGenerator },
  );
  const candidateInsightService = new CandidateInsightService(insightEngine);

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
    knowledgeEvolution: knowledgeEvolutionService,
  });

  const reviewSessionMetrics = new ReviewSessionMetricsService({
    clock,
    idGenerator,
    telemetry: telemetryStore,
    workspaceId: config.defaultWorkspaceId,
  });

  const candidateEditService = new CandidateEditService({
    clock,
    idGenerator,
    candidateRepository,
    telemetry: telemetryStore,
    resumePreviewService,
    knowledgeEvolution: knowledgeEvolutionService,
    reviewSessionMetrics,
  });

  const recruitmentService = new RecruitmentService({
    clock,
    idGenerator,
    jobRepository,
    submissionRepository,
    candidateRepository,
    interviewRepository,
    offerRepository,
    activityRepository,
    telemetry: telemetryStore,
    workspaceId: config.defaultWorkspaceId,
    knowledgeEvolution: knowledgeEvolutionService,
  });

  const jobService = new JobService({
    clock,
    idGenerator,
    jobRepository,
    submissionRepository,
    candidateRepository,
    telemetry: telemetryStore,
    workspaceId: config.defaultWorkspaceId,
    onJobCreated: (jobId, actorId) => recruitmentService.onJobCreated(jobId, actorId),
    onSubmissionCreated: (submission, actorId) =>
      recruitmentService.onSubmissionCreated(submission, actorId),
  });

  const actorRegistry = new ActorRegistry();
  const authorizationService = new AuthorizationService(actorRegistry);
  const notificationService = new NotificationService({
    clock,
    idGenerator,
    repository: new FileNotificationRepository(
      join(config.storagePath, "notifications.jsonl"),
      join(config.storagePath, "collaboration-notes.jsonl"),
    ),
    actors: actorRegistry,
  });

  const auditRepository = new FileAuditRepository(join(config.storagePath, "audit-log.jsonl"));
  const auditService = new AuditService({
    clock,
    idGenerator,
    repository: auditRepository,
    authorizationService,
  });

  const relationshipService = new RelationshipService({
    clock,
    idGenerator,
    relationshipRepository,
    candidateRepository,
    jobRepository,
    notificationService,
    auditService,
  });

  const matchingService = new MatchingService({
    clock,
    candidateRepository,
    jobRepository,
  });

  const searchService = new SearchService({
    clock,
    idGenerator,
    candidateRepository,
    jobRepository,
    relationshipRepository,
    matchingService,
    authorizationService,
    savedSearchRepository: new FileSavedSearchRepository(
      join(config.storagePath, "saved-searches.jsonl"),
    ),
  });

  const copilotService = new CopilotService({
    clock,
    idGenerator,
    providerRegistry,
    matchingService,
    candidateRepository,
    jobRepository,
    relationshipRepository,
    workspaceId: config.defaultWorkspaceId,
  });

  const analyticsService = new AnalyticsService({
    clock,
    candidateRepository,
    jobRepository,
    relationshipRepository,
    matchingService,
  });

  const reportService = new ReportService({
    authorizationService,
    analyticsService,
    auditRepository,
    candidateRepository,
    jobRepository,
  });

  const automationService = new AutomationService({
    clock,
    idGenerator,
    relationshipService,
    relationshipRepository,
    actionResultRepository: new FileActionResultRepository(
      join(config.storagePath, "automation-actions.jsonl"),
    ),
    emailSendAdapter: new MockEmailSendAdapter(),
    authorizationService,
    notificationService,
    auditService,
  });

  const integrationService = new IntegrationService({
    clock,
    idGenerator,
    repository: new FileIntegrationRepository(join(config.storagePath, "integrations.jsonl")),
    jobService,
    authorizationService,
    auditService,
  });

  const auditReplayService = new AuditReplayService({
    candidateRepository,
    submissionRepository,
    interviewRepository,
    offerRepository,
    activityRepository,
    knowledgeRepository,
  });

  const consistencyVerifier = new ConsistencyVerifier({
    candidateRepository,
    submissionRepository,
    interviewRepository,
    offerRepository,
    knowledgeRepository,
  });

  const dataIntegrityChecker = new DataIntegrityChecker({
    candidateRepository,
    resumeRepository,
    submissionRepository,
    jobRepository,
    interviewRepository,
    offerRepository,
    knowledgeRepository,
  });

  return {
    config,
    candidateImportService,
    candidateEditService,
    resumePreviewService,
    jobService,
    relationshipService,
    matchingService,
    copilotService,
    analyticsService,
    automationService,
    authorizationService,
    notificationService,
    integrationService,
    auditService,
    searchService,
    reportService,
    recruitmentService,
    knowledgeEvolutionService,
    candidateInsightService,
    insightEngine,
    reviewSessionMetrics,
    auditReplayService,
    consistencyVerifier,
    dataIntegrityChecker,
    idGenerator,
    telemetry: telemetryStore,
    clock,
    persistenceDriver: repos.driver,
    repositories: repos,
    logger,
  };
}

export async function buildApp(deps?: AppDependencies) {
  // TECH-004: Fastify built-in logger off — structured Logger owns all process logs.
  const resolved = deps ?? createAppDependencies(AppConfig.fromEnv());
  const app = Fastify({
    logger: false,
    disableRequestLogging: true,
    bodyLimit: resolved.config.maxRequestBodyBytes,
  });
  setLogger(resolved.logger);
  registerRequestLogging(app, resolved.logger);
  registerSecurityPlugin(app, resolved.config, resolved.logger);
  registerAuthorizationGate(app, resolved.authorizationService);

  await app.register(cors, { origin: true });
  await app.register(multipart, {
    limits: {
      fileSize: resolved.config.maxFileSizeBytes,
      fieldSize: resolved.config.maxJsonBodyBytes,
      files: 1,
      fields: 20,
    },
  });

  const flagsFile = loadFeatureFlagsFile(resolved.config.featureFlagsFile || getFeatureFlagsPath());
  const flags = resolveFeatureFlags(flagsFile);

  app.get("/health", async () =>
    buildHealthBody({
      config: resolved.config,
      persistenceDriver: resolved.persistenceDriver,
      flags,
    }),
  );

  registerCandidateRoutes(
    app,
    resolved.candidateImportService,
    resolved.candidateEditService,
    resolved.resumePreviewService,
    resolved.config.defaultWorkspaceId,
    resolved.logger,
    resolved.config.maxFileSizeBytes,
  );

  registerKnowledgeRoutes(app, resolved.knowledgeEvolutionService, resolved.clock);
  registerInsightRoutes(app, {
    candidateInsightService: resolved.candidateInsightService,
    insightEngine: resolved.insightEngine,
    telemetry: resolved.telemetry,
    clock: resolved.clock,
    idGenerator: resolved.idGenerator,
  });

  registerJobRoutes(app, resolved.jobService, resolved.clock);
  registerRelationshipRoutes(app, resolved.relationshipService);
  registerMatchingRoutes(app, resolved.matchingService);
  registerCopilotRoutes(app, resolved.copilotService);
  registerAnalyticsRoutes(app, resolved.analyticsService);
  registerAutomationRoutes(app, resolved.automationService);
  registerNotificationRoutes(app, resolved.notificationService);
  registerIntegrationRoutes(app, resolved.integrationService);
  registerAuditRoutes(app, resolved.auditService);
  registerSearchRoutes(app, resolved.searchService);
  registerReportRoutes(app, resolved.reportService);
  registerRecruitmentRoutes(app, resolved.recruitmentService);

  registerOperationsDashboardRoutes(app, {
    config: resolved.config,
    telemetry: resolved.telemetry,
    clock: resolved.clock,
  });

  registerUxTelemetryRoutes(
    app,
    resolved.telemetry,
    resolved.clock,
    resolved.config.defaultWorkspaceId,
    resolved.reviewSessionMetrics,
  );

  return app;
}

export async function startServer(config = AppConfig.fromEnv()) {
  return withOperation(getLogger(), "startup", async () => {
    const deps = createAppDependencies(config);
    const app = await buildApp(deps);
    logStartupReport(config, deps.persistenceDriver, deps.logger);
    registerGracefulShutdown(app, deps.logger);
    await app.listen({ port: config.port, host: "0.0.0.0" });
    deps.logger.info("http server listening", {
      operation: "startup",
      result: "SUCCESS",
      port: config.port,
    });
    return app;
  });
}

import { fileURLToPath } from "node:url";

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  startServer().catch(async (err) => {
    const logger = getLogger();
    logger.error("fatal startup error", {
      operation: "startup",
      result: "FAILURE",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    await logger.flush();
    process.exit(1);
  });
}
