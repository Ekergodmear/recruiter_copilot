/**
 * EPIC-005 runtime validation — Matching Foundation.
 * Evidence: reports/epic-005-validation-evidence.json
 */
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp, createAppDependencies } from "../src/app/server.js";
import { AppConfig } from "../src/shared/config/index.js";
import { createTestDocx } from "../tests/helpers/create-test-docx.js";
import { computeMatchingResult } from "../src/modules/matching/domain/matching-engine.js";
import type {
  MatchingCandidateInput,
  MatchingJobInput,
  MatchingResult,
} from "../src/modules/matching/domain/types.js";

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
  const boundary = "----e005";
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
  const storagePath = mkdtempSync(join(tmpdir(), "epic-005-validate-"));
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: storagePath,
    DEFAULT_WORKSPACE_ID: "ws_epic005_validate",
  });
  const app = await buildApp(createAppDependencies(config));

  const health = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health",
    ac: "AC-13",
    description: "GET /health returns status ok",
    pass: health.statusCode === 200 && (health.json() as { status?: string }).status === "ok",
    detail: { statusCode: health.statusCode, body: health.json() },
  });

  const c1 = await importCandidate(app, [
    "E005 Cand",
    "e005@example.com",
    "React",
    "TypeScript",
    "5 years of experience",
    "English B2",
  ]);
  steps.push({
    id: "import",
    ac: "AC-12",
    description: "Resume Import works (no regression)",
    pass: Boolean(c1),
    detail: { c1 },
  });

  await app.inject({
    method: "PATCH",
    url: `/api/v1/candidates/${c1}`,
    payload: { salary: "1800" },
  });

  const jobRes = await app.inject({
    method: "POST",
    url: "/api/v1/jobs",
    payload: {
      title: "E005 Job",
      company: "E005 Co",
      status: "Open",
      salaryMin: 1000,
      salaryMax: 2500,
      currency: "USD",
    },
  });
  const jobId = (jobRes.json() as { id: string }).id;
  await app.inject({
    method: "PATCH",
    url: `/api/v1/jobs/${jobId}`,
    payload: {
      skills: ["React", "TypeScript", "Node"],
      experienceYears: 5,
      englishRequirement: "B2",
    },
  });
  steps.push({
    id: "job-create",
    ac: "AC-9",
    description: "Job create/edit still works (Job Workspace)",
    pass: jobRes.statusCode === 201,
    detail: { jobId },
  });

  // AC-1 generate Matching Result
  const match1 = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
  });
  const body1 = match1.json() as MatchingResult;
  steps.push({
    id: "generate",
    ac: "AC-1",
    description: "Matching Result can be generated on demand",
    pass:
      match1.statusCode === 200 &&
      Boolean(body1.evidence) &&
      typeof body1.overallMatchScore === "number",
    detail: { statusCode: match1.statusCode, score: body1.overallMatchScore },
  });

  // AC-2 / AC-3 skills
  const matchedLower = (body1.evidence?.matchedSkills ?? []).map((s) => s.toLowerCase());
  const missingLower = (body1.evidence?.missingSkills ?? []).map((s) => s.toLowerCase());
  steps.push({
    id: "matched-skills",
    ac: "AC-2",
    description: "Matched Skills are correct",
    pass: matchedLower.includes("react") && matchedLower.includes("typescript"),
    detail: { matchedSkills: body1.evidence?.matchedSkills },
  });
  steps.push({
    id: "missing-skills",
    ac: "AC-3",
    description: "Missing Skills are correct",
    pass: missingLower.includes("node"),
    detail: { missingSkills: body1.evidence?.missingSkills },
  });

  // AC-4 experience
  steps.push({
    id: "experience",
    ac: "AC-4",
    description: "Experience comparison is correct",
    pass:
      body1.evidence?.experience?.status === "meets" &&
      body1.evidence.experience.actualYears === 5 &&
      body1.evidence.experience.requiredYears === 5,
    detail: { experience: body1.evidence?.experience },
  });

  // AC-5 english
  steps.push({
    id: "english",
    ac: "AC-5",
    description: "English comparison is correct",
    pass: body1.evidence?.english?.status === "meets",
    detail: { english: body1.evidence?.english },
  });

  // AC-6 salary
  steps.push({
    id: "salary",
    ac: "AC-6",
    description: "Salary comparison is correct",
    pass:
      body1.evidence?.salary?.status === "within_budget" &&
      body1.evidence.salary.expectedSalary === 1800,
    detail: { salary: body1.evidence?.salary },
  });

  // AC-7 determinism — same input three times
  const match2 = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
  });
  const match3 = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
  });
  const body2 = match2.json() as MatchingResult;
  const body3 = match3.json() as MatchingResult;
  steps.push({
    id: "deterministic",
    ac: "AC-7",
    description: "Overall Match Score is deterministic (same input → same output)",
    pass:
      body1.overallMatchScore === body2.overallMatchScore &&
      body2.overallMatchScore === body3.overallMatchScore &&
      JSON.stringify(body1.evidence) === JSON.stringify(body2.evidence) &&
      JSON.stringify(body2.evidence) === JSON.stringify(body3.evidence),
    detail: {
      scores: [body1.overallMatchScore, body2.overallMatchScore, body3.overallMatchScore],
    },
  });

  // Score from documented evidence only
  const expectedFromBreakdown = Math.round(
    (body1.evidence.skillsDimensionScore * body1.weights.skills +
      body1.evidence.experience.dimensionScore * body1.weights.experience +
      body1.evidence.english.dimensionScore * body1.weights.english +
      body1.evidence.salary.dimensionScore * body1.weights.salary) *
      100,
  );
  steps.push({
    id: "score-from-evidence",
    description: "Overall score equals weighted sum of documented evidence dimensions",
    pass: body1.overallMatchScore === expectedFromBreakdown,
    detail: {
      overallMatchScore: body1.overallMatchScore,
      expectedFromBreakdown,
      weights: body1.weights,
    },
  });

  // Monotonicity (reviewer note — not a Spec AC)
  const baseCand: MatchingCandidateInput = {
    candidateId: "c_mono",
    skills: ["React", "TypeScript"],
    yearsOfExperience: 5,
    englishLevel: "B2",
    expectedSalary: 1500,
  };
  const baseJob: MatchingJobInput = {
    jobId: "j_mono",
    skills: ["React", "TypeScript", "Node"],
    experienceYears: 5,
    englishRequirement: "B2",
    salaryMin: 1000,
    salaryMax: 2000,
    currency: "USD",
  };
  const t = "2026-07-19T00:00:00.000Z";
  const scoreBase = computeMatchingResult(baseCand, baseJob, t).overallMatchScore;
  const scoreAddSkill = computeMatchingResult(
    { ...baseCand, skills: ["React", "TypeScript", "Node"] },
    baseJob,
    t,
  ).overallMatchScore;
  const scoreRemoveSkill = computeMatchingResult(
    { ...baseCand, skills: ["React"] },
    baseJob,
    t,
  ).overallMatchScore;
  steps.push({
    id: "monotonicity",
    description:
      "Score monotonicity: adding a matched skill does not decrease; removing does not increase",
    pass: scoreAddSkill >= scoreBase && scoreRemoveSkill <= scoreBase,
    detail: { scoreBase, scoreAddSkill, scoreRemoveSkill },
  });

  // Read-only side effects
  const candBefore = await app.inject({ method: "GET", url: `/api/v1/candidates/${c1}` });
  const nameBefore = (candBefore.json() as { name?: string }).name;
  const jobBefore = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` });
  const titleBefore = (jobBefore.json() as { title?: string }).title;

  const relCreate = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    payload: { candidateId: c1, jobId },
  });
  const relId = (relCreate.json() as { id: string }).id;
  const stageBefore = (relCreate.json() as { currentStage: string }).currentStage;
  const historyLenBefore = (relCreate.json() as { stageHistory: unknown[] }).stageHistory.length;

  await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
  });

  const candAfter = await app.inject({ method: "GET", url: `/api/v1/candidates/${c1}` });
  const jobAfter = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` });
  const relAfter = await app.inject({
    method: "GET",
    url: `/api/v1/relationships/${relId}`,
  });
  const relBody = relAfter.json() as {
    currentStage: string;
    stageHistory: unknown[];
  };
  steps.push({
    id: "read-only",
    description: "Matching does not mutate Candidate, Job, Relationship, or Workflow",
    pass:
      (candAfter.json() as { name?: string }).name === nameBefore &&
      (jobAfter.json() as { title?: string }).title === titleBefore &&
      relBody.currentStage === stageBefore &&
      relBody.stageHistory.length === historyLenBefore,
    detail: {
      nameBefore,
      nameAfter: (candAfter.json() as { name?: string }).name,
      titleBefore,
      titleAfter: (jobAfter.json() as { title?: string }).title,
      stageBefore,
      stageAfter: relBody.currentStage,
      historyLenBefore,
      historyLenAfter: relBody.stageHistory.length,
    },
  });

  // AC-8 Candidate Workspace
  const candList = await app.inject({ method: "GET", url: "/api/v1/candidates" });
  steps.push({
    id: "candidate-workspace",
    ac: "AC-8",
    description: "Candidate Workspace has no regression",
    pass: candAfter.statusCode === 200 && candList.statusCode === 200,
    detail: { detail: candAfter.statusCode, list: candList.statusCode },
  });

  // AC-9 Job Workspace (also covered by job-create)
  const jobList = await app.inject({ method: "GET", url: "/api/v1/jobs" });
  steps.push({
    id: "job-workspace",
    ac: "AC-9",
    description: "Job Workspace has no regression",
    pass:
      jobAfter.statusCode === 200 &&
      jobList.statusCode === 200 &&
      (jobAfter.json() as { source?: string }).source === "manual",
    detail: { get: jobAfter.statusCode, list: jobList.statusCode },
  });

  // AC-10 Relationship Foundation
  const byCand = await app.inject({
    method: "GET",
    url: `/api/v1/candidates/${c1}/relationships`,
  });
  const dup = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    payload: { candidateId: c1, jobId },
  });
  steps.push({
    id: "relationship-foundation",
    ac: "AC-10",
    description: "Relationship Foundation has no regression",
    pass: byCand.statusCode === 200 && dup.statusCode === 409 && relCreate.statusCode === 201,
    detail: {
      list: byCand.statusCode,
      create: relCreate.statusCode,
      duplicate: dup.statusCode,
    },
  });

  // AC-11 Workflow Foundation
  const moved = await app.inject({
    method: "PATCH",
    url: `/api/v1/relationships/${relId}`,
    payload: { stage: "Screening" },
  });
  const movedBody = moved.json() as {
    currentStage: string;
    stageHistory: unknown[];
  };
  steps.push({
    id: "workflow-foundation",
    ac: "AC-11",
    description: "Workflow Foundation has no regression",
    pass:
      moved.statusCode === 200 &&
      movedBody.currentStage === "Screening" &&
      movedBody.stageHistory.length === 2,
    detail: {
      currentStage: movedBody.currentStage,
      historyLen: movedBody.stageHistory.length,
    },
  });

  const healthAfter = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health-after",
    ac: "AC-13",
    description: "/health still ok after matching",
    pass:
      healthAfter.statusCode === 200 && (healthAfter.json() as { status?: string }).status === "ok",
    detail: { statusCode: healthAfter.statusCode },
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
    "AC-11",
    "AC-12",
    "AC-13",
  ] as const;
  const acceptanceCriteria = acIds.map((ac) => ({
    ac,
    pass: steps.some((s) => s.ac === ac && s.pass) && !steps.some((s) => s.ac === ac && !s.pass),
  }));

  const evidence = {
    epic: "EPIC-005",
    title: "Matching Foundation",
    generatedAt: new Date().toISOString(),
    storagePath,
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    allStepsPass: failed.length === 0,
    summary: {
      totalSteps: steps.length,
      passed: steps.filter((s) => s.pass).length,
      failed,
      acceptanceCriteria,
      note: "AC-14 (pnpm run ci) recorded separately in Validation Report",
    },
    steps,
  };

  mkdirSync("reports", { recursive: true });
  const out = join("reports", "epic-005-validation-evidence.json");
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
