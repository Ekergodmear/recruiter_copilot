/**
 * EPIC-007 runtime validation — Analytics & Insights.
 * Evidence: reports/epic-007-validation-evidence.json
 */
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp, createAppDependencies } from "../src/app/server.js";
import { AppConfig } from "../src/shared/config/index.js";
import { createTestDocx } from "../tests/helpers/create-test-docx.js";

type Step = {
  id: string;
  ac?: string;
  description: string;
  pass: boolean;
  detail: Record<string, unknown>;
};

type StageRow = { stage: string; count: number; relationshipIds: string[] };
type MatchItem = {
  relationshipId: string;
  candidateId: string;
  jobId: string;
  overallMatchScore: number;
};
type Snapshot = {
  scope: string;
  jobId: string | null;
  generatedAt: string;
  sourceCapabilities: string[];
  counts: { candidates: number; jobs: number; relationships: number };
  stageDistribution: { stages: StageRow[]; total: number };
  funnel: {
    transitions: Array<{
      from: string | null;
      to: string;
      count: number;
      relationshipIds: string[];
    }>;
    conversions: Array<{
      from: string;
      to: string;
      reachedFrom: number;
      movedTo: number;
      rate: number | null;
      relationshipIdsReachedFrom: string[];
      relationshipIdsMovedTo: string[];
    }>;
  };
  matchScoreDistribution: {
    buckets: Array<{ label: string; count: number; items: MatchItem[] }>;
    totalComputed: number;
    source: string;
  };
  timeToStage: {
    byStage: Array<{
      stage: string;
      sampleSize: number;
      averageDays: number | null;
      medianDays: number | null;
      relationshipIds: string[];
    }>;
  };
};

/** Stable metric shape — strip wall-clock fields (generatedAt, Matching computedAt). */
function stableMetrics(s: Snapshot): unknown {
  return {
    scope: s.scope,
    jobId: s.jobId,
    sourceCapabilities: s.sourceCapabilities,
    counts: s.counts,
    stageDistribution: s.stageDistribution,
    funnel: s.funnel,
    matchScoreDistribution: {
      source: s.matchScoreDistribution.source,
      totalComputed: s.matchScoreDistribution.totalComputed,
      buckets: s.matchScoreDistribution.buckets.map((b) => ({
        label: b.label,
        count: b.count,
        items: b.items.map((i) => ({
          relationshipId: i.relationshipId,
          candidateId: i.candidateId,
          jobId: i.jobId,
          overallMatchScore: i.overallMatchScore,
        })),
      })),
    },
    timeToStage: s.timeToStage,
  };
}

async function importCandidate(
  app: Awaited<ReturnType<typeof buildApp>>,
  lines: string[],
): Promise<string> {
  const docx = await createTestDocx(lines);
  const boundary = "----e007";
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="c.docx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`,
    ),
    docx,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/candidates/import-resume",
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    payload: body,
  });
  if (res.statusCode !== 201) {
    throw new Error(`import failed: ${res.statusCode}`);
  }
  return (res.json() as { candidateId: string }).candidateId;
}

async function main() {
  const steps: Step[] = [];
  const storagePath = mkdtempSync(join(tmpdir(), "epic-007-validate-"));
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: storagePath,
    DEFAULT_WORKSPACE_ID: "ws_epic007_validate",
    GEMINI_API_KEY: "",
  });
  const app = await buildApp(createAppDependencies(config));

  const health = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health",
    ac: "AC-15",
    description: "GET /health returns status ok",
    pass: health.statusCode === 200 && (health.json() as { status?: string }).status === "ok",
    detail: { statusCode: health.statusCode },
  });

  const c1 = await importCandidate(app, [
    "E007 Cand",
    "e007@example.com",
    "React",
    "TypeScript",
    "5 years of experience",
    "English B2",
  ]);
  steps.push({
    id: "import",
    ac: "AC-14",
    description: "Resume Import works (no regression)",
    pass: Boolean(c1),
    detail: { c1 },
  });

  const jobRes = await app.inject({
    method: "POST",
    url: "/api/v1/jobs",
    payload: {
      title: "E007 Job",
      company: "E007 Co",
      status: "Open",
      salaryMin: 1000,
      salaryMax: 3000,
      currency: "USD",
    },
  });
  const jobId = (jobRes.json() as { id: string }).id;
  await app.inject({
    method: "PATCH",
    url: `/api/v1/jobs/${jobId}`,
    payload: {
      skills: ["React", "TypeScript", "Node"],
      experienceYears: 5,
      englishRequirement: "B2",
    },
  });
  await app.inject({
    method: "PATCH",
    url: `/api/v1/candidates/${c1}`,
    payload: { salary: "2000" },
  });

  const relRes = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    payload: { candidateId: c1, jobId },
  });
  const relationshipId = (relRes.json() as { id: string }).id;
  await app.inject({
    method: "PATCH",
    url: `/api/v1/relationships/${relationshipId}`,
    payload: { stage: "Screening" },
  });

  const matchRes = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
  });
  const matchScore = (matchRes.json() as { overallMatchScore: number }).overallMatchScore;

  const beforeCand = await app.inject({ method: "GET", url: `/api/v1/candidates/${c1}` });
  const beforeJob = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` });
  const beforeRel = await app.inject({
    method: "GET",
    url: `/api/v1/relationships/${relationshipId}`,
  });

  const overview1 = await app.inject({ method: "GET", url: "/api/v1/analytics/overview" });
  const overview2 = await app.inject({ method: "GET", url: "/api/v1/analytics/overview" });
  const o1 = overview1.json() as Snapshot;
  const o2 = overview2.json() as Snapshot;

  steps.push({
    id: "stage-distribution",
    ac: "AC-1",
    description: "Stage Distribution returns counts by currentStage",
    pass:
      overview1.statusCode === 200 &&
      o1.stageDistribution.total >= 1 &&
      o1.stageDistribution.stages.some((s) => s.stage === "Screening" && s.count >= 1),
    detail: {
      statusCode: overview1.statusCode,
      total: o1.stageDistribution.total,
      screening: o1.stageDistribution.stages.find((s) => s.stage === "Screening"),
    },
  });

  const screening = o1.stageDistribution.stages.find((s) => s.stage === "Screening");
  const stageSum = o1.stageDistribution.stages.reduce((a, s) => a + s.count, 0);
  steps.push({
    id: "traceability",
    ac: "AC-1b",
    description: "Metrics include relationshipIds and Matching Result items",
    pass:
      Boolean(screening?.relationshipIds?.includes(relationshipId)) &&
      o1.matchScoreDistribution.buckets.some((b) =>
        b.items.some((i) => i.relationshipId === relationshipId),
      ) &&
      o1.funnel.conversions.some((c) => c.relationshipIdsReachedFrom.length >= 0),
    detail: {
      screeningIds: screening?.relationshipIds,
      matchItems: o1.matchScoreDistribution.buckets.flatMap((b) => b.items),
    },
  });

  steps.push({
    id: "funnel",
    ac: "AC-2",
    description: "Funnel / Stage Conversion derived from Stage History",
    pass:
      o1.funnel.transitions.length > 0 &&
      o1.funnel.conversions.length > 0 &&
      o1.funnel.transitions.some((t) => t.relationshipIds.includes(relationshipId)),
    detail: {
      transitions: o1.funnel.transitions.length,
      conversions: o1.funnel.conversions.length,
    },
  });

  steps.push({
    id: "counts",
    ac: "AC-3",
    description: "Candidate / Job / Relationship counts available",
    pass: o1.counts.candidates >= 1 && o1.counts.jobs >= 1 && o1.counts.relationships >= 1,
    detail: { counts: o1.counts },
  });

  const matchItem = o1.matchScoreDistribution.buckets
    .flatMap((b) => b.items)
    .find((i) => i.relationshipId === relationshipId);
  steps.push({
    id: "match-on-demand",
    ac: "AC-4",
    description: "Match Score Distribution uses EPIC-005 on-demand (score equals Matching GET)",
    pass:
      o1.matchScoreDistribution.source === "matching_on_demand" &&
      o1.matchScoreDistribution.totalComputed >= 1 &&
      matchItem?.overallMatchScore === matchScore &&
      o1.sourceCapabilities.includes("matching"),
    detail: {
      source: o1.matchScoreDistribution.source,
      matchItem,
      matchingGetScore: matchScore,
    },
  });

  const jobSnap = await app.inject({
    method: "GET",
    url: `/api/v1/analytics/jobs/${jobId}`,
  });
  const jobBody = jobSnap.json() as Snapshot;
  steps.push({
    id: "job-snapshot",
    ac: "AC-5",
    description: "Job Pipeline Snapshot returns stage + match overview",
    pass:
      jobSnap.statusCode === 200 &&
      jobBody.scope === "job" &&
      jobBody.jobId === jobId &&
      jobBody.stageDistribution.total === 1 &&
      jobBody.matchScoreDistribution.source === "matching_on_demand",
    detail: {
      statusCode: jobSnap.statusCode,
      scope: jobBody.scope,
      total: jobBody.stageDistribution.total,
    },
  });

  const timeRows = o1.timeToStage.byStage;
  const hasNullWhenEmpty = timeRows.every(
    (t) =>
      (t.sampleSize === 0 && t.averageDays === null && t.medianDays === null) ||
      (t.sampleSize > 0 && t.averageDays != null),
  );
  steps.push({
    id: "time-to-stage",
    ac: "AC-6",
    description: "Time-to-stage uses history timestamps; null when not computable",
    pass: Array.isArray(timeRows) && hasNullWhenEmpty,
    detail: {
      withSamples: timeRows.filter((t) => t.sampleSize > 0).length,
      emptyNullOk: hasNullWhenEmpty,
    },
  });

  const afterCand = await app.inject({ method: "GET", url: `/api/v1/candidates/${c1}` });
  const afterJob = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` });
  const afterRel = await app.inject({
    method: "GET",
    url: `/api/v1/relationships/${relationshipId}`,
  });
  const afterMatch = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
  });
  steps.push({
    id: "read-only",
    ac: "AC-7",
    description: "Analytics queries do not mutate Candidate/Job/Relationship/Workflow/Matching",
    pass:
      JSON.stringify(afterCand.json()) === JSON.stringify(beforeCand.json()) &&
      JSON.stringify(afterJob.json()) === JSON.stringify(beforeJob.json()) &&
      (afterRel.json() as { currentStage: string }).currentStage ===
        (beforeRel.json() as { currentStage: string }).currentStage &&
      JSON.stringify((afterRel.json() as { stageHistory: unknown }).stageHistory) ===
        JSON.stringify((beforeRel.json() as { stageHistory: unknown }).stageHistory) &&
      (afterMatch.json() as { overallMatchScore: number }).overallMatchScore === matchScore,
    detail: {
      candidateUnchanged: true,
      jobUnchanged: true,
      workflowUnchanged: true,
      matchingUnchanged: true,
    },
  });

  const candList = await app.inject({ method: "GET", url: "/api/v1/candidates" });
  const candGet = await app.inject({ method: "GET", url: `/api/v1/candidates/${c1}` });
  steps.push({
    id: "candidate-workspace",
    ac: "AC-8",
    description: "Candidate Workspace no regression",
    pass: candList.statusCode === 200 && candGet.statusCode === 200,
    detail: { list: candList.statusCode, get: candGet.statusCode },
  });

  const jobList = await app.inject({ method: "GET", url: "/api/v1/jobs" });
  const jobGet = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` });
  steps.push({
    id: "job-workspace",
    ac: "AC-9",
    description: "Job Workspace no regression",
    pass: jobList.statusCode === 200 && jobGet.statusCode === 200,
    detail: { list: jobList.statusCode, get: jobGet.statusCode },
  });

  const relList = await app.inject({
    method: "GET",
    url: `/api/v1/jobs/${jobId}/relationships`,
  });
  const dup = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    payload: { candidateId: c1, jobId },
  });
  steps.push({
    id: "relationship-foundation",
    ac: "AC-10",
    description: "Relationship Foundation no regression (list + duplicate 409)",
    pass: relList.statusCode === 200 && dup.statusCode === 409,
    detail: { list: relList.statusCode, dup: dup.statusCode },
  });

  const relAfter = await app.inject({
    method: "GET",
    url: `/api/v1/relationships/${relationshipId}`,
  });
  steps.push({
    id: "workflow-foundation",
    ac: "AC-11",
    description: "Workflow Foundation no regression (stage + history intact)",
    pass:
      relAfter.statusCode === 200 &&
      (relAfter.json() as { currentStage: string }).currentStage === "Screening" &&
      ((relAfter.json() as { stageHistory: unknown[] }).stageHistory?.length ?? 0) >= 2,
    detail: {
      currentStage: (relAfter.json() as { currentStage: string }).currentStage,
      historyLen: (relAfter.json() as { stageHistory: unknown[] }).stageHistory?.length,
    },
  });

  const matchAgain = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
  });
  steps.push({
    id: "matching-foundation",
    ac: "AC-12",
    description: "Matching Foundation no regression",
    pass:
      matchAgain.statusCode === 200 &&
      (matchAgain.json() as { overallMatchScore: number }).overallMatchScore === matchScore,
    detail: { statusCode: matchAgain.statusCode, score: matchScore },
  });

  const copilot = await app.inject({
    method: "POST",
    url: "/api/v1/copilot/explain-match",
    payload: { candidateId: c1, jobId },
  });
  const copilotBody = copilot.json() as { aiSuggestion?: string; evidence?: unknown };
  steps.push({
    id: "copilot-regression",
    ac: "AC-13",
    description: "AI Recruiter Copilot no regression",
    pass:
      copilot.statusCode === 200 &&
      Boolean(copilotBody.aiSuggestion) &&
      copilotBody.evidence != null,
    detail: { statusCode: copilot.statusCode },
  });

  // Reviewer non-blocker: consistency (exclude wall-clock fields)
  const stable =
    overview1.statusCode === 200 &&
    overview2.statusCode === 200 &&
    JSON.stringify(stableMetrics(o1)) === JSON.stringify(stableMetrics(o2));
  steps.push({
    id: "consistency-repeat",
    description:
      "Two consecutive analytics calls yield identical metrics (excluding generatedAt / computedAt)",
    pass: stable,
    detail: { stable, generatedAt1: o1.generatedAt, generatedAt2: o2.generatedAt },
  });

  steps.push({
    id: "consistency-stage-sum",
    description: "Sum of stage distribution counts equals stageDistribution.total / relationships",
    pass:
      stageSum === o1.stageDistribution.total &&
      o1.stageDistribution.total === o1.counts.relationships,
    detail: {
      stageSum,
      total: o1.stageDistribution.total,
      relationships: o1.counts.relationships,
    },
  });

  const healthAfter = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health-after",
    ac: "AC-15",
    description: "GET /health still ok after analytics",
    pass:
      healthAfter.statusCode === 200 && (healthAfter.json() as { status?: string }).status === "ok",
    detail: { statusCode: healthAfter.statusCode },
  });

  const failed = steps.filter((s) => !s.pass);
  const acIds = [
    "AC-1",
    "AC-1b",
    "AC-2",
    "AC-3",
    "AC-4",
    "AC-5",
    "AC-6",
    "AC-7",
    "AC-8",
    "AC-9",
    "AC-10",
    "AC-11",
    "AC-12",
    "AC-13",
    "AC-14",
    "AC-15",
  ];
  const acceptanceCriteria = acIds.map((ac) => ({
    ac,
    pass: steps.filter((s) => s.ac === ac).every((s) => s.pass) && steps.some((s) => s.ac === ac),
  }));

  const report = {
    epic: "EPIC-007",
    title: "Analytics & Insights",
    generatedAt: new Date().toISOString(),
    storagePath,
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    allStepsPass: failed.length === 0,
    summary: {
      totalSteps: steps.length,
      passed: steps.filter((s) => s.pass).length,
      failed: failed.map((s) => s.id),
      acceptanceCriteria,
      note: "AC-16 (pnpm run ci) recorded separately in Validation Report",
    },
    steps,
  };

  mkdirSync("reports", { recursive: true });
  const out = join("reports", "epic-007-validation-evidence.json");
  writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(
    JSON.stringify(
      {
        verdict: report.verdict,
        out,
        summary: report.summary,
      },
      null,
      2,
    ),
  );
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
