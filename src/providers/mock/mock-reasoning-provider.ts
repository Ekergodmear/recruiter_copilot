import type {
  ReasoningInput,
  ReasoningOutput,
  ReasoningProvider,
} from "../interfaces/reasoning-provider.js";
import type { ProviderHealth } from "../interfaces/types.js";

export class MockReasoningProvider implements ReasoningProvider {
  readonly providerId = "mock-reasoning";

  health(): ProviderHealth {
    return { available: true, providerId: this.providerId };
  }

  async reason(input: ReasoningInput): Promise<ReasoningOutput> {
    return {
      result: { task: input.task, inferred: true },
      providerId: this.providerId,
      confidence: 0.5,
    };
  }
}
