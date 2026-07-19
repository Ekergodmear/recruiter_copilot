import type {
  ReasoningInput,
  ReasoningOutput,
  ReasoningProvider,
} from "../interfaces/reasoning-provider.js";
import type { ProviderHealth } from "../interfaces/types.js";

/**
 * Deterministic reasoning stub for CI — returns a suggestion string from context.
 * Copilot still owns Transparency (evidence vs aiSuggestion) at the application layer.
 */
export class MockReasoningProvider implements ReasoningProvider {
  readonly providerId = "mock-reasoning";

  health(): ProviderHealth {
    return { available: true, providerId: this.providerId };
  }

  async reason(input: ReasoningInput): Promise<ReasoningOutput> {
    const suggestion = mockSuggestion(input.task, input.context);
    return {
      result: { task: input.task, suggestion, inferred: true },
      providerId: this.providerId,
      confidence: 0.5,
    };
  }
}

function list(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.map(String).join(", ") : "(none)";
  if (typeof value === "string" && value.trim()) return value;
  return "(none)";
}

function mockSuggestion(task: string, context: Record<string, unknown>): string {
  switch (task) {
    case "explain-match":
      return [
        `[mock] Score ${String(context.overallMatchScore)} is produced by Matching Intelligence.`,
        `Matched: ${list(context.matchedSkills)}. Missing: ${list(context.missingSkills)}.`,
        "Use the Evidence section for platform facts; this paragraph is an AI suggestion only.",
      ].join(" ");
    case "summarize-candidate":
      return `[mock] ${String(context.name ?? "Candidate")}: skills ${list(context.skills)}; English ${String(context.english ?? "n/a")}; experience ${String(context.experience ?? "n/a")}.`;
    case "summarize-job":
      return `[mock] ${String(context.title ?? "Job")} at ${String(context.company ?? "Company")} — skills ${list(context.skills)}.`;
    case "draft-outreach":
      return [
        `Subject: ${String(context.jobTitle ?? "Role")} at ${String(context.jobCompany ?? "Company")}`,
        "",
        `Hi ${String(context.candidateName ?? "there")},`,
        "",
        `[mock] Sharing an opening for ${String(context.jobTitle ?? "this role")}. Open to a quick chat?`,
        "",
        "Best regards",
      ].join("\n");
    case "suggest-interview-questions": {
      const missing = Array.isArray(context.missingSkills)
        ? (context.missingSkills as string[])
        : [];
      if (missing.length === 0) {
        return "[mock] 1. Describe a recent project relevant to this role.\n2. How do you ramp up on unfamiliar tools?";
      }
      return missing
        .slice(0, 5)
        .map((s, i) => `[mock] ${i + 1}. Probe experience with ${s}.`)
        .join("\n");
    }
    default:
      return `[mock] suggestion for ${task}`;
  }
}
