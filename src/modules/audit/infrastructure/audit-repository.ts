import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import type { AuditListQuery, AuditRecord } from "../domain/types.js";

export interface AuditRepository {
  append(record: AuditRecord): Promise<void>;
  findById(id: string): Promise<AuditRecord | null>;
  list(query?: AuditListQuery): Promise<AuditRecord[]>;
}

export class InMemoryAuditRepository implements AuditRepository {
  private readonly items: AuditRecord[] = [];

  async append(record: AuditRecord): Promise<void> {
    this.items.push(record);
  }

  async findById(id: string): Promise<AuditRecord | null> {
    return this.items.find((r) => r.auditId === id) ?? null;
  }

  async list(query: AuditListQuery = {}): Promise<AuditRecord[]> {
    return filterAndSort(this.items, query);
  }
}

/** Append-only JSONL under STORAGE_PATH — MVP Audit Log, not SIEM. */
export class FileAuditRepository implements AuditRepository {
  private readonly items: AuditRecord[] = [];
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
        this.items.push(JSON.parse(line) as AuditRecord);
      } catch {
        // skip corrupt lines
      }
    }
  }

  async append(record: AuditRecord): Promise<void> {
    this.ensureLoaded();
    this.items.push(record);
    mkdirSync(dirname(this.filePath), { recursive: true });
    appendFileSync(this.filePath, `${JSON.stringify(record)}\n`, "utf8");
  }

  async findById(id: string): Promise<AuditRecord | null> {
    this.ensureLoaded();
    return this.items.find((r) => r.auditId === id) ?? null;
  }

  async list(query: AuditListQuery = {}): Promise<AuditRecord[]> {
    this.ensureLoaded();
    return filterAndSort(this.items, query);
  }
}

function filterAndSort(items: AuditRecord[], query: AuditListQuery): AuditRecord[] {
  let out = [...items];
  if (query.actorId) out = out.filter((r) => r.actorId === query.actorId);
  if (query.action) out = out.filter((r) => r.action === query.action);
  if (query.source) out = out.filter((r) => r.source === query.source);
  if (query.from) out = out.filter((r) => r.occurredAt >= query.from!);
  if (query.to) out = out.filter((r) => r.occurredAt <= query.to!);
  return out.sort((a, b) =>
    a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0,
  );
}
