/**
 * EPIC-004 runtime validation — Recruiter Workflow Foundation.
 * Evidence: reports/epic-004-validation-evidence.json
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

type RelBody = {
  id: string;
  status: string;
  currentStage: string;
  stageHistory: Array<{
    previousStage: string | null;
    newStage: string;
    changedAt: string;
  }>;
};

async function importCandidate(
  app: Awaited<ReturnType<typeof buildApp>>,
  lines: string[],
): Promise<string> {
  const docx = await createTestDocx(lines);
  const boundary = "----e004";
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
  const storagePath = mkdtempSync(join(tmpdir(), "epic-004-validate-"));
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: storagePath,
    DEFAULT_WORKSPACE_ID: "ws_epic004_validate",
  });
  const app = await buildApp(createAppDependencies(config));

  const health = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health",
    ac: "AC-10",
    description: "GET /health returns status ok",
    pass: health.statusCode === 200 && (health.json() as { status?: string }).status === "ok",
    detail: { statusCode: health.statusCode, body: health.json() },
  });

  const c1 = await importCandidate(app, ["E004 Cand One", "e004a@example.com", "Go"]);
  const c2 = await importCandidate(app, ["E004 Cand Two", "e004b@example.com", "Rust"]);
  steps.push({
    id: "import",
    ac: "AC-9",
    description: "Resume Import works (no regression)",
    pass: Boolean(c1) && Boolean(c2),
    detail: { c1, c2 },
  });

  const job1Res = await app.inject({
    method: "POST",
    url: "/api/v1/jobs",
    payload: { title: "E004 Job A", company: "E004 Co", status: "Open" },
  });
  const job2Res = await app.inject({
    method: "POST",
    url: "/api/v1/jobs",
    payload: { title: "E004 Job B", company: "E004 Co", status: "Open" },
  });
  const jobId1 = (job1Res.json() as { id: string }).id;
  const jobId2 = (job2Res.json() as { id: string }).id;
  steps.push({
    id: "job-create",
    ac: "AC-7",
    description: "Job create still works (Job Workspace)",
    pass: job1Res.statusCode === 201 && job2Res.statusCode === 201,
    detail: { jobId1, jobId2 },
  });

  // AC-1 — init Sourced + first history
  const created = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    payload: { candidateId: c1, jobId: jobId1 },
  });
  const rel = created.json() as RelBody;
  const initOk =
    created.statusCode === 201 &&
    rel.currentStage === "Sourced" &&
    rel.status === "Sourced" &&
    rel.stageHistory?.length === 1 &&
    rel.stageHistory[0].previousStage === null &&
    rel.stageHistory[0].newStage === "Sourced";
  steps.push({
    id: "init",
    ac: "AC-1",
    description: "New relationship has currentStage=Sourced and exactly 1 history entry",
    pass: initOk,
    detail: { statusCode: created.statusCode, body: rel },
  });
  const relId = rel.id;

  // AC-2 / AC-3 — consecutive moves Sourced → Screening → Offer
  const toScreening = await app.inject({
    method: "PATCH",
    url: `/api/v1/relationships/${relId}`,
    payload: { stage: "Screening" },
  });
  const afterScreening = toScreening.json() as RelBody;
  const toOffer = await app.inject({
    method: "PATCH",
    url: `/api/v1/relationships/${relId}`,
    payload: { stage: "Offer" },
  });
  const afterOffer = toOffer.json() as RelBody;
  const historyLen = afterOffer.stageHistory?.length ?? 0;
  const timestampsOk =
    historyLen >= 3 &&
    new Date(afterOffer.stageHistory[0].changedAt).getTime() <=
      new Date(afterOffer.stageHistory[1].changedAt).getTime() &&
    new Date(afterOffer.stageHistory[1].changedAt).getTime() <=
      new Date(afterOffer.stageHistory[2].changedAt).getTime();
  steps.push({
    id: "move-stage",
    ac: "AC-2",
    description: "Recruiter can update current stage (Sourced→Screening→Offer)",
    pass:
      toScreening.statusCode === 200 &&
      toOffer.statusCode === 200 &&
      afterOffer.currentStage === "Offer",
    detail: {
      afterScreening: afterScreening.currentStage,
      afterOffer: afterOffer.currentStage,
      historyLen,
    },
  });
  steps.push({
    id: "history-append",
    ac: "AC-3",
    description: "Every stage change appends history (no overwrite); timestamps ordered",
    pass: historyLen === 3 && timestampsOk,
    detail: {
      historyLen,
      history: afterOffer.stageHistory,
      timestampsOk,
    },
  });

  // AC-4 — currentStage matches latest history
  const latest = afterOffer.stageHistory[afterOffer.stageHistory.length - 1];
  const detail = await app.inject({
    method: "GET",
    url: `/api/v1/relationships/${relId}`,
  });
  const detailBody = detail.json() as RelBody;
  const detailLatest = detailBody.stageHistory[detailBody.stageHistory.length - 1];
  steps.push({
    id: "current-matches-latest",
    ac: "AC-4",
    description: "Current stage always matches the latest history entry",
    pass:
      detail.statusCode === 200 &&
      detailBody.currentStage === detailLatest.newStage &&
      afterOffer.currentStage === latest.newStage &&
      detailBody.status === detailBody.currentStage,
    detail: {
      currentStage: detailBody.currentStage,
      latestHistory: detailLatest,
    },
  });

  // Second relationship for filter
  await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    payload: { candidateId: c2, jobId: jobId1, status: "Screening" },
  });

  // AC-5 — filter + groupBy
  const filteredOffer = await app.inject({
    method: "GET",
    url: `/api/v1/jobs/${jobId1}/relationships?stage=Offer`,
  });
  const filteredScreening = await app.inject({
    method: "GET",
    url: `/api/v1/jobs/${jobId1}/relationships?stage=Screening`,
  });
  const grouped = await app.inject({
    method: "GET",
    url: `/api/v1/jobs/${jobId1}/relationships?groupBy=stage`,
  });
  const offerItems = (filteredOffer.json() as { items: RelBody[] }).items ?? [];
  const screeningItems = (filteredScreening.json() as { items: RelBody[] }).items ?? [];
  const groups = (grouped.json() as { groups: Record<string, RelBody[]>; total: number }).groups;
  steps.push({
    id: "list-by-stage",
    ac: "AC-5",
    description: "Relationships can be listed/filtered/grouped by stage",
    pass:
      filteredOffer.statusCode === 200 &&
      offerItems.length === 1 &&
      offerItems[0].id === relId &&
      screeningItems.length === 1 &&
      grouped.statusCode === 200 &&
      (groups?.Offer?.length ?? 0) === 1 &&
      (groups?.Screening?.length ?? 0) === 1,
    detail: {
      offerCount: offerItems.length,
      screeningCount: screeningItems.length,
      groupOffer: groups?.Offer?.length,
      groupScreening: groups?.Screening?.length,
      total: (grouped.json() as { total: number }).total,
    },
  });

  // Edge: invalid stage → 400, history unchanged
  const beforeInvalidLen = detailBody.stageHistory.length;
  const invalid = await app.inject({
    method: "PATCH",
    url: `/api/v1/relationships/${relId}`,
    payload: { stage: "NotARealStage" },
  });
  const afterInvalid = await app.inject({
    method: "GET",
    url: `/api/v1/relationships/${relId}`,
  });
  const afterInvalidBody = afterInvalid.json() as RelBody;
  steps.push({
    id: "invalid-stage",
    description: "Invalid stage → 400; history not appended",
    pass:
      invalid.statusCode === 400 &&
      afterInvalidBody.stageHistory.length === beforeInvalidLen &&
      afterInvalidBody.currentStage === "Offer",
    detail: {
      statusCode: invalid.statusCode,
      body: invalid.json(),
      historyLenBefore: beforeInvalidLen,
      historyLenAfter: afterInvalidBody.stageHistory.length,
    },
  });

  // AC-6 Candidate Workspace
  const candWs = await app.inject({ method: "GET", url: `/api/v1/candidates/${c1}` });
  const candList = await app.inject({ method: "GET", url: "/api/v1/candidates" });
  steps.push({
    id: "candidate-workspace",
    ac: "AC-6",
    description: "Candidate Workspace has no regression",
    pass: candWs.statusCode === 200 && candList.statusCode === 200,
    detail: { workspace: candWs.statusCode, list: candList.statusCode },
  });

  // AC-7 Job Workspace
  const jobGet = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId1}` });
  const jobList = await app.inject({ method: "GET", url: "/api/v1/jobs" });
  steps.push({
    id: "job-workspace",
    ac: "AC-7",
    description: "Job Workspace has no regression",
    pass:
      jobGet.statusCode === 200 &&
      jobList.statusCode === 200 &&
      (jobGet.json() as { source?: string }).source === "manual",
    detail: {
      get: jobGet.statusCode,
      list: jobList.statusCode,
      source: (jobGet.json() as { source?: string }).source,
    },
  });

  // AC-8 Relationship Foundation
  const byCand = await app.inject({
    method: "GET",
    url: `/api/v1/candidates/${c1}/relationships`,
  });
  const byJob = await app.inject({
    method: "GET",
    url: `/api/v1/jobs/${jobId1}/relationships`,
  });
  const dup = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    payload: { candidateId: c1, jobId: jobId1 },
  });
  // N:N still works
  const relJob2 = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    payload: { candidateId: c1, jobId: jobId2 },
  });
  steps.push({
    id: "relationship-foundation",
    ac: "AC-8",
    description: "Relationship Foundation has no regression (list, 409 dup, N:N)",
    pass:
      byCand.statusCode === 200 &&
      byJob.statusCode === 200 &&
      dup.statusCode === 409 &&
      relJob2.statusCode === 201 &&
      ((byCand.json() as { total: number }).total ?? 0) >= 1,
    detail: {
      byCand: byCand.statusCode,
      byJob: byJob.statusCode,
      duplicate: dup.statusCode,
      secondJobRel: relJob2.statusCode,
    },
  });

  const healthAfter = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health-after",
    ac: "AC-10",
    description: "/health still ok after workflow mutations",
    pass:
      healthAfter.statusCode === 200 && (healthAfter.json() as { status?: string }).status === "ok",
    detail: { statusCode: healthAfter.statusCode, body: healthAfter.json() },
  });

  const failed = steps.filter((s) => !s.pass).map((s) => s.id);
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
  ] as const;
  const acceptanceCriteria = acIds.map((ac) => ({
    ac,
    pass: steps.some((s) => s.ac === ac && s.pass) && !steps.some((s) => s.ac === ac && !s.pass),
  }));

  const evidence = {
    epic: "EPIC-004",
    title: "Recruiter Workflow Foundation",
    generatedAt: new Date().toISOString(),
    storagePath,
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    allStepsPass: failed.length === 0,
    summary: {
      totalSteps: steps.length,
      passed: steps.filter((s) => s.pass).length,
      failed,
      acceptanceCriteria,
      note: "AC-11 (pnpm run ci) recorded separately in Validation Report",
    },
    steps,
  };

  mkdirSync("reports", { recursive: true });
  const out = join("reports", "epic-004-validation-evidence.json");
  writeFileSync(out, JSON.stringify(evidence, null, 2), "utf8");
  console.log(
    JSON.stringify(
      {
        verdict: evidence.verdict,
        out,
        summary: evidence.summary,
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
