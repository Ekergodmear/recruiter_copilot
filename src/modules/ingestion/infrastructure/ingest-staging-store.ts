import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ClassifiedDocument } from "../domain/ingestion-job.js";

/** Spill classified file bytes to disk so AwaitingConfirmation survives and HTTP stays light. */
export class IngestStagingStore {
  constructor(private readonly rootDir: string) {}

  stage(jobId: string, docs: ClassifiedDocument[]): void {
    const dir = join(this.rootDir, jobId);
    mkdirSync(dir, { recursive: true });
    for (const d of docs) {
      if (!d.bufferBase64) continue;
      writeFileSync(join(dir, d.contentHash), Buffer.from(d.bufferBase64, "base64"));
    }
  }

  read(jobId: string, contentHash: string): Buffer | undefined {
    const p = join(this.rootDir, jobId, contentHash);
    if (!existsSync(p)) return undefined;
    return readFileSync(p);
  }

  clear(jobId: string): void {
    const dir = join(this.rootDir, jobId);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  }
}
