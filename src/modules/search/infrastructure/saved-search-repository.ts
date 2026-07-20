import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { SavedSearch } from "../domain/types.js";

export interface SavedSearchRepository {
  save(record: SavedSearch): Promise<void>;
  listByActor(actorId: string): Promise<SavedSearch[]>;
  findById(id: string): Promise<SavedSearch | null>;
  delete(id: string, actorId: string): Promise<boolean>;
}

export class InMemorySavedSearchRepository implements SavedSearchRepository {
  private readonly items: SavedSearch[] = [];

  async save(record: SavedSearch): Promise<void> {
    this.items.push(record);
  }

  async listByActor(actorId: string): Promise<SavedSearch[]> {
    return this.items
      .filter((s) => s.actorId === actorId)
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  }

  async findById(id: string): Promise<SavedSearch | null> {
    return this.items.find((s) => s.savedSearchId === id) ?? null;
  }

  async delete(id: string, actorId: string): Promise<boolean> {
    const idx = this.items.findIndex((s) => s.savedSearchId === id && s.actorId === actorId);
    if (idx < 0) return false;
    this.items.splice(idx, 1);
    return true;
  }
}

/** Actor-owned query definitions only — not SoT entity snapshots. */
export class FileSavedSearchRepository implements SavedSearchRepository {
  private readonly items: SavedSearch[] = [];
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
        this.items.push(JSON.parse(line) as SavedSearch);
      } catch {
        // skip corrupt lines
      }
    }
  }

  private rewrite(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const body = this.items.map((s) => JSON.stringify(s)).join("\n");
    writeFileSync(this.filePath, body ? `${body}\n` : "", "utf8");
  }

  async save(record: SavedSearch): Promise<void> {
    this.ensureLoaded();
    this.items.push(record);
    mkdirSync(dirname(this.filePath), { recursive: true });
    appendFileSync(this.filePath, `${JSON.stringify(record)}\n`, "utf8");
  }

  async listByActor(actorId: string): Promise<SavedSearch[]> {
    this.ensureLoaded();
    return this.items
      .filter((s) => s.actorId === actorId)
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  }

  async findById(id: string): Promise<SavedSearch | null> {
    this.ensureLoaded();
    return this.items.find((s) => s.savedSearchId === id) ?? null;
  }

  async delete(id: string, actorId: string): Promise<boolean> {
    this.ensureLoaded();
    const idx = this.items.findIndex((s) => s.savedSearchId === id && s.actorId === actorId);
    if (idx < 0) return false;
    this.items.splice(idx, 1);
    this.rewrite();
    return true;
  }
}
