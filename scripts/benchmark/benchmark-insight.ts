#!/usr/bin/env tsx
/**
 * TECH-002 — Insight / Audit Replay / Knowledge retrieval benchmark.
 *
 *   pnpm bench:insight
 *   BENCHMARK_INSIGHT_SIZES=100,1000 BENCHMARK_INSIGHT_SAMPLES=10 pnpm bench:insight
 */
import { createBenchmarkEnv, collectEnvironmentInfo } from "./lib/harness.js";
import { seedCandidateDataset, seedBenchmarkJob } from "./lib/seed.js";
import { computeLatencyStats, parseSizeList, formatMs } from "./lib/stats.js";
import { takeMemorySnapshot, type MemorySnapshot } from "./lib/memory.js";
import { writeInsightReport } from "./lib/write-partial-reports.js";

const DEFAULT_SIZES = [100, 1000, 5000, 10000];

type OpResult = {
  size: number;
  op: string;
  stats: ReturnType<typeof computeLatencyStats>;
};

export async function runInsightBenchmark(sizes?: number[]) {
  const resolved = sizes ?? parseSizeList(process.env.BENCHMARK_INSIGHT_SIZES, DEFAULT_SIZES);
  const samplesPerOp = Number(process.env.BENCHMARK_INSIGHT_SAMPLES ?? 20);
  const results: OpResult[] = [];
  const memory: { label: string; snap: MemorySnapshot }[] = [];
  const metrics: Record<string, number> = {};
  let envInfo = collectEnvironmentInfo("memory");
  let topOps: ReturnType<
    import("../../../src/shared/profiling/index.js").OperationProfiler["top"]
  > = [];

  memory.push({ label: "start", snap: takeMemorySnapshot() });

  for (const size of resolved) {
    console.log(`\n[insight] seed n=${size} …`);
    const env = await createBenchmarkEnv({ workspaceId: `ws_insight_${size}` });
    envInfo = collectEnvironmentInfo(env.persistenceDriver, env.databaseUrl);

    const seedStart = performance.now();
    const ids = await seedCandidateDataset(env.deps, size, env.workspaceId);
    const job = await seedBenchmarkJob(env.deps, env.workspaceId);
    console.log(`  seeded in ${formatMs(performance.now() - seedStart)}`);
    memory.push({ label: `after seed n=${size}`, snap: takeMemorySnapshot() });

    env.profiler.reset();
    const primary = ids[0]!;
    const sampleIds = ids.slice(0, Math.min(samplesPerOp, ids.length));

    async function measure(op: string, fn: () => Promise<unknown>) {
      const samples: number[] = [];
      for (let i = 0; i < sampleIds.length; i++) {
        const t0 = performance.now();
        await env.profiler.time(op, fn);
        samples.push(performance.now() - t0);
      }
      const stats = computeLatencyStats(samples);
      results.push({ size, op, stats });
      metrics[`insight.${op}.avg_ms.${size}`] = stats.averageMs;
      metrics[`insight.${op}.p95_ms.${size}`] = stats.p95Ms;
      console.log(`  ${op}: avg=${formatMs(stats.averageMs)} p95=${formatMs(stats.p95Ms)}`);
    }

    await measure("candidate_insight", async () => {
      const id = sampleIds[Math.floor(Math.random() * sampleIds.length)]!;
      return env.deps.candidateInsightService.getInsights(id, "candidate");
    });

    await measure("job_insight", async () => {
      return env.deps.insightEngine.getInsights({ type: "job", jobId: job.id });
    });

    await measure("audit_replay", async () => {
      return env.deps.auditReplayService.replay(primary);
    });

    await measure("knowledge_retrieval", async () => {
      const id = sampleIds[Math.floor(Math.random() * sampleIds.length)]!;
      return env.deps.repositories.knowledgeRepository.findByCandidateId(id);
    });

    topOps = env.profiler.top(10);
    memory.push({ label: `after insight n=${size}`, snap: takeMemorySnapshot() });
    await env.cleanup();
  }

  memory.push({ label: "end", snap: takeMemorySnapshot() });
  return { results, metrics, memory, envInfo, topOps };
}

async function main() {
  const run = await runInsightBenchmark();
  writeInsightReport(run);
  console.log(`\nWrote reports/benchmarks/insights.md`);
}

const isDirect =
  process.argv[1] &&
  (process.argv[1].endsWith("benchmark-insight.ts") ||
    process.argv[1].endsWith("benchmark-insight.js"));

if (isDirect) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
