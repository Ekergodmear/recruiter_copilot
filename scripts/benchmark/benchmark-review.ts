#!/usr/bin/env tsx
/**
 * TECH-002 — Review-path microbench (getReview + knowledge accept + mark ready).
 * Independent script; complements import / insight suites.
 *
 *   pnpm bench:review
 */
import { createBenchmarkEnv, collectEnvironmentInfo } from "./lib/harness.js";
import { createBenchmarkDocx } from "./lib/docx.js";
import { computeLatencyStats, parseSizeList, formatMs } from "./lib/stats.js";
import { takeMemorySnapshot, type MemorySnapshot } from "./lib/memory.js";
import { writeReviewReport } from "./lib/write-partial-reports.js";

const DEFAULT_SIZES = [10, 50];

export async function runReviewBenchmark(sizes?: number[]) {
  const resolved = sizes ?? parseSizeList(process.env.BENCHMARK_REVIEW_SIZES, DEFAULT_SIZES);
  const results: {
    size: number;
    review: ReturnType<typeof computeLatencyStats>;
    ready: ReturnType<typeof computeLatencyStats>;
  }[] = [];
  const memory: { label: string; snap: MemorySnapshot }[] = [];
  const metrics: Record<string, number> = {};
  let envInfo = collectEnvironmentInfo("memory");
  let topOps: ReturnType<
    import("../../../src/shared/profiling/index.js").OperationProfiler["top"]
  > = [];

  memory.push({ label: "start", snap: takeMemorySnapshot() });

  for (const size of resolved) {
    console.log(`\n[review] n=${size} …`);
    const env = await createBenchmarkEnv({ workspaceId: `ws_review_${size}` });
    envInfo = collectEnvironmentInfo(env.persistenceDriver, env.databaseUrl);
    env.profiler.reset();

    const reviewSamples: number[] = [];
    const readySamples: number[] = [];

    for (let i = 0; i < size; i++) {
      const file = await createBenchmarkDocx(i + 10_000);
      const imported = await env.deps.candidateImportService.importResume({
        file,
        filename: `bench-review-${size}-${i}.docx`,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sourceType: "manual_upload",
        workspaceId: env.workspaceId,
        actorId: "recruiter_bench",
      });

      const tReview = performance.now();
      const review = await env.profiler.time("review.getReview", () =>
        env.deps.candidateEditService.getReview(imported.candidateId),
      );
      reviewSamples.push(performance.now() - tReview);

      const field = review.diff?.[0]?.field ?? "summary";
      await env.profiler.time("review.knowledgeAccept", () =>
        env.deps.candidateEditService.reviewKnowledge({
          candidateId: imported.candidateId,
          field,
          action: "accept",
          actorId: "recruiter_bench",
        }),
      );

      const tReady = performance.now();
      await env.profiler.time("review.markReady", () =>
        env.deps.candidateEditService.markCandidateReady({
          candidateId: imported.candidateId,
          actorId: "recruiter_bench",
        }),
      );
      readySamples.push(performance.now() - tReady);
    }

    const review = computeLatencyStats(reviewSamples);
    const ready = computeLatencyStats(readySamples);
    results.push({ size, review, ready });
    metrics[`review.getReview.p95_ms.${size}`] = review.p95Ms;
    metrics[`review.markReady.p95_ms.${size}`] = ready.p95Ms;
    topOps = env.profiler.top(10);
    console.log(`  getReview p95=${formatMs(review.p95Ms)} markReady p95=${formatMs(ready.p95Ms)}`);
    memory.push({ label: `after review n=${size}`, snap: takeMemorySnapshot() });
    await env.cleanup();
  }

  memory.push({ label: "end", snap: takeMemorySnapshot() });
  return { results, metrics, memory, envInfo, topOps };
}

async function main() {
  const run = await runReviewBenchmark();
  writeReviewReport(run);
  console.log(`\nWrote reports/benchmarks/review.md`);
}

const isDirect =
  process.argv[1] &&
  (process.argv[1].endsWith("benchmark-review.ts") ||
    process.argv[1].endsWith("benchmark-review.js"));

if (isDirect) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
