/**
 * Prompt helpers — narrate capability payloads only.
 * Business rules stay in EPIC-001…005; prompts must not redefine Match Score.
 */

import type { MatchingResult } from "../../matching/domain/types.js";

export function buildExplainMatchContext(matching: MatchingResult): Record<string, unknown> {
  return {
    overallMatchScore: matching.overallMatchScore,
    scoreBreakdown: matching.scoreBreakdown,
    weights: matching.weights,
    matchedSkills: matching.evidence.matchedSkills,
    missingSkills: matching.evidence.missingSkills,
    experience: matching.evidence.experience,
    english: matching.evidence.english,
    salary: matching.evidence.salary,
    instruction:
      "Explain why this Overall Match Score is what it is using ONLY the evidence fields. Do not invent a different score. Do not invent skills.",
  };
}

export function buildCandidateSummaryContext(
  facts: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...facts,
    instruction: "Write a short recruiter briefing summary from these Candidate fields only.",
  };
}

export function buildJobSummaryContext(facts: Record<string, unknown>): Record<string, unknown> {
  return {
    ...facts,
    instruction: "Write a short recruiter briefing summary from these Job fields only.",
  };
}

export function buildOutreachContext(facts: Record<string, unknown>): Record<string, unknown> {
  return {
    ...facts,
    instruction:
      "Draft a short first-touch outreach email. Do not claim a hire decision. Do not invent skills not listed.",
  };
}

export function buildInterviewQuestionsContext(
  facts: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...facts,
    instruction:
      "Suggest interview questions focused on Missing Skills and job gaps. Do not score the candidate.",
  };
}
