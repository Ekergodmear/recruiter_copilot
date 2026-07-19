/**
 * EPIC-006 runtime validation — AI Recruiter Copilot.
 * Evidence: reports/epic-006-validation-evidence.json
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

type CopilotBody = {
  action: string;
  evidence: Record<string, unknown>;
  aiSuggestion: string;
  matchingResult?: { overallMatchScore: number };
  providerId: string;
};

async function importCandidate(
  app: Awaited<ReturnType<typeof buildApp>>,
  lines: string[],
): Promise<string> {
  const docx = await createTestDocx(lines);
  const boundary = "----e006";
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

function hasTransparency(body: CopilotBody): boolean {
  return (
    body.evidence != null &&
    typeof body.evidence === "object" &&
    typeof body.aiSuggestion === "string" &&
    body.aiSuggestion.length > 0 &&
    body.evidence.source != null
  );
}

async function main() {
  const steps: Step[] = [];
  const storagePath = mkdtempSync(join(tmpdir(), "epic-006-validate-"));
  const config = AppConfig.fromEnv({
    ...process.env,
    STORAGE_PATH: storagePath,
    DEFAULT_WORKSPACE_ID: "ws_epic006_validate",
    GEMINI_API_KEY: "",
  });
  const app = await buildApp(createAppDependencies(config));

  const health = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health",
    ac: "AC-14",
    description: "GET /health returns status ok",
    pass: health.statusCode === 200 && (health.json() as { status?: string }).status === "ok",
    detail: { statusCode: health.statusCode },
  });

  const c1 = await importCandidate(app, [
    "E006 Cand",
    "e006@example.com",
    "React",
    "TypeScript",
    "5 years of experience",
    "English B2",
  ]);
  steps.push({
    id: "import",
    ac: "AC-13",
    description: "Resume Import works (no regression)",
    pass: Boolean(c1),
    detail: { c1 },
  });

  const jobRes = await app.inject({
    method: "POST",
    url: "/api/v1/jobs",
    payload: { title: "E006 Job", company: "E006 Co", status: "Open" },
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

  const matchBefore = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
  });
  const scoreBefore = (matchBefore.json() as { overallMatchScore: number }).overallMatchScore;
  steps.push({
    id: "matching-baseline",
    ac: "AC-12",
    description: "Matching Foundation baseline available",
    pass: matchBefore.statusCode === 200 && typeof scoreBefore === "number",
    detail: { scoreBefore },
  });

  // AC-1 Explain Match grounded in evidence
  const explain1 = await app.inject({
    method: "POST",
    url: "/api/v1/copilot/explain-match",
    payload: { candidateId: c1, jobId },
  });
  const explainBody = explain1.json() as CopilotBody;
  steps.push({
    id: "explain-match",
    ac: "AC-1",
    description: "Explain Match grounded in Matching Evidence",
    pass:
      explain1.statusCode === 200 &&
      explainBody.evidence?.overallMatchScore === scoreBefore &&
      Array.isArray(explainBody.evidence?.matchedSkills) &&
      Array.isArray(explainBody.evidence?.missingSkills),
    detail: {
      statusCode: explain1.statusCode,
      overallMatchScore: explainBody.evidence?.overallMatchScore,
      matchedSkills: explainBody.evidence?.matchedSkills,
      missingSkills: explainBody.evidence?.missingSkills,
    },
  });

  // AC-1b Transparency
  steps.push({
    id: "transparency",
    ac: "AC-1b",
    description: "Response separates evidence (platform) from aiSuggestion (LLM)",
    pass:
      hasTransparency(explainBody) &&
      explainBody.evidence.overallMatchScore !== undefined &&
      typeof explainBody.aiSuggestion === "string",
    detail: {
      evidenceKeys: Object.keys(explainBody.evidence ?? {}),
      aiSuggestionPreview: String(explainBody.aiSuggestion ?? "").slice(0, 120),
      providerId: explainBody.providerId,
    },
  });

  // AC-2 score invariance
  const matchAfterExplain = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
  });
  const scoreAfter = (matchAfterExplain.json() as { overallMatchScore: number }).overallMatchScore;
  steps.push({
    id: "score-invariant",
    ac: "AC-2",
    description: "Explain Match does not change Overall Match Score",
    pass:
      scoreAfter === scoreBefore && explainBody.matchingResult?.overallMatchScore === scoreBefore,
    detail: { scoreBefore, scoreAfter, embedded: explainBody.matchingResult?.overallMatchScore },
  });

  // AC-3 Candidate Summary
  const candSum = await app.inject({
    method: "POST",
    url: "/api/v1/copilot/summarize-candidate",
    payload: { candidateId: c1 },
  });
  const candSumBody = candSum.json() as CopilotBody;
  steps.push({
    id: "summarize-candidate",
    ac: "AC-3",
    description: "Summarize Candidate from Candidate Intelligence",
    pass:
      candSum.statusCode === 200 &&
      hasTransparency(candSumBody) &&
      Boolean(candSumBody.evidence?.name),
    detail: { evidence: candSumBody.evidence, suggestionLen: candSumBody.aiSuggestion?.length },
  });

  // AC-4 Job Summary
  const jobSum = await app.inject({
    method: "POST",
    url: "/api/v1/copilot/summarize-job",
    payload: { jobId },
  });
  const jobSumBody = jobSum.json() as CopilotBody;
  steps.push({
    id: "summarize-job",
    ac: "AC-4",
    description: "Summarize Job from Job Intelligence",
    pass:
      jobSum.statusCode === 200 &&
      hasTransparency(jobSumBody) &&
      jobSumBody.evidence?.title === "E006 Job",
    detail: { evidence: jobSumBody.evidence },
  });

  // AC-5 Draft Outreach
  const draft = await app.inject({
    method: "POST",
    url: "/api/v1/copilot/draft-outreach",
    payload: { candidateId: c1, jobId },
  });
  const draftBody = draft.json() as CopilotBody;
  steps.push({
    id: "draft-outreach",
    ac: "AC-5",
    description: "Draft Outreach returns reviewable draft (no send)",
    pass:
      draft.statusCode === 200 &&
      hasTransparency(draftBody) &&
      String(draftBody.evidence?.note ?? "")
        .toLowerCase()
        .includes("does not send") &&
      draftBody.aiSuggestion.length > 0,
    detail: { note: draftBody.evidence?.note, suggestionLen: draftBody.aiSuggestion?.length },
  });

  // AC-6 Interview Questions
  const questions = await app.inject({
    method: "POST",
    url: "/api/v1/copilot/suggest-interview-questions",
    payload: { candidateId: c1, jobId },
  });
  const qBody = questions.json() as CopilotBody;
  const missing = (qBody.evidence?.missingSkills as string[] | undefined) ?? [];
  steps.push({
    id: "interview-questions",
    ac: "AC-6",
    description: "Interview Questions reference Missing Skills / job gaps",
    pass:
      questions.statusCode === 200 &&
      hasTransparency(qBody) &&
      missing.map((s) => s.toLowerCase()).includes("node") &&
      qBody.aiSuggestion.toLowerCase().includes("node"),
    detail: { missingSkills: missing, suggestionPreview: qBody.aiSuggestion.slice(0, 160) },
  });

  // Orchestration determinism (reviewer note) — mock provider, same structure twice
  const explain2 = await app.inject({
    method: "POST",
    url: "/api/v1/copilot/explain-match",
    payload: { candidateId: c1, jobId },
  });
  const explain2Body = explain2.json() as CopilotBody;
  steps.push({
    id: "orchestration-determinism",
    description:
      "Same mock provider + input → stable response shape (evidence + aiSuggestion present)",
    pass:
      explain2.statusCode === 200 &&
      hasTransparency(explain2Body) &&
      Object.keys(explainBody.evidence).sort().join() ===
        Object.keys(explain2Body.evidence).sort().join() &&
      explainBody.evidence.overallMatchScore === explain2Body.evidence.overallMatchScore &&
      explainBody.aiSuggestion === explain2Body.aiSuggestion,
    detail: {
      keys1: Object.keys(explainBody.evidence),
      keys2: Object.keys(explain2Body.evidence),
      suggestionEqual: explainBody.aiSuggestion === explain2Body.aiSuggestion,
    },
  });

  // Relationship + workflow setup for read-only + regression
  const rel = await app.inject({
    method: "POST",
    url: "/api/v1/relationships",
    payload: { candidateId: c1, jobId },
  });
  const relId = (rel.json() as { id: string }).id;
  await app.inject({
    method: "PATCH",
    url: `/api/v1/relationships/${relId}`,
    payload: { stage: "Screening" },
  });
  const relBefore = await app.inject({
    method: "GET",
    url: `/api/v1/relationships/${relId}`,
  });
  const stageBefore = (relBefore.json() as { currentStage: string }).currentStage;
  const histBefore = (relBefore.json() as { stageHistory: unknown[] }).stageHistory.length;
  const candNameBefore = (
    await app.inject({ method: "GET", url: `/api/v1/candidates/${c1}` })
  ).json() as { name?: string };
  const jobTitleBefore = (
    await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` })
  ).json() as { title?: string };

  await app.inject({
    method: "POST",
    url: "/api/v1/copilot/explain-match",
    payload: { candidateId: c1, jobId },
  });
  await app.inject({
    method: "POST",
    url: "/api/v1/copilot/draft-outreach",
    payload: { candidateId: c1, jobId },
  });

  const relAfter = await app.inject({
    method: "GET",
    url: `/api/v1/relationships/${relId}`,
  });
  const candAfter = await app.inject({ method: "GET", url: `/api/v1/candidates/${c1}` });
  const jobAfter = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` });
  const matchFinal = await app.inject({
    method: "GET",
    url: `/api/v1/matching?candidateId=${c1}&jobId=${jobId}`,
  });

  steps.push({
    id: "read-only",
    ac: "AC-7",
    description: "Copilot does not mutate Candidate, Job, Relationship, Workflow, Matching",
    pass:
      (candAfter.json() as { name?: string }).name === candNameBefore.name &&
      (jobAfter.json() as { title?: string }).title === jobTitleBefore.title &&
      (relAfter.json() as { currentStage: string }).currentStage === stageBefore &&
      (relAfter.json() as { stageHistory: unknown[] }).stageHistory.length === histBefore &&
      (matchFinal.json() as { overallMatchScore: number }).overallMatchScore === scoreBefore,
    detail: {
      stageBefore,
      stageAfter: (relAfter.json() as { currentStage: string }).currentStage,
      histBefore,
      histAfter: (relAfter.json() as { stageHistory: unknown[] }).stageHistory.length,
      scoreBefore,
      scoreFinal: (matchFinal.json() as { overallMatchScore: number }).overallMatchScore,
    },
  });

  // Error path — missing candidate → 404; no mutation
  const errRes = await app.inject({
    method: "POST",
    url: "/api/v1/copilot/explain-match",
    payload: { candidateId: "candidate_does_not_exist_e006", jobId },
  });
  const relAfterErr = await app.inject({
    method: "GET",
    url: `/api/v1/relationships/${relId}`,
  });
  steps.push({
    id: "error-no-side-effect",
    description: "Provider/orchestration error (404 missing candidate) does not mutate domain",
    pass:
      errRes.statusCode === 404 &&
      (relAfterErr.json() as { currentStage: string }).currentStage === "Screening" &&
      (relAfterErr.json() as { stageHistory: unknown[] }).stageHistory.length === histBefore,
    detail: {
      statusCode: errRes.statusCode,
      body: errRes.json(),
      stage: (relAfterErr.json() as { currentStage: string }).currentStage,
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

  // AC-9 Job Workspace
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

  // AC-10 Relationship
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
    pass: byCand.statusCode === 200 && dup.statusCode === 409 && rel.statusCode === 201,
    detail: { list: byCand.statusCode, duplicate: dup.statusCode },
  });

  // AC-11 Workflow
  steps.push({
    id: "workflow-foundation",
    ac: "AC-11",
    description: "Workflow Foundation has no regression",
    pass: stageBefore === "Screening" && histBefore === 2,
    detail: { currentStage: stageBefore, historyLen: histBefore },
  });

  // AC-12 Matching already covered + reconfirm
  steps.push({
    id: "matching-foundation",
    ac: "AC-12",
    description: "Matching Foundation has no regression after Copilot",
    pass: matchFinal.statusCode === 200 && scoreAfter === scoreBefore,
    detail: { scoreBefore, scoreFinal: scoreAfter },
  });

  const healthAfter = await app.inject({ method: "GET", url: "/health" });
  steps.push({
    id: "health-after",
    ac: "AC-14",
    description: "/health still ok after Copilot actions",
    pass:
      healthAfter.statusCode === 200 && (healthAfter.json() as { status?: string }).status === "ok",
    detail: { statusCode: healthAfter.statusCode },
  });

  const failed = steps.filter((s) => !s.pass).map((s) => s.id);
  const acIds = [
    "AC-1",
    "AC-1b",
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
    "AC-14",
  ] as const;
  const acceptanceCriteria = acIds.map((ac) => ({
    ac,
    pass: steps.some((s) => s.ac === ac && s.pass) && !steps.some((s) => s.ac === ac && !s.pass),
  }));

  const evidenceDoc = {
    epic: "EPIC-006",
    title: "AI Recruiter Copilot",
    generatedAt: new Date().toISOString(),
    storagePath,
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    allStepsPass: failed.length === 0,
    summary: {
      totalSteps: steps.length,
      passed: steps.filter((s) => s.pass).length,
      failed,
      acceptanceCriteria,
      note: "AC-15 (pnpm run ci) recorded separately in Validation Report",
    },
    steps,
  };

  mkdirSync("reports", { recursive: true });
  const out = join("reports", "epic-006-validation-evidence.json");
  writeFileSync(out, JSON.stringify(evidenceDoc, null, 2), "utf8");
  console.log(
    JSON.stringify({ verdict: evidenceDoc.verdict, out, summary: evidenceDoc.summary }, null, 2),
  );
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
