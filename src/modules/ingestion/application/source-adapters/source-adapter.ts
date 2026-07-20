import type { RawSourceFile } from "../stages/classify.js";
import type { SourceKind } from "../../domain/ingestion-job.js";

/**
 * SourceAdapter — pluggable intake. MVP: Zip / Folder / MultiFile.
 * Future: Gmail / Drive / … feed the same RawSourceFile[] into the engine.
 */
export interface SourceAdapter {
  readonly kind: SourceKind;
  extract(input: SourceAdapterInput): Promise<{ label: string; files: RawSourceFile[] }>;
}

export type SourceAdapterInput = {
  /** Uploaded parts from HTTP (or future remote listing). */
  parts: { filename: string; mimeType: string; buffer: Buffer; relativePath?: string }[];
};
