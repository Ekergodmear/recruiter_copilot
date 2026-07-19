/**
 * EPIC-011 — Integrations (adapter boundary).
 * Connect external systems; do not own business rules or write SoT directly.
 */

export type IntegrationStatus = "Enabled" | "Disabled";

export type ProviderKey = "csv" | "webhook" | "ats_mock";

export type IntegrationRecord = {
  integrationId: string;
  provider: ProviderKey;
  status: IntegrationStatus;
  displayName: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ConnectionTestResult = {
  ok: boolean;
  message: string;
};

export type PreviewRow = {
  index: number;
  kind: "job";
  title: string;
  company: string;
  location?: string;
  status?: string;
  notes?: string;
};

export type PreviewResult = {
  provider: ProviderKey;
  direction: "import" | "export";
  rowCount: number;
  rows: PreviewRow[];
  warnings: string[];
};

export type ExecuteResult = {
  provider: ProviderKey;
  direction: "import" | "export";
  success: boolean;
  createdIds: string[];
  exportedPayload?: string;
  error?: { code: string; message: string };
};

export type JobImportRow = {
  title: string;
  company: string;
  location?: string;
  status?: string;
  notes?: string;
  description?: string;
};
