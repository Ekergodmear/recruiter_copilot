/**
 * EPIC-006 — AI Recruiter Copilot.
 * AI consumes capabilities; does not own business rules.
 * Copilot Transparency: evidence (platform) vs aiSuggestion (LLM).
 */

import type { MatchingResult } from "../../matching/domain/types.js";

export type CopilotAction =
  | "explain-match"
  | "summarize-candidate"
  | "summarize-job"
  | "draft-outreach"
  | "suggest-interview-questions";

/**
 * Transparent Copilot response — facts and AI text are never mixed into one blob.
 */
export type CopilotResponse = {
  action: CopilotAction;
  /** Platform-derived facts only (Matching Evidence, Candidate/Job fields, etc.) */
  evidence: Record<string, unknown>;
  /** LLM-generated suggestion text (non-authoritative) */
  aiSuggestion: string;
  /** Present for explain-match — score owned by EPIC-005, not recalculated */
  matchingResult?: MatchingResult;
  providerId: string;
  generatedAt: string;
};
