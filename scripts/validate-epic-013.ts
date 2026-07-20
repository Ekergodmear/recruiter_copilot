/**
 * EPIC-013 runtime validation — Search & Discovery.
 * Evidence: reports/epic-013-validation-evidence.json
 */
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp, createAppDependencies } from "../src/app/server.js";
import { AppConfig } from "../src/shared/config/index.js";
import { createTestDocx } from "../tests/helpers/create-test-docx.js";
import type { SearchHit } from "../src/modules/search/domain/types.js";

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
  filename: string,
  actorId = "recruiter_alpha",
): Promise<string> {
  const docx = await createTestDocx(lines);
  const boundary = "----e013";
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`,
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

function hitKeys(h: SearchHit): string {
  return `${h.type}:${h.id}`;
}

function sameHitShape(a: SearchHit, b: SearchHit): boolean {
  return (
    a.type === b.type &&
    a.id === b.id &&
    typeof a.title === typeof b.title &&
    typeof a.subtitle === typeof b.subtitle &&
    (a.score === null) === (b.score === null) &&
    typeof a.meta === typeof b.meta
  );
}

async function main() {
  const steps: Step[] = [];
  const storagePath = mkdtempSync(join(tmpdir(), "epic-013-validate-"));
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: storagePath,
    DEFAULT_WORKSPACE_ID: "ws_epic013_validate",
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

  // Seed
  const c1 = await importCandidate(
    app,
    ["E013 Alice", "e013a@example.com", "React", "5 years of experience", "English B2"],
    "a.docx",
  );
  const c2 = await importCandidate(
    app,
    ["E013 Bob", "e013b@example.com", "Java", "8 years of experience", "English C1"],
    "b.docx",
  );
  steps.push({
    id: "seed-candidates",
    ac: "AC-12",
    description: "Resume Import seeds candidates for search validation",
    pass: Boolean(c1 && c2),
    detail: { c1, c2 },
  });

  const jobOpen = await app.inject({
    method: "POST",
    url: "/api/v1/jobs",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: {
      title: "React Engineer E013",
      company: "SearchValidate Co",
      status: "Open",
      salaryMin: 1000,
      salaryMax: 3000,
    },
  });
  const jobId = (jobOpen.json() as { id: string }).id;
  await app.inject({
    method: "PATCH",
    url: `/api/v1/jobs/${jobId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { skills: ["React"] },
  });
  const jobPaused = await app.inject({
    method: "POST",
    url: "/api/v1/jobs",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { title: "Java Lead E013", company: "Other Co", status: "Paused" },
  });
  const pausedId = (jobPaused.json() as { id: string }).id;
  await app.inject({
    method: "PATCH",
    url: `/api/v1/jobs/${pausedId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { skills: ["Java"] },
  });

  const rel = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { candidateId: c1, jobId },
  });
  const relationshipId = (rel.json() as { id: string }).id;
  await app.inject({
    method: "PATCH",
    url: `/api/v1/relationships/${relationshipId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { stage: "Screening" },
  });

  // AC-1 SearchService exists (wired via deps)
  steps.push({
    id: "search-service",
    ac: "AC-1",
    description: "SearchService is wired and callable via API",
    pass: typeof deps.searchService?.search === "function",
    detail: { hasSearch: typeof deps.searchService?.search === "function" },
  });

  // AC-2 Global Search
  const global = await app.inject({
    method: "GET",
    url: "/api/v1/search?q=React",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const globalItems = (global.json() as { items: SearchHit[] }).items;
  steps.push({
    id: "global-search",
    ac: "AC-2",
    description: "Global Search returns Candidate and/or Job hits for q",
    pass:
      global.statusCode === 200 &&
      globalItems.some((i) => i.type === "candidate" && i.id === c1) &&
      globalItems.some((i) => i.type === "job" && i.id === jobId),
    detail: {
      statusCode: global.statusCode,
      types: globalItems.map((i) => i.type),
      ids: globalItems.map((i) => i.id),
    },
  });

  // AC-3 Candidate filters
  const candSkill = await app.inject({
    method: "GET",
    url: "/api/v1/search?type=candidate&skills=React",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const candSkillIds = (candSkill.json() as { items: SearchHit[] }).items.map((i) => i.id);
  steps.push({
    id: "candidate-filters",
    ac: "AC-3",
    description: "Candidate skills filter narrows results",
    pass: candSkill.statusCode === 200 && candSkillIds.includes(c1) && !candSkillIds.includes(c2),
    detail: { ids: candSkillIds },
  });

  // AC-4 Job filters
  const jobFilter = await app.inject({
    method: "GET",
    url: "/api/v1/search?type=job&jobStatus=Paused",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const jobItems = (jobFilter.json() as { items: SearchHit[] }).items;
  steps.push({
    id: "job-filters",
    ac: "AC-4",
    description: "Job status filter narrows results",
    pass: jobFilter.statusCode === 200 && jobItems.length === 1 && jobItems[0]!.id === pausedId,
    detail: { ids: jobItems.map((i) => i.id) },
  });

  // AC-5 Workflow filter
  const stageFilter = await app.inject({
    method: "GET",
    url: "/api/v1/search?type=candidate&stage=Screening",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const stageIds = (stageFilter.json() as { items: SearchHit[] }).items.map((i) => i.id);
  steps.push({
    id: "workflow-filter",
    ac: "AC-5",
    description: "Workflow stage filter narrows via Relationship",
    pass: stageFilter.statusCode === 200 && stageIds.length === 1 && stageIds[0] === c1,
    detail: { ids: stageIds },
  });

  // AC-6 Matching filter read-only
  const jobBeforeMatch = await app.inject({
    method: "GET",
    url: `/api/v1/jobs/${jobId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const statusBefore = (jobBeforeMatch.json() as { status: string }).status;
  const matchFilter = await app.inject({
    method: "GET",
    url: `/api/v1/search?type=candidate&jobId=${jobId}&minMatchScore=0`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const matchItems = (matchFilter.json() as { items: SearchHit[] }).items;
  const matchHit = matchItems.find((i) => i.id === c1);
  const jobAfterMatch = await app.inject({
    method: "GET",
    url: `/api/v1/jobs/${jobId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  steps.push({
    id: "matching-filter",
    ac: "AC-6",
    description: "Matching filter uses MatchingService; does not persist / mutate Job",
    pass:
      matchFilter.statusCode === 200 &&
      typeof matchHit?.score === "number" &&
      (jobAfterMatch.json() as { status: string }).status === statusBefore,
    detail: {
      score: matchHit?.score ?? null,
      statusBefore,
      statusAfter: (jobAfterMatch.json() as { status: string }).status,
    },
  });

  // AC-7 Unified result model
  const sample = globalItems[0];
  steps.push({
    id: "unified-result-model",
    ac: "AC-7",
    description: "Unified SearchHit shape (type, id, title, subtitle, score, meta)",
    pass:
      Boolean(sample) &&
      (sample!.type === "candidate" || sample!.type === "job") &&
      typeof sample!.id === "string" &&
      typeof sample!.title === "string" &&
      typeof sample!.subtitle === "string" &&
      "score" in sample! &&
      typeof sample!.meta === "object",
    detail: { keys: sample ? Object.keys(sample) : [] },
  });

  // AC-8 Saved Searches
  const saved = await app.inject({
    method: "POST",
    url: "/api/v1/search/saved",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { name: "React people", query: { type: "candidate", skills: ["React"] } },
  });
  const savedId = (saved.json() as { savedSearchId: string }).savedSearchId;
  const listed = await app.inject({
    method: "GET",
    url: "/api/v1/search/saved",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const other = await app.inject({
    method: "GET",
    url: "/api/v1/search/saved",
    headers: { "x-actor-id": "recruiter_beta" },
  });
  const del = await app.inject({
    method: "DELETE",
    url: `/api/v1/search/saved/${savedId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  steps.push({
    id: "saved-searches",
    ac: "AC-8",
    description: "Saved Searches save/list/delete; actor-owned; query definition only",
    pass:
      saved.statusCode === 201 &&
      (saved.json() as { query: { skills?: string[] } }).query.skills?.[0] === "React" &&
      (listed.json() as { total: number }).total === 1 &&
      (other.json() as { total: number }).total === 0 &&
      del.statusCode === 204,
    detail: {
      saved: saved.statusCode,
      listed: (listed.json() as { total: number }).total,
      other: (other.json() as { total: number }).total,
      delete: del.statusCode,
    },
  });

  // AC-9 Authorization
  const ghost = await app.inject({
    method: "GET",
    url: "/api/v1/search",
    headers: { "x-actor-id": "ghost_unknown" },
  });
  const viewer = await app.inject({
    method: "GET",
    url: "/api/v1/search?type=job",
    headers: { "x-actor-id": "viewer_alpha" },
  });
  steps.push({
    id: "authorization",
    ac: "AC-9",
    description: "search.read via AuthorizationService; Viewer allowed; unknown denied",
    pass:
      authz.authorize("recruiter_alpha", "search.read").allowed &&
      authz.authorize("viewer_alpha", "search.read").allowed &&
      !authz.authorize("ghost_unknown", "search.read").allowed &&
      ghost.statusCode === 403 &&
      viewer.statusCode === 200,
    detail: { ghost: ghost.statusCode, viewer: viewer.statusCode },
  });

  // AC-10 Read-only SoT
  const stageBefore = (
    await app.inject({
      method: "GET",
      url: `/api/v1/relationships/${relationshipId}`,
      headers: { "x-actor-id": "recruiter_alpha" },
    })
  ).json() as { currentStage: string };
  await app.inject({
    method: "GET",
    url: "/api/v1/search?q=React&stage=Screening",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const stageAfter = (
    await app.inject({
      method: "GET",
      url: `/api/v1/relationships/${relationshipId}`,
      headers: { "x-actor-id": "recruiter_alpha" },
    })
  ).json() as { currentStage: string };
  steps.push({
    id: "read-only",
    ac: "AC-10",
    description: "Search does not mutate Workflow / Job state",
    pass:
      stageBefore.currentStage === "Screening" &&
      stageAfter.currentStage === "Screening" &&
      (jobAfterMatch.json() as { status: string }).status === "Open",
    detail: { stageBefore: stageBefore.currentStage, stageAfter: stageAfter.currentStage },
  });

  // AC-10b Determinism
  const d1 = await app.inject({
    method: "GET",
    url: "/api/v1/search?q=E013",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const d2 = await app.inject({
    method: "GET",
    url: "/api/v1/search?q=E013",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const d1Items = (d1.json() as { items: SearchHit[]; total: number }).items;
  const d2Items = (d2.json() as { items: SearchHit[]; total: number }).items;
  const keys1 = d1Items.map(hitKeys);
  const keys2 = d2Items.map(hitKeys);
  steps.push({
    id: "determinism",
    ac: "AC-10b",
    description: "Same data + query → same result set and default order",
    pass:
      d1.statusCode === 200 &&
      d2.statusCode === 200 &&
      (d1.json() as { total: number }).total === (d2.json() as { total: number }).total &&
      JSON.stringify(keys1) === JSON.stringify(keys2),
    detail: { keys1, total: (d1.json() as { total: number }).total },
  });

  // AC-10c Pagination Stability
  const p1 = await app.inject({
    method: "GET",
    url: "/api/v1/search?q=E013&limit=1&offset=0",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const p2 = await app.inject({
    method: "GET",
    url: "/api/v1/search?q=E013&limit=1&offset=1",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const pageIds = [
    ...(p1.json() as { items: SearchHit[] }).items.map(hitKeys),
    ...(p2.json() as { items: SearchHit[] }).items.map(hitKeys),
  ];
  const fullKeys = keys1.slice(0, 2);
  steps.push({
    id: "pagination-stability",
    ac: "AC-10c",
    description: "limit/offset pages do not duplicate or skip records",
    pass:
      p1.statusCode === 200 &&
      p2.statusCode === 200 &&
      pageIds.length === 2 &&
      new Set(pageIds).size === 2 &&
      JSON.stringify(pageIds) === JSON.stringify(fullKeys),
    detail: { pageIds, fullKeys },
  });

  // Result Type Stability (reviewer non-blocker) — AC-7 / AC-10b companion
  const typeStable =
    d1Items.length === d2Items.length &&
    d1Items.every((h, i) => sameHitShape(h, d2Items[i]!)) &&
    d1Items.every((h) => h.type === "candidate" || h.type === "job");
  steps.push({
    id: "result-type-stability",
    ac: "AC-7",
    description:
      "Result Type Stability: same query → same hit types and shape (candidate|job) across runs",
    pass: typeStable,
    detail: {
      types1: d1Items.map((h) => h.type),
      types2: d2Items.map((h) => h.type),
    },
  });

  // AC-11 SoT preserved — no search entity store of candidates/jobs; saved search is query-only
  const savedDef = await app.inject({
    method: "POST",
    url: "/api/v1/search/saved",
    headers: { "x-actor-id": "recruiter_alpha" },
    payload: { name: "check", query: { q: "E013" } },
  });
  const savedBody = savedDef.json() as { query: Record<string, unknown>; items?: unknown };
  steps.push({
    id: "sot-preserved",
    ac: "AC-11",
    description: "Saved Search stores query definition only — not SoT snapshots",
    pass:
      savedDef.statusCode === 201 &&
      savedBody.query != null &&
      savedBody.items === undefined &&
      !("candidates" in savedBody) &&
      !("jobs" in savedBody),
    detail: { keys: Object.keys(savedBody) },
  });

  // AC-12 Regression
  const match = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
    headers: { "x-actor-id": "recruiter_alpha" },
  });
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
  const audit = await app.inject({
    method: "GET",
    url: "/api/v1/audit",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  const intg = await app.inject({
    method: "GET",
    url: "/api/v1/integrations",
    headers: { "x-actor-id": "recruiter_alpha" },
  });
  steps.push({
    id: "regression",
    ac: "AC-12",
    description: "Authorized happy-path regression (Match/Analytics/Notif/Audit/Integrations)",
    pass:
      jobOpen.statusCode === 201 &&
      rel.statusCode === 201 &&
      match.statusCode === 200 &&
      analytics.statusCode === 200 &&
      notif.statusCode === 200 &&
      audit.statusCode === 200 &&
      intg.statusCode === 200,
    detail: {
      job: jobOpen.statusCode,
      rel: rel.statusCode,
      match: match.statusCode,
      analytics: analytics.statusCode,
      notifications: notif.statusCode,
      audit: audit.statusCode,
      integrations: intg.statusCode,
    },
  });

  const healthAfter = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health-after",
    ac: "AC-13",
    description: "GET /health still public after search checks",
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
    "AC-10",
    "AC-10b",
    "AC-10c",
    "AC-11",
    "AC-12",
    "AC-13",
  ];
  const acceptanceCriteria = acIds.map((ac) => ({
    ac,
    pass: steps.filter((s) => s.ac === ac).every((s) => s.pass) && steps.some((s) => s.ac === ac),
  }));

  const report = {
    epic: "EPIC-013",
    title: "Search & Discovery",
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
      orderingConvention: "type asc, then id asc; Matching filter: score desc then id asc",
      paginationConvention: "sort full filtered set, then slice limit/offset",
    },
    steps,
  };

  mkdirSync("reports", { recursive: true });
  const out = join("reports", "epic-013-validation-evidence.json");
  writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ verdict: report.verdict, out, summary: report.summary }, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
