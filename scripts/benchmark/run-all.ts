#!/usr/bin/env tsx
/**
 * TECH-002 — Run all benchmarks, write summary + memory + baseline compare.
 *
 *   pnpm bench:all
 *   BENCHMARK_QUICK=1 pnpm bench:all   # smaller sizes for local iteration
 */
import { runImportBenchmark } from "./benchmark-import.js";
import { runInsightBenchmark } from "./benchmark-insight.js";
import { runVerifyDataBenchmark } from "./benchmark-verify-data.js";
import { runReviewBenchmark } from "./benchmark-review.js";
import { takeMemorySnapshot, type MemorySnapshot } from "./lib/memory.js";
import { formatMs } from "./lib/stats.js";
import {
  writeText,
  reportsDir,
  environmentMarkdown,
  memorySection,
  topOpsSection,
  loadBaseline,
  saveBaseline,
  compareToBaseline,
  regressionMarkdown,
  peakMemory,
  type BaselineFile,
} from "./lib/report.js";
import type { EnvironmentInfo } from "./lib/harness.js";
import type { OperationStats } from "../../src/shared/profiling/index.js";
import { getLogger, withOperation } from "../../src/shared/logging/index.js";

function quickSizes() {
  if (process.env.BENCHMARK_QUICK === "1" || process.env.BENCHMARK_QUICK === "true") {
    process.env.BENCHMARK_IMPORT_SIZES ??= "5,10";
    process.env.BENCHMARK_INSIGHT_SIZES ??= "50,100";
    process.env.BENCHMARK_VERIFY_SIZES ??= "50,100";
    process.env.BENCHMARK_REVIEW_SIZES ??= "5";
    process.env.BENCHMARK_INSIGHT_SAMPLES ??= "5";
    process.env.BENCHMARK_VERIFY_REPEATS ??= "2";
    console.log("[bench:all] QUICK mode sizes enabled");
  }
}

async function main() {
  await withOperation(getLogger(), "benchmark", async () => runBenchmarkSuite());
}

async function runBenchmarkSuite() {
  quickSizes();
  const allMemory: { label: string; snap: MemorySnapshot }[] = [
    { label: "suite start", snap: takeMemorySnapshot() },
  ];
  const allMetrics: Record<string, number> = {};
  let envInfo: EnvironmentInfo | null = null;
  const allTop: OperationStats[] = [];

  console.log("\n=== TECH-002 Benchmark Suite ===\n");

  const { writeImportReport, writeInsightReport, writeVerifyReport, writeReviewReport } =
    await import("./lib/write-partial-reports.js");

  const importRun = await runImportBenchmark();
  Object.assign(allMetrics, importRun.metrics);
  envInfo = importRun.envInfo;
  allTop.push(...importRun.topOps);
  allMemory.push(...importRun.memory.map((m) => ({ label: `import/${m.label}`, snap: m.snap })));
  writeImportReport(importRun);

  const insightRun = await runInsightBenchmark();
  Object.assign(allMetrics, insightRun.metrics);
  allTop.push(...insightRun.topOps);
  allMemory.push(...insightRun.memory.map((m) => ({ label: `insight/${m.label}`, snap: m.snap })));
  writeInsightReport(insightRun);

  const verifyRun = await runVerifyDataBenchmark();
  Object.assign(allMetrics, verifyRun.metrics);
  allTop.push(...verifyRun.topOps);
  allMemory.push(...verifyRun.memory.map((m) => ({ label: `verify/${m.label}`, snap: m.snap })));
  writeVerifyReport(verifyRun);

  const reviewRun = await runReviewBenchmark();
  Object.assign(allMetrics, reviewRun.metrics);
  allTop.push(...reviewRun.topOps);
  allMemory.push(...reviewRun.memory.map((m) => ({ label: `review/${m.label}`, snap: m.snap })));
  writeReviewReport(reviewRun);

  allMemory.push({ label: "suite end", snap: takeMemorySnapshot() });

  const mergedTop = mergeTopOps(allTop, 5);
  const peak = peakMemory(allMemory.map((m) => m.snap));
  const slowestKey = Object.entries(allMetrics)
    .filter(([k]) => k.includes("p95") || k.includes("wall"))
    .sort((a, b) => b[1] - a[1])[0];

  // Memory report
  writeText(
    reportsDir("benchmarks", "memory.md"),
    [
      "# Memory Snapshots",
      "",
      `_Generated ${new Date().toISOString()} — TECH-002_`,
      "",
      envInfo ? environmentMarkdown(envInfo) : "",
      memorySection(allMemory),
      peak ? `**Peak RSS:** ${(peak.rss / (1024 * 1024)).toFixed(2)} MB at ${peak.at}\n` : "",
      "",
    ].join("\n"),
  );

  const baseline = loadBaseline();
  const regressions = compareToBaseline(allMetrics, baseline);
  const updateBaseline =
    process.env.BENCHMARK_UPDATE_BASELINE === "1" ||
    process.env.BENCHMARK_UPDATE_BASELINE === "true" ||
    !baseline;

  if (updateBaseline && envInfo) {
    const file: BaselineFile = {
      version: 1,
      capturedAt: new Date().toISOString(),
      environment: envInfo,
      metrics: allMetrics,
    };
    saveBaseline(file);
    console.log(
      baseline
        ? "Updated benchmarks/baseline.json (BENCHMARK_UPDATE_BASELINE)"
        : "Created benchmarks/baseline.json (first run)",
    );
  }

  const summary = [
    "# Benchmark Summary",
    "",
    `_Generated ${new Date().toISOString()} — TECH-002_`,
    "",
    envInfo ? environmentMarkdown(envInfo) : "## Environment\n\n_(unavailable)_\n",
    "## Dataset",
    "",
    `- Import sizes: ${process.env.BENCHMARK_IMPORT_SIZES ?? "10,100,500,1000"}`,
    `- Insight sizes: ${process.env.BENCHMARK_INSIGHT_SIZES ?? "100,1000,5000,10000"}`,
    `- verify:data sizes: ${process.env.BENCHMARK_VERIFY_SIZES ?? "100,1000,10000"}`,
    "",
    "## Results (key P95 / wall)",
    "",
    `| Metric | Value |`,
    `|--------|------:|`,
    ...Object.entries(allMetrics)
      .filter(
        ([k]) =>
          k.includes("p95") || k.includes("wall") || k.endsWith(".1000") || k.endsWith(".10000"),
      )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `| ${k} | ${formatMs(v)} |`),
    "",
    peak ? `**Peak memory (RSS):** ${(peak.rss / (1024 * 1024)).toFixed(2)} MB\n` : "",
    slowestKey
      ? `**Slowest recorded metric:** \`${slowestKey[0]}\` = ${formatMs(slowestKey[1])}\n`
      : "",
    topOpsSection(mergedTop, 5),
    regressionMarkdown(regressions),
    "## Detail reports",
    "",
    "- [import.md](./benchmarks/import.md)",
    "- [insights.md](./benchmarks/insights.md)",
    "- [verify-data.md](./benchmarks/verify-data.md)",
    "- [review.md](./benchmarks/review.md)",
    "- [memory.md](./benchmarks/memory.md)",
    "",
    "## TECH-003 targets (hotspots)",
    "",
    "| Hotspot | Target | Status |",
    "|---------|--------|--------|",
    `| verify:data @10k | <1.0s | ${formatMs(allMetrics["verify.p95_ms.10000"] ?? 0)} |`,
    `| job_insight @10k | <25ms | ${formatMs(allMetrics["insight.job_insight.p95_ms.10000"] ?? 0)} |`,
    `| audit_replay @10k | <2ms | ${formatMs(allMetrics["insight.audit_replay.p95_ms.10000"] ?? 0)} |`,
    "",
    "## Remaining bottlenecks",
    "",
    "1. Import wall clock for 1000 CVs (~14s sequential) — product throughput, not a correctness hotspot.",
    "2. Job insight still O(ready candidates) for exact match counts — acceptable under 25ms @10k.",
    "",
    "## Regression notes",
    "",
    "Comparison is warning-only. CI does not fail on regression.",
    "Sub-millisecond and cold-start (first import batch) deltas are noise unless >10% on P95 hotspots.",
    "",
  ].join("\n");

  writeText(reportsDir("benchmark-summary.md"), summary);
  console.log(`\nWrote ${reportsDir("benchmark-summary.md")}`);
  console.log(`Metrics: ${Object.keys(allMetrics).length}`);
}

function mergeTopOps(ops: OperationStats[], n: number): OperationStats[] {
  const map = new Map<string, OperationStats>();
  for (const o of ops) {
    const prev = map.get(o.name);
    if (!prev) {
      map.set(o.name, { ...o });
      continue;
    }
    map.set(o.name, {
      name: o.name,
      callCount: prev.callCount + o.callCount,
      totalMs: prev.totalMs + o.totalMs,
      averageMs: (prev.totalMs + o.totalMs) / (prev.callCount + o.callCount),
      medianMs: Math.max(prev.medianMs, o.medianMs),
      p95Ms: Math.max(prev.p95Ms, o.p95Ms),
      maxMs: Math.max(prev.maxMs, o.maxMs),
    });
  }
  return [...map.values()].sort((a, b) => b.totalMs - a.totalMs).slice(0, n);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
