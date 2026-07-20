export type PersistenceDriver = "memory" | "prisma";

export type AppConfigValues = {
  port: number;
  nodeEnv: string;
  defaultWorkspaceId: string;
  storagePath: string;
  telemetryPath: string;
  maxFileSizeBytes: number;
  maxJsonBodyBytes: number;
  maxRequestBodyBytes: number;
  rateLimitEnabled: boolean;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  featureFlagsFile: string;
  geminiApiKey?: string;
  operationsDashboardEnabled: boolean;
  operationsDashboardLocalhostOnly: boolean;
  /** TECH-001: memory (tests/dev default) | prisma (production / Alpha smoke) */
  persistenceDriver: PersistenceDriver;
  databaseUrl?: string;
};

export class AppConfig {
  readonly port: number;
  readonly nodeEnv: string;
  readonly defaultWorkspaceId: string;
  readonly storagePath: string;
  readonly telemetryPath: string;
  readonly maxFileSizeBytes: number;
  readonly maxJsonBodyBytes: number;
  readonly maxRequestBodyBytes: number;
  readonly rateLimitEnabled: boolean;
  readonly rateLimitWindowMs: number;
  readonly rateLimitMax: number;
  readonly featureFlagsFile: string;
  readonly geminiApiKey?: string;
  readonly operationsDashboardEnabled: boolean;
  readonly operationsDashboardLocalhostOnly: boolean;
  readonly persistenceDriver: PersistenceDriver;
  readonly databaseUrl?: string;

  private constructor(values: AppConfigValues) {
    this.port = values.port;
    this.nodeEnv = values.nodeEnv;
    this.defaultWorkspaceId = values.defaultWorkspaceId;
    this.storagePath = values.storagePath;
    this.telemetryPath = values.telemetryPath;
    this.maxFileSizeBytes = values.maxFileSizeBytes;
    this.maxJsonBodyBytes = values.maxJsonBodyBytes;
    this.maxRequestBodyBytes = values.maxRequestBodyBytes;
    this.rateLimitEnabled = values.rateLimitEnabled;
    this.rateLimitWindowMs = values.rateLimitWindowMs;
    this.rateLimitMax = values.rateLimitMax;
    this.featureFlagsFile = values.featureFlagsFile;
    this.geminiApiKey = values.geminiApiKey;
    this.operationsDashboardEnabled = values.operationsDashboardEnabled;
    this.operationsDashboardLocalhostOnly = values.operationsDashboardLocalhostOnly;
    this.persistenceDriver = values.persistenceDriver;
    this.databaseUrl = values.databaseUrl;
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): AppConfig {
    const nodeEnv = env.NODE_ENV ?? "development";
    const operationsDashboardEnabled =
      nodeEnv === "development" || env.OPERATIONS_DASHBOARD_ENABLED === "true";

    const explicitDriver = env.PERSISTENCE_DRIVER?.toLowerCase();
    const databaseUrl = env.DATABASE_URL || undefined;
    let persistenceDriver: PersistenceDriver = "memory";
    if (explicitDriver === "prisma" || explicitDriver === "memory") {
      persistenceDriver = explicitDriver;
    } else if (nodeEnv === "production" && databaseUrl) {
      persistenceDriver = "prisma";
    }

    const maxFileSizeBytes = Number(env.MAX_FILE_SIZE_BYTES ?? 10 * 1024 * 1024);
    const maxJsonBodyBytes = Number(env.MAX_JSON_BODY_BYTES ?? 1 * 1024 * 1024);
    // EPIC-015: multi-file / ZIP packages need headroom beyond a single file.
    const maxRequestBodyBytes = Number(
      env.MAX_REQUEST_BODY_BYTES ??
        Math.max(
          maxFileSizeBytes * 50,
          maxFileSizeBytes + 64 * 1024,
          maxJsonBodyBytes,
          100 * 1024 * 1024,
        ),
    );

    const rateLimitExplicit = env.RATE_LIMIT_ENABLED?.toLowerCase();
    const rateLimitEnabled =
      rateLimitExplicit === "true"
        ? true
        : rateLimitExplicit === "false"
          ? false
          : nodeEnv === "production";

    return new AppConfig({
      port: Number(env.PORT ?? 3000),
      nodeEnv,
      defaultWorkspaceId: env.DEFAULT_WORKSPACE_ID ?? "ws_default",
      storagePath: env.STORAGE_PATH ?? "./data/resumes",
      telemetryPath: env.TELEMETRY_PATH ?? "./data/telemetry/events.jsonl",
      maxFileSizeBytes,
      maxJsonBodyBytes,
      maxRequestBodyBytes,
      rateLimitEnabled,
      rateLimitWindowMs: Number(env.RATE_LIMIT_WINDOW_MS ?? 60_000),
      rateLimitMax: Number(env.RATE_LIMIT_MAX ?? 120),
      featureFlagsFile: env.FEATURE_FLAGS_FILE ?? "feature-flags/sprint-1.yaml",
      geminiApiKey: env.GEMINI_API_KEY || undefined,
      operationsDashboardEnabled,
      operationsDashboardLocalhostOnly: nodeEnv === "production",
      persistenceDriver,
      databaseUrl,
    });
  }
}
