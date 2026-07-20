import type { SourceAdapter, SourceAdapterInput } from "./source-adapter.js";
import { guessMime, type RawSourceFile } from "../stages/classify.js";

/** Multi-file SourceAdapter — flat list of resume/docs. */
export class MultiFileSourceAdapter implements SourceAdapter {
  readonly kind = "multi_file" as const;

  async extract(input: SourceAdapterInput): Promise<{ label: string; files: RawSourceFile[] }> {
    const files: RawSourceFile[] = input.parts
      .filter((p) => !p.filename.toLowerCase().endsWith(".zip"))
      .map((p) => ({
        path: p.relativePath ?? p.filename,
        filename: basename(p.filename),
        mimeType: p.mimeType || guessMime(p.filename),
        buffer: p.buffer,
      }));
    const label = files.length === 1 ? files[0].filename : `${files.length} files`;
    return { label, files };
  }
}

function basename(p: string): string {
  const n = p.replace(/\\/g, "/");
  return n.includes("/") ? n.slice(n.lastIndexOf("/") + 1) : n;
}
