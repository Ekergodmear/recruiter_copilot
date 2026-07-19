#!/usr/bin/env tsx
/**
 * TECH-002 — verify:data (DataIntegrityChecker) benchmark.
 *
 *   pnpm bench:verify-data
 *   BENCHMARK_VERIFY_SIZES=100,1000,10000 pnpm bench:verify-data
 */
import { createBenchmarkEnv, collectEnvironmentInfo } from "./lib/harness.js";
import { seedCandidateDataset } from "./lib/seed.js";
import { computeLatencyStats, parseSizeList, formatMs } from "./lib/stats.js";
import { takeMemorySnapshot, type MemorySnapshot } from "./lib/memory.js";
import { writeVerifyReport } from "./lib/write-partial-reports.js";

const DEFAULT_SIZES = [100, 1000, 10000];

export async function runVerifyDataBenchmark(sizes?: number[]) {
  const resolved = sizes ?? parseSizeList(process.env.BENCHMARK_VERIFY_SIZES, DEFAULT_SIZES);
  const repeats = Number(process.env.BENCHMARK_VERIFY_REPEATS ?? 5);
  const results: {
    size: number;
    stats: ReturnType<typeof computeLatencyStats>;
    errorCount: number;
  }[] = [];
  const memory: { label: string; snap: MemorySnapshot }[] = [];
  const metrics: Record<string, number> = {};
  let envInfo = collectEnvironmentInfo("memory");
  let topOps: ReturnType<
    import("../../../src/shared/profiling/index.js").OperationProfiler["top"]
  > = [];

  memory.push({ label: "start", snap: takeMemorySnapshot() });

  for (const size of resolved) {
    console.log(`\n[verify:data] seed n=${size} …`);
    const env = await createBenchmarkEnv({ workspaceId: `ws_verify_${size}` });
    envInfo = collectEnvironmentInfo(env.persistenceDriver, env.databaseUrl);
    await seedCandidateDataset(env.deps, size, env.workspaceId);
    memory.push({ label: `after seed n=${size}`, snap: takeMemorySnapshot() });

    env.profiler.reset();
    const samples: number[] = [];
    let lastErrors = 0;
    for (let i = 0; i < repeats; i++) {
      const t0 = performance.now();
      const report = await env.profiler.time("verify:data.check", () =>
        env.deps.dataIntegrityChecker.check(),
      );
      samples.push(performance.now() - t0);
      lastErrors = report.errorCount;
    }
    const stats = computeLatencyStats(samples);
    results.push({ size, stats, errorCount: lastErrors });
    metrics[`verify.avg_ms.${size}`] = stats.averageMs;
    metrics[`verify.p95_ms.${size}`] = stats.p95Ms;
    topOps = env.profiler.top(10);
    console.log(
      `  avg=${formatMs(stats.averageMs)} p95=${formatMs(stats.p95Ms)} errors=${lastErrors}`,
    );
    memory.push({ label: `after verify n=${size}`, snap: takeMemorySnapshot() });
    await env.cleanup();
  }

  memory.push({ label: "end", snap: takeMemorySnapshot() });
  return { results, metrics, memory, envInfo, topOps };
}

async function main() {
  const run = await runVerifyDataBenchmark();
  writeVerifyReport(run);
  console.log(`\nWrote reports/benchmarks/verify-data.md`);
}

const isDirect =
  process.argv[1] &&
  (process.argv[1].endsWith("benchmark-verify-data.ts") ||
    process.argv[1].endsWith("benchmark-verify-data.js"));

if (isDirect) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
