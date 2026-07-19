#!/usr/bin/env tsx
/**
 * TECH-002 — Resume Import benchmark (10 / 100 / 500 / 1000).
 *
 *   pnpm bench:import
 *   BENCHMARK_IMPORT_SIZES=10,50 BENCHMARK_PERSISTENCE=prisma pnpm bench:import
 */
import { createBenchmarkEnv, collectEnvironmentInfo } from "./lib/harness.js";
import { createBenchmarkDocx } from "./lib/docx.js";
import { computeLatencyStats, parseSizeList, formatMs } from "./lib/stats.js";
import { takeMemorySnapshot, type MemorySnapshot } from "./lib/memory.js";
import { writeImportReport } from "./lib/write-partial-reports.js";

const DEFAULT_SIZES = [10, 100, 500, 1000];

export type ImportSizeResult = {
  size: number;
  stats: ReturnType<typeof computeLatencyStats>;
  wallMs: number;
  failures: number;
  memoryEnd: MemorySnapshot;
};

export async function runImportBenchmark(sizes?: number[]): Promise<{
  results: ImportSizeResult[];
  metrics: Record<string, number>;
  memory: { label: string; snap: MemorySnapshot }[];
  envInfo: ReturnType<typeof collectEnvironmentInfo>;
  topOps: ReturnType<import("../../../src/shared/profiling/index.js").OperationProfiler["top"]>;
}> {
  const resolved = sizes ?? parseSizeList(process.env.BENCHMARK_IMPORT_SIZES, DEFAULT_SIZES);
  const results: ImportSizeResult[] = [];
  const memory: { label: string; snap: MemorySnapshot }[] = [];
  const metrics: Record<string, number> = {};

  memory.push({ label: "start", snap: takeMemorySnapshot() });

  // Fresh env per size so repository growth does not skew later sizes.
  let lastProfilerTop: ReturnType<
    import("../../../src/shared/profiling/index.js").OperationProfiler["top"]
  > = [];
  let envInfo = collectEnvironmentInfo("memory");

  for (const size of resolved) {
    console.log(`\n[import] size=${size} …`);
    const env = await createBenchmarkEnv({ workspaceId: `ws_import_${size}` });
    envInfo = collectEnvironmentInfo(env.persistenceDriver, env.databaseUrl);
    env.profiler.reset();

    const samples: number[] = [];
    let failures = 0;
    const wallStart = performance.now();

    for (let i = 0; i < size; i++) {
      const file = await createBenchmarkDocx(i);
      const t0 = performance.now();
      try {
        await env.profiler.time("import.pipeline", () =>
          env.deps.candidateImportService.importResume({
            file,
            filename: `bench-import-${size}-${i}.docx`,
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            sourceType: "manual_upload",
            workspaceId: env.workspaceId,
            actorId: "recruiter_bench",
          }),
        );
        samples.push(performance.now() - t0);
      } catch {
        failures += 1;
        samples.push(performance.now() - t0);
      }
      if ((i + 1) % 50 === 0 || i + 1 === size) {
        process.stdout.write(`  ${i + 1}/${size}\r`);
      }
    }

    const wallMs = performance.now() - wallStart;
    const stats = computeLatencyStats(samples);
    const memoryEnd = takeMemorySnapshot();
    memory.push({ label: `after import n=${size}`, snap: memoryEnd });
    results.push({ size, stats, wallMs, failures, memoryEnd });
    metrics[`import.avg_ms.${size}`] = stats.averageMs;
    metrics[`import.p95_ms.${size}`] = stats.p95Ms;
    metrics[`import.max_ms.${size}`] = stats.maxMs;
    metrics[`import.wall_ms.${size}`] = wallMs;
    lastProfilerTop = env.profiler.top(10);
    console.log(
      `  done: avg=${formatMs(stats.averageMs)} p95=${formatMs(stats.p95Ms)} wall=${formatMs(wallMs)} fail=${failures}`,
    );
    await env.cleanup();
  }

  memory.push({ label: "end", snap: takeMemorySnapshot() });

  return { results, metrics, memory, envInfo, topOps: lastProfilerTop };
}

async function main() {
  const run = await runImportBenchmark();
  writeImportReport(run);
  console.log(`\nWrote reports/benchmarks/import.md`);
}

const isDirect =
  process.argv[1] &&
  (process.argv[1].endsWith("benchmark-import.ts") ||
    process.argv[1].endsWith("benchmark-import.js"));

if (isDirect) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
