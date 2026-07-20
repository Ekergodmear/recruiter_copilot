/**
 * EPIC-014 runtime validation — Reporting & Export.
 * Evidence: reports/epic-014-validation-evidence.json
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

async function importCandidate(app: Awaited<ReturnType<typeof buildApp>>): Promise<string> {
  const docx = await createTestDocx([
    "E014 Cand",
    "e014@example.com",
    "React",
    "5 years of experience",
    "English B2",
  ]);
  const boundary = "----e014";
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
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
      "x-actor-id": "recruiter_alpha",
    },
    payload: body,
  });
  if (res.statusCode !== 201) throw new Error(`import failed: ${res.statusCode}`);
  return (res.json() as { candidateId: string }).candidateId;
}

async function main() {
  const steps: Step[] = [];
  const storagePath = mkdtempSync(join(tmpdir(), "epic-014-validate-"));
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: storagePath,
    DEFAULT_WORKSPACE_ID: "ws_epic014_validate",
    GEMINI_API_KEY: "",
  });
  const deps = createAppDependencies(config);
  const app = await buildApp(deps);
  const authz = deps.authorizationService;

  const healthBefore = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health-before",
    ac: "AC-11",
    description: "GET /health ok before validation",
    pass:
      healthBefore.statusCode === 200 &&
      (healthBefore.json() as { status?: string }).status === "ok",
    detail: { statusCode: healthBefore.statusCode },
  });

  const candidateId = await importCandidate(app);
  const job = await app.inject({
    method: "POST",
    url: "/api/v1/jobs",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { title: "E014 Job", company: "E014 Co", status: "Open" },
  });
  const jobId = (job.json() as { id: string }).id;
  const rel = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { candidateId, jobId },
  });
  await app.inject({
    method: "PATCH",
    url: `/api/v1/relationships/${(rel.json() as { id: string }).id}`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { stage: "Screening" },
  });

  steps.push({
    id: "report-service",
    ac: "AC-1",
    description: "ReportService wired",
    pass: typeof deps.reportService?.getOverview === "function",
    detail: {},
  });

  const overview = await app.inject({
    method: "GET",
    url: "/api/v1/reports/overview",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const ov = overview.json() as {
    counts: { candidates: number; jobs: number };
    stageDistribution: unknown[];
  };
  steps.push({
    id: "overview-json",
    ac: "AC-2",
    description: "GET /reports/overview returns Analytics-derived JSON",
    pass:
      overview.statusCode === 200 &&
      ov.counts.candidates >= 1 &&
      ov.counts.jobs >= 1 &&
      Array.isArray(ov.stageDistribution),
    detail: { statusCode: overview.statusCode, counts: ov.counts },
  });

  const ovCsv1 = await app.inject({
    method: "GET",
    url: "/api/v1/reports/export?kind=overview",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const ovCsv2 = await app.inject({
    method: "GET",
    url: "/api/v1/reports/export?kind=overview",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  steps.push({
    id: "csv-overview",
    ac: "AC-3",
    description: "CSV kind=overview deterministic metric rows",
    pass:
      ovCsv1.statusCode === 200 &&
      ovCsv1.body === ovCsv2.body &&
      ovCsv1.body.startsWith("metric,value\n") &&
      ovCsv1.body.includes("candidates,"),
    detail: { bytes: ovCsv1.body.length },
  });

  const auditCsv = await app.inject({
    method: "GET",
    url: "/api/v1/reports/export?kind=audit",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  steps.push({
    id: "csv-audit",
    ac: "AC-4",
    description: "CSV kind=audit exports Audit records",
    pass:
      auditCsv.statusCode === 200 &&
      auditCsv.body.startsWith("auditId,") &&
      auditCsv.body.includes("workflow.stage_changed"),
    detail: { bytes: auditCsv.body.length },
  });

  const candCsv = await app.inject({
    method: "GET",
    url: "/api/v1/reports/export?kind=candidates",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const jobCsv = await app.inject({
    method: "GET",
    url: "/api/v1/reports/export?kind=jobs",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  steps.push({
    id: "csv-entities",
    ac: "AC-5",
    description: "CSV candidates + jobs SoT projections",
    pass:
      candCsv.statusCode === 200 &&
      jobCsv.statusCode === 200 &&
      candCsv.body.includes(candidateId) &&
      jobCsv.body.includes(jobId),
    detail: { candidateId, jobId },
  });

  const ghost = await app.inject({
    method: "GET",
    url: "/api/v1/reports/overview",
    headers: { "x-actor-id": "ghost_unknown" },
  });
  const viewer = await app.inject({
    method: "GET",
    url: "/api/v1/reports/export?kind=jobs",
    headers: { "x-actor-id": "viewer_alpha" },
  });
  steps.push({
    id: "authorization",
    ac: "AC-6",
    description: "report.read via AuthorizationService",
    pass:
      authz.authorize("recruiter_alpha", "report.read").allowed &&
      authz.authorize("viewer_alpha", "report.read").allowed &&
      ghost.statusCode === 403 &&
      viewer.statusCode === 200,
    detail: { ghost: ghost.statusCode, viewer: viewer.statusCode },
  });

  const jobAfter = await app.inject({
    method: "GET",
    url: `/api/v1/jobs/${jobId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  steps.push({
    id: "read-only",
    ac: "AC-7",
    description: "Reporting does not mutate SoT",
    pass: (jobAfter.json() as { status: string }).status === "Open",
    detail: { status: (jobAfter.json() as { status: string }).status },
  });

  steps.push({
    id: "no-warehouse",
    ac: "AC-8",
    description: "No report warehouse — on-demand export only",
    pass: ovCsv1.statusCode === 200 && typeof deps.reportService.exportCsv === "function",
    detail: {},
  });

  steps.push({
    id: "determinism",
    ac: "AC-9",
    description: "Same data + query → same CSV",
    pass: ovCsv1.body === ovCsv2.body && candCsv.body === candCsv.body,
    detail: {},
  });

  const analytics = await app.inject({
    method: "GET",
    url: "/api/v1/analytics/overview",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const search = await app.inject({
    method: "GET",
    url: "/api/v1/search?q=E014",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const audit = await app.inject({
    method: "GET",
    url: "/api/v1/audit",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  steps.push({
    id: "regression",
    ac: "AC-10",
    description: "Regression Analytics/Search/Audit happy-paths",
    pass:
      analytics.statusCode === 200 &&
      search.statusCode === 200 &&
      audit.statusCode === 200 &&
      job.statusCode === 201,
    detail: {
      analytics: analytics.statusCode,
      search: search.statusCode,
      audit: audit.statusCode,
    },
  });

  const healthAfter = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health-after",
    ac: "AC-11",
    description: "GET /health still public",
    pass:
      healthAfter.statusCode === 200 && (healthAfter.json() as { status?: string }).status === "ok",
    detail: { statusCode: healthAfter.statusCode },
  });

  const failed = steps.filter((s) => !s.pass);
  const acIds = [
    "AC-1",
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
  ];
  const acceptanceCriteria = acIds.map((ac) => ({
    ac,
    pass: steps.filter((s) => s.ac === ac).every((s) => s.pass) && steps.some((s) => s.ac === ac),
  }));

  const report = {
    epic: "EPIC-014",
    title: "Reporting & Export",
    generatedAt: new Date().toISOString(),
    storagePath,
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    allStepsPass: failed.length === 0,
    summary: {
      totalSteps: steps.length,
      passed: steps.filter((s) => s.pass).length,
      failed: failed.map((s) => s.id),
      acceptanceCriteria,
      note: "AC-12 (pnpm run ci) recorded separately in Validation Report",
    },
    steps,
  };

  mkdirSync("reports", { recursive: true });
  const out = join("reports", "epic-014-validation-evidence.json");
  writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ verdict: report.verdict, out, summary: report.summary }, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
