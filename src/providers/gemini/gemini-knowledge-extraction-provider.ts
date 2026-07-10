import type {
  KnowledgeExtractionInput,
  KnowledgeExtractionOutput,
  KnowledgeExtractionProvider,
} from "../interfaces/knowledge-extraction-provider.js";
import type { ProviderHealth } from "../interfaces/types.js";

/**
 * Gemini implementation — SDK usage restricted to this folder (ADR-016).
 * Uses REST when GEMINI_API_KEY is set; otherwise reports unavailable.
 */
export class GeminiKnowledgeExtractionProvider implements KnowledgeExtractionProvider {
  readonly providerId = "gemini-knowledge-extraction";

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

  async completeKnowledge(input: KnowledgeExtractionInput): Promise<KnowledgeExtractionOutput> {
    const health = this.health();
    if (!health.available) {
      throw new Error(health.reason ?? "Gemini provider unavailable");
    }

    // Sprint 1: placeholder — actual KC execution wired in CandidateImportService
    return {
      providerId: this.providerId,
      filledGaps: input.gaps.map((g) => g.field),
      contractOutputs: {
        extraction_method: this.providerId,
        trace_id: input.traceId,
      },
    };
  }
}
