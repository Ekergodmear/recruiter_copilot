import type { ProviderHealth } from "./types.js";

export type SummaryInput = {
  traceId: string;
  workspaceId: string;
  candidateId: string;
  rawText: string;
  deterministicFields: Record<string, unknown>;
};

export type SummaryOutput = {
  summary: string;
  providerId: string;
  confidence: number;
};

export interface SummaryProvider {
  readonly providerId: string;
  health(): ProviderHealth;
  generateSummary(input: SummaryInput): Promise<SummaryOutput>;
}
