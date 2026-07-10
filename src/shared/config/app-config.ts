export type AppConfigValues = {
  port: number;
  nodeEnv: string;
  defaultWorkspaceId: string;
  storagePath: string;
  telemetryPath: string;
  maxFileSizeBytes: number;
  featureFlagsFile: string;
  geminiApiKey?: string;
  operationsDashboardEnabled: boolean;
  operationsDashboardLocalhostOnly: boolean;
};

export class AppConfig {
  readonly port: number;
  readonly nodeEnv: string;
  readonly defaultWorkspaceId: string;
  readonly storagePath: string;
  readonly telemetryPath: string;
  readonly maxFileSizeBytes: number;
  readonly featureFlagsFile: string;
  readonly geminiApiKey?: string;
  readonly operationsDashboardEnabled: boolean;
  readonly operationsDashboardLocalhostOnly: boolean;

  private constructor(values: AppConfigValues) {
    this.port = values.port;
    this.nodeEnv = values.nodeEnv;
    this.defaultWorkspaceId = values.defaultWorkspaceId;
    this.storagePath = values.storagePath;
    this.telemetryPath = values.telemetryPath;
    this.maxFileSizeBytes = values.maxFileSizeBytes;
    this.featureFlagsFile = values.featureFlagsFile;
    this.geminiApiKey = values.geminiApiKey;
    this.operationsDashboardEnabled = values.operationsDashboardEnabled;
    this.operationsDashboardLocalhostOnly = values.operationsDashboardLocalhostOnly;
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): AppConfig {
    const nodeEnv = env.NODE_ENV ?? "development";
    const operationsDashboardEnabled =
      nodeEnv === "development" || env.OPERATIONS_DASHBOARD_ENABLED === "true";

    return new AppConfig({
      port: Number(env.PORT ?? 3000),
      nodeEnv,
      defaultWorkspaceId: env.DEFAULT_WORKSPACE_ID ?? "ws_default",
      storagePath: env.STORAGE_PATH ?? "./data/resumes",
      telemetryPath: env.TELEMETRY_PATH ?? "./data/telemetry/events.jsonl",
      maxFileSizeBytes: Number(env.MAX_FILE_SIZE_BYTES ?? 10 * 1024 * 1024),
      featureFlagsFile: env.FEATURE_FLAGS_FILE ?? "feature-flags/sprint-1.yaml",
      geminiApiKey: env.GEMINI_API_KEY || undefined,
      operationsDashboardEnabled,
      operationsDashboardLocalhostOnly: nodeEnv === "production",
    });
  }
}
