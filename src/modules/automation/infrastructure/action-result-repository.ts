import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ActionResult } from "../domain/types.js";

export interface ActionResultRepository {
  append(result: ActionResult): Promise<void>;
  list(): Promise<ActionResult[]>;
  findSuccessfulSend(
    relationshipId: string,
    draftFingerprint: string,
  ): Promise<ActionResult | null>;
}

export class InMemoryActionResultRepository implements ActionResultRepository {
  private readonly items: ActionResult[] = [];

  async append(result: ActionResult): Promise<void> {
    this.items.push(result);
  }

  async list(): Promise<ActionResult[]> {
    return [...this.items];
  }

  async findSuccessfulSend(
    relationshipId: string,
    draftFingerprint: string,
  ): Promise<ActionResult | null> {
    return (
      this.items.find(
        (r) =>
          r.success &&
          r.actionType === "send_outreach" &&
          r.target.relationshipId === relationshipId &&
          r.target.draftFingerprint === draftFingerprint,
      ) ?? null
    );
  }
}

/** Lightweight append-only JSONL under STORAGE_PATH — MVP attribution, not full Audit EPIC. */
export class FileActionResultRepository implements ActionResultRepository {
  private readonly items: ActionResult[] = [];
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
        this.items.push(JSON.parse(line) as ActionResult);
      } catch {
        // skip corrupt lines
      }
    }
  }

  async append(result: ActionResult): Promise<void> {
    this.ensureLoaded();
    this.items.push(result);
    mkdirSync(dirname(this.filePath), { recursive: true });
    appendFileSync(this.filePath, `${JSON.stringify(result)}\n`, "utf8");
  }

  async list(): Promise<ActionResult[]> {
    this.ensureLoaded();
    return [...this.items];
  }

  async findSuccessfulSend(
    relationshipId: string,
    draftFingerprint: string,
  ): Promise<ActionResult | null> {
    this.ensureLoaded();
    return (
      this.items.find(
        (r) =>
          r.success &&
          r.actionType === "send_outreach" &&
          r.target.relationshipId === relationshipId &&
          r.target.draftFingerprint === draftFingerprint,
      ) ?? null
    );
  }
}
