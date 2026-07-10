import type {
  SummaryInput,
  SummaryOutput,
  SummaryProvider,
} from "../interfaces/summary-provider.js";
import type { ProviderHealth } from "../interfaces/types.js";

export class MockSummaryProvider implements SummaryProvider {
  readonly providerId = "mock-summary";

  health(): ProviderHealth {
    return { available: true, providerId: this.providerId };
  }

  async generateSummary(input: SummaryInput): Promise<SummaryOutput> {
    const name = (input.deterministicFields.candidateName as string) ?? "Candidate";
    return {
      summary: `${name} — profile generated without LLM.`,
      providerId: this.providerId,
      confidence: 0.5,
    };
  }
}
