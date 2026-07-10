import type {
  EmbeddingInput,
  EmbeddingOutput,
  EmbeddingProvider,
} from "../interfaces/embedding-provider.js";
import type { ProviderHealth } from "../interfaces/types.js";

const DIMENSIONS = 384;

function hashEmbed(text: string): number[] {
  const vector = new Array(DIMENSIONS).fill(0);
  for (let i = 0; i < text.length; i++) {
    vector[i % DIMENSIONS] += text.charCodeAt(i) / 255;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / magnitude);
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly providerId = "local-embedding";
  readonly modelId = "local-hash-384";

  health(): ProviderHealth {
    return { available: true, providerId: this.providerId };
  }

  async embed(input: EmbeddingInput): Promise<EmbeddingOutput> {
    return {
      vector: hashEmbed(input.text),
      modelId: this.modelId,
      providerId: this.providerId,
      dimensions: DIMENSIONS,
    };
  }
}
