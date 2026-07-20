import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { IntegrationRecord } from "../domain/types.js";

export interface IntegrationRepository {
  list(): Promise<IntegrationRecord[]>;
  findById(id: string): Promise<IntegrationRecord | null>;
  save(record: IntegrationRecord): Promise<void>;
}

export class InMemoryIntegrationRepository implements IntegrationRepository {
  private readonly items = new Map<string, IntegrationRecord>();

  async list(): Promise<IntegrationRecord[]> {
    return [...this.items.values()].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
    );
  }

  async findById(id: string): Promise<IntegrationRecord | null> {
    return this.items.get(id) ?? null;
  }

  async save(record: IntegrationRecord): Promise<void> {
    this.items.set(record.integrationId, record);
  }
}

/** Restart-safe registry (JSONL under STORAGE_PATH) — not SoT business data. */
export class FileIntegrationRepository implements IntegrationRepository {
  private readonly items = new Map<string, IntegrationRecord>();
  private loaded = false;

  constructor(private readonly filePath: string) {}

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    if (!existsSync(this.filePath)) return;
    const text = readFileSync(this.filePath, "utf8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as IntegrationRecord;
        this.items.set(row.integrationId, row);
      } catch {
        // skip corrupt lines
      }
    }
  }

  private rewrite(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const body = [...this.items.values()].map((r) => JSON.stringify(r)).join("\n");
    writeFileSync(this.filePath, body ? `${body}\n` : "", "utf8");
  }

  async list(): Promise<IntegrationRecord[]> {
    this.ensureLoaded();
    return [...this.items.values()].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
    );
  }

  async findById(id: string): Promise<IntegrationRecord | null> {
    this.ensureLoaded();
    return this.items.get(id) ?? null;
  }

  async save(record: IntegrationRecord): Promise<void> {
    this.ensureLoaded();
    this.items.set(record.integrationId, record);
    this.rewrite();
  }
}
