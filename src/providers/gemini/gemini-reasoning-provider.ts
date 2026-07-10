import type {
  ReasoningInput,
  ReasoningOutput,
  ReasoningProvider,
} from "../interfaces/reasoning-provider.js";
import type { ProviderHealth } from "../interfaces/types.js";

export class GeminiReasoningProvider implements ReasoningProvider {
  readonly providerId = "gemini-reasoning";

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

  async reason(input: ReasoningInput): Promise<ReasoningOutput> {
    const health = this.health();
    if (!health.available) {
      throw new Error(health.reason ?? "Gemini provider unavailable");
    }

    return {
      result: { task: input.task },
      providerId: this.providerId,
      confidence: 0.7,
    };
  }
}
