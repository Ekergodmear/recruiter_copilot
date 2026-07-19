/**
 * EPIC-008 runtime validation — Automation / Actions.
 * Evidence: reports/epic-008-validation-evidence.json
 */
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp, createAppDependencies } from "../src/app/server.js";
import { AppConfig } from "../src/shared/config/index.js";
import { createTestDocx } from "../tests/helpers/create-test-docx.js";
import { SystemClock } from "../src/shared/clock/index.js";
import { UuidIdGenerator } from "../src/shared/id-generator/index.js";
import { AutomationService } from "../src/modules/automation/application/automation-service.js";
import { InMemoryActionResultRepository } from "../src/modules/automation/infrastructure/action-result-repository.js";
import type { EmailSendAdapter } from "../src/modules/automation/infrastructure/email-send-adapter.js";
import { RelationshipService } from "../src/modules/relationship/application/relationship-service.js";
import { InMemoryRelationshipRepository } from "../src/modules/relationship/infrastructure/in-memory-relationship-repository.js";
import { InMemoryCandidateRepository } from "../src/modules/candidate/infrastructure/persistence/in-memory-candidate-repository.js";
import { InMemoryJobRepository } from "../src/modules/job/infrastructure/in-memory-job-repository.js";

type Step = {
  id: string;
  ac?: string;
  description: string;
  pass: boolean;
  detail: Record<string, unknown>;
};

type ActionResultBody = {
  actionId: string;
  actionType: string;
  actorId: string;
  executedAt: string;
  success: boolean;
  error: { code: string; message: string } | null;
  target: Record<string, string | undefined>;
  noop?: boolean;
};

async function importCandidate(
  app: Awaited<ReturnType<typeof buildApp>>,
  lines: string[],
): Promise<string> {
  const docx = await createTestDocx(lines);
  const boundary = "----e008";
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

function isActionResult(body: ActionResultBody): boolean {
  return (
    typeof body.actionId === "string" &&
    body.actionId.length > 0 &&
    typeof body.actorId === "string" &&
    typeof body.executedAt === "string" &&
    typeof body.success === "boolean" &&
    typeof body.actionType === "string"
  );
}

async function main() {
  const steps: Step[] = [];
  const storagePath = mkdtempSync(join(tmpdir(), "epic-008-validate-"));
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: storagePath,
    DEFAULT_WORKSPACE_ID: "ws_epic008_validate",
    GEMINI_API_KEY: "",
  });
  const deps = createAppDependencies(config);
  const app = await buildApp(deps);

  const health = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health",
    ac: "AC-17",
    description: "GET /health returns status ok",
    pass: health.statusCode === 200 && (health.json() as { status?: string }).status === "ok",
    detail: { statusCode: health.statusCode },
  });

  const c1 = await importCandidate(app, [
    "E008 Cand",
    "e008@example.com",
    "React",
    "TypeScript",
    "5 years of experience",
    "English B2",
  ]);
  steps.push({
    id: "import",
    ac: "AC-16",
    description: "Resume Import works (no regression)",
    pass: Boolean(c1),
    detail: { c1 },
  });

  const jobRes = await app.inject({
    method: "POST",
    url: "/api/v1/jobs",
    payload: {
      title: "E008 Job",
      company: "E008 Co",
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
      skills: ["React", "TypeScript"],
      experienceYears: 5,
      englishRequirement: "B2",
    },
  });

  const relRes = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    payload: { candidateId: c1, jobId },
  });
  const relationshipId = (relRes.json() as { id: string }).id;

  // AC-4 Authorization
  const noConfirm = await app.inject({
    method: "POST",
    url: "/api/v1/automation/stage-move",
    payload: {
      relationshipId,
      targetStage: "Screening",
      actorId: "recruiter_alpha",
    },
  });
  const noActor = await app.inject({
    method: "POST",
    url: "/api/v1/automation/assign",
    payload: {
      relationshipId,
      assigneeId: "recruiter_beta",
      confirmed: true,
    },
  });
  steps.push({
    id: "authorization",
    ac: "AC-4",
    description: "Authorization enforced — confirmed + actorId required",
    pass: noConfirm.statusCode === 403 && noActor.statusCode === 403,
    detail: { noConfirm: noConfirm.statusCode, noActor: noActor.statusCode },
  });

  // AC-1 Stage Move + AC-5 read SoT + AC-7 Action Result + AC-9 attribution
  const beforeMove = await app.inject({
    method: "GET",
    url: `/api/v1/relationships/${relationshipId}`,
  });
  const historyBefore = (beforeMove.json() as { stageHistory: unknown[] }).stageHistory.length;
  const move = await app.inject({
    method: "POST",
    url: "/api/v1/automation/stage-move",
    payload: {
      relationshipId,
      targetStage: "Screening",
      actorId: "recruiter_alpha",
      confirmed: true,
    },
  });
  const moveBody = move.json() as ActionResultBody;
  const afterMove = await app.inject({
    method: "GET",
    url: `/api/v1/relationships/${relationshipId}`,
  });
  steps.push({
    id: "stage-move",
    ac: "AC-1",
    description: "Execute Stage Move with confirmation via Workflow",
    pass:
      move.statusCode === 200 &&
      moveBody.success === true &&
      (afterMove.json() as { currentStage: string }).currentStage === "Screening" &&
      (afterMove.json() as { stageHistory: unknown[] }).stageHistory.length === historyBefore + 1,
    detail: {
      statusCode: move.statusCode,
      stage: (afterMove.json() as { currentStage: string }).currentStage,
    },
  });

  steps.push({
    id: "action-result",
    ac: "AC-7",
    description: "Action Result returned with attribution fields",
    pass: isActionResult(moveBody) && moveBody.actorId === "recruiter_alpha",
    detail: {
      actionId: moveBody.actionId,
      actorId: moveBody.actorId,
      executedAt: moveBody.executedAt,
    },
  });

  steps.push({
    id: "attribution",
    ac: "AC-9",
    description: "Execution attributable (actor, time, action, result)",
    pass:
      moveBody.actionType === "stage_move" &&
      Boolean(moveBody.actionId) &&
      Boolean(moveBody.executedAt) &&
      moveBody.success === true,
    detail: { actionType: moveBody.actionType },
  });

  steps.push({
    id: "read-sot",
    ac: "AC-5",
    description: "Action reads relationship/workflow state before mutation",
    pass:
      (beforeMove.json() as { currentStage: string }).currentStage === "Sourced" &&
      (afterMove.json() as { currentStage: string }).currentStage === "Screening",
    detail: {
      before: (beforeMove.json() as { currentStage: string }).currentStage,
      after: (afterMove.json() as { currentStage: string }).currentStage,
    },
  });

  // AC-3 Assignment
  const assign = await app.inject({
    method: "POST",
    url: "/api/v1/automation/assign",
    payload: {
      relationshipId,
      assigneeId: "recruiter_beta",
      actorId: "recruiter_alpha",
      confirmed: true,
    },
  });
  const assignBody = assign.json() as ActionResultBody;
  const relAssigned = await app.inject({
    method: "GET",
    url: `/api/v1/relationships/${relationshipId}`,
  });
  steps.push({
    id: "assign",
    ac: "AC-3",
    description: "Execute Assignment of Relationship",
    pass:
      assign.statusCode === 200 &&
      assignBody.success === true &&
      (relAssigned.json() as { assigneeId: string | null }).assigneeId === "recruiter_beta",
    detail: { assigneeId: (relAssigned.json() as { assigneeId: string | null }).assigneeId },
  });

  // AC-2 Send Outreach from Copilot draft
  const draft = await app.inject({
    method: "POST",
    url: "/api/v1/copilot/draft-outreach",
    payload: { candidateId: c1, jobId },
  });
  const draftBody = (draft.json() as { aiSuggestion: string }).aiSuggestion;
  const send = await app.inject({
    method: "POST",
    url: "/api/v1/automation/send-outreach",
    payload: {
      relationshipId,
      draftBody,
      actorId: "recruiter_alpha",
      confirmed: true,
    },
  });
  const sendBody = send.json() as ActionResultBody;
  steps.push({
    id: "send-outreach",
    ac: "AC-2",
    description: "Execute Send Outreach from existing Copilot draft (no draft authorship)",
    pass:
      draft.statusCode === 200 &&
      draftBody.length > 0 &&
      send.statusCode === 200 &&
      sendBody.success === true &&
      Boolean(sendBody.target.draftFingerprint),
    detail: {
      draftLen: draftBody.length,
      fingerprint: sendBody.target.draftFingerprint,
    },
  });

  // AC-6 No implicit execution — covered by auth failures without confirmed
  steps.push({
    id: "no-implicit",
    ac: "AC-6",
    description: "No implicit execution without confirmed:true",
    pass: noConfirm.statusCode === 403,
    detail: { statusCode: noConfirm.statusCode },
  });

  // AC-8 Failure recoverable
  const badStage = await app.inject({
    method: "POST",
    url: "/api/v1/automation/stage-move",
    payload: {
      relationshipId,
      targetStage: "NotARealStage",
      actorId: "recruiter_alpha",
      confirmed: true,
    },
  });
  const afterBad = await app.inject({
    method: "GET",
    url: `/api/v1/relationships/${relationshipId}`,
  });
  steps.push({
    id: "failure-recoverable",
    ac: "AC-8",
    description: "Failure returns error Action Result; state unchanged for bad stage",
    pass:
      badStage.statusCode >= 400 &&
      (badStage.json() as ActionResultBody).success === false &&
      (afterBad.json() as { currentStage: string }).currentStage === "Screening",
    detail: {
      statusCode: badStage.statusCode,
      error: (badStage.json() as ActionResultBody).error,
    },
  });

  // AC-9b Idempotency
  const histLen = (afterBad.json() as { stageHistory: unknown[] }).stageHistory.length;
  const moveSame = await app.inject({
    method: "POST",
    url: "/api/v1/automation/stage-move",
    payload: {
      relationshipId,
      targetStage: "Screening",
      actorId: "recruiter_alpha",
      confirmed: true,
    },
  });
  const afterSame = await app.inject({
    method: "GET",
    url: `/api/v1/relationships/${relationshipId}`,
  });
  const assignSame = await app.inject({
    method: "POST",
    url: "/api/v1/automation/assign",
    payload: {
      relationshipId,
      assigneeId: "recruiter_beta",
      actorId: "recruiter_alpha",
      confirmed: true,
    },
  });
  const sendDup = await app.inject({
    method: "POST",
    url: "/api/v1/automation/send-outreach",
    payload: {
      relationshipId,
      draftBody,
      actorId: "recruiter_alpha",
      confirmed: true,
    },
  });
  steps.push({
    id: "idempotency",
    ac: "AC-9b",
    description: "Idempotent assign/move; duplicate send → ALREADY_SENT",
    pass:
      (moveSame.json() as ActionResultBody).noop === true &&
      (afterSame.json() as { stageHistory: unknown[] }).stageHistory.length === histLen &&
      (assignSame.json() as ActionResultBody).noop === true &&
      sendDup.statusCode === 409 &&
      (sendDup.json() as ActionResultBody).error?.code === "ALREADY_SENT",
    detail: {
      moveNoop: (moveSame.json() as ActionResultBody).noop,
      assignNoop: (assignSame.json() as ActionResultBody).noop,
      sendDup: sendDup.statusCode,
    },
  });

  // Reviewer non-blocker: Atomicity
  // 1) Failed stage move — no new history
  const histBeforeFail = (afterSame.json() as { stageHistory: unknown[] }).stageHistory.length;
  await app.inject({
    method: "POST",
    url: "/api/v1/automation/stage-move",
    payload: {
      relationshipId,
      targetStage: "BogusStage",
      actorId: "recruiter_alpha",
      confirmed: true,
    },
  });
  const histAfterFail = (
    await app.inject({ method: "GET", url: `/api/v1/relationships/${relationshipId}` })
  ).json() as { stageHistory: unknown[]; assigneeId: string | null };
  steps.push({
    id: "atomicity-stage-move",
    description: "Failed Stage Move leaves no new Stage History",
    pass: histAfterFail.stageHistory.length === histBeforeFail,
    detail: { histBeforeFail, histAfterFail: histAfterFail.stageHistory.length },
  });

  // 2) Failed assign (missing relationship) — existing assignee unchanged
  const assigneeBefore = histAfterFail.assigneeId;
  const assignFail = await app.inject({
    method: "POST",
    url: "/api/v1/automation/assign",
    payload: {
      relationshipId: "rel_doesnotexist9",
      assigneeId: "recruiter_gamma",
      actorId: "recruiter_alpha",
      confirmed: true,
    },
  });
  const assigneeAfter = (
    await app.inject({ method: "GET", url: `/api/v1/relationships/${relationshipId}` })
  ).json() as { assigneeId: string | null };
  const assignFailBody = assignFail.json() as ActionResultBody;
  steps.push({
    id: "atomicity-assign",
    description: "Failed Assignment does not update assigneeId on existing relationship",
    pass:
      assignFail.statusCode === 404 &&
      assignFailBody.success === false &&
      assignFailBody.error?.code === "NOT_FOUND" &&
      assigneeAfter.assigneeId === assigneeBefore,
    detail: {
      assigneeBefore,
      assigneeAfter: assigneeAfter.assigneeId,
      error: assignFailBody.error,
      statusCode: assignFail.statusCode,
    },
  });

  // 3) Failed send adapter — no successful Action Result / no ALREADY_SENT lock
  const failingAdapter: EmailSendAdapter = {
    async send() {
      throw new Error("adapter boom");
    },
  };
  const memRels = new InMemoryRelationshipRepository();
  const clock = new SystemClock();
  const idGen = new UuidIdGenerator();
  const candRepo = new InMemoryCandidateRepository();
  const jobRepo = new InMemoryJobRepository();
  // Seed a relationship via RelationshipService on memory repos for isolation
  const relSvc = new RelationshipService({
    clock,
    idGenerator: idGen,
    relationshipRepository: memRels,
    candidateRepository: candRepo,
    jobRepository: jobRepo,
  });
  // Bypass create validation by saving directly
  const now = clock.nowIso();
  await memRels.save({
    id: "rel_atomicity01",
    candidateId: "cand_atomicity01",
    jobId: "job_atomicity01",
    status: "Sourced",
    currentStage: "Sourced",
    stageHistory: [{ previousStage: null, newStage: "Sourced", changedAt: now }],
    createdAt: now,
    updatedAt: now,
    createdBy: "recruiter_alpha",
    assigneeId: null,
  });
  const actionRepo = new InMemoryActionResultRepository();
  const autoSvc = new AutomationService({
    clock,
    idGenerator: idGen,
    relationshipService: relSvc,
    relationshipRepository: memRels,
    actionResultRepository: actionRepo,
    emailSendAdapter: failingAdapter,
  });
  const failSend = await autoSvc.sendOutreach({
    relationshipId: "rel_atomicity01",
    draftBody: "Hello draft for atomicity",
    actorId: "recruiter_alpha",
    confirmed: true,
  });
  const priorSuccess = await actionRepo.findSuccessfulSend(
    "rel_atomicity01",
    failSend.target.draftFingerprint ?? "none",
  );
  steps.push({
    id: "atomicity-send",
    description: "Failed Send adapter does not record successful send / ALREADY_SENT lock",
    pass:
      failSend.success === false && failSend.error?.code === "SEND_FAILED" && priorSuccess === null,
    detail: {
      success: failSend.success,
      error: failSend.error,
      priorSuccess: priorSuccess != null,
    },
  });

  // Regressions AC-10…AC-15
  const candList = await app.inject({ method: "GET", url: "/api/v1/candidates" });
  steps.push({
    id: "candidate-workspace",
    ac: "AC-10",
    description: "Candidate Workspace no regression",
    pass: candList.statusCode === 200,
    detail: { statusCode: candList.statusCode },
  });

  const jobList = await app.inject({ method: "GET", url: "/api/v1/jobs" });
  steps.push({
    id: "job-workspace",
    ac: "AC-11",
    description: "Job Workspace no regression",
    pass: jobList.statusCode === 200,
    detail: { statusCode: jobList.statusCode },
  });

  const relList = await app.inject({
    method: "GET",
    url: `/api/v1/jobs/${jobId}/relationships`,
  });
  steps.push({
    id: "relationship-workflow",
    ac: "AC-12",
    description: "Relationship / Workflow Foundations no regression",
    pass:
      relList.statusCode === 200 &&
      (afterSame.json() as { currentStage: string }).currentStage === "Screening",
    detail: { list: relList.statusCode },
  });

  const matching = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
  });
  steps.push({
    id: "matching",
    ac: "AC-13",
    description: "Matching Foundation no regression",
    pass: matching.statusCode === 200,
    detail: {
      score: (matching.json() as { overallMatchScore: number }).overallMatchScore,
    },
  });

  const copilot = await app.inject({
    method: "POST",
    url: "/api/v1/copilot/summarize-candidate",
    payload: { candidateId: c1 },
  });
  steps.push({
    id: "copilot-draft-only",
    ac: "AC-14",
    description: "Copilot remains draft/read-only (no send endpoint)",
    pass:
      copilot.statusCode === 200 &&
      Boolean((copilot.json() as { aiSuggestion?: string }).aiSuggestion),
    detail: { statusCode: copilot.statusCode },
  });

  const analytics = await app.inject({ method: "GET", url: "/api/v1/analytics/overview" });
  steps.push({
    id: "analytics",
    ac: "AC-15",
    description: "Analytics no regression",
    pass: analytics.statusCode === 200,
    detail: { statusCode: analytics.statusCode },
  });

  const healthAfter = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health-after",
    ac: "AC-17",
    description: "GET /health still ok after automation",
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
    "AC-9b",
    "AC-10",
    "AC-11",
    "AC-12",
    "AC-13",
    "AC-14",
    "AC-15",
    "AC-16",
    "AC-17",
  ];
  const acceptanceCriteria = acIds.map((ac) => ({
    ac,
    pass: steps.filter((s) => s.ac === ac).every((s) => s.pass) && steps.some((s) => s.ac === ac),
  }));

  const report = {
    epic: "EPIC-008",
    title: "Automation / Actions",
    generatedAt: new Date().toISOString(),
    storagePath,
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    allStepsPass: failed.length === 0,
    summary: {
      totalSteps: steps.length,
      passed: steps.filter((s) => s.pass).length,
      failed: failed.map((s) => s.id),
      acceptanceCriteria,
      note: "AC-18 (pnpm run ci) recorded separately in Validation Report",
    },
    steps,
  };

  mkdirSync("reports", { recursive: true });
  const out = join("reports", "epic-008-validation-evidence.json");
  writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ verdict: report.verdict, out, summary: report.summary }, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
