import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EnvironmentInfo } from "./harness.js";
import type { LatencyStats } from "./stats.js";
import { formatMs } from "./stats.js";
import type { MemorySnapshot } from "./memory.js";
import { formatBytes, memoryTableRow } from "./memory.js";
import type { OperationStats } from "../../../src/shared/profiling/index.js";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");

export function reportsDir(...parts: string[]): string {
  return join(ROOT, "reports", ...parts);
}

export function benchmarksDir(...parts: string[]): string {
  return join(ROOT, "benchmarks", ...parts);
}

export function writeText(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

export function environmentMarkdown(env: EnvironmentInfo): string {
  return [
    "## Environment",
    "",
    `| Key | Value |`,
    `|-----|-------|`,
    `| CPU | ${env.cpuModel} × ${env.cpuCount} |`,
    `| RAM | ${env.ramTotalMb} MB total / ${env.ramFreeMb} MB free |`,
    `| Node | ${env.nodeVersion} |`,
    `| Platform | ${env.platform} |`,
    `| Persistence | ${env.persistenceDriver} |`,
    `| Database | ${env.database} |`,
    "",
  ].join("\n");
}

export function latencyRow(label: string, stats: LatencyStats): string {
  return `| ${label} | ${stats.count} | ${formatMs(stats.averageMs)} | ${formatMs(stats.medianMs)} | ${formatMs(stats.p95Ms)} | ${formatMs(stats.maxMs)} |`;
}

export function latencyTableHeader(): string {
  return `| Dataset / Op | N | Average | Median | P95 | Max |\n|--------------|---|--------:|-------:|----:|----:|`;
}

export function memorySection(entries: { label: string; snap: MemorySnapshot }[]): string {
  const lines = [
    "## Memory snapshots",
    "",
    `| Checkpoint | RSS | Heap Used | Heap Total | External |`,
    `|------------|----:|----------:|-----------:|---------:|`,
    ...entries.map((e) => memoryTableRow(e.label, e.snap)),
    "",
  ];
  return lines.join("\n");
}

export function topOpsSection(ops: OperationStats[], n = 5): string {
  const top = ops.slice(0, n);
  if (top.length === 0) return "## Top operations\n\n_(no samples)_\n";
  return [
    `## Top ${n} operations (by total time)`,
    "",
    `| Operation | Calls | Total | Avg | P95 | Max |`,
    `|-----------|------:|------:|----:|----:|----:|`,
    ...top.map(
      (o) =>
        `| ${o.name} | ${o.callCount} | ${formatMs(o.totalMs)} | ${formatMs(o.averageMs)} | ${formatMs(o.p95Ms)} | ${formatMs(o.maxMs)} |`,
    ),
    "",
  ].join("\n");
}

export type BaselineMetric = {
  key: string;
  valueMs: number;
};

export type BaselineFile = {
  version: 1;
  capturedAt: string;
  environment: EnvironmentInfo;
  metrics: Record<string, number>;
};

export type RegressionVerdict = "Improved" | "Stable" | "Regressed";

export type RegressionRow = {
  key: string;
  baselineMs: number;
  currentMs: number;
  deltaPct: number;
  verdict: RegressionVerdict;
};

const REGRESSION_THRESHOLD = 0.1; // TECH-003: warn if >10% slower

export function compareToBaseline(
  current: Record<string, number>,
  baseline: BaselineFile | null,
): RegressionRow[] {
  if (!baseline) return [];
  const rows: RegressionRow[] = [];
  for (const [key, currentMs] of Object.entries(current)) {
    const baselineMs = baseline.metrics[key];
    if (baselineMs === undefined || baselineMs <= 0) continue;
    const deltaPct = (currentMs - baselineMs) / baselineMs;
    let verdict: RegressionVerdict = "Stable";
    if (deltaPct <= -REGRESSION_THRESHOLD) verdict = "Improved";
    else if (deltaPct >= REGRESSION_THRESHOLD) verdict = "Regressed";
    rows.push({ key, baselineMs, currentMs, deltaPct, verdict });
  }
  return rows.sort((a, b) => b.deltaPct - a.deltaPct);
}

export function loadBaseline(): BaselineFile | null {
  const path = benchmarksDir("baseline.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as BaselineFile;
}

export function saveBaseline(file: BaselineFile): void {
  writeText(benchmarksDir("baseline.json"), JSON.stringify(file, null, 2) + "\n");
}

export function regressionMarkdown(rows: RegressionRow[]): string {
  if (rows.length === 0) {
    return "## Regression vs baseline\n\nNo baseline or no overlapping metrics. Warning only — CI does not fail.\n";
  }
  const regressed = rows.filter((r) => r.verdict === "Regressed");
  return [
    "## Regression vs baseline",
    "",
    `_Threshold ±${REGRESSION_THRESHOLD * 100}% — warning only, no CI failure._`,
    "",
    regressed.length
      ? `⚠ **${regressed.length} regressed** metric(s)`
      : "✔ No regressions above threshold",
    "",
    `| Metric | Baseline | Current | Δ% | Verdict |`,
    `|--------|---------:|--------:|----:|---------|`,
    ...rows.map(
      (r) =>
        `| ${r.key} | ${formatMs(r.baselineMs)} | ${formatMs(r.currentMs)} | ${(r.deltaPct * 100).toFixed(1)}% | ${r.verdict} |`,
    ),
    "",
  ].join("\n");
}

export function peakMemory(entries: MemorySnapshot[]): MemorySnapshot | null {
  if (entries.length === 0) return null;
  return entries.reduce((a, b) => (b.rss > a.rss ? b : a));
}

export { formatBytes, formatMs, ROOT };
