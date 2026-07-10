import type {
  SummaryInput,
  SummaryOutput,
  SummaryProvider,
} from "../interfaces/summary-provider.js";
import type { ProviderHealth } from "../interfaces/types.js";

export class GeminiSummaryProvider implements SummaryProvider {
  readonly providerId = "gemini-summary";

  constructor(private readonly apiKey?: string) {}

  health(): ProviderHealth {
    if (!this.apiKey) {
      return {
        available: false,
        providerId: this.providerId,
        reason: "GEMINI_API_KEY not configured",
      };
    }
    return { available: true, providerId: this.providerId };
  }

  async generateSummary(input: SummaryInput): Promise<SummaryOutput> {
    const health = this.health();
    if (!health.available) {
      throw new Error(health.reason ?? "Gemini provider unavailable");
    }

    const name = (input.deterministicFields.candidateName as string) ?? "Candidate";
    return {
      summary: `${name} — summary via Gemini (stub).`,
      providerId: this.providerId,
      confidence: 0.7,
    };
  }
}
