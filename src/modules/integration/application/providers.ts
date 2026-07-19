import type { IntegrationProvider } from "./integration-provider.js";
import { jobsToCsv, parseJobCsv } from "./csv-codec.js";
import type { JobImportRow } from "../domain/types.js";

const ATS_MOCK_ROWS: JobImportRow[] = [
  {
    title: "ATS Mock Backend Engineer",
    company: "Mock ATS Co",
    location: "Remote",
    status: "Open",
    notes: "Deterministic ATS mock row",
  },
  {
    title: "ATS Mock Product Designer",
    company: "Mock ATS Co",
    location: "Hanoi",
    status: "Draft",
    notes: "Deterministic ATS mock row 2",
  },
];

export class CsvIntegrationProvider implements IntegrationProvider {
  readonly providerKey = "csv" as const;

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: "CSV provider ready (file/payload based)" };
  }

  parseImportPayload(raw: string): JobImportRow[] {
    return parseJobCsv(raw).rows;
  }

  buildExportCsv(rows: JobImportRow[]): string {
    return jobsToCsv(rows);
  }

  buildExportJson(rows: JobImportRow[]): string {
    return JSON.stringify({ provider: "csv", jobs: rows }, null, 2);
  }
}

export class WebhookIntegrationProvider implements IntegrationProvider {
  readonly providerKey = "webhook" as const;

  async testConnection(config: Record<string, unknown>): Promise<{ ok: boolean; message: string }> {
    const url = typeof config.webhookUrl === "string" ? config.webhookUrl.trim() : "";
    if (!url) {
      return { ok: true, message: "Webhook provider ready (no webhookUrl configured — local OK)" };
    }
    if (!/^https?:\/\//i.test(url)) {
      return { ok: false, message: "webhookUrl must start with http:// or https://" };
    }
    return { ok: true, message: `Webhook URL accepted: ${url}` };
  }

  parseImportPayload(raw: string): JobImportRow[] {
    const parsed = JSON.parse(raw) as { jobs?: JobImportRow[] };
    if (!Array.isArray(parsed.jobs)) {
      throw new Error("Webhook import JSON must contain jobs: []");
    }
    return parsed.jobs.map((j) => ({
      title: String(j.title ?? "").trim(),
      company: String(j.company ?? "").trim(),
      location: j.location ? String(j.location) : undefined,
      status: j.status ? String(j.status) : undefined,
      notes: j.notes ? String(j.notes) : undefined,
      description: j.description ? String(j.description) : undefined,
    }));
  }

  buildExportCsv(rows: JobImportRow[]): string {
    return jobsToCsv(rows);
  }

  buildExportJson(rows: JobImportRow[]): string {
    return JSON.stringify({ provider: "webhook", jobs: rows }, null, 2);
  }
}

export class AtsMockIntegrationProvider implements IntegrationProvider {
  readonly providerKey = "ats_mock" as const;

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: "ATS Mock connected (deterministic fixture)" };
  }

  parseImportPayload(raw: string): JobImportRow[] {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "{}" || trimmed === "mock") {
      return ATS_MOCK_ROWS.map((r) => ({ ...r }));
    }
    // Allow overriding with JSON { jobs: [...] } for tests
    try {
      const parsed = JSON.parse(trimmed) as { jobs?: JobImportRow[] };
      if (Array.isArray(parsed.jobs) && parsed.jobs.length > 0) {
        return parsed.jobs;
      }
    } catch {
      // fall through to mock rows
    }
    return ATS_MOCK_ROWS.map((r) => ({ ...r }));
  }

  buildExportCsv(rows: JobImportRow[]): string {
    return jobsToCsv(rows);
  }

  buildExportJson(rows: JobImportRow[]): string {
    return JSON.stringify({ provider: "ats_mock", jobs: rows }, null, 2);
  }
}

export function createProviderRegistry(): Map<string, IntegrationProvider> {
  const map = new Map<string, IntegrationProvider>();
  for (const p of [
    new CsvIntegrationProvider(),
    new WebhookIntegrationProvider(),
    new AtsMockIntegrationProvider(),
  ]) {
    map.set(p.providerKey, p);
  }
  return map;
}
