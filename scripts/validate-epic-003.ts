/**
 * EPIC-003 runtime validation — in-process Fastify inject.
 * Evidence: reports/epic-003-validation-evidence.json
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

async function importCandidate(
  app: Awaited<ReturnType<typeof buildApp>>,
  lines: string[],
): Promise<string> {
  const docx = await createTestDocx(lines);
  const boundary = "----e003";
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
  const storagePath = mkdtempSync(join(tmpdir(), "epic-003-validate-"));
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: storagePath,
    DEFAULT_WORKSPACE_ID: "ws_epic003_validate",
  });
  const app = await buildApp(createAppDependencies(config));

  const health = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health",
    ac: "AC-9",
    description: "GET /health returns status ok",
    pass: health.statusCode === 200 && (health.json() as { status?: string }).status === "ok",
    detail: { statusCode: health.statusCode, body: health.json() },
  });

  const c1 = await importCandidate(app, ["E003 Cand One", "e003a@example.com", "Go"]);
  const c2 = await importCandidate(app, ["E003 Cand Two", "e003b@example.com", "Rust"]);
  steps.push({
    id: "import",
    ac: "AC-8",
    description: "Resume Import works (no regression)",
    pass: Boolean(c1) && Boolean(c2),
    detail: { c1, c2 },
  });

  const job1Res = await app.inject({
    method: "POST",
    url: "/api/v1/jobs",
    payload: { title: "E003 Job A", company: "E003 Co", status: "Open" },
  });
  const job2Res = await app.inject({
    method: "POST",
    url: "/api/v1/jobs",
    payload: { title: "E003 Job B", company: "E003 Co", status: "Open" },
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

  // AC-1 create
  const created = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    payload: { candidateId: c1, jobId: jobId1, status: "Sourced" },
  });
  const rel = created.json() as { id?: string; status?: string };
  steps.push({
    id: "create",
    ac: "AC-1",
    description: "Relationship can be created",
    pass: created.statusCode === 201 && Boolean(rel.id) && rel.status === "Sourced",
    detail: { statusCode: created.statusCode, body: rel },
  });
  const relId = rel.id!;

  // 404 missing candidate/job
  const missingCand = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    payload: { candidateId: "candidate_doesnotexist999", jobId: jobId1 },
  });
  const missingJob = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    payload: { candidateId: c1, jobId: "job_doesnotexist999" },
  });
  steps.push({
    id: "edge-404",
    description: "Create with missing Candidate or Job → 404",
    pass: missingCand.statusCode === 404 && missingJob.statusCode === 404,
    detail: {
      missingCand: missingCand.statusCode,
      missingJob: missingJob.statusCode,
    },
  });

  // Duplicate 409
  const dup = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    payload: { candidateId: c1, jobId: jobId1, status: "Applied" },
  });
  const afterDup = await app.inject({
    method: "GET",
    url: `/api/v1/candidates/${c1}/relationships`,
  });
  steps.push({
    id: "uniqueness",
    ac: "AC-5",
    description: "Duplicate (candidate, job) → 409; no extra row",
    pass:
      dup.statusCode === 409 &&
      (afterDup.json() as { items: unknown[] }).items.filter(
        (i) => (i as { jobId: string }).jobId === jobId1,
      ).length === 1,
    detail: {
      statusCode: dup.statusCode,
      body: dup.json(),
      countForJob1: (afterDup.json() as { items: { jobId: string }[] }).items.filter(
        (i) => i.jobId === jobId1,
      ).length,
    },
  });

  // N:N
  await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    payload: { candidateId: c1, jobId: jobId2, status: "Applied" },
  });
  await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    payload: { candidateId: c2, jobId: jobId1, status: "Screening" },
  });

  const byCand = await app.inject({
    method: "GET",
    url: `/api/v1/candidates/${c1}/relationships`,
  });
  steps.push({
    id: "list-candidate",
    ac: "AC-2",
    description: "Relationship appears under Candidate",
    pass: byCand.statusCode === 200 && (byCand.json() as { items: unknown[] }).items.length === 2,
    detail: { statusCode: byCand.statusCode, total: (byCand.json() as { total: number }).total },
  });

  const byJob = await app.inject({
    method: "GET",
    url: `/api/v1/jobs/${jobId1}/relationships`,
  });
  steps.push({
    id: "list-job",
    ac: "AC-3",
    description: "Relationship appears under Job",
    pass: byJob.statusCode === 200 && (byJob.json() as { items: unknown[] }).items.length === 2,
    detail: { statusCode: byJob.statusCode, total: (byJob.json() as { total: number }).total },
  });

  steps.push({
    id: "nn",
    ac: "AC-5",
    description: "N:N — one candidate→many jobs; one job→many candidates",
    pass:
      (byCand.json() as { items: unknown[] }).items.length === 2 &&
      (byJob.json() as { items: unknown[] }).items.length === 2,
    detail: {
      candidateJobs: (byCand.json() as { total: number }).total,
      jobCandidates: (byJob.json() as { total: number }).total,
    },
  });

  // AC-4 status transitions
  const toApplied = await app.inject({
    method: "PATCH",
    url: `/api/v1/relationships/${relId}`,
    payload: { status: "Applied" },
  });
  const toScreening = await app.inject({
    method: "PATCH",
    url: `/api/v1/relationships/${relId}`,
    payload: { status: "Screening" },
  });
  const reload = await app.inject({
    method: "GET",
    url: `/api/v1/candidates/${c1}/relationships`,
  });
  const reloaded = (reload.json() as { items: { id: string; status: string }[] }).items.find(
    (i) => i.id === relId,
  );
  steps.push({
    id: "status",
    ac: "AC-4",
    description: "Status updates Sourced→Applied→Screening persist",
    pass:
      toApplied.statusCode === 200 &&
      toApplied.json().status === "Applied" &&
      toScreening.statusCode === 200 &&
      toScreening.json().status === "Screening" &&
      reloaded?.status === "Screening",
    detail: {
      toApplied: toApplied.json(),
      toScreening: toScreening.json(),
      reloadedStatus: reloaded?.status,
    },
  });

  // AC-6 Candidate Workspace
  const ws = await app.inject({ method: "GET", url: `/api/v1/candidates/${c1}` });
  const candList = await app.inject({ method: "GET", url: "/api/v1/candidates" });
  steps.push({
    id: "candidate-workspace",
    ac: "AC-6",
    description: "Candidate Workspace has no regression",
    pass: ws.statusCode === 200 && candList.statusCode === 200,
    detail: {
      workspace: ws.statusCode,
      list: candList.statusCode,
      name: (ws.json() as { name?: string }).name,
    },
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

  const health2 = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health-after",
    ac: "AC-9",
    description: "/health still ok after relationship mutations",
    pass: health2.statusCode === 200 && (health2.json() as { status?: string }).status === "ok",
    detail: { statusCode: health2.statusCode, body: health2.json() },
  });

  const required = steps.filter((s) => s.ac);
  const requiredPass = required.every((s) => s.pass);
  const acIds = ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5", "AC-6", "AC-7", "AC-8", "AC-9"] as const;

  const report = {
    epic: "EPIC-003",
    title: "Candidate ↔ Job Relationship Foundation",
    generatedAt: new Date().toISOString(),
    storagePath,
    verdict: requiredPass ? "PASS" : "FAIL",
    allStepsPass: steps.every((s) => s.pass),
    summary: {
      totalSteps: steps.length,
      passed: steps.filter((s) => s.pass).length,
      failed: steps.filter((s) => !s.pass).map((s) => s.id),
      acceptanceCriteria: acIds.map((ac) => ({
        ac,
        pass: steps.filter((s) => s.ac === ac).every((s) => s.pass),
      })),
      note: "AC-10 (pnpm run ci) recorded separately in Validation Report",
    },
    steps,
  };

  mkdirSync("reports", { recursive: true });
  const out = join("reports", "epic-003-validation-evidence.json");
  writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ verdict: report.verdict, out, summary: report.summary }, null, 2));
  if (!requiredPass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
