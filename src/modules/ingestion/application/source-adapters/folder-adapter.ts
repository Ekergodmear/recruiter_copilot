import type { SourceAdapter, SourceAdapterInput } from "./source-adapter.js";
import { guessMime, type RawSourceFile } from "../stages/classify.js";

/**
 * Folder SourceAdapter — browser expands directory to FileList with webkitRelativePath.
 * Same pipeline as ZIP walk; paths preserve folder structure for classify heuristics.
 */
export class FolderSourceAdapter implements SourceAdapter {
  readonly kind = "folder" as const;

  async extract(input: SourceAdapterInput): Promise<{ label: string; files: RawSourceFile[] }> {
    const files: RawSourceFile[] = input.parts
      .filter((p) => !p.filename.toLowerCase().endsWith(".zip"))
      .map((p) => {
        const path = (p.relativePath ?? p.filename).replace(/\\/g, "/");
        const filename = path.includes("/") ? path.slice(path.lastIndexOf("/") + 1) : path;
        return {
          path,
          filename,
          mimeType: p.mimeType || guessMime(filename),
          buffer: p.buffer,
        };
      });
    const root = files[0]?.path.split("/")[0] ?? "folder";
    return { label: `${root}/ (${files.length} files)`, files };
  }
}
