/**
 * EPIC-009 runtime validation — Administration & Authorization.
 * Evidence: reports/epic-009-validation-evidence.json
 */
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp, createAppDependencies } from "../src/app/server.js";
import { AppConfig } from "../src/shared/config/index.js";
import { createTestDocx } from "../tests/helpers/create-test-docx.js";
import { ActorRegistry } from "../src/modules/authorization/application/actor-registry.js";
import { AuthorizationService } from "../src/modules/authorization/application/authorization-service.js";
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from "../src/modules/authorization/domain/types.js";

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
    "E009 Cand",
    "e009@example.com",
    "React",
    "5 years of experience",
    "English B2",
  ]);
  const boundary = "----e009";
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

async function main() {
  const steps: Step[] = [];
  const storagePath = mkdtempSync(join(tmpdir(), "epic-009-validate-"));
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: storagePath,
    DEFAULT_WORKSPACE_ID: "ws_epic009_validate",
    GEMINI_API_KEY: "",
  });
  const deps = createAppDependencies(config);
  const app = await buildApp(deps);
  const authz = deps.authorizationService;

  // AC-1 Role model
  steps.push({
    id: "role-model",
    ac: "AC-1",
    description: "Role model exists: Admin, Recruiter, Viewer",
    pass:
      ROLES.includes("Admin") &&
      ROLES.includes("Recruiter") &&
      ROLES.includes("Viewer") &&
      ROLES.length === 3,
    detail: { roles: ROLES },
  });

  // AC-2 Permission model
  steps.push({
    id: "permission-model",
    ac: "AC-2",
    description: "Fixed MVP permission set present",
    pass:
      PERMISSIONS.includes("automation.execute") &&
      PERMISSIONS.includes("analytics.read") &&
      PERMISSIONS.includes("copilot.use") &&
      PERMISSIONS.includes("admin.manage") &&
      ROLE_PERMISSIONS.Viewer.every((p) => !p.endsWith(".write") && p !== "automation.execute"),
    detail: { permissionCount: PERMISSIONS.length },
  });

  // AC-3 AuthorizationService
  steps.push({
    id: "authorization-service",
    ac: "AC-3",
    description: "AuthorizationService.authorize exists and evaluates",
    pass: typeof authz.authorize === "function" && authz instanceof AuthorizationService,
    detail: { type: authz.constructor.name },
  });

  // AC-4 + policy consistency (reviewer non-blocker)
  const a1 = authz.authorize("recruiter_alpha", "automation.execute");
  const a2 = authz.authorize("recruiter_alpha", "automation.execute");
  const a3 = authz.authorize("recruiter_alpha", "automation.execute");
  const v1 = authz.authorize("viewer_alpha", "candidate.write");
  const v2 = authz.authorize("viewer_alpha", "candidate.write");
  const u1 = authz.authorize("recruiter_alpha", "unknown.permission");
  const u2 = authz.authorize("recruiter_alpha", "unknown.permission");
  steps.push({
    id: "policy-deterministic",
    ac: "AC-4",
    description: "Policy evaluation deterministic for actor + permission",
    pass:
      JSON.stringify(a1) === JSON.stringify(a2) &&
      JSON.stringify(a2) === JSON.stringify(a3) &&
      JSON.stringify(v1) === JSON.stringify(v2) &&
      JSON.stringify(u1) === JSON.stringify(u2),
    detail: { recruiterAllow: a1.allowed, viewerWrite: v1.allowed, unknown: u1.allowed },
  });

  steps.push({
    id: "policy-consistency",
    description:
      "Policy consistency — same actor/action always same result; Admin/Viewer/unknown matrix",
    pass:
      a1.allowed === true &&
      authz.authorize("admin_alpha", "admin.manage").allowed === true &&
      v1.allowed === false &&
      !u1.allowed &&
      (!u1.allowed ? u1.code === "UNKNOWN_PERMISSION" : false),
    detail: {
      recruiterAutomation: a1.allowed,
      adminManage: authz.authorize("admin_alpha", "admin.manage").allowed,
      viewerWrite: v1.allowed,
      unknownCode: !u1.allowed ? u1.code : null,
    },
  });

  // Health public (AC-14 + consistency)
  const healthNoActor = await app.inject({ method: "GET", url: "/health" });
  const healthViewer = await app.inject({
    method: "GET",
    url: "/health",
    headers: { "x-actor-id": "viewer_alpha" },
  });
  const healthGhost = await app.inject({
    method: "GET",
    url: "/health",
    headers: { "x-actor-id": "ghost_actor" },
  });
  steps.push({
    id: "health-public",
    ac: "AC-14",
    description: "GET /health always public (ok regardless of actor)",
    pass:
      healthNoActor.statusCode === 200 &&
      (healthNoActor.json() as { status?: string }).status === "ok" &&
      healthViewer.statusCode === 200 &&
      healthGhost.statusCode === 200,
    detail: {
      noActor: healthNoActor.statusCode,
      viewer: healthViewer.statusCode,
      ghost: healthGhost.statusCode,
    },
  });

  // AC-13 Import + AC-5 ALLOW
  const c1 = await importCandidate(app, "recruiter_alpha");
  steps.push({
    id: "import",
    ac: "AC-13",
    description: "Resume Import works for authorized Recruiter",
    pass: Boolean(c1),
    detail: { c1 },
  });

  const jobRes = await app.inject({
    method: "POST",
    url: "/api/v1/jobs",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { title: "E009 Job", company: "E009 Co", status: "Open" },
  });
  const jobId = (jobRes.json() as { id: string }).id;
  steps.push({
    id: "allow-path",
    ac: "AC-5",
    description: "ALLOW path — Recruiter proceeds to create Job",
    pass: jobRes.statusCode === 201,
    detail: { statusCode: jobRes.statusCode, jobId },
  });

  const relRes = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { candidateId: c1, jobId },
  });
  const relationshipId = (relRes.json() as { id: string }).id;

  // AC-6 DENY Viewer mutation — no domain change
  const beforeName = (
    await app.inject({
      method: "GET",
      url: `/api/v1/candidates/${c1}`,
      headers: { "x-actor-id": "recruiter_alpha" },
    })
  ).json() as { name?: string };
  const viewerPatch = await app.inject({
    method: "PATCH",
    url: `/api/v1/candidates/${c1}`,
    headers: { "x-actor-id": "viewer_alpha" },
    payload: { name: "Should Not Apply" },
  });
  const afterName = (
    await app.inject({
      method: "GET",
      url: `/api/v1/candidates/${c1}`,
      headers: { "x-actor-id": "recruiter_alpha" },
    })
  ).json() as { name?: string };
  steps.push({
    id: "deny-path",
    ac: "AC-6",
    description: "DENY Viewer write — 403 and no domain mutation",
    pass:
      viewerPatch.statusCode === 403 && JSON.stringify(beforeName) === JSON.stringify(afterName),
    detail: {
      statusCode: viewerPatch.statusCode,
      error: viewerPatch.json(),
      nameUnchanged: beforeName.name === afterName.name,
    },
  });

  // AC-6b Deny-by-default (service + already tested unknown)
  const registry = new ActorRegistry();
  const fresh = new AuthorizationService(registry);
  const unknown = fresh.authorize("recruiter_alpha", "totally.undeclared");
  steps.push({
    id: "deny-by-default",
    ac: "AC-6b",
    description: "Unknown permission DENY (never silent Allow)",
    pass: unknown.allowed === false && unknown.code === "UNKNOWN_PERMISSION",
    detail: { code: unknown.code },
  });

  // AC-7 Automation uses AuthorizationService
  const viewerAuto = await app.inject({
    method: "POST",
    url: "/api/v1/automation/stage-move",
    headers: { "x-actor-id": "viewer_alpha" },
    payload: {
      relationshipId,
      targetStage: "Screening",
      actorId: "viewer_alpha",
      confirmed: true,
    },
  });
  const recruiterAuto = await app.inject({
    method: "POST",
    url: "/api/v1/automation/stage-move",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: {
      relationshipId,
      targetStage: "Screening",
      actorId: "recruiter_alpha",
      confirmed: true,
    },
  });
  steps.push({
    id: "automation-authz",
    ac: "AC-7",
    description: "Automation gated by AuthorizationService (Viewer deny, Recruiter allow)",
    pass: viewerAuto.statusCode === 403 && recruiterAuto.statusCode === 200,
    detail: {
      viewer: viewerAuto.statusCode,
      recruiter: recruiterAuto.statusCode,
    },
  });

  // AC-8 Analytics + Copilot protected
  const viewerAnalytics = await app.inject({
    method: "GET",
    url: "/api/v1/analytics/overview",
    headers: { "x-actor-id": "viewer_alpha" },
  });
  const ghostAnalytics = await app.inject({
    method: "GET",
    url: "/api/v1/analytics/overview",
    headers: { "x-actor-id": "ghost_actor" },
  });
  const viewerCopilot = await app.inject({
    method: "POST",
    url: "/api/v1/copilot/summarize-candidate",
    headers: { "x-actor-id": "viewer_alpha" },
    payload: { candidateId: c1 },
  });
  const ghostCopilot = await app.inject({
    method: "POST",
    url: "/api/v1/copilot/summarize-candidate",
    headers: { "x-actor-id": "ghost_actor" },
    payload: { candidateId: c1 },
  });
  steps.push({
    id: "copilot-analytics",
    ac: "AC-8",
    description: "Analytics and Copilot protected (Viewer allow, unknown actor deny)",
    pass:
      viewerAnalytics.statusCode === 200 &&
      ghostAnalytics.statusCode === 403 &&
      viewerCopilot.statusCode === 200 &&
      ghostCopilot.statusCode === 403,
    detail: {
      viewerAnalytics: viewerAnalytics.statusCode,
      ghostAnalytics: ghostAnalytics.statusCode,
      viewerCopilot: viewerCopilot.statusCode,
      ghostCopilot: ghostCopilot.statusCode,
    },
  });

  // AC-9 Read APIs protected
  const ghostCand = await app.inject({
    method: "GET",
    url: `/api/v1/candidates/${c1}`,
    headers: { "x-actor-id": "ghost_actor" },
  });
  const ghostJob = await app.inject({
    method: "GET",
    url: `/api/v1/jobs/${jobId}`,
    headers: { "x-actor-id": "ghost_actor" },
  });
  const ghostMatch = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
    headers: { "x-actor-id": "ghost_actor" },
  });
  const recruiterMatch = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  steps.push({
    id: "read-protection",
    ac: "AC-9",
    description: "Core Read APIs protected (unknown actor 403; Recruiter Matching OK)",
    pass:
      ghostCand.statusCode === 403 &&
      ghostJob.statusCode === 403 &&
      ghostMatch.statusCode === 403 &&
      recruiterMatch.statusCode === 200,
    detail: {
      ghostCand: ghostCand.statusCode,
      ghostJob: ghostJob.statusCode,
      ghostMatch: ghostMatch.statusCode,
      recruiterMatch: recruiterMatch.statusCode,
    },
  });

  // AC-10 Mutation APIs protected
  const viewerJobWrite = await app.inject({
    method: "PATCH",
    url: `/api/v1/jobs/${jobId}`,
    headers: { "x-actor-id": "viewer_alpha" },
    payload: { title: "Hacked" },
  });
  const viewerRelWrite = await app.inject({
    method: "PATCH",
    url: `/api/v1/relationships/${relationshipId}`,
    headers: { "x-actor-id": "viewer_alpha" },
    payload: { stage: "Offer" },
  });
  steps.push({
    id: "mutation-protection",
    ac: "AC-10",
    description: "Core Mutation APIs protected for Viewer",
    pass: viewerJobWrite.statusCode === 403 && viewerRelWrite.statusCode === 403,
    detail: {
      viewerJobWrite: viewerJobWrite.statusCode,
      viewerRelWrite: viewerRelWrite.statusCode,
    },
  });

  // AC-11 Matching/Workflow semantics unchanged for authorized actor
  const matchScore = (recruiterMatch.json() as { overallMatchScore: number }).overallMatchScore;
  const matchAgain = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const relAfter = await app.inject({
    method: "GET",
    url: `/api/v1/relationships/${relationshipId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  steps.push({
    id: "no-business-rules-moved",
    ac: "AC-11",
    description: "Matching/Workflow semantics unchanged under Authorization",
    pass:
      matchAgain.statusCode === 200 &&
      (matchAgain.json() as { overallMatchScore: number }).overallMatchScore === matchScore &&
      (relAfter.json() as { currentStage: string }).currentStage === "Screening",
    detail: {
      matchScore,
      stage: (relAfter.json() as { currentStage: string }).currentStage,
    },
  });

  // AC-12 Regression smoke for authorized actors
  const analytics = await app.inject({
    method: "GET",
    url: "/api/v1/analytics/overview",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  steps.push({
    id: "regression-authorized",
    ac: "AC-12",
    description: "Authorized happy-path regression (Candidate/Job/Rel/Match/Analytics/Automation)",
    pass:
      jobRes.statusCode === 201 &&
      relRes.statusCode === 201 &&
      recruiterMatch.statusCode === 200 &&
      recruiterAuto.statusCode === 200 &&
      analytics.statusCode === 200,
    detail: {
      job: jobRes.statusCode,
      rel: relRes.statusCode,
      match: recruiterMatch.statusCode,
      automation: recruiterAuto.statusCode,
      analytics: analytics.statusCode,
    },
  });

  const healthAfter = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health-after",
    ac: "AC-14",
    description: "GET /health still ok after authorization checks",
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
    "AC-14",
  ];
  const acceptanceCriteria = acIds.map((ac) => ({
    ac,
    pass: steps.filter((s) => s.ac === ac).every((s) => s.pass) && steps.some((s) => s.ac === ac),
  }));

  const report = {
    epic: "EPIC-009",
    title: "Administration & Authorization",
    generatedAt: new Date().toISOString(),
    storagePath,
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    allStepsPass: failed.length === 0,
    summary: {
      totalSteps: steps.length,
      passed: steps.filter((s) => s.pass).length,
      failed: failed.map((s) => s.id),
      acceptanceCriteria,
      note: "AC-15 (pnpm run ci) recorded separately in Validation Report",
    },
    steps,
  };

  mkdirSync("reports", { recursive: true });
  const out = join("reports", "epic-009-validation-evidence.json");
  writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ verdict: report.verdict, out, summary: report.summary }, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
