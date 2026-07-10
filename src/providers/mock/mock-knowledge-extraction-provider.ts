import type {
  KnowledgeExtractionInput,
  KnowledgeExtractionOutput,
  KnowledgeExtractionProvider,
} from "../interfaces/knowledge-extraction-provider.js";
import type { ProviderHealth } from "../interfaces/types.js";

export class MockKnowledgeExtractionProvider implements KnowledgeExtractionProvider {
  readonly providerId = "mock-knowledge-extraction";

  health(): ProviderHealth {
    return { available: true, providerId: this.providerId };
  }

  async completeKnowledge(input: KnowledgeExtractionInput): Promise<KnowledgeExtractionOutput> {
    const inferredSkills =
      input.gaps.some((g) => g.field === "skills") && !input.deterministicFields.skills
        ? ["communication"]
        : [];

    const hasLanguageGap = input.gaps.some((g) => g.field === "languages");

    return {
      providerId: this.providerId,
      filledGaps: input.gaps.map((g) => g.field),
      contractOutputs: {
        skills: inferredSkills,
        englishLevel: hasLanguageGap ? "unknown" : undefined,
      },
    };
  }
}
