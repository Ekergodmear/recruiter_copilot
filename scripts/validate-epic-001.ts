/**
 * EPIC-001 runtime validation — in-process Fastify inject (no long-lived server).
 * Evidence written to reports/epic-001-validation-evidence.json
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

async function importDocx(
  app: Awaited<ReturnType<typeof buildApp>>,
  lines: string[],
): Promise<{ statusCode: number; candidateId: string | null; body: unknown }> {
  const docx = await createTestDocx(lines);
  const boundary = "----epic001validate";
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="v.docx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`,
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
  const json = res.json() as { candidateId?: string };
  return {
    statusCode: res.statusCode,
    candidateId: json.candidateId ?? null,
    body: json,
  };
}

async function main() {
  const steps: Step[] = [];
  const storagePath = mkdtempSync(join(tmpdir(), "epic-001-validate-"));
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: storagePath,
    DEFAULT_WORKSPACE_ID: "ws_epic001_validate",
  });
  const app = await buildApp(createAppDependencies(config));

  // AC-7 health
  const health = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health",
    ac: "AC-7",
    description: "GET /health returns status ok",
    pass: health.statusCode === 200 && (health.json() as { status?: string }).status === "ok",
    detail: { statusCode: health.statusCode, body: health.json() },
  });

  // AC-6 import
  const importedA = await importDocx(app, [
    "Validate Alpha",
    "alpha.validate@example.com",
    "+84901111111",
    "TypeScript",
    "4 years of experience",
  ]);
  steps.push({
    id: "import-a",
    ac: "AC-6",
    description: "Import Resume succeeds (candidate created)",
    pass: importedA.statusCode === 201 && Boolean(importedA.candidateId),
    detail: { statusCode: importedA.statusCode, candidateId: importedA.candidateId },
  });

  const idA = importedA.candidateId!;
  await app.inject({ method: "POST", url: `/api/v1/candidates/${idA}/mark-ready` });

  const importedB = await importDocx(app, [
    "Validate Beta",
    "beta.validate@example.com",
    "Python",
    "2 years of experience",
  ]);
  const idB = importedB.candidateId!;
  await app.inject({ method: "POST", url: `/api/v1/candidates/${idB}/mark-ready` });
  steps.push({
    id: "import-b",
    ac: "AC-6",
    description: "Second Import Resume succeeds (no regression)",
    pass: importedB.statusCode === 201 && Boolean(idB),
    detail: { statusCode: importedB.statusCode, candidateId: idB },
  });

  // AC-1 list
  const list = await app.inject({
    method: "GET",
    url: "/api/v1/candidates?ready=true&sort=updated",
  });
  const listBody = list.json() as {
    items: Array<{
      candidateId: string;
      name: string;
      currentTitle: string;
      company: string;
      experience: string;
      english: string;
      updatedAt: string;
    }>;
  };
  const sample = listBody.items[0];
  const listHasColumns =
    sample != null &&
    "name" in sample &&
    "currentTitle" in sample &&
    "company" in sample &&
    "experience" in sample &&
    "english" in sample &&
    "updatedAt" in sample;
  steps.push({
    id: "list",
    ac: "AC-1",
    description: "Candidate List returns MVP columns",
    pass: list.statusCode === 200 && listHasColumns && listBody.items.length >= 2,
    detail: {
      statusCode: list.statusCode,
      total: listBody.items.length,
      sampleColumns: sample
        ? {
            name: sample.name,
            currentTitle: sample.currentTitle,
            company: sample.company,
            experience: sample.experience,
            english: sample.english,
            updatedAt: sample.updatedAt,
          }
        : null,
    },
  });

  // AC-2 detail
  const detail = await app.inject({ method: "GET", url: `/api/v1/candidates/${idA}` });
  const detailBody = detail.json() as Record<string, unknown>;
  const detailSections = [
    "name",
    "phone",
    "email",
    "skills",
    "experience",
    "education",
    "english",
    "salary",
    "note",
  ];
  steps.push({
    id: "detail",
    ac: "AC-2",
    description: "Candidate Detail workspace payload present",
    pass: detail.statusCode === 200 && detailSections.every((k) => k in detailBody),
    detail: {
      statusCode: detail.statusCode,
      keys: Object.keys(detailBody),
      name: detailBody.name,
      email: detailBody.email,
    },
  });

  // AC-3 edit
  const patch = await app.inject({
    method: "PATCH",
    url: `/api/v1/candidates/${idA}`,
    payload: {
      name: "Validate Alpha Edited",
      phone: "+84902222222",
      email: "alpha.edited@example.com",
      salary: "2500 USD",
      note: "EPIC-001 validation note",
    },
  });
  const patched = patch.json() as {
    name?: string;
    phone?: string;
    email?: string;
    salary?: string;
    note?: string;
  };
  steps.push({
    id: "edit",
    ac: "AC-3",
    description: "Recruiter can edit allowed fields",
    pass:
      patch.statusCode === 200 &&
      patched.name === "Validate Alpha Edited" &&
      patched.salary === "2500 USD" &&
      patched.note === "EPIC-001 validation note",
    detail: { statusCode: patch.statusCode, body: patched },
  });

  // AC-4 persist (reload GET)
  const reload = await app.inject({ method: "GET", url: `/api/v1/candidates/${idA}` });
  const reloaded = reload.json() as {
    name?: string;
    phone?: string;
    email?: string;
    salary?: string;
    note?: string;
  };
  steps.push({
    id: "persist",
    ac: "AC-4",
    description: "Edits remain after reload (repository persist)",
    pass:
      reload.statusCode === 200 &&
      reloaded.name === "Validate Alpha Edited" &&
      reloaded.phone === "+84902222222" &&
      reloaded.email === "alpha.edited@example.com" &&
      reloaded.salary === "2500 USD" &&
      reloaded.note === "EPIC-001 validation note",
    detail: { statusCode: reload.statusCode, body: reloaded },
  });

  // AC-5 search name + email
  const searchName = await app.inject({
    method: "GET",
    url: "/api/v1/candidates?ready=true&q=Validate%20Beta",
  });
  const searchEmail = await app.inject({
    method: "GET",
    url: "/api/v1/candidates?ready=true&q=beta.validate@",
  });
  const searchEmpty = await app.inject({
    method: "GET",
    url: "/api/v1/candidates?ready=true&q=no-such-candidate-zzzz",
  });
  steps.push({
    id: "search",
    ac: "AC-5",
    description: "Search by name and email; empty query returns []",
    pass:
      searchName.statusCode === 200 &&
      (searchName.json() as { items: unknown[] }).items.length === 1 &&
      searchEmail.statusCode === 200 &&
      (searchEmail.json() as { items: unknown[] }).items.length === 1 &&
      searchEmpty.statusCode === 200 &&
      (searchEmpty.json() as { items: unknown[] }).items.length === 0,
    detail: {
      byName: searchName.json(),
      byEmail: searchEmail.json(),
      empty: searchEmpty.json(),
    },
  });

  // Sort
  await app.inject({
    method: "PATCH",
    url: `/api/v1/candidates/${idB}`,
    payload: { note: "touch for sort" },
  });
  const sortUpdated = await app.inject({
    method: "GET",
    url: "/api/v1/candidates?ready=true&sort=updated",
  });
  const sortCreated = await app.inject({
    method: "GET",
    url: "/api/v1/candidates?ready=true&sort=created",
  });
  const updatedFirst = (sortUpdated.json() as { items: { candidateId: string }[] }).items[0]
    ?.candidateId;
  steps.push({
    id: "sort",
    description: "Sort by updated/created works",
    pass: sortUpdated.statusCode === 200 && sortCreated.statusCode === 200 && updatedFirst === idB,
    detail: {
      sortUpdatedFirst: updatedFirst,
      sortCreatedFirst: (sortCreated.json() as { items: { candidateId: string }[] }).items[0]
        ?.candidateId,
    },
  });

  // Edge (non-blocking TL notes)
  const missing = await app.inject({
    method: "PATCH",
    url: "/api/v1/candidates/candidate_doesnotexist999",
    payload: { note: "x" },
  });
  const badEmail = await app.inject({
    method: "PATCH",
    url: `/api/v1/candidates/${idA}`,
    payload: { email: "not-an-email" },
  });
  steps.push({
    id: "edge-404",
    description: "PATCH missing candidate → 404",
    pass: missing.statusCode === 404,
    detail: { statusCode: missing.statusCode, body: missing.json() },
  });
  steps.push({
    id: "edge-email",
    description: "PATCH invalid email → 400",
    pass: badEmail.statusCode === 400,
    detail: { statusCode: badEmail.statusCode, body: badEmail.json() },
  });

  // Health again after mutations
  const health2 = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health-after",
    ac: "AC-7",
    description: "/health still ok after workspace mutations",
    pass: health2.statusCode === 200 && (health2.json() as { status?: string }).status === "ok",
    detail: { statusCode: health2.statusCode, body: health2.json() },
  });

  const required = steps.filter((s) => s.ac);
  const requiredPass = required.every((s) => s.pass);
  const allPass = steps.every((s) => s.pass);

  const report = {
    epic: "EPIC-001",
    title: "Candidate Workspace",
    generatedAt: new Date().toISOString(),
    storagePath,
    verdict: requiredPass ? "PASS" : "FAIL",
    allStepsPass: allPass,
    summary: {
      totalSteps: steps.length,
      passed: steps.filter((s) => s.pass).length,
      failed: steps.filter((s) => !s.pass).map((s) => s.id),
      acceptanceCriteria: ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5", "AC-6", "AC-7"].map((ac) => ({
        ac,
        pass: steps.filter((s) => s.ac === ac).every((s) => s.pass),
      })),
    },
    steps,
  };

  mkdirSync("reports", { recursive: true });
  const out = join("reports", "epic-001-validation-evidence.json");
  writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ verdict: report.verdict, out, summary: report.summary }, null, 2));
  if (!requiredPass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
