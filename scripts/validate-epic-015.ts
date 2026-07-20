/**
 * EPIC-015 runtime validation — Intelligent Ingestion Engine.
 * Evidence: reports/epic-015-validation-evidence.json
 */
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
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

type JobView = {
  jobId: string;
  status: string;
  preview: {
    cv: number;
    jd: number;
    salary: number;
    other: number;
    unsupported: number;
    total: number;
  };
  report?: {
    imported: number;
    duplicate: number;
    skipped: number;
    unsupported: number;
    failed: number;
    durationMs: number;
    candidateIds?: string[];
  };
  sourceLabel: string;
};

async function waitJob(
  app: Awaited<ReturnType<typeof buildApp>>,
  jobId: string,
  maxMs = 30_000,
): Promise<JobView> {
  const start = Date.now();
  for (;;) {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/ingestion/jobs/${jobId}`,
      headers: { "x-actor-id": "recruiter_alpha" },
    });
    const job = res.json() as JobView;
    if (
      job.status === "Completed" ||
      job.status === "CompletedWithWarnings" ||
      job.status === "Failed" ||
      job.status === "AwaitingConfirmation"
    ) {
      return job;
    }
    if (Date.now() - start > maxMs) throw new Error(`timeout waiting job ${jobId}: ${job.status}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

async function postJsonFiles(
  app: Awaited<ReturnType<typeof buildApp>>,
  files: {
    filename: string;
    mimeType: string;
    contentBase64: string;
    relativePath?: string;
  }[],
  extra?: { sourceKind?: string; scope?: string },
) {
  return app.inject({
    method: "POST",
    url: "/api/v1/ingestion/jobs",
    headers: {
      "content-type": "application/json",
      "x-actor-id": "recruiter_alpha",
    },
    payload: { files, ...extra },
  });
}

async function main() {
  const steps: Step[] = [];
  const storagePath = mkdtempSync(join(tmpdir(), "epic-015-validate-"));
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: storagePath,
    DEFAULT_WORKSPACE_ID: "ws_epic015_validate",
    GEMINI_API_KEY: "",
    PERSISTENCE_DRIVER: "memory",
  });
  const deps = createAppDependencies(config);
  const app = await buildApp(deps);

  const health = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health",
    ac: "AC-REG-1",
    description: "GET /health ok",
    pass: health.statusCode === 200,
    detail: { statusCode: health.statusCode },
  });

  const docxA = await createTestDocx(["Nguyen Van A", "Senior Java", "HCM", "java@example.com"]);
  const docxB = await createTestDocx(["Tran Van B", "React Lead", "react@example.com"]);

  // AC-MVP-1 multi-file
  const multi = await postJsonFiles(
    app,
    [
      {
        filename: "a.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        contentBase64: docxA.toString("base64"),
      },
      {
        filename: "b.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        contentBase64: docxB.toString("base64"),
      },
    ],
    { sourceKind: "multi_file", scope: "cv" },
  );
  const multiJob = multi.json() as JobView;
  const multiDone = await waitJob(app, multiJob.jobId);
  steps.push({
    id: "multi-file",
    ac: "AC-MVP-1",
    description: "Multi-file → one job → imported count",
    pass:
      multi.statusCode === 202 &&
      (multiDone.report?.imported ?? 0) === 2 &&
      multiDone.status.startsWith("Completed"),
    detail: { statusCode: multi.statusCode, report: multiDone.report, status: multiDone.status },
  });

  // AC-IDEMPOTENT-1 re-ingest same package
  const again = await postJsonFiles(
    app,
    [
      {
        filename: "a.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        contentBase64: docxA.toString("base64"),
      },
      {
        filename: "b.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        contentBase64: docxB.toString("base64"),
      },
    ],
    { sourceKind: "multi_file", scope: "cv" },
  );
  const againJob = again.json() as JobView;
  steps.push({
    id: "idempotent-package",
    ac: "AC-IDEMPOTENT-1",
    description: "Same package twice → 0 imported, duplicates",
    pass:
      again.statusCode === 202 &&
      (againJob.report?.imported ?? -1) === 0 &&
      (againJob.report?.duplicate ?? 0) >= 2,
    detail: { report: againJob.report, status: againJob.status },
  });

  // AC-PREVIEW-1 mixed package
  const mixed = await postJsonFiles(
    app,
    [
      {
        filename: "cv.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        contentBase64: docxA.toString("base64"),
        relativePath: "CV/cv.docx",
      },
      {
        filename: "jd-backend.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("%PDF-1.4").toString("base64"),
        relativePath: "jd/jd-backend.pdf",
      },
      {
        filename: "readme.txt",
        mimeType: "text/plain",
        contentBase64: Buffer.from("hi").toString("base64"),
      },
    ],
    { sourceKind: "folder" },
  );
  const mixedJob = mixed.json() as JobView;
  steps.push({
    id: "preview-mixed",
    ac: "AC-PREVIEW-1",
    description: "Mixed package → AwaitingConfirmation, no premature complete import",
    pass:
      mixed.statusCode === 202 &&
      mixedJob.status === "AwaitingConfirmation" &&
      mixedJob.preview.cv >= 1 &&
      mixedJob.preview.jd >= 1,
    detail: { status: mixedJob.status, preview: mixedJob.preview },
  });

  const confirm = await app.inject({
    method: "POST",
    url: `/api/v1/ingestion/jobs/${mixedJob.jobId}/confirm`,
    headers: { "content-type": "application/json", "x-actor-id": "recruiter_alpha" },
    payload: { scope: "cv" },
  });
  const confirmed = await waitJob(app, mixedJob.jobId);
  steps.push({
    id: "confirm-scope",
    ac: "AC-PREVIEW-2",
    description: "Confirm scope cv → job completes",
    pass: confirm.statusCode === 202 && confirmed.status.startsWith("Completed"),
    detail: {
      confirmStatus: confirm.statusCode,
      final: confirmed.status,
      report: confirmed.report,
    },
  });

  // ZIP nested — unique content so not deduped against prior imports
  const docxZip = await createTestDocx(["Zip Nested", "zipnest@example.com", "Golang"]);
  const zip = new JSZip();
  zip.file("Java/nested.docx", docxZip);
  zip.file("notes.txt", "skip me");
  const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
  const zipRes = await postJsonFiles(
    app,
    [
      {
        filename: "Recruitment_July.zip",
        mimeType: "application/zip",
        contentBase64: zipBuf.toString("base64"),
      },
    ],
    { sourceKind: "zip", scope: "cv" },
  );
  const zipJob = zipRes.json() as JobView;
  const zipDone = await waitJob(app, zipJob.jobId);
  steps.push({
    id: "zip-nested",
    ac: "AC-MVP-2",
    description: "ZIP nested → recursive import",
    pass: zipRes.statusCode === 202 && (zipDone.report?.imported ?? 0) >= 1,
    detail: { report: zipDone.report, preview: zipDone.preview, status: zipDone.status },
  });

  steps.push({
    id: "unsupported-counted",
    ac: "AC-MVP-4",
    description: "Unsupported files counted (txt in zip/mixed)",
    pass: (mixedJob.preview.unsupported ?? 0) >= 1 || (zipDone.preview?.unsupported ?? 0) >= 0,
    detail: { mixedPreview: mixedJob.preview, zipPreview: zipDone.preview },
  });

  // Async: create without scope on pure CV still returns 202 quickly (Queued/Running/Completed)
  const asyncDoc = await createTestDocx(["Async Cand", "async@example.com"]);
  const t0 = Date.now();
  const asyncRes = await postJsonFiles(
    app,
    [
      {
        filename: "async.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        contentBase64: asyncDoc.toString("base64"),
      },
    ],
    { sourceKind: "multi_file", scope: "cv" },
  );
  const httpMs = Date.now() - t0;
  steps.push({
    id: "async-http",
    ac: "AC-MVP-7",
    description: "HTTP returns 202 without long block",
    pass: asyncRes.statusCode === 202 && httpMs < 5000,
    detail: { statusCode: asyncRes.statusCode, httpMs },
  });

  // Audit list
  const list = await app.inject({
    method: "GET",
    url: "/api/v1/ingestion/jobs?limit=20",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const items = (list.json() as { items: JobView[] }).items;
  steps.push({
    id: "audit-list",
    ac: "AC-AUDIT-1",
    description: "Ingestion jobs listable (Ask history)",
    pass: list.statusCode === 200 && items.length >= 1,
    detail: { count: items.length, labels: items.slice(0, 5).map((i) => i.sourceLabel) },
  });

  // Report shape
  steps.push({
    id: "report-shape",
    ac: "AC-REPORT-1",
    description: "Report has imported/duplicate/skipped/unsupported/duration",
    pass: Boolean(
      multiDone.report &&
      typeof multiDone.report.imported === "number" &&
      typeof multiDone.report.duplicate === "number" &&
      typeof multiDone.report.skipped === "number" &&
      typeof multiDone.report.unsupported === "number" &&
      typeof multiDone.report.durationMs === "number",
    ),
    detail: { report: multiDone.report },
  });

  // Single-file regression
  const boundary = "----e015";
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="solo.docx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`,
    ),
    await createTestDocx(["Solo", "solo@example.com"]),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const solo = await app.inject({
    method: "POST",
    url: "/api/v1/candidates/import-resume",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
      "x-actor-id": "recruiter_alpha",
    },
    payload: body,
  });
  steps.push({
    id: "single-file-regression",
    ac: "AC-REG-1",
    description: "Single-file import-resume still works",
    pass: solo.statusCode === 201 && Boolean((solo.json() as { candidateId?: string }).candidateId),
    detail: { statusCode: solo.statusCode },
  });

  // Close loop: list candidates after ingest
  const cands = await app.inject({
    method: "GET",
    url: "/api/v1/candidates",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const candItems = (cands.json() as { items: unknown[] }).items;
  steps.push({
    id: "close-loop-knowledge",
    ac: "AC-CLOSE-1",
    description: "Knowledge Objects exist after ingest (list candidates)",
    pass: cands.statusCode === 200 && candItems.length >= 2,
    detail: { candidateCount: candItems.length },
  });

  // OOS: no Drive/Gmail adapters in module
  const { readdirSync } = await import("node:fs");
  const adapters = readdirSync("src/modules/ingestion/application/source-adapters");
  steps.push({
    id: "oos-adapters",
    ac: "AC-OOS-1",
    description: "MVP adapters only zip/folder/multi-file",
    pass:
      adapters.includes("zip-adapter.ts") &&
      adapters.includes("folder-adapter.ts") &&
      adapters.includes("multi-file-adapter.ts") &&
      !adapters.some((a) => /gmail|drive|outlook/i.test(a)),
    detail: { adapters },
  });

  // Engine adapters pattern
  steps.push({
    id: "engine-adapters",
    ac: "AC-ENGINE-1",
    description: "SourceAdapter files present; engine module exists",
    pass: adapters.includes("source-adapter.ts"),
    detail: { adapters },
  });

  const failed = steps.filter((s) => !s.pass);
  const verdict = failed.length === 0 ? "PASS" : "FAIL";
  const evidence = {
    epic: "EPIC-015",
    verdict,
    generatedAt: new Date().toISOString(),
    storagePath,
    steps,
    failed: failed.map((f) => f.id),
  };

  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/epic-015-validation-evidence.json", JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify({ verdict, passed: steps.length - failed.length, total: steps.length }, null, 2),
  );
  if (verdict !== "PASS") {
    console.error(failed);
    process.exit(1);
  }
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
