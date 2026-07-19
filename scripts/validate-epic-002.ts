/**
 * EPIC-002 runtime validation — in-process Fastify inject.
 * Evidence: reports/epic-002-validation-evidence.json
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

async function main() {
  const steps: Step[] = [];
  const storagePath = mkdtempSync(join(tmpdir(), "epic-002-validate-"));
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: storagePath,
    DEFAULT_WORKSPACE_ID: "ws_epic002_validate",
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

  // AC-3 create (no source in body → manual)
  const created = await app.inject({
    method: "POST",
    url: "/api/v1/jobs",
    payload: {
      title: "Validate Platform Engineer",
      company: "Validate Co",
      location: "Remote",
      employmentType: "full_time",
      salaryMin: 1500,
      salaryMax: 2500,
      status: "Open",
      notes: "initial note",
      description: "Build recruiter platform",
      requirements: "TypeScript",
      benefits: "Remote",
    },
  });
  const job = created.json() as {
    id?: string;
    source?: string;
    notes?: string;
    title?: string;
  };
  steps.push({
    id: "create-manual",
    ac: "AC-3",
    description: "Create Job (manual) works without sending source",
    pass: created.statusCode === 201 && Boolean(job.id),
    detail: { statusCode: created.statusCode, id: job.id },
  });
  steps.push({
    id: "source-default",
    ac: "AC-7",
    description: "Create without source → system assigns manual",
    pass: job.source === "manual",
    detail: { source: job.source },
  });

  const jobId = job.id!;

  // AC-1 list
  const list = await app.inject({
    method: "GET",
    url: "/api/v1/jobs?sort=updated",
  });
  const listBody = list.json() as {
    items: Array<{
      title: string;
      company: string;
      location: string;
      employmentType: string;
      status: string;
      updatedAt: string;
      source: string;
    }>;
  };
  const sample = listBody.items.find((i) => i.title.includes("Validate Platform"));
  steps.push({
    id: "list",
    ac: "AC-1",
    description: "Job List returns MVP columns",
    pass:
      list.statusCode === 200 &&
      sample != null &&
      "title" in sample &&
      "company" in sample &&
      "location" in sample &&
      "employmentType" in sample &&
      "status" in sample &&
      "updatedAt" in sample,
    detail: { statusCode: list.statusCode, sample },
  });

  // AC-2 detail
  const detail = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` });
  const d = detail.json() as Record<string, unknown>;
  const detailKeys = [
    "title",
    "company",
    "description",
    "requirements",
    "benefits",
    "salaryMin",
    "salaryMax",
    "notes",
    "source",
    "createdAt",
    "updatedAt",
  ];
  steps.push({
    id: "detail",
    ac: "AC-2",
    description: "Job Detail payload has intelligence sections fields",
    pass: detail.statusCode === 200 && detailKeys.every((k) => k in d),
    detail: {
      statusCode: detail.statusCode,
      keys: Object.keys(d),
      source: d.source,
      notes: d.notes,
    },
  });

  // AC-4 edit + save
  const patch = await app.inject({
    method: "PATCH",
    url: `/api/v1/jobs/${jobId}`,
    payload: {
      title: "Validate Platform Engineer II",
      company: "Validate Co Intl",
      location: "HCM",
      employmentType: "contract",
      salaryMin: 2000,
      salaryMax: 3000,
      status: "Paused",
      notes: "updated note",
    },
  });
  const patched = patch.json() as Record<string, unknown>;
  steps.push({
    id: "edit",
    ac: "AC-4",
    description: "Edit + Save allowed fields",
    pass:
      patch.statusCode === 200 &&
      patched.title === "Validate Platform Engineer II" &&
      patched.notes === "updated note" &&
      patched.status === "Paused" &&
      patched.source === "manual",
    detail: { statusCode: patch.statusCode, body: patched },
  });

  const reload = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` });
  const reloaded = reload.json() as Record<string, unknown>;
  steps.push({
    id: "persist",
    ac: "AC-4",
    description: "Edits remain after reload; metadata source unchanged",
    pass:
      reload.statusCode === 200 &&
      reloaded.title === "Validate Platform Engineer II" &&
      reloaded.notes === "updated note" &&
      reloaded.source === "manual" &&
      reloaded.createdAt === d.createdAt,
    detail: {
      statusCode: reload.statusCode,
      source: reloaded.source,
      createdAt: reloaded.createdAt,
      updatedAt: reloaded.updatedAt,
    },
  });

  // Source immutability
  const sourceAttempt = await app.inject({
    method: "PATCH",
    url: `/api/v1/jobs/${jobId}`,
    payload: { source: "import" },
  });
  const afterSource = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` });
  steps.push({
    id: "source-immutable",
    ac: "AC-7",
    description: "PATCH source → 400 and data unchanged",
    pass:
      sourceAttempt.statusCode === 400 &&
      (afterSource.json() as { source?: string }).source === "manual",
    detail: {
      statusCode: sourceAttempt.statusCode,
      body: sourceAttempt.json(),
      sourceAfter: (afterSource.json() as { source?: string }).source,
    },
  });

  // Second job for search/sort
  await app.inject({
    method: "POST",
    url: "/api/v1/jobs",
    payload: { title: "Other Role", company: "Other Corp", status: "Open" },
  });

  const searchTitle = await app.inject({
    method: "GET",
    url: "/api/v1/jobs?q=Platform%20Engineer",
  });
  const searchCompany = await app.inject({
    method: "GET",
    url: "/api/v1/jobs?q=Other%20Corp",
  });
  const searchEmpty = await app.inject({
    method: "GET",
    url: "/api/v1/jobs?q=zzzz-no-job",
  });
  steps.push({
    id: "search",
    ac: "AC-5",
    description: "Search by title and company; empty → []",
    pass:
      searchTitle.statusCode === 200 &&
      (searchTitle.json() as { items: unknown[] }).items.length >= 1 &&
      searchCompany.statusCode === 200 &&
      (searchCompany.json() as { items: unknown[] }).items.length === 1 &&
      searchEmpty.statusCode === 200 &&
      (searchEmpty.json() as { items: unknown[] }).items.length === 0,
    detail: {
      byTitle: (searchTitle.json() as { total: number }).total,
      byCompany: (searchCompany.json() as { total: number }).total,
      empty: (searchEmpty.json() as { items: unknown[] }).items.length,
    },
  });

  await app.inject({
    method: "PATCH",
    url: `/api/v1/jobs/${jobId}`,
    payload: { notes: "touch for sort" },
  });
  const sortUpdated = await app.inject({
    method: "GET",
    url: "/api/v1/jobs?sort=updated",
  });
  const sortCreated = await app.inject({
    method: "GET",
    url: "/api/v1/jobs?sort=created",
  });
  steps.push({
    id: "sort",
    ac: "AC-6",
    description: "Sort by updated/created works",
    pass:
      sortUpdated.statusCode === 200 &&
      sortCreated.statusCode === 200 &&
      (sortUpdated.json() as { items: { id: string }[] }).items[0]?.id === jobId,
    detail: {
      updatedFirst: (sortUpdated.json() as { items: { id: string }[] }).items[0]?.id,
      createdFirst: (sortCreated.json() as { items: { id: string }[] }).items[0]?.id,
    },
  });

  // AC-8 Candidate Workspace smoke
  const candList = await app.inject({ method: "GET", url: "/api/v1/candidates?ready=true" });
  steps.push({
    id: "candidate-workspace",
    ac: "AC-8",
    description: "Candidate Workspace list API still responds",
    pass:
      candList.statusCode === 200 && Array.isArray((candList.json() as { items: unknown }).items),
    detail: {
      statusCode: candList.statusCode,
      total: (candList.json() as { total?: number }).total,
    },
  });

  // AC-9 Import Resume
  const docx = await createTestDocx(["Epic002 Cand", "e002@example.com", "Rust"]);
  const boundary = "----e002";
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="c.docx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`,
    ),
    docx,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const imported = await app.inject({
    method: "POST",
    url: "/api/v1/candidates/import-resume",
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    payload: body,
  });
  const candidateId = (imported.json() as { candidateId?: string }).candidateId;
  steps.push({
    id: "import-resume",
    ac: "AC-9",
    description: "Resume Import has no regression",
    pass: imported.statusCode === 201 && Boolean(candidateId),
    detail: { statusCode: imported.statusCode, candidateId },
  });

  // Workspace still works after import
  if (candidateId) {
    const ws = await app.inject({ method: "GET", url: `/api/v1/candidates/${candidateId}` });
    steps.push({
      id: "candidate-detail",
      ac: "AC-8",
      description: "Candidate Detail workspace still works after import",
      pass: ws.statusCode === 200,
      detail: { statusCode: ws.statusCode, name: (ws.json() as { name?: string }).name },
    });
  }

  const health2 = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health-after",
    ac: "AC-10",
    description: "/health still ok after Job + Candidate mutations",
    pass: health2.statusCode === 200 && (health2.json() as { status?: string }).status === "ok",
    detail: { statusCode: health2.statusCode, body: health2.json() },
  });

  const required = steps.filter((s) => s.ac);
  const requiredPass = required.every((s) => s.pass);
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

  const report = {
    epic: "EPIC-002",
    title: "Job Intelligence Foundation",
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
      note: "AC-11 (pnpm run ci) recorded separately in Validation Report",
    },
    steps,
  };

  mkdirSync("reports", { recursive: true });
  const out = join("reports", "epic-002-validation-evidence.json");
  writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ verdict: report.verdict, out, summary: report.summary }, null, 2));
  if (!requiredPass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
