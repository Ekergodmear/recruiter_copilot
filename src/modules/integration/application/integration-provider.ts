import type {
  ConnectionTestResult,
  ExecuteResult,
  JobImportRow,
  PreviewResult,
  ProviderKey,
} from "../domain/types.js";

/**
 * Plugin port — all MVP providers implement the same surface.
 * Execute must not touch repositories; IntegrationService calls Application Services.
 */
export interface IntegrationProvider {
  readonly providerKey: ProviderKey;

  testConnection(config: Record<string, unknown>): Promise<ConnectionTestResult>;

  parseImportPayload(raw: string): JobImportRow[];

  buildExportCsv(rows: JobImportRow[]): string;

  buildExportJson(rows: JobImportRow[]): string;
}

export type ParsedPreview = {
  rows: JobImportRow[];
  warnings: string[];
};

export function toPreviewResult(
  provider: ProviderKey,
  direction: "import" | "export",
  rows: JobImportRow[],
  warnings: string[] = [],
): PreviewResult {
  return {
    provider,
    direction,
    rowCount: rows.length,
    rows: rows.map((r, index) => ({
      index,
      kind: "job" as const,
      title: r.title,
      company: r.company,
      location: r.location,
      status: r.status,
      notes: r.notes,
    })),
    warnings,
  };
}

export type { ExecuteResult };
