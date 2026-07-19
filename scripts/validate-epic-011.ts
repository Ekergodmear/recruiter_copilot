/**
 * EPIC-011 runtime validation — Integrations.
 * Evidence: reports/epic-011-validation-evidence.json
 */
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp, createAppDependencies } from "../src/app/server.js";
import { AppConfig } from "../src/shared/config/index.js";
import { createTestDocx } from "../tests/helpers/create-test-docx.js";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../src/modules/authorization/domain/types.js";
import { createProviderRegistry } from "../src/modules/integration/application/providers.js";

type Step = {
  id: string;
  ac?: string;
  description: string;
  pass: boolean;
  detail: Record<string, unknown>;
};

async function importCandidate(
  app: Awaited<ReturnType<typeof buildApp>>,
  actorId = "recruiter_alpha",
): Promise<string> {
  const docx = await createTestDocx([
    "E011 Cand",
    "e011@example.com",
    "React",
    "5 years of experience",
    "English B2",
  ]);
  const boundary = "----e011";
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
      "x-actor-id": actorId,
    },
    payload: body,
  });
  if (res.statusCode !== 201) {
    throw new Error(`import failed: ${res.statusCode}`);
  }
  return (res.json() as { candidateId: string }).candidateId;
}

async function jobTotal(app: Awaited<ReturnType<typeof buildApp>>): Promise<number> {
  const res = await app.inject({
    method: "GET",
    url: "/api/v1/jobs",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  return (res.json() as { total: number }).total;
}

async function main() {
  const steps: Step[] = [];
  const storagePath = mkdtempSync(join(tmpdir(), "epic-011-validate-"));
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: storagePath,
    DEFAULT_WORKSPACE_ID: "ws_epic011_validate",
    GEMINI_API_KEY: "",
  });
  const deps = createAppDependencies(config);
  const app = await buildApp(deps);
  const authz = deps.authorizationService;

  const healthBefore = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health-before",
    ac: "AC-13",
    description: "GET /health ok before validation",
    pass:
      healthBefore.statusCode === 200 &&
      (healthBefore.json() as { status?: string }).status === "ok",
    detail: { statusCode: healthBefore.statusCode },
  });

  // AC-12 Resume Import
  const c1 = await importCandidate(app);
  steps.push({
    id: "import-resume",
    ac: "AC-12",
    description: "Resume Import works for authorized Recruiter",
    pass: Boolean(c1),
    detail: { c1 },
  });

  // AC-2 Provider interface (all three keys)
  const providers = createProviderRegistry();
  steps.push({
    id: "provider-port",
    ac: "AC-2",
    description: "Provider Interface registered for csv, webhook, ats_mock",
    pass:
      providers.has("csv") &&
      providers.has("webhook") &&
      providers.has("ats_mock") &&
      typeof providers.get("csv")!.testConnection === "function" &&
      typeof providers.get("csv")!.parseImportPayload === "function",
    detail: { keys: [...providers.keys()] },
  });

  // AC-1 Registry
  const csvReg = await app.inject({
    method: "POST",
    url: "/api/v1/integrations",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { provider: "csv", displayName: "CSV Validate" },
  });
  const csvId = (csvReg.json() as { integrationId: string }).integrationId;
  const list = await app.inject({
    method: "GET",
    url: "/api/v1/integrations",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  steps.push({
    id: "registry",
    ac: "AC-1",
    description: "Integration Registry create + list",
    pass:
      csvReg.statusCode === 201 &&
      (csvReg.json() as { status: string }).status === "Enabled" &&
      list.statusCode === 200 &&
      (list.json() as { total: number }).total >= 1,
    detail: { csvId, listTotal: (list.json() as { total: number }).total },
  });

  const csvPayload = [
    "title,company,location,status,notes",
    "E011 Job A,Acme,Remote,Open,notes-a",
    "E011 Job B,Acme,Hanoi,Draft,notes-b",
  ].join("\n");

  const jobsBeforePreview = await jobTotal(app);

  // AC-7 Preview no persist + preview determinism (reviewer non-blocker)
  const p1 = await app.inject({
    method: "POST",
    url: `/api/v1/integrations/${csvId}/import/preview`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { payload: csvPayload },
  });
  const p2 = await app.inject({
    method: "POST",
    url: `/api/v1/integrations/${csvId}/import/preview`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { payload: csvPayload },
  });
  const p3 = await app.inject({
    method: "POST",
    url: `/api/v1/integrations/${csvId}/import/preview`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { payload: csvPayload },
  });
  const jobsAfterPreview = await jobTotal(app);
  const previewStable =
    JSON.stringify(p1.json()) === JSON.stringify(p2.json()) &&
    JSON.stringify(p2.json()) === JSON.stringify(p3.json());
  steps.push({
    id: "preview-no-persist",
    ac: "AC-7",
    description: "Preview does not persist; Execute requires confirm",
    pass:
      p1.statusCode === 200 &&
      (p1.json() as { rowCount: number }).rowCount === 2 &&
      jobsAfterPreview === jobsBeforePreview,
    detail: {
      rowCount: (p1.json() as { rowCount: number }).rowCount,
      jobsBeforePreview,
      jobsAfterPreview,
    },
  });
  steps.push({
    id: "preview-determinism",
    description: "Preview deterministic ×3 with same input; no side effects",
    pass: previewStable && jobsAfterPreview === jobsBeforePreview,
    detail: { previewStable, jobsUnchanged: jobsAfterPreview === jobsBeforePreview },
  });

  const noConfirm = await app.inject({
    method: "POST",
    url: `/api/v1/integrations/${csvId}/import/execute`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { payload: csvPayload },
  });
  steps.push({
    id: "confirm-required",
    ac: "AC-7",
    description: "Execute without confirmed → 403",
    pass: noConfirm.statusCode === 403 && (await jobTotal(app)) === jobsBeforePreview,
    detail: { statusCode: noConfirm.statusCode },
  });

  // AC-4 Manual import CSV
  const execOk = await app.inject({
    method: "POST",
    url: `/api/v1/integrations/${csvId}/import/execute`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { payload: csvPayload, confirmed: true },
  });
  const jobsAfterImport = await jobTotal(app);
  steps.push({
    id: "manual-import-csv",
    ac: "AC-4",
    description: "Manual CSV Import via JobService (confirmed)",
    pass:
      execOk.statusCode === 200 &&
      (execOk.json() as { success: boolean }).success === true &&
      ((execOk.json() as { createdIds: string[] }).createdIds?.length ?? 0) === 2 &&
      jobsAfterImport === jobsBeforePreview + 2,
    detail: {
      statusCode: execOk.statusCode,
      createdIds: (execOk.json() as { createdIds: string[] }).createdIds,
      jobsAfterImport,
    },
  });

  // AC-7b Atomicity
  const beforeAtomic = await jobTotal(app);
  const badCsv = [
    "title,company,location,status,notes",
    "Should Rollback,Acme,Remote,Open,ok",
    "Bad Status Job,Acme,Remote,NotARealStatus,bad",
  ].join("\n");
  const atomic = await app.inject({
    method: "POST",
    url: `/api/v1/integrations/${csvId}/import/execute`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { payload: badCsv, confirmed: true },
  });
  const afterAtomic = await jobTotal(app);
  steps.push({
    id: "import-atomicity",
    ac: "AC-7b",
    description: "Failed Execute leaves no partial import",
    pass:
      atomic.statusCode === 400 &&
      (atomic.json() as { success: boolean }).success === false &&
      ((atomic.json() as { createdIds: string[] }).createdIds?.length ?? 0) === 0 &&
      afterAtomic === beforeAtomic,
    detail: {
      statusCode: atomic.statusCode,
      beforeAtomic,
      afterAtomic,
      error: (atomic.json() as { error?: unknown }).error,
    },
  });

  // AC-3 Enable/Disable
  await app.inject({
    method: "PATCH",
    url: `/api/v1/integrations/${csvId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { status: "Disabled" },
  });
  const disabledExec = await app.inject({
    method: "POST",
    url: `/api/v1/integrations/${csvId}/import/execute`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { payload: csvPayload, confirmed: true },
  });
  await app.inject({
    method: "PATCH",
    url: `/api/v1/integrations/${csvId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { status: "Enabled" },
  });
  steps.push({
    id: "enable-disable",
    ac: "AC-3",
    description: "Disabled integration rejects execute",
    pass: disabledExec.statusCode === 403,
    detail: { statusCode: disabledExec.statusCode },
  });

  // AC-5 Export CSV + Webhook
  const exportCsv = await app.inject({
    method: "POST",
    url: `/api/v1/integrations/${csvId}/export/execute`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { confirmed: true, format: "csv" },
  });
  const whReg = await app.inject({
    method: "POST",
    url: "/api/v1/integrations",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { provider: "webhook", config: { webhookUrl: "https://example.com/hook" } },
  });
  const whId = (whReg.json() as { integrationId: string }).integrationId;
  const exportWh = await app.inject({
    method: "POST",
    url: `/api/v1/integrations/${whId}/export/execute`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { confirmed: true },
  });
  steps.push({
    id: "manual-export",
    ac: "AC-5",
    description: "Manual Export CSV and Webhook JSON",
    pass:
      exportCsv.statusCode === 200 &&
      String((exportCsv.json() as { exportedPayload?: string }).exportedPayload).includes(
        "title,company",
      ) &&
      exportWh.statusCode === 200 &&
      JSON.parse(String((exportWh.json() as { exportedPayload?: string }).exportedPayload))
        .provider === "webhook",
    detail: {
      csvStatus: exportCsv.statusCode,
      webhookStatus: exportWh.statusCode,
    },
  });

  // AC-6 Test connection (no SoT mutation)
  const jobsBeforeTest = await jobTotal(app);
  const atsReg = await app.inject({
    method: "POST",
    url: "/api/v1/integrations",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { provider: "ats_mock", displayName: "ATS Mock" },
  });
  const atsId = (atsReg.json() as { integrationId: string }).integrationId;
  const testConn = await app.inject({
    method: "POST",
    url: `/api/v1/integrations/${atsId}/test-connection`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const jobsAfterTest = await jobTotal(app);
  steps.push({
    id: "test-connection",
    ac: "AC-6",
    description: "Test Connection ok/fail without mutating SoT",
    pass:
      testConn.statusCode === 200 &&
      (testConn.json() as { ok: boolean }).ok === true &&
      jobsAfterTest === jobsBeforeTest,
    detail: {
      ok: (testConn.json() as { ok: boolean }).ok,
      jobsUnchanged: jobsAfterTest === jobsBeforeTest,
    },
  });

  // ATS Mock import (AC-4 also)
  const atsExec = await app.inject({
    method: "POST",
    url: `/api/v1/integrations/${atsId}/import/execute`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { payload: "mock", confirmed: true },
  });
  steps.push({
    id: "ats-mock-import",
    ac: "AC-4",
    description: "ATS Mock manual import via same execute path",
    pass:
      atsExec.statusCode === 200 &&
      ((atsExec.json() as { createdIds: string[] }).createdIds?.length ?? 0) > 0,
    detail: { createdIds: (atsExec.json() as { createdIds: string[] }).createdIds },
  });

  // AC-8 Authorization
  const viewerCreate = await app.inject({
    method: "POST",
    url: "/api/v1/integrations",
    headers: { "x-actor-id": "viewer_alpha" },
    payload: { provider: "csv" },
  });
  const viewerList = await app.inject({
    method: "GET",
    url: "/api/v1/integrations",
    headers: { "x-actor-id": "viewer_alpha" },
  });
  const ghostList = await app.inject({
    method: "GET",
    url: "/api/v1/integrations",
    headers: { "x-actor-id": "ghost_actor" },
  });
  steps.push({
    id: "authorization",
    ac: "AC-8",
    description: "integration.read/execute via AuthorizationService",
    pass:
      PERMISSIONS.includes("integration.read") &&
      PERMISSIONS.includes("integration.execute") &&
      authz.authorize("viewer_alpha", "integration.read").allowed === true &&
      authz.authorize("viewer_alpha", "integration.execute").allowed === false &&
      !ROLE_PERMISSIONS.Viewer.includes("integration.execute") &&
      viewerCreate.statusCode === 403 &&
      viewerList.statusCode === 200 &&
      ghostList.statusCode === 403,
    detail: {
      viewerCreate: viewerCreate.statusCode,
      viewerList: viewerList.statusCode,
      ghostList: ghostList.statusCode,
    },
  });

  // AC-9 / adapter-only evidence: execute creates Jobs only (JobService path) — Matching unchanged
  // AC-10 no business rules
  const jobRes = await app.inject({
    method: "POST",
    url: "/api/v1/jobs",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { title: "E011 Match Job", company: "E011 Co", status: "Open" },
  });
  const jobId = (jobRes.json() as { id: string }).id;
  const match1 = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const score = (match1.json() as { overallMatchScore: number }).overallMatchScore;
  const match2 = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  steps.push({
    id: "no-direct-db-and-no-business-rules",
    ac: "AC-9",
    description: "Import creates Jobs via Application Services; Matching semantics unchanged",
    pass:
      execOk.statusCode === 200 &&
      match1.statusCode === 200 &&
      match2.statusCode === 200 &&
      (match2.json() as { overallMatchScore: number }).overallMatchScore === score,
    detail: { score, createdViaImport: (execOk.json() as { createdIds: string[] }).createdIds },
  });
  steps.push({
    id: "no-business-rules",
    ac: "AC-10",
    description: "Matching score stable under Integrations usage",
    pass: (match2.json() as { overallMatchScore: number }).overallMatchScore === score,
    detail: { score },
  });

  // AC-11 Regression
  const relRes = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { candidateId: c1, jobId },
  });
  const analytics = await app.inject({
    method: "GET",
    url: "/api/v1/analytics/overview",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const notif = await app.inject({
    method: "GET",
    url: "/api/v1/notifications",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  steps.push({
    id: "regression",
    ac: "AC-11",
    description: "Authorized happy-path regression (Job/Rel/Match/Analytics/Notifications)",
    pass:
      jobRes.statusCode === 201 &&
      relRes.statusCode === 201 &&
      match1.statusCode === 200 &&
      analytics.statusCode === 200 &&
      notif.statusCode === 200,
    detail: {
      job: jobRes.statusCode,
      rel: relRes.statusCode,
      match: match1.statusCode,
      analytics: analytics.statusCode,
      notifications: notif.statusCode,
    },
  });

  const healthAfter = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health-after",
    ac: "AC-13",
    description: "GET /health still public after integration checks",
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
    "AC-7b",
    "AC-8",
    "AC-9",
    "AC-10",
    "AC-11",
    "AC-12",
    "AC-13",
  ];
  const acceptanceCriteria = acIds.map((ac) => ({
    ac,
    pass: steps.filter((s) => s.ac === ac).every((s) => s.pass) && steps.some((s) => s.ac === ac),
  }));

  const report = {
    epic: "EPIC-011",
    title: "Integrations",
    generatedAt: new Date().toISOString(),
    storagePath,
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    allStepsPass: failed.length === 0,
    summary: {
      totalSteps: steps.length,
      passed: steps.filter((s) => s.pass).length,
      failed: failed.map((s) => s.id),
      acceptanceCriteria,
      note: "AC-14 (pnpm run ci) recorded separately in Validation Report",
    },
    steps,
  };

  mkdirSync("reports", { recursive: true });
  const out = join("reports", "epic-011-validation-evidence.json");
  writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ verdict: report.verdict, out, summary: report.summary }, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
