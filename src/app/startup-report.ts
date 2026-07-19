import type { AppConfig } from "../shared/config/index.js";
import { getBuildInfo, getLogger, type Logger } from "../shared/logging/index.js";

export function logStartupReport(
  config: AppConfig,
  persistenceDriver: "memory" | "prisma",
  logger: Logger = getLogger(),
): void {
  const build = getBuildInfo();
  const database = !config.databaseUrl
    ? "none"
    : config.databaseUrl.startsWith("file:")
      ? "sqlite"
      : config.databaseUrl.startsWith("postgres")
        ? "postgres"
        : "other";

  logger.info("application startup", {
    operation: "startup",
    result: "SUCCESS",
    nodeVersion: process.version,
    environment: config.nodeEnv,
    persistenceDriver,
    database,
    databaseConfigured: Boolean(config.databaseUrl),
    version: build.version,
    buildTimestamp: build.buildTimestamp,
    port: config.port,
    service: build.service,
    workspaceId: config.defaultWorkspaceId,
    maxFileSizeBytes: config.maxFileSizeBytes,
    operationsDashboard: config.operationsDashboardEnabled,
  });
}
