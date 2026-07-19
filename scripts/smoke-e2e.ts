#!/usr/bin/env tsx
/**
 * Smoke test — full recruiter workflow against real CVs.
 *
 * Usage:
 *   pnpm exec tsx scripts/smoke-e2e.ts [cv-dir]
 *
 * Default cv-dir: C:/Users/Admin/Downloads/Data4SmokeTest
 */
import {
  readdirSync,
  readFileSync,
  mkdtempSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join, extname, basename } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { buildApp, createAppDependencies } from "../src/app/server.js";
import { AppConfig } from "../src/shared/config/index.js";
import { InMemoryTelemetryStore } from "../src/shared/telemetry/index.js";
import { disconnectPrisma } from "../src/infrastructure/persistence/prisma/prisma-client.js";

const CV_DIR = process.argv[2] ?? "C:\\Users\\Admin\\Downloads\\Data4SmokeTest";
const SMOKE_PROFILE = process.env.SMOKE_PROFILE === "1" || process.env.SMOKE_PROFILE === "true";

type StepResult = { ok: boolean; detail: string };

const results: { step: string; ok: boolean; detail: string }[] = [];

function log(step: string, result: StepResult) {
  results.push({ step, ...result });
  const mark = result.ok ? "✓" : "✗";
  console.log(`${mark} ${step} — ${result.detail}`);
}

function mimeFor(filename: string): string {
  const ext = extname(filename).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "application/octet-stream";
}

async function main() {
  if (!existsSync(CV_DIR)) {
    console.error(`CV directory not found: ${CV_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(CV_DIR)
    .filter((f) => [".pdf", ".docx"].includes(extname(f).toLowerCase()))
    .filter((f) => {
      const size = readFileSync(join(CV_DIR, f)).length;
      return size >= 5_000; // skip tiny/corrupt stubs
    })
    .sort();

  console.log(`\n=== Smoke E2E — ${files.length} CVs from ${CV_DIR} ===\n`);
  if (SMOKE_PROFILE) {
    console.log("(SMOKE_PROFILE=true — will write reports/smoke-performance.md)\n");
  }
  const profile = {
    totalStart: performance.now(),
    importMs: 0,
    reviewMs: 0,
    readyMs: 0,
  };

  const root = mkdtempSync(join(tmpdir(), "smoke-e2e-"));
  mkdirSync(join(root, "db"), { recursive: true });
  const dbPath = join(root, "db", "smoke.db");
  // Prisma SQLite URLs must be file: absolute (forward slashes on Windows).
  const databaseUrl = `file:${dbPath.replace(/\\/g, "/")}`;
  execSync("pnpm exec prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  const telemetry = new InMemoryTelemetryStore();
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: join(root, "storage"),
    TELEMETRY_PATH: join(root, "telemetry.jsonl"),
    DEFAULT_WORKSPACE_ID: "ws_smoke",
    NODE_ENV: "development",
    PERSISTENCE_DRIVER: "prisma",
    DATABASE_URL: databaseUrl,
  });
  const deps = createAppDependencies(config, telemetry);
  const app = await buildApp(deps);

  // 1. Health
  {
    const res = await app.inject({ method: "GET", url: "/health" });
    const body = res.json();
    log("Health", {
      ok: res.statusCode === 200 && body.status === "ok" && body.persistence === "prisma",
      detail: `status=${res.statusCode} epic=${body.epic ?? "?"} persistence=${body.persistence ?? "?"}`,
    });
  }

  // 2. Bulk import all CVs
  const imported: { candidateId: string; filename: string; name?: string }[] = [];
  const importFailures: string[] = [];

  const importStarted = performance.now();
  for (const filename of files) {
    const filePath = join(CV_DIR, filename);
    const file = readFileSync(filePath);
    try {
      const result = await deps.candidateImportService.importResume({
        file,
        filename,
        mimeType: mimeFor(filename),
        sourceType: "manual_upload",
        workspaceId: "ws_smoke",
        actorId: "recruiter_smoke",
      });
      imported.push({
        candidateId: result.candidateId,
        filename,
        name: result.name,
      });
      log(`Import ${basename(filename)}`, {
        ok: true,
        detail: `${result.candidateId} (${result.name ?? "unnamed"})`,
      });
    } catch (err) {
      importFailures.push(filename);
      log(`Import ${basename(filename)}`, {
        ok: false,
        detail: (err as Error).message,
      });
    }
  }
  profile.importMs = performance.now() - importStarted;

  log("Bulk import summary", {
    ok: imported.length > 0,
    detail: `${imported.length}/${files.length} imported, ${importFailures.length} failed`,
  });

  if (imported.length === 0) {
    console.error("\nNo candidates imported — aborting remaining workflow.");
    process.exit(1);
  }

  // EPIC-007 exit: reject section-header / icon names
  {
    const BAD_NAME =
      /^(about|profile|summary|objective|cv|resume|curriculum vitae|personal information|thong tin ca nhan|thông tin cá nhân|giới thiệu|gioi thieu|working experience|work experience|chi so chat luong|chỉ số chất lượng|nationality)\b/i;
    const bad = imported.filter((c) => {
      const n = (c.name ?? "").trim().replace(/:$/, "");
      return !n || BAD_NAME.test(n) || /^[^A-Za-z\u00C0-\u024F\u1E00-\u1EFF]*$/.test(n);
    });
    log("Name extraction hardening", {
      ok: bad.length === 0,
      detail:
        bad.length === 0
          ? `all ${imported.length} names look human`
          : `bad names: ${bad.map((b) => `${b.filename}=${b.name}`).join("; ")}`,
    });
  }

  // EPIC-007 exit: duplicate pair chung-nguyen ×2 must warn
  {
    const chungPair = imported.filter((c) => /chung-nguyen-cv-quant-engineer/i.test(c.filename));
    let dupOk = false;
    let detail = "chung-nguyen pair not found in import set";
    if (chungPair.length >= 2) {
      const reviews = await Promise.all(
        chungPair.map((c) =>
          app.inject({
            method: "GET",
            url: `/api/v1/candidates/${c.candidateId}/review`,
          }),
        ),
      );
      const withDups = reviews.filter((r) => (r.json().possibleDuplicates?.length ?? 0) > 0);
      dupOk = withDups.length >= 1;
      detail = withDups.length
        ? `${withDups.length}/${chungPair.length} of pair show possibleDuplicates`
        : `0/${chungPair.length} show possibleDuplicates (expected ≥1)`;
    }
    log("Duplicate warning (chung-nguyen pair)", {
      ok: dupOk,
      detail,
    });
  }

  const primary = imported[0]!;

  // 3. List candidates
  {
    const res = await app.inject({ method: "GET", url: "/api/v1/candidates" });
    const total = res.json().items?.length ?? 0;
    log("List candidates", {
      ok: res.statusCode === 200 && total >= imported.length,
      detail: `total=${total}`,
    });
  }

  // 4. Review + Knowledge + Insights (primary)
  {
    const reviewStarted = performance.now();
    const review = await app.inject({
      method: "GET",
      url: `/api/v1/candidates/${primary.candidateId}/review`,
    });
    log("Candidate review", {
      ok: review.statusCode === 200,
      detail: `fields=${review.json().diff?.length ?? 0}`,
    });

    const field = review.json().diff?.[0]?.field ?? "english";
    const edit = await app.inject({
      method: "POST",
      url: `/api/v1/candidates/${primary.candidateId}/knowledge/review`,
      payload: {
        field,
        action: "accept",
      },
    });
    log("Knowledge review accept", {
      ok: edit.statusCode === 200,
      detail: `field=${field}`,
    });

    const knowledge = await app.inject({
      method: "GET",
      url: `/api/v1/knowledge/${primary.candidateId}`,
    });
    log("Knowledge GET", {
      ok: knowledge.statusCode === 200 && (knowledge.json().objects?.length ?? 0) > 0,
      detail: `objects=${knowledge.json().objects?.length ?? 0}`,
    });

    const history = await app.inject({
      method: "GET",
      url: `/api/v1/knowledge/${primary.candidateId}/history`,
    });
    log("Knowledge history", {
      ok: history.statusCode === 200,
      detail: `timeline=${history.json().timeline?.length ?? 0}`,
    });

    const insights = await app.inject({
      method: "GET",
      url: `/api/v1/candidates/${primary.candidateId}/insights?screen=candidate`,
    });
    log("Candidate insights", {
      ok: insights.statusCode === 200,
      detail: `count=${insights.json().insights?.length ?? 0}`,
    });
    profile.reviewMs = performance.now() - reviewStarted;
  }

  // 5. Mark all imported candidates Ready (best-effort)
  let readyCount = 0;
  const readyStarted = performance.now();
  for (const c of imported) {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/candidates/${c.candidateId}/mark-ready`,
    });
    if (res.statusCode === 200) readyCount += 1;
  }
  profile.readyMs = performance.now() - readyStarted;
  log("Mark Ready (all)", {
    ok: readyCount > 0,
    detail: `${readyCount}/${imported.length} ready`,
  });

  // 6. Create Job + review + ready
  let jobId = "";
  {
    const jobRes = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      payload: {
        company: "Smoke Test Co",
        text: `Senior Software Engineer
Company: Smoke Test Co
Location: Ho Chi Minh
Skills: React, TypeScript, Node, Python
English: B2
Experience: 3 years
Salary: 2000-4000 USD

Build recruitment products. Strong backend and frontend.`,
      },
    });
    jobId = jobRes.json().id ?? "";
    log("Create Job", {
      ok: jobRes.statusCode === 201 && Boolean(jobId),
      detail: jobId || jobRes.body,
    });

    await app.inject({
      method: "POST",
      url: `/api/v1/jobs/${jobId}/review`,
      payload: { field: "title", action: "accept" },
    });
    const readyJob = await app.inject({
      method: "POST",
      url: `/api/v1/jobs/${jobId}/mark-ready`,
    });
    log("Job mark ready", {
      ok: readyJob.statusCode === 200,
      detail: `status=${readyJob.statusCode}`,
    });

    const jobInsights = await app.inject({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/insights`,
    });
    log("Job insights", {
      ok: jobInsights.statusCode === 200,
      detail: `count=${jobInsights.json().insights?.length ?? 0}`,
    });

    const matches = await app.inject({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/matches`,
    });
    log("Job matches", {
      ok: matches.statusCode === 200,
      detail: `matches=${matches.json().items?.length ?? matches.json().length ?? "?"}`,
    });
  }

  // 7. Submit primary candidate → interview → offer → placement
  let submissionId = "";
  let interviewId = "";
  {
    const submit = await app.inject({
      method: "POST",
      url: `/api/v1/jobs/${jobId}/submissions`,
      payload: { candidateId: primary.candidateId },
    });
    submissionId = submit.json().id ?? "";
    log("Submit candidate", {
      ok: submit.statusCode === 201 && Boolean(submissionId),
      detail: submissionId || submit.body,
    });

    const subInsights = await app.inject({
      method: "GET",
      url: `/api/v1/submissions/${submissionId}/insights`,
    });
    log("Submission insights", {
      ok: subInsights.statusCode === 200,
      detail: `count=${subInsights.json().insights?.length ?? 0}`,
    });

    await app.inject({
      method: "PATCH",
      url: `/api/v1/submissions/${submissionId}/status`,
      payload: { status: "Client Reviewing" },
    });

    const interview = await app.inject({
      method: "POST",
      url: `/api/v1/submissions/${submissionId}/interviews`,
      payload: {
        date: new Date().toISOString(),
        type: "Technical",
        interviewer: "Smoke HM",
      },
    });
    interviewId = interview.json().id ?? "";
    log("Schedule interview", {
      ok: interview.statusCode === 201 && Boolean(interviewId),
      detail: interviewId || interview.body,
    });

    const intInsights = await app.inject({
      method: "GET",
      url: `/api/v1/interviews/${interviewId}/insights`,
    });
    log("Interview insights", {
      ok: intInsights.statusCode === 200,
      detail: `count=${intInsights.json().insights?.length ?? 0}`,
    });

    const complete = await app.inject({
      method: "POST",
      url: `/api/v1/interviews/${interviewId}/complete`,
      payload: { decision: "Passed", feedback: "Smoke test — strong fundamentals" },
    });
    log("Complete interview", {
      ok: complete.statusCode === 200 && complete.json().decision === "Passed",
      detail: `decision=${complete.json().decision}`,
    });

    const offer = await app.inject({
      method: "POST",
      url: `/api/v1/submissions/${submissionId}/offers`,
      payload: { salary: "USD 3000", startDate: "2026-08-01", benefits: "Health" },
    });
    const offerId = offer.json().id ?? "";
    log("Create offer", {
      ok: offer.statusCode === 201 && Boolean(offerId),
      detail: offerId || offer.body,
    });

    const sent = await app.inject({
      method: "POST",
      url: `/api/v1/offers/${offerId}/status`,
      payload: { status: "Sent" },
    });
    const accepted = await app.inject({
      method: "POST",
      url: `/api/v1/offers/${offerId}/status`,
      payload: { status: "Accepted" },
    });
    log("Offer sent → accepted", {
      ok: sent.statusCode === 200 && accepted.statusCode === 200,
      detail: `sent=${sent.statusCode} accepted=${accepted.statusCode}`,
    });

    const place = await app.inject({
      method: "POST",
      url: `/api/v1/submissions/${submissionId}/place`,
    });
    log("Placement", {
      ok: place.statusCode === 200 && place.json().status === "Placed",
      detail: `status=${place.json().status}`,
    });

    const detail = await app.inject({
      method: "GET",
      url: `/api/v1/submissions/${submissionId}`,
    });
    log("Submission detail + timeline", {
      ok: detail.statusCode === 200 && (detail.json().activities?.length ?? 0) > 0,
      detail: `activities=${detail.json().activities?.length ?? 0}`,
    });
  }

  // 8. Submit a second candidate (pipeline breadth)
  if (imported[1]) {
    const submit2 = await app.inject({
      method: "POST",
      url: `/api/v1/jobs/${jobId}/submissions`,
      payload: { candidateId: imported[1].candidateId },
    });
    log("Submit 2nd candidate", {
      ok: submit2.statusCode === 201,
      detail: submit2.json().id ?? submit2.body,
    });
  }

  // 9. Pipeline list + search
  {
    const pipeline = await app.inject({
      method: "GET",
      url: "/api/v1/submissions",
    });
    log("Pipeline list", {
      ok: pipeline.statusCode === 200,
      detail: `items=${pipeline.json().items?.length ?? "?"}`,
    });

    const jobs = await app.inject({ method: "GET", url: "/api/v1/jobs" });
    log("Jobs list", {
      ok: jobs.statusCode === 200,
      detail: `items=${jobs.json().items?.length ?? "?"}`,
    });
  }

  // 10. Insight click telemetry
  {
    const click = await app.inject({
      method: "POST",
      url: "/api/v1/insights/click",
      payload: { screen: "candidate", insight_id: "smoke_insight_1" },
    });
    log("Insight click telemetry", {
      ok: click.statusCode === 200,
      detail: `ok=${click.json().ok}`,
    });
  }

  // EPIC-008 — Founder Readiness gates
  {
    const replay = await deps.auditReplayService.replay(primary.candidateId);
    const kinds = new Set(replay.steps.map((s) => s.kind));
    const replay2 = await deps.auditReplayService.replay(primary.candidateId);
    const deterministic = JSON.stringify(replay.steps) === JSON.stringify(replay2.steps);
    log("Audit replay timeline", {
      ok:
        replay.steps.length > 0 &&
        kinds.has("import") &&
        kinds.has("ready") &&
        kinds.has("submission") &&
        kinds.has("placement") &&
        deterministic,
      detail: `steps=${replay.steps.length} deterministic=${deterministic}`,
    });
  }

  {
    const issues = await deps.consistencyVerifier.verify();
    const errors = issues.filter((i) => i.severity === "error");
    log("Consistency verification", {
      ok: errors.length === 0,
      detail:
        errors.length === 0
          ? `issues=${issues.length} (warnings ok)`
          : errors.map((e) => e.code).join(", "),
    });
  }

  {
    const report = await deps.dataIntegrityChecker.check();
    log("verify:data (in-process)", {
      ok: report.errorCount === 0,
      detail: `errors=${report.errorCount} warnings=${report.warningCount}`,
    });
  }

  {
    const requiredTypes = [
      "review_session_completed",
      "submission_created",
      "interview_completed",
      "offer_sent",
      "placement_created",
    ] as const;
    const events = telemetry.getEvents();
    const missing: string[] = [];
    for (const type of requiredTypes) {
      const matches = events.filter((e) => e.event_type === type);
      if (matches.length === 0) {
        missing.push(`${type}:missing`);
        continue;
      }
      for (const ev of matches) {
        if (!ev.correlation_id) missing.push(`${type}:no_correlation`);
        if (!ev.candidate_id) missing.push(`${type}:no_candidate`);
        if (!ev.timestamp) missing.push(`${type}:no_timestamp`);
      }
    }
    log("Telemetry completeness", {
      ok: missing.length === 0,
      detail:
        missing.length === 0 ? "correlationId+candidateId ok" : missing.slice(0, 8).join(", "),
    });
  }

  // Summary
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed / ${results.length} steps ===`);
  console.log(`Imported: ${imported.map((c) => c.name || c.filename).join(" | ")}`);
  if (importFailures.length) {
    console.log(`Import failures: ${importFailures.join(", ")}`);
  }

  const eventTypes = new Set(telemetry.getEvents().map((e) => e.event_type));
  console.log(
    `Telemetry events: ${telemetry.getEvents().length} (types: ${[...eventTypes].sort().join(", ")})`,
  );

  if (SMOKE_PROFILE) {
    const totalMs = performance.now() - profile.totalStart;
    const lines = [
      "# Smoke Performance",
      "",
      `_Generated ${new Date().toISOString()} — TECH-002 (SMOKE_PROFILE)_`,
      "",
      `| Phase | Duration |`,
      `|-------|---------:|`,
      `| Import (${imported.length} CVs) | ${(profile.importMs / 1000).toFixed(2)}s |`,
      `| Review (primary) | ${(profile.reviewMs / 1000).toFixed(2)}s |`,
      `| Ready (all) | ${(profile.readyMs / 1000).toFixed(2)}s |`,
      `| Total workflow | ${(totalMs / 1000).toFixed(2)}s |`,
      "",
      `Persistence: prisma`,
      `CV dir: ${CV_DIR}`,
      `Steps: ${passed} passed / ${failed} failed / ${results.length} total`,
      "",
    ];
    const outPath = join(process.cwd(), "reports", "smoke-performance.md");
    mkdirSync(join(process.cwd(), "reports"), { recursive: true });
    writeFileSync(outPath, lines.join("\n"), "utf8");
    console.log(`\nSMOKE_PROFILE wrote ${outPath}`);
  }

  await app.close();
  await disconnectPrisma();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await disconnectPrisma();
  process.exit(1);
});
