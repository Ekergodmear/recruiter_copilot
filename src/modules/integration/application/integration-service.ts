import type { Clock } from "../../../shared/clock/index.js";
import type { IdGenerator } from "../../../shared/id-generator/index.js";
import type { AuthorizationService } from "../../authorization/application/authorization-service.js";
import type { AuditService } from "../../audit/application/audit-service.js";
import { JobService, JobServiceError } from "../../job/application/job-service.js";
import type { JobStatus } from "../../job/domain/types.js";
import { parseJobCsv } from "./csv-codec.js";
import { createProviderRegistry } from "./providers.js";
import { toPreviewResult, type IntegrationProvider } from "./integration-provider.js";
import type { IntegrationRepository } from "../infrastructure/integration-repository.js";
import type {
  ConnectionTestResult,
  ExecuteResult,
  IntegrationRecord,
  IntegrationStatus,
  JobImportRow,
  PreviewResult,
  ProviderKey,
} from "../domain/types.js";

export class IntegrationServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "IntegrationServiceError";
  }
}

/**
 * EPIC-011 — orchestrates providers; never writes SoT repositories directly.
 * Import execute → JobService.createManual; rollback via softDelete (AC-7b).
 */
export class IntegrationService {
  private readonly providers: Map<string, IntegrationProvider>;

  constructor(
    private readonly deps: {
      clock: Clock;
      idGenerator: IdGenerator;
      repository: IntegrationRepository;
      jobService: JobService;
      authorizationService: AuthorizationService;
      /** EPIC-012 — one audit record per execute outcome. */
      auditService?: AuditService;
      providers?: Map<string, IntegrationProvider>;
    },
  ) {
    this.providers = deps.providers ?? createProviderRegistry();
  }

  async list(): Promise<IntegrationRecord[]> {
    return this.deps.repository.list();
  }

  async getById(id: string): Promise<IntegrationRecord> {
    const found = await this.deps.repository.findById(id);
    if (!found) throw new IntegrationServiceError("NOT_FOUND", "Integration not found");
    return found;
  }

  async create(params: {
    provider: string;
    displayName?: string;
    status?: IntegrationStatus;
    config?: Record<string, unknown>;
    actorId: string;
  }): Promise<IntegrationRecord> {
    this.requireExecute(params.actorId);
    const provider = this.requireProviderKey(params.provider);
    if (!this.providers.has(provider)) {
      throw new IntegrationServiceError("UNKNOWN_PROVIDER", `Unknown provider: ${provider}`);
    }
    const now = this.deps.clock.nowIso();
    const record: IntegrationRecord = {
      integrationId: this.deps.idGenerator.generateId("intg"),
      provider,
      status: params.status === "Disabled" ? "Disabled" : "Enabled",
      displayName: params.displayName?.trim() || `${provider} integration`,
      config: params.config ?? {},
      createdAt: now,
      updatedAt: now,
    };
    await this.deps.repository.save(record);
    return record;
  }

  async update(params: {
    id: string;
    status?: IntegrationStatus;
    displayName?: string;
    config?: Record<string, unknown>;
    actorId: string;
  }): Promise<IntegrationRecord> {
    this.requireExecute(params.actorId);
    const current = await this.getById(params.id);
    const next: IntegrationRecord = {
      ...current,
      status: params.status ?? current.status,
      displayName: params.displayName?.trim() || current.displayName,
      config: params.config ?? current.config,
      updatedAt: this.deps.clock.nowIso(),
    };
    await this.deps.repository.save(next);
    return next;
  }

  async testConnection(params: { id: string; actorId: string }): Promise<ConnectionTestResult> {
    this.requireExecute(params.actorId);
    const record = await this.getById(params.id);
    const provider = this.providers.get(record.provider)!;
    return provider.testConnection(record.config);
  }

  async previewImport(params: {
    id: string;
    payload: string;
    actorId: string;
  }): Promise<PreviewResult> {
    this.requireRead(params.actorId);
    const record = await this.getById(params.id);
    const { rows, warnings } = this.parseImport(record.provider, params.payload);
    return toPreviewResult(record.provider, "import", rows, warnings);
  }

  async executeImport(params: {
    id: string;
    payload: string;
    actorId: string;
    confirmed?: boolean;
  }): Promise<ExecuteResult> {
    this.requireExecute(params.actorId);
    if (params.confirmed !== true) {
      throw new IntegrationServiceError(
        "CONFIRMATION_REQUIRED",
        "confirmed: true is required before execute",
      );
    }
    const record = await this.getById(params.id);
    if (record.status !== "Enabled") {
      throw new IntegrationServiceError("DISABLED", "Integration is Disabled");
    }

    const { rows } = this.parseImport(record.provider, params.payload);
    if (rows.length === 0) {
      throw new IntegrationServiceError("EMPTY_PAYLOAD", "No import rows to execute");
    }

    // Validate all rows before any write (fail fast)
    for (const row of rows) {
      if (!row.title.trim() || !row.company.trim()) {
        throw new IntegrationServiceError(
          "INVALID_ROW",
          "Each import row requires title and company",
        );
      }
    }

    const createdIds: string[] = [];
    try {
      for (const row of rows) {
        const job = await this.deps.jobService.createManual({
          actorId: params.actorId,
          title: row.title,
          company: row.company,
          location: row.location,
          status: (row.status as JobStatus | undefined) ?? "Draft",
          notes: row.notes,
          description: row.description,
        });
        createdIds.push(job.id);
      }
      const result: ExecuteResult = {
        provider: record.provider,
        direction: "import",
        success: true,
        createdIds,
      };
      await this.recordExecuteAudit(params.actorId, record.integrationId, result);
      return result;
    } catch (err) {
      // AC-7b — rollback partial creates via Application Service softDelete
      for (const id of [...createdIds].reverse()) {
        try {
          await this.deps.jobService.softDelete(id);
        } catch {
          // best-effort rollback
        }
      }
      const message =
        err instanceof JobServiceError || err instanceof Error ? err.message : "Import failed";
      const code = err instanceof JobServiceError ? err.code : "IMPORT_FAILED";
      const result: ExecuteResult = {
        provider: record.provider,
        direction: "import",
        success: false,
        createdIds: [],
        error: { code, message },
      };
      await this.recordExecuteAudit(params.actorId, record.integrationId, result);
      return result;
    }
  }

  async previewExport(params: { id: string; actorId: string }): Promise<PreviewResult> {
    this.requireRead(params.actorId);
    const record = await this.getById(params.id);
    const rows = await this.loadExportRows();
    return toPreviewResult(record.provider, "export", rows);
  }

  async executeExport(params: {
    id: string;
    actorId: string;
    confirmed?: boolean;
    format?: "csv" | "json";
  }): Promise<ExecuteResult> {
    this.requireExecute(params.actorId);
    if (params.confirmed !== true) {
      throw new IntegrationServiceError(
        "CONFIRMATION_REQUIRED",
        "confirmed: true is required before execute",
      );
    }
    const record = await this.getById(params.id);
    if (record.status !== "Enabled") {
      throw new IntegrationServiceError("DISABLED", "Integration is Disabled");
    }
    const provider = this.providers.get(record.provider)!;
    const rows = await this.loadExportRows();
    const format = params.format === "json" || record.provider === "webhook" ? "json" : "csv";
    const exportedPayload =
      format === "json" ? provider.buildExportJson(rows) : provider.buildExportCsv(rows);
    const result: ExecuteResult = {
      provider: record.provider,
      direction: "export",
      success: true,
      createdIds: [],
      exportedPayload,
    };
    await this.recordExecuteAudit(params.actorId, record.integrationId, result);
    return result;
  }

  private async recordExecuteAudit(
    actorId: string,
    integrationId: string,
    result: ExecuteResult,
  ): Promise<void> {
    await this.deps.auditService?.record({
      actorId,
      action: `integration.${result.direction}.execute`,
      source: "integration",
      outcome: result.success ? "success" : "failure",
      target: { integrationId },
      summary: result.success
        ? `Integration ${result.direction} via ${result.provider}`
        : `Integration ${result.direction} failed via ${result.provider}`,
      error: result.error ?? null,
    });
  }

  private async loadExportRows(): Promise<JobImportRow[]> {
    const listed = await this.deps.jobService.list({});
    return listed.items.map((j) => ({
      title: j.title,
      company: j.company,
      location: j.location,
      status: j.status,
      notes: undefined,
      description: undefined,
    }));
  }

  private parseImport(
    providerKey: ProviderKey,
    payload: string,
  ): { rows: JobImportRow[]; warnings: string[] } {
    const provider = this.providers.get(providerKey);
    if (!provider) {
      throw new IntegrationServiceError("UNKNOWN_PROVIDER", `Unknown provider: ${providerKey}`);
    }
    if (providerKey === "csv") {
      try {
        return parseJobCsv(payload);
      } catch (err) {
        throw new IntegrationServiceError(
          "INVALID_PAYLOAD",
          err instanceof Error ? err.message : "Invalid CSV",
        );
      }
    }
    try {
      const rows = provider.parseImportPayload(payload);
      const warnings: string[] = [];
      const cleaned = rows.filter((r) => {
        if (!r.title?.trim() || !r.company?.trim()) {
          warnings.push("Skipped row missing title/company");
          return false;
        }
        return true;
      });
      return { rows: cleaned, warnings };
    } catch (err) {
      throw new IntegrationServiceError(
        "INVALID_PAYLOAD",
        err instanceof Error ? err.message : "Invalid payload",
      );
    }
  }

  private requireProviderKey(value: string): ProviderKey {
    if (value === "csv" || value === "webhook" || value === "ats_mock") return value;
    throw new IntegrationServiceError("UNKNOWN_PROVIDER", `Unknown provider: ${value}`);
  }

  private requireRead(actorId: string): void {
    const decision = this.deps.authorizationService.authorize(actorId, "integration.read");
    if (!decision.allowed) {
      throw new IntegrationServiceError(decision.code, decision.message);
    }
  }

  private requireExecute(actorId: string): void {
    const decision = this.deps.authorizationService.authorize(actorId, "integration.execute");
    if (!decision.allowed) {
      throw new IntegrationServiceError(decision.code, decision.message);
    }
  }
}
