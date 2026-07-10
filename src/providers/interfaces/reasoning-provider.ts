import type { ProviderHealth } from "./types.js";

export type ReasoningInput = {
  traceId: string;
  workspaceId: string;
  task: string;
  context: Record<string, unknown>;
};

export type ReasoningOutput = {
  result: Record<string, unknown>;
  providerId: string;
  confidence: number;
};

export interface ReasoningProvider {
  readonly providerId: string;
  health(): ProviderHealth;
  reason(input: ReasoningInput): Promise<ReasoningOutput>;
}
