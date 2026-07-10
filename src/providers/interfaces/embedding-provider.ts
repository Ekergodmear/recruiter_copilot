import type { ProviderHealth } from "./types.js";

export type EmbeddingInput = {
  traceId: string;
  workspaceId: string;
  text: string;
};

export type EmbeddingOutput = {
  vector: number[];
  modelId: string;
  providerId: string;
  dimensions: number;
};

export interface EmbeddingProvider {
  readonly providerId: string;
  health(): ProviderHealth;
  embed(input: EmbeddingInput): Promise<EmbeddingOutput>;
}
