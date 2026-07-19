/**
 * EPIC-012 runtime validation — Audit & Governance.
 * Evidence: reports/epic-012-validation-evidence.json
 */
import { mkdirSync, writeFileSync, mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp, createAppDependencies } from "../src/app/server.js";
import { AppConfig } from "../src/shared/config/index.js";
import { createTestDocx } from "../tests/helpers/create-test-docx.js";
import type { AuditRecord } from "../src/modules/audit/domain/types.js";

type Step = {
  id: string;
  ac?: string;
  description: string;
  pass: boolean;
  detail: Record<string, unknown>;
};

type AuditItem = AuditRecord;

async function importCandidate(
  app: Awaited<ReturnType<typeof buildApp>>,
  actorId = "recruiter_alpha",
): Promise<string> {
  const docx = await createTestDocx([
    "E012 Cand",
    "e012@example.com",
    "React",
    "5 years of experience",
    "English B2",
  ]);
  const boundary = "----e012";
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

function isNewestFirst(items: AuditItem[]): boolean {
  for (let i = 1; i < items.length; i++) {
    if (items[i - 1]!.occurredAt < items[i]!.occurredAt) return false;
  }
  return true;
}

async function main() {
  const steps: Step[] = [];
  const storagePath = mkdtempSync(join(tmpdir(), "epic-012-validate-"));
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: storagePath,
    DEFAULT_WORKSPACE_ID: "ws_epic012_validate",
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
  const candidateId = await importCandidate(app);
  steps.push({
    id: "import-resume",
    ac: "AC-12",
    description: "Resume Import works for authorized Recruiter",
    pass: Boolean(candidateId),
    detail: { candidateId },
  });

  const jobRes = await app.inject({
    method: "POST",
    url: "/api/v1/jobs",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { title: "E012 Audit Job", company: "E012 Co", status: "Open" },
  });
  const jobId = (jobRes.json() as { id: string }).id;
  const relRes = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { candidateId, jobId },
  });
  const relationshipId = (relRes.json() as { id: string }).id;

  // AC-1 / AC-2 — record model via producers + query shape
  const assign = await app.inject({
    method: "POST",
    url: "/api/v1/automation/assign",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: {
      relationshipId,
      assigneeId: "recruiter_beta",
      actorId: "recruiter_alpha",
      confirmed: true,
    },
  });
  const actionId = (assign.json() as { actionId: string }).actionId;

  let feed = await app.inject({
    method: "GET",
    url: "/api/v1/audit",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  let body = feed.json() as { items: AuditItem[]; total: number };
  const sample = body.items[0];
  const requiredFields =
    sample &&
    typeof sample.auditId === "string" &&
    typeof sample.occurredAt === "string" &&
    typeof sample.actorId === "string" &&
    typeof sample.action === "string" &&
    typeof sample.outcome === "string" &&
    typeof sample.source === "string" &&
    typeof sample.summary === "string";

  steps.push({
    id: "audit-record-model",
    ac: "AC-1",
    description: "Audit Record has required attribution fields",
    pass: feed.statusCode === 200 && Boolean(requiredFields),
    detail: {
      statusCode: feed.statusCode,
      keys: sample ? Object.keys(sample) : [],
    },
  });

  steps.push({
    id: "audit-service-append",
    ac: "AC-2",
    description: "AuditService.record appends immutable records (visible via query)",
    pass: feed.statusCode === 200 && body.total >= 1 && Boolean(sample?.auditId),
    detail: { total: body.total, sampleAuditId: sample?.auditId },
  });

  // AC-3 Query newest-first
  steps.push({
    id: "query-newest-first",
    ac: "AC-3",
    description: "Audit Query lists records newest-first (occurredAt desc)",
    pass: feed.statusCode === 200 && isNewestFirst(body.items),
    detail: {
      total: body.total,
      first: body.items[0]?.occurredAt,
      last: body.items[body.items.length - 1]?.occurredAt,
    },
  });

  // AC-4 Automation + correlation
  const autoAudits = body.items.filter((a) => a.action === "automation.assign");
  steps.push({
    id: "automation-producer",
    ac: "AC-4",
    description: "Automation outcomes produce audit linked to ActionResult",
    pass:
      assign.statusCode === 200 &&
      autoAudits.length === 1 &&
      autoAudits[0]!.correlation?.actionId === actionId &&
      autoAudits[0]!.source === "automation",
    detail: {
      assignStatus: assign.statusCode,
      actionId,
      auditCount: autoAudits.length,
      correlation: autoAudits[0]?.correlation ?? null,
    },
  });

  // AC-6b Completeness — automation path must NOT also emit relationship.assign
  steps.push({
    id: "completeness-automation-assign",
    ac: "AC-6b",
    description: "Exactly one audit for automation.assign (no relationship.assign duplicate)",
    pass:
      autoAudits.length === 1 &&
      body.items.filter((a) => a.action === "relationship.assign").length === 0,
    detail: {
      automationAssign: autoAudits.length,
      relationshipAssign: body.items.filter((a) => a.action === "relationship.assign").length,
    },
  });

  // AC-6 Workflow stage change (direct PATCH)
  const stage = await app.inject({
    method: "PATCH",
    url: `/api/v1/relationships/${relationshipId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { stage: "Screening" },
  });
  feed = await app.inject({
    method: "GET",
    url: "/api/v1/audit?action=workflow.stage_changed",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  body = feed.json() as { items: AuditItem[]; total: number };
  steps.push({
    id: "workflow-producer",
    ac: "AC-6",
    description: "Workflow stage change produces audit record",
    pass:
      stage.statusCode === 200 &&
      body.items.length === 1 &&
      body.items[0]!.source === "workflow" &&
      body.items[0]!.action === "workflow.stage_changed",
    detail: {
      stageStatus: stage.statusCode,
      count: body.items.length,
      source: body.items[0]?.source,
    },
  });

  // AC-6b — automation stage_move adds exactly one more (not second workflow.*)
  const beforeAutoStage = (
    await app.inject({
      method: "GET",
      url: "/api/v1/audit",
      headers: { "x-actor-id": "recruiter_alpha" },
    })
  ).json() as { total: number };

  const autoStage = await app.inject({
    method: "POST",
    url: "/api/v1/automation/stage-move",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: {
      relationshipId,
      targetStage: "Technical Interview",
      actorId: "recruiter_alpha",
      confirmed: true,
    },
  });
  const afterAutoStage = (
    await app.inject({
      method: "GET",
      url: "/api/v1/audit",
      headers: { "x-actor-id": "recruiter_alpha" },
    })
  ).json() as { items: AuditItem[]; total: number };

  steps.push({
    id: "completeness-automation-stage",
    ac: "AC-6b",
    description: "automation.stage_move adds exactly one audit (suppress Relationship)",
    pass:
      autoStage.statusCode === 200 &&
      afterAutoStage.total === beforeAutoStage.total + 1 &&
      afterAutoStage.items.filter((a) => a.action === "automation.stage_move").length === 1,
    detail: {
      before: beforeAutoStage.total,
      after: afterAutoStage.total,
      autoStageStatus: autoStage.statusCode,
    },
  });

  // AC-5 Integration execute
  const intg = await app.inject({
    method: "POST",
    url: "/api/v1/integrations",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { provider: "ats_mock" },
  });
  const intgId = (intg.json() as { integrationId: string }).integrationId;
  const intgExec = await app.inject({
    method: "POST",
    url: `/api/v1/integrations/${intgId}/import/execute`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { payload: "mock", confirmed: true },
  });
  const intgFeed = await app.inject({
    method: "GET",
    url: "/api/v1/audit?source=integration",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const intgItems = (intgFeed.json() as { items: AuditItem[] }).items;
  steps.push({
    id: "integration-producer",
    ac: "AC-5",
    description: "Integration execute produces audit record",
    pass:
      intgExec.statusCode === 200 &&
      intgItems.length >= 1 &&
      intgItems[0]!.action === "integration.import.execute" &&
      intgItems[0]!.source === "integration",
    detail: {
      execStatus: intgExec.statusCode,
      count: intgItems.length,
      action: intgItems[0]?.action,
    },
  });

  // Audit Ordering (reviewer non-blocker) — stable newest-first; query does not mutate
  const order1 = await app.inject({
    method: "GET",
    url: "/api/v1/audit",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const order2 = await app.inject({
    method: "GET",
    url: "/api/v1/audit",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const o1 = order1.json() as { items: AuditItem[]; total: number };
  const o2 = order2.json() as { items: AuditItem[]; total: number };
  const ids1 = o1.items.map((i) => i.auditId);
  const ids2 = o2.items.map((i) => i.auditId);
  const logPath = join(storagePath, "audit-log.jsonl");
  const sizeBefore = existsSync(logPath) ? readFileSync(logPath, "utf8").length : 0;
  await app.inject({
    method: "GET",
    url: "/api/v1/audit",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const sizeAfter = existsSync(logPath) ? readFileSync(logPath, "utf8").length : 0;

  steps.push({
    id: "audit-ordering",
    ac: "AC-3",
    description:
      "Audit Ordering: newest-first by occurredAt; repeated query stable; query does not mutate store",
    pass:
      isNewestFirst(o1.items) &&
      o1.total === o2.total &&
      JSON.stringify(ids1) === JSON.stringify(ids2) &&
      sizeBefore === sizeAfter &&
      sizeBefore > 0,
    detail: {
      total: o1.total,
      newestFirst: isNewestFirst(o1.items),
      stableIds: JSON.stringify(ids1) === JSON.stringify(ids2),
      storeBytesBefore: sizeBefore,
      storeBytesAfter: sizeAfter,
    },
  });

  // AC-7 Immutability
  const post = await app.inject({
    method: "POST",
    url: "/api/v1/audit",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { action: "spoof" },
  });
  const patch = await app.inject({
    method: "PATCH",
    url: `/api/v1/audit/${ids1[0]}`,
    headers: { "x-actor-id": "admin_alpha" },
    payload: { summary: "tamper" },
  });
  const del = await app.inject({
    method: "DELETE",
    url: `/api/v1/audit/${ids1[0]}`,
    headers: { "x-actor-id": "admin_alpha" },
  });
  const afterMutate = (
    await app.inject({
      method: "GET",
      url: "/api/v1/audit",
      headers: { "x-actor-id": "recruiter_alpha" },
    })
  ).json() as { total: number };
  steps.push({
    id: "immutability",
    ac: "AC-7",
    description: "No POST/PATCH/DELETE audit routes; store unchanged after attempts",
    pass:
      [404, 405].includes(post.statusCode) &&
      [404, 405].includes(patch.statusCode) &&
      [404, 405].includes(del.statusCode) &&
      afterMutate.total === o1.total,
    detail: {
      post: post.statusCode,
      patch: patch.statusCode,
      delete: del.statusCode,
      totalBefore: o1.total,
      totalAfter: afterMutate.total,
    },
  });

  // AC-8 Authorization
  const viewer = await app.inject({
    method: "GET",
    url: "/api/v1/audit",
    headers: { "x-actor-id": "viewer_alpha" },
  });
  const ghost = await app.inject({
    method: "GET",
    url: "/api/v1/audit",
    headers: { "x-actor-id": "ghost_unknown" },
  });
  steps.push({
    id: "authorization",
    ac: "AC-8",
    description: "audit.read via AuthorizationService; Viewer/unknown denied",
    pass:
      authz.authorize("admin_alpha", "audit.read").allowed &&
      authz.authorize("recruiter_alpha", "audit.read").allowed &&
      !authz.authorize("viewer_alpha", "audit.read").allowed &&
      viewer.statusCode === 403 &&
      ghost.statusCode === 403,
    detail: {
      viewer: viewer.statusCode,
      ghost: ghost.statusCode,
      adminAllowed: authz.authorize("admin_alpha", "audit.read").allowed,
      recruiterAllowed: authz.authorize("recruiter_alpha", "audit.read").allowed,
    },
  });

  // AC-9 / AC-10 — record-only; Matching/Workflow semantics unchanged
  const match1 = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${candidateId}&jobId=${jobId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const score = (match1.json() as { overallMatchScore: number }).overallMatchScore;
  const match2 = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${candidateId}&jobId=${jobId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const relGet = await app.inject({
    method: "GET",
    url: `/api/v1/relationships/${relationshipId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const currentStage = (relGet.json() as { currentStage: string }).currentStage;
  steps.push({
    id: "record-only",
    ac: "AC-9",
    description: "Audit never executes business actions (query-only surface)",
    pass:
      [404, 405].includes(post.statusCode) &&
      match1.statusCode === 200 &&
      currentStage === "Technical Interview",
    detail: { post: post.statusCode, currentStage },
  });
  steps.push({
    id: "no-business-rules",
    ac: "AC-10",
    description: "Matching/Workflow semantics unchanged under Audit usage",
    pass:
      match2.statusCode === 200 &&
      (match2.json() as { overallMatchScore: number }).overallMatchScore === score &&
      currentStage === "Technical Interview",
    detail: { score, currentStage },
  });

  // AC-11 Regression
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
  const intgList = await app.inject({
    method: "GET",
    url: "/api/v1/integrations",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  steps.push({
    id: "regression",
    ac: "AC-11",
    description: "Authorized happy-path regression (Job/Rel/Match/Analytics/Notif/Integrations)",
    pass:
      jobRes.statusCode === 201 &&
      relRes.statusCode === 201 &&
      match1.statusCode === 200 &&
      analytics.statusCode === 200 &&
      notif.statusCode === 200 &&
      intgList.statusCode === 200,
    detail: {
      job: jobRes.statusCode,
      rel: relRes.statusCode,
      match: match1.statusCode,
      analytics: analytics.statusCode,
      notifications: notif.statusCode,
      integrations: intgList.statusCode,
    },
  });

  const healthAfter = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health-after",
    ac: "AC-13",
    description: "GET /health still public after audit checks",
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
    "AC-6b",
    "AC-7",
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
    epic: "EPIC-012",
    title: "Audit & Governance",
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
      orderingConvention: "newest-first by occurredAt (descending); query is read-only",
    },
    steps,
  };

  mkdirSync("reports", { recursive: true });
  const out = join("reports", "epic-012-validation-evidence.json");
  writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ verdict: report.verdict, out, summary: report.summary }, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
