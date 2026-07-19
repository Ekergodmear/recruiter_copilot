import { formatMs } from "./stats.js";
import {
  writeText,
  reportsDir,
  environmentMarkdown,
  latencyTableHeader,
  latencyRow,
  memorySection,
  topOpsSection,
} from "./report.js";
import type { runImportBenchmark } from "../benchmark-import.js";
import type { runInsightBenchmark } from "../benchmark-insight.js";
import type { runVerifyDataBenchmark } from "../benchmark-verify-data.js";
import type { runReviewBenchmark } from "../benchmark-review.js";

type ImportRun = Awaited<ReturnType<typeof runImportBenchmark>>;
type InsightRun = Awaited<ReturnType<typeof runInsightBenchmark>>;
type VerifyRun = Awaited<ReturnType<typeof runVerifyDataBenchmark>>;
type ReviewRun = Awaited<ReturnType<typeof runReviewBenchmark>>;

export function writeImportReport(run: ImportRun): void {
  const body = [
    "# Import Benchmark",
    "",
    `_Generated ${new Date().toISOString()} — TECH-002_`,
    "",
    environmentMarkdown(run.envInfo),
    "## Dataset",
    "",
    `Sizes: ${run.results.map((r) => r.size).join(", ")} synthetic DOCX via import pipeline.`,
    "",
    "## Results (per-resume latency)",
    "",
    latencyTableHeader(),
    ...run.results.map((r) => latencyRow(`Import n=${r.size}`, r.stats)),
    "",
    "## Wall clock (full batch)",
    "",
    `| Size | Wall | Failures | Peak RSS (end) |`,
    `|-----:|-----:|---------:|---------------:|`,
    ...run.results.map(
      (r) =>
        `| ${r.size} | ${formatMs(r.wallMs)} | ${r.failures} | ${(r.memoryEnd.rss / (1024 * 1024)).toFixed(2)} MB |`,
    ),
    "",
    memorySection(run.memory),
    topOpsSection(run.topOps, 5),
    "## Notes",
    "",
    "- Each size uses a fresh workspace.",
    "- Default persistence: memory. Set `BENCHMARK_PERSISTENCE=prisma` for Prisma.",
    "",
  ].join("\n");
  writeText(reportsDir("benchmarks", "import.md"), body);
}

export function writeInsightReport(run: InsightRun): void {
  const byOp = ["candidate_insight", "job_insight", "audit_replay", "knowledge_retrieval"];
  const sections = byOp.map((op) => {
    const rows = run.results.filter((r) => r.op === op);
    return [
      `### ${op}`,
      "",
      latencyTableHeader(),
      ...rows.map((r) => latencyRow(`n=${r.size}`, r.stats)),
      "",
    ].join("\n");
  });
  const body = [
    "# Insight Benchmark",
    "",
    `_Generated ${new Date().toISOString()} — TECH-002_`,
    "",
    environmentMarkdown(run.envInfo),
    "## Dataset",
    "",
    "Seeded ready candidates (direct repository writes).",
    `Sizes: ${[...new Set(run.results.map((r) => r.size))].join(", ")}.`,
    `Samples/op: ${process.env.BENCHMARK_INSIGHT_SAMPLES ?? 20}.`,
    "",
    "## Results",
    "",
    ...sections,
    memorySection(run.memory),
    topOpsSection(run.topOps, 5),
    "",
  ].join("\n");
  writeText(reportsDir("benchmarks", "insights.md"), body);
}

export function writeVerifyReport(run: VerifyRun): void {
  const body = [
    "# verify:data Benchmark",
    "",
    `_Generated ${new Date().toISOString()} — TECH-002_`,
    "",
    environmentMarkdown(run.envInfo),
    "## Dataset",
    "",
    `Repeats: ${process.env.BENCHMARK_VERIFY_REPEATS ?? 5}.`,
    "",
    "## Results",
    "",
    latencyTableHeader(),
    ...run.results.map((r) => latencyRow(`verify:data n=${r.size}`, r.stats)),
    "",
    `| Size | Errors (last run) |`,
    `|-----:|------------------:|`,
    ...run.results.map((r) => `| ${r.size} | ${r.errorCount} |`),
    "",
    memorySection(run.memory),
    topOpsSection(run.topOps, 5),
    "",
  ].join("\n");
  writeText(reportsDir("benchmarks", "verify-data.md"), body);
}

export function writeReviewReport(run: ReviewRun): void {
  const body = [
    "# Review Benchmark",
    "",
    `_Generated ${new Date().toISOString()} — TECH-002_`,
    "",
    environmentMarkdown(run.envInfo),
    "## Results",
    "",
    "### getReview",
    "",
    latencyTableHeader(),
    ...run.results.map((r) => latencyRow(`n=${r.size}`, r.review)),
    "",
    "### markReady",
    "",
    latencyTableHeader(),
    ...run.results.map((r) => latencyRow(`n=${r.size}`, r.ready)),
    "",
    memorySection(run.memory),
    topOpsSection(run.topOps, 5),
    "",
  ].join("\n");
  writeText(reportsDir("benchmarks", "review.md"), body);
}
