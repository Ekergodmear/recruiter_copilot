import type { AppConfig } from "../shared/config/index.js";
import { getPrismaClient } from "../infrastructure/persistence/prisma/prisma-client.js";
import { getBuildInfo } from "../shared/logging/index.js";
import type { FeatureFlags } from "../shared/feature-flags/index.js";

const startedAt = Date.now();

export type HealthBody = {
  status: "ok" | "degraded";
  sprint: string;
  epic: string;
  mode: string;
  foundation: string;
  persistence: "memory" | "prisma";
  database: {
    configured: boolean;
    connected: boolean | null;
    dialect: string | null;
  };
  uptimeSeconds: number;
  version: string;
  buildTimestamp: string | null;
  feature_flags: FeatureFlags;
  operations_dashboard: string | null;
};

export async function buildHealthBody(params: {
  config: AppConfig;
  persistenceDriver: "memory" | "prisma";
  flags: FeatureFlags;
}): Promise<HealthBody> {
  const build = getBuildInfo();
  const db = await checkDatabase(params.config, params.persistenceDriver);
  const status: "ok" | "degraded" =
    params.persistenceDriver === "prisma" && db.connected === false ? "degraded" : "ok";

  return {
    status,
    sprint: "4",
    epic: "EPIC-008",
    mode: "founder-alpha",
    foundation: "v3.1-frozen",
    persistence: params.persistenceDriver,
    database: db,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    version: build.version,
    buildTimestamp: build.buildTimestamp,
    feature_flags: params.flags,
    operations_dashboard: params.config.operationsDashboardEnabled
      ? "/internal/operations-dashboard/ui"
      : null,
  };
}

async function checkDatabase(
  config: AppConfig,
  driver: "memory" | "prisma",
): Promise<HealthBody["database"]> {
  if (driver !== "prisma") {
    return { configured: false, connected: null, dialect: null };
  }
  if (!config.databaseUrl) {
    return { configured: false, connected: false, dialect: null };
  }
  const dialect = config.databaseUrl.startsWith("file:")
    ? "sqlite"
    : config.databaseUrl.startsWith("postgres")
      ? "postgres"
      : "other";
  try {
    const prisma = getPrismaClient(config.databaseUrl);
    await prisma.$queryRaw`SELECT 1`;
    return { configured: true, connected: true, dialect };
  } catch {
    return { configured: true, connected: false, dialect };
  }
}
