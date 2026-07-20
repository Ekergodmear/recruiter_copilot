import type { AppConfig } from "../shared/config/index.js";
import { getPrismaClient } from "../infrastructure/persistence/prisma/prisma-client.js";
import { getBuildInfo } from "../shared/logging/index.js";
import type { FeatureFlags } from "../shared/feature-flags/index.js";

const startedAt = Date.now();

/** Surface persistence mode for operators (postgres when Prisma + Postgres URL). */
export type HealthPersistence = "memory" | "postgres" | "sqlite" | "prisma";

export type HealthBody = {
  status: "ok" | "degraded";
  sprint: string;
  epic: string;
  mode: string;
  foundation: string;
  persistence: HealthPersistence;
  database: {
    configured: boolean;
    connected: boolean | null;
    dialect: string | null;
    /** Round-trip latency for SELECT 1 when connected; null otherwise. */
    latencyMs: number | null;
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
  const persistence = resolvePersistenceLabel(params.persistenceDriver, db.dialect);
  const status: "ok" | "degraded" =
    params.persistenceDriver === "prisma" && db.connected === false ? "degraded" : "ok";

  return {
    status,
    sprint: "4",
    epic: "EPIC-014",
    mode: "founder-alpha",
    foundation: "v3.1-frozen",
    persistence,
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

function resolvePersistenceLabel(
  driver: "memory" | "prisma",
  dialect: string | null,
): HealthPersistence {
  if (driver === "memory") return "memory";
  if (dialect === "postgres") return "postgres";
  if (dialect === "sqlite") return "sqlite";
  return "prisma";
}

async function checkDatabase(
  config: AppConfig,
  driver: "memory" | "prisma",
): Promise<HealthBody["database"]> {
  if (driver !== "prisma") {
    return { configured: false, connected: null, dialect: null, latencyMs: null };
  }
  if (!config.databaseUrl) {
    return { configured: false, connected: false, dialect: null, latencyMs: null };
  }
  const dialect = config.databaseUrl.startsWith("file:")
    ? "sqlite"
    : config.databaseUrl.startsWith("postgres")
      ? "postgres"
      : "other";
  try {
    const prisma = getPrismaClient(config.databaseUrl);
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - t0;
    return { configured: true, connected: true, dialect, latencyMs };
  } catch {
    return { configured: true, connected: false, dialect, latencyMs: null };
  }
}
