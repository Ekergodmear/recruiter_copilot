import { mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { cpus, totalmem, freemem } from "node:os";
import { AppConfig } from "../../../src/shared/config/index.js";
import { createAppDependencies, type AppDependencies } from "../../../src/app/server.js";
import { InMemoryTelemetryStore } from "../../../src/shared/telemetry/index.js";
import { OperationProfiler, wrapWithProfiler } from "../../../src/shared/profiling/index.js";
import type { AppRepositories } from "../../../src/infrastructure/persistence/create-repositories.js";
import { createRepositories } from "../../../src/infrastructure/persistence/create-repositories.js";
import { disconnectPrisma } from "../../../src/infrastructure/persistence/prisma/prisma-client.js";

export type BenchmarkEnv = {
  deps: AppDependencies;
  profiler: OperationProfiler;
  workspaceId: string;
  root: string;
  persistenceDriver: "memory" | "prisma";
  databaseUrl?: string;
  cleanup: () => Promise<void>;
};

export type EnvironmentInfo = {
  cpuModel: string;
  cpuCount: number;
  ramTotalMb: number;
  ramFreeMb: number;
  nodeVersion: string;
  platform: string;
  persistenceDriver: string;
  database: string;
};

export function collectEnvironmentInfo(
  persistenceDriver: string,
  databaseUrl?: string,
): EnvironmentInfo {
  const cpu = cpus()[0];
  return {
    cpuModel: cpu?.model ?? "unknown",
    cpuCount: cpus().length,
    ramTotalMb: Math.round(totalmem() / (1024 * 1024)),
    ramFreeMb: Math.round(freemem() / (1024 * 1024)),
    nodeVersion: process.version,
    platform: `${process.platform} ${process.arch}`,
    persistenceDriver,
    database: databaseUrl
      ? databaseUrl.startsWith("file:")
        ? "sqlite"
        : databaseUrl.startsWith("postgres")
          ? "postgres"
          : "other"
      : "n/a (memory)",
  };
}

function instrumentRepositories(
  repos: AppRepositories,
  profiler: OperationProfiler,
): AppRepositories {
  return {
    driver: repos.driver,
    candidateRepository: wrapWithProfiler(
      "CandidateRepository",
      repos.candidateRepository,
      profiler,
    ),
    resumeRepository: wrapWithProfiler("ResumeRepository", repos.resumeRepository, profiler),
    jobRepository: wrapWithProfiler("JobRepository", repos.jobRepository, profiler),
    submissionRepository: wrapWithProfiler(
      "SubmissionRepository",
      repos.submissionRepository,
      profiler,
    ),
    interviewRepository: wrapWithProfiler(
      "InterviewRepository",
      repos.interviewRepository,
      profiler,
    ),
    offerRepository: wrapWithProfiler("OfferRepository", repos.offerRepository, profiler),
    activityRepository: wrapWithProfiler("ActivityRepository", repos.activityRepository, profiler),
    knowledgeRepository: wrapWithProfiler(
      "KnowledgeRepository",
      repos.knowledgeRepository,
      profiler,
    ),
  };
}

/**
 * Isolated workspace for benchmarks.
 * Default: in-memory (fast, reproducible). Set BENCHMARK_PERSISTENCE=prisma for Prisma.
 */
export async function createBenchmarkEnv(options?: {
  workspaceId?: string;
  profile?: boolean;
}): Promise<BenchmarkEnv> {
  const workspaceId = options?.workspaceId ?? "ws_bench";
  const root = mkdtempSync(join(tmpdir(), "bench-"));
  const profiler = new OperationProfiler();
  const wantPrisma = (process.env.BENCHMARK_PERSISTENCE ?? "memory").toLowerCase() === "prisma";

  let databaseUrl: string | undefined;
  if (wantPrisma) {
    mkdirSync(join(root, "db"), { recursive: true });
    const dbPath = join(root, "db", "bench.db");
    databaseUrl = `file:${dbPath.replace(/\\/g, "/")}`;
    execSync("pnpm exec prisma db push --skip-generate", {
      stdio: "pipe",
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
  }

  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: join(root, "storage"),
    TELEMETRY_PATH: join(root, "telemetry.jsonl"),
    DEFAULT_WORKSPACE_ID: workspaceId,
    NODE_ENV: "development",
    PERSISTENCE_DRIVER: wantPrisma ? "prisma" : "memory",
    ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
  });

  const rawRepos = createRepositories(config);
  const repos = options?.profile === false ? rawRepos : instrumentRepositories(rawRepos, profiler);

  const deps = createAppDependencies(config, new InMemoryTelemetryStore(), { repositories: repos });

  return {
    deps,
    profiler,
    workspaceId,
    root,
    persistenceDriver: repos.driver,
    databaseUrl,
    cleanup: async () => {
      await disconnectPrisma();
    },
  };
}
