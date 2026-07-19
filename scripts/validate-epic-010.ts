/**
 * EPIC-010 runtime validation — Notifications & Collaboration.
 * Evidence: reports/epic-010-validation-evidence.json
 */
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp, createAppDependencies } from "../src/app/server.js";
import { AppConfig } from "../src/shared/config/index.js";
import { createTestDocx } from "../tests/helpers/create-test-docx.js";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../src/modules/authorization/domain/types.js";

type Step = {
  id: string;
  ac?: string;
  description: string;
  pass: boolean;
  detail: Record<string, unknown>;
};

type Notif = {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  source: Record<string, unknown>;
};

async function importCandidate(
  app: Awaited<ReturnType<typeof buildApp>>,
  actorId = "recruiter_alpha",
): Promise<string> {
  const docx = await createTestDocx([
    "E010 Cand",
    "e010@example.com",
    "React",
    "5 years of experience",
    "English B2",
  ]);
  const boundary = "----e010";
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

function isNewestFirst(items: Notif[]): boolean {
  for (let i = 1; i < items.length; i++) {
    if (items[i - 1]!.createdAt < items[i]!.createdAt) return false;
  }
  return true;
}

function contentFingerprint(n: Notif): string {
  return JSON.stringify({
    type: n.type,
    title: n.title,
    body: n.body,
    createdAt: n.createdAt,
    recipientId: n.recipientId,
    source: n.source,
  });
}

async function main() {
  const steps: Step[] = [];
  const storagePath = mkdtempSync(join(tmpdir(), "epic-010-validate-"));
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: storagePath,
    DEFAULT_WORKSPACE_ID: "ws_epic010_validate",
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

  // AC-12 Import
  const c1 = await importCandidate(app);
  steps.push({
    id: "import",
    ac: "AC-12",
    description: "Resume Import works for authorized Recruiter",
    pass: Boolean(c1),
    detail: { c1 },
  });

  const jobRes = await app.inject({
    method: "POST",
    url: "/api/v1/jobs",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { title: "E010 Job", company: "E010 Co", status: "Open" },
  });
  const jobId = (jobRes.json() as { id: string }).id;
  const relRes = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { candidateId: c1, jobId },
  });
  const relationshipId = (relRes.json() as { id: string }).id;

  // Empty feed shape (AC-1/AC-2 baseline)
  const emptyFeed = await app.inject({
    method: "GET",
    url: "/api/v1/notifications",
    headers: { "x-actor-id": "recruiter_beta" },
  });
  const emptyBody = emptyFeed.json() as { items: Notif[]; unreadCount: number; actorId: string };
  steps.push({
    id: "notification-model-feed",
    ac: "AC-1",
    description: "Notification feed API returns model envelope for actor",
    pass:
      emptyFeed.statusCode === 200 &&
      emptyBody.actorId === "recruiter_beta" &&
      Array.isArray(emptyBody.items) &&
      typeof emptyBody.unreadCount === "number",
    detail: { statusCode: emptyFeed.statusCode, unreadCount: emptyBody.unreadCount },
  });

  steps.push({
    id: "feed-api",
    ac: "AC-2",
    description: "GET /api/v1/notifications returns current actor feed",
    pass: emptyFeed.statusCode === 200 && emptyBody.actorId === "recruiter_beta",
    detail: { statusCode: emptyFeed.statusCode },
  });

  // AC-5 Assignment
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
  await new Promise((r) => setTimeout(r, 5));
  const feedAfterAssign = await app.inject({
    method: "GET",
    url: "/api/v1/notifications",
    headers: { "x-actor-id": "recruiter_beta" },
  });
  const betaAfterAssign = (feedAfterAssign.json() as { items: Notif[] }).items;
  const assignmentNotif = betaAfterAssign.find((n) => n.type === "assignment");
  steps.push({
    id: "assignment-notification",
    ac: "AC-5",
    description: "Assignment notification for assignee after successful assign",
    pass: assign.statusCode === 200 && Boolean(assignmentNotif) && assignmentNotif!.readAt == null,
    detail: {
      assignStatus: assign.statusCode,
      types: betaAfterAssign.map((n) => n.type),
    },
  });

  // AC-7 Automation completed for actor
  const alphaFeed = await app.inject({
    method: "GET",
    url: "/api/v1/notifications",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const alphaItems = (alphaFeed.json() as { items: Notif[] }).items;
  steps.push({
    id: "automation-notification",
    ac: "AC-7",
    description: "Automation completion notification for executing actor",
    pass: alphaItems.some((n) => n.type === "automation.completed"),
    detail: { types: alphaItems.map((n) => n.type) },
  });

  // AC-6 Workflow stage
  await new Promise((r) => setTimeout(r, 5));
  const stage = await app.inject({
    method: "PATCH",
    url: `/api/v1/relationships/${relationshipId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { stage: "Screening" },
  });
  const feedAfterStage = await app.inject({
    method: "GET",
    url: "/api/v1/notifications",
    headers: { "x-actor-id": "recruiter_beta" },
  });
  const betaAfterStage = (feedAfterStage.json() as { items: Notif[] }).items;
  steps.push({
    id: "workflow-notification",
    ac: "AC-6",
    description: "Workflow stage-change notification after successful stage move",
    pass:
      stage.statusCode === 200 &&
      betaAfterStage.some((n) => n.type === "workflow.stage_changed") &&
      (stage.json() as { currentStage: string }).currentStage === "Screening",
    detail: {
      stageStatus: stage.statusCode,
      types: betaAfterStage.map((n) => n.type),
    },
  });

  // AC-8 Mention
  await new Promise((r) => setTimeout(r, 5));
  const note = await app.inject({
    method: "POST",
    url: "/api/v1/collaboration/notes",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: {
      body: "Please review @recruiter_beta — thanks",
      relationshipId,
    },
  });
  const feedAfterMention = await app.inject({
    method: "GET",
    url: "/api/v1/notifications",
    headers: { "x-actor-id": "recruiter_beta" },
  });
  const betaAfterMention = (feedAfterMention.json() as { items: Notif[] }).items;
  steps.push({
    id: "mention-notification",
    ac: "AC-8",
    description: "Mention notification when note includes @actorId",
    pass:
      note.statusCode === 201 &&
      (note.json() as { mentionNotifications: number }).mentionNotifications === 1 &&
      betaAfterMention.some((n) => n.type === "mention"),
    detail: {
      noteStatus: note.statusCode,
      types: betaAfterMention.map((n) => n.type),
    },
  });

  // Ordering (reviewer non-blocker) — newest first; stable across read
  const orderBefore = betaAfterMention.map((n) => n.id);
  const orderingOk = isNewestFirst(betaAfterMention) && betaAfterMention.length >= 2;
  steps.push({
    id: "notification-ordering",
    description:
      "Feed ordered by createdAt descending; read/mark-all must not reorder event sequence",
    pass: orderingOk,
    detail: {
      createdAts: betaAfterMention.map((n) => n.createdAt),
      ids: orderBefore,
    },
  });

  // AC-3 + AC-3b immutability
  const target = betaAfterMention.find((n) => n.type === "assignment") ?? betaAfterMention[0]!;
  const fpBefore = contentFingerprint(target);
  const markOne = await app.inject({
    method: "POST",
    url: `/api/v1/notifications/${target.id}/read`,
    headers: { "x-actor-id": "recruiter_beta" },
  });
  const marked = markOne.json() as Notif;
  steps.push({
    id: "mark-read",
    ac: "AC-3",
    description: "Mark one notification as read",
    pass: markOne.statusCode === 200 && marked.readAt != null,
    detail: { statusCode: markOne.statusCode, readAt: marked.readAt },
  });
  steps.push({
    id: "immutability",
    ac: "AC-3b",
    description: "Mark read changes only readAt — content/source/createdAt immutable",
    pass:
      markOne.statusCode === 200 &&
      contentFingerprint(marked) === fpBefore &&
      marked.readAt != null,
    detail: {
      fingerprintMatch: contentFingerprint(marked) === fpBefore,
      readAt: marked.readAt,
    },
  });

  const feedAfterRead = await app.inject({
    method: "GET",
    url: "/api/v1/notifications",
    headers: { "x-actor-id": "recruiter_beta" },
  });
  const idsAfterRead = (feedAfterRead.json() as { items: Notif[] }).items.map((n) => n.id);
  steps.push({
    id: "ordering-stable-after-read",
    description: "Mark read does not change feed id order",
    pass: JSON.stringify(idsAfterRead) === JSON.stringify(orderBefore),
    detail: { before: orderBefore, after: idsAfterRead },
  });

  // AC-4 mark all
  const markAll = await app.inject({
    method: "POST",
    url: "/api/v1/notifications/read-all",
    headers: { "x-actor-id": "recruiter_beta" },
  });
  const unreadAfter = await app.inject({
    method: "GET",
    url: "/api/v1/notifications?status=unread",
    headers: { "x-actor-id": "recruiter_beta" },
  });
  const allAfter = await app.inject({
    method: "GET",
    url: "/api/v1/notifications",
    headers: { "x-actor-id": "recruiter_beta" },
  });
  const idsAfterAll = (allAfter.json() as { items: Notif[] }).items.map((n) => n.id);
  steps.push({
    id: "mark-all-read",
    ac: "AC-4",
    description: "Mark all notifications as read for current actor",
    pass:
      markAll.statusCode === 200 &&
      (unreadAfter.json() as { items: Notif[] }).items.length === 0 &&
      (allAfter.json() as { items: Notif[] }).items.every((n) => n.readAt != null),
    detail: {
      markAllStatus: markAll.statusCode,
      unread: (unreadAfter.json() as { items: Notif[] }).items.length,
    },
  });
  steps.push({
    id: "ordering-stable-after-mark-all",
    description: "Mark all read does not change feed id order",
    pass: JSON.stringify(idsAfterAll) === JSON.stringify(orderBefore),
    detail: { before: orderBefore, after: idsAfterAll },
  });

  // AC-9 consume-only — mention does not change stage; no execute from notification APIs
  const relAfterMention = await app.inject({
    method: "GET",
    url: `/api/v1/relationships/${relationshipId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const allowedTypes = new Set([
    "assignment",
    "workflow.stage_changed",
    "automation.completed",
    "mention",
  ]);
  const allBetaTypes = betaAfterMention.map((n) => n.type);
  steps.push({
    id: "consume-only",
    ac: "AC-9",
    description: "Notifications only from MVP sources; mention does not execute workflow",
    pass:
      allBetaTypes.every((t) => allowedTypes.has(t)) &&
      (relAfterMention.json() as { currentStage: string }).currentStage === "Screening" &&
      (relAfterMention.json() as { assigneeId: string }).assigneeId === "recruiter_beta",
    detail: {
      types: allBetaTypes,
      stage: (relAfterMention.json() as { currentStage: string }).currentStage,
    },
  });

  // AC-10 — AuthZ (Spec AC-10 is "no business rules moved"; user review mapped AuthZ — cover both)
  // Spec AC-10: No business rules moved into Notifications
  const matchBefore = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const score = (matchBefore.json() as { overallMatchScore: number }).overallMatchScore;
  const matchAfter = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  steps.push({
    id: "no-business-rules",
    ac: "AC-10",
    description: "Matching/Workflow semantics unchanged under Notifications",
    pass:
      matchBefore.statusCode === 200 &&
      matchAfter.statusCode === 200 &&
      (matchAfter.json() as { overallMatchScore: number }).overallMatchScore === score &&
      (relAfterMention.json() as { currentStage: string }).currentStage === "Screening",
    detail: { score },
  });

  // Authorization evidence (reviewer focus)
  const viewerWrite = authz.authorize("viewer_alpha", "notification.write");
  const viewerRead = authz.authorize("viewer_alpha", "notification.read");
  const viewerNote = await app.inject({
    method: "POST",
    url: "/api/v1/collaboration/notes",
    headers: { "x-actor-id": "viewer_alpha" },
    payload: { body: "Hi @recruiter_alpha", relationshipId },
  });
  const ghostFeed = await app.inject({
    method: "GET",
    url: "/api/v1/notifications",
    headers: { "x-actor-id": "ghost_actor" },
  });
  const viewerFeed = await app.inject({
    method: "GET",
    url: "/api/v1/notifications",
    headers: { "x-actor-id": "viewer_alpha" },
  });
  steps.push({
    id: "authorization",
    description: "AuthorizationService gates notification.read/write; Viewer cannot mention",
    pass:
      PERMISSIONS.includes("notification.read") &&
      PERMISSIONS.includes("notification.write") &&
      viewerRead.allowed === true &&
      viewerWrite.allowed === false &&
      !ROLE_PERMISSIONS.Viewer.includes("notification.write") &&
      viewerNote.statusCode === 403 &&
      ghostFeed.statusCode === 403 &&
      viewerFeed.statusCode === 200,
    detail: {
      viewerNote: viewerNote.statusCode,
      ghostFeed: ghostFeed.statusCode,
      viewerFeed: viewerFeed.statusCode,
    },
  });

  // AC-11 regression happy-path
  const analytics = await app.inject({
    method: "GET",
    url: "/api/v1/analytics/overview",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
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
  steps.push({
    id: "regression",
    ac: "AC-11",
    description: "Authorized happy-path regression (Job/Rel/Match/Analytics/Automation)",
    pass:
      jobRes.statusCode === 201 &&
      relRes.statusCode === 201 &&
      matchAfter.statusCode === 200 &&
      analytics.statusCode === 200 &&
      autoStage.statusCode === 200,
    detail: {
      job: jobRes.statusCode,
      rel: relRes.statusCode,
      match: matchAfter.statusCode,
      analytics: analytics.statusCode,
      automation: autoStage.statusCode,
    },
  });

  const healthAfter = await app.inject({ method: "GET", url: "/health" });
  const healthGhost = await app.inject({
    method: "GET",
    url: "/health",
    headers: { "x-actor-id": "ghost_actor" },
  });
  steps.push({
    id: "health-after",
    ac: "AC-13",
    description: "GET /health still public after notification checks",
    pass:
      healthAfter.statusCode === 200 &&
      (healthAfter.json() as { status?: string }).status === "ok" &&
      healthGhost.statusCode === 200,
    detail: {
      after: healthAfter.statusCode,
      ghost: healthGhost.statusCode,
    },
  });

  const failed = steps.filter((s) => !s.pass);
  const acIds = [
    "AC-1",
    "AC-2",
    "AC-3",
    "AC-3b",
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
  ];
  const acceptanceCriteria = acIds.map((ac) => ({
    ac,
    pass: steps.filter((s) => s.ac === ac).every((s) => s.pass) && steps.some((s) => s.ac === ac),
  }));

  const report = {
    epic: "EPIC-010",
    title: "Notifications & Collaboration",
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
  const out = join("reports", "epic-010-validation-evidence.json");
  writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ verdict: report.verdict, out, summary: report.summary }, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
