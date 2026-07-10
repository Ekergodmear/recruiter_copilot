import type { ProviderHealth } from "./types.js";

export type KnowledgeGap = {
  field: string;
  reason: "missing" | "low_confidence" | "inference_required";
};

export type KnowledgeExtractionInput = {
  contractId: string;
  traceId: string;
  correlationId: string;
  workspaceId: string;
  resumeId: string;
  rawText: string;
  deterministicFields: Record<string, unknown>;
  gaps: KnowledgeGap[];
};

export type KnowledgeExtractionOutput = {
  contractOutputs: Record<string, unknown>;
  providerId: string;
  filledGaps: string[];
};

export interface KnowledgeExtractionProvider {
  readonly providerId: string;
  health(): ProviderHealth;
  completeKnowledge(input: KnowledgeExtractionInput): Promise<KnowledgeExtractionOutput>;
}
