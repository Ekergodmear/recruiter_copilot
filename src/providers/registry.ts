import type {
  EmbeddingProvider,
  KnowledgeExtractionProvider,
  ReasoningProvider,
  SummaryProvider,
} from "./interfaces/index.js";
import { GeminiKnowledgeExtractionProvider } from "./gemini/gemini-knowledge-extraction-provider.js";
import { GeminiReasoningProvider } from "./gemini/gemini-reasoning-provider.js";
import { GeminiSummaryProvider } from "./gemini/gemini-summary-provider.js";
import { LocalEmbeddingProvider } from "./local/local-embedding-provider.js";
import { MockKnowledgeExtractionProvider } from "./mock/mock-knowledge-extraction-provider.js";
import { MockReasoningProvider } from "./mock/mock-reasoning-provider.js";
import { MockSummaryProvider } from "./mock/mock-summary-provider.js";

export type ProviderRegistryConfig = {
  knowledgeExtraction: "gemini" | "mock";
  summary: "gemini" | "mock";
  reasoning: "gemini" | "mock";
  embedding: "local";
  geminiApiKey?: string;
};

export class ProviderRegistry {
  constructor(private readonly config: ProviderRegistryConfig) {}

  getKnowledgeExtractionProvider(): KnowledgeExtractionProvider {
    if (this.config.knowledgeExtraction === "gemini") {
      return new GeminiKnowledgeExtractionProvider(this.config.geminiApiKey);
    }
    return new MockKnowledgeExtractionProvider();
  }

  getSummaryProvider(): SummaryProvider {
    if (this.config.summary === "gemini") {
      return new GeminiSummaryProvider(this.config.geminiApiKey);
    }
    return new MockSummaryProvider();
  }

  getEmbeddingProvider(): EmbeddingProvider {
    return new LocalEmbeddingProvider();
  }

  getReasoningProvider(): ReasoningProvider {
    if (this.config.reasoning === "gemini") {
      return new GeminiReasoningProvider(this.config.geminiApiKey);
    }
    return new MockReasoningProvider();
  }
}
