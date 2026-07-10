export type ProviderCapability = "knowledge-extraction" | "summary" | "embedding" | "reasoning";

export type ProviderHealth = {
  available: boolean;
  providerId: string;
  reason?: string;
};

export type ContractExecutionContext = {
  contractId: string;
  traceId: string;
  correlationId: string;
  workspaceId: string;
  resumeId: string;
};
