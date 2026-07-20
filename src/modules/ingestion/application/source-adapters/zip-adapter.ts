import JSZip from "jszip";
import type { SourceAdapter, SourceAdapterInput } from "./source-adapter.js";
import { guessMime, type RawSourceFile } from "../stages/classify.js";

const MAX_UNCOMPRESSED_BYTES = 200 * 1024 * 1024;
const MAX_ENTRIES = 2000;

/** ZIP SourceAdapter — extract + nested walk; zip-slip safe. */
export class ZipSourceAdapter implements SourceAdapter {
  readonly kind = "zip" as const;

  async extract(input: SourceAdapterInput): Promise<{ label: string; files: RawSourceFile[] }> {
    const zipPart = input.parts.find((p) => p.filename.toLowerCase().endsWith(".zip"));
    if (!zipPart) {
      throw new Error("ZipSourceAdapter requires a .zip part");
    }
    const zip = await JSZip.loadAsync(zipPart.buffer);
    const files: RawSourceFile[] = [];
    let total = 0;

    const entries = Object.values(zip.files);
    if (entries.length > MAX_ENTRIES) {
      throw new Error(`ZIP too many entries (max ${MAX_ENTRIES})`);
    }

    for (const entry of entries) {
      if (entry.dir) continue;
      const name = entry.name.replace(/\\/g, "/");
      // zip-slip: reject any path with .. segments (JSZip may normalize ../x → x)
      if (name.split("/").includes("..") || entry.name.includes("..") || name.startsWith("/")) {
        continue;
      }
      if (name.startsWith("__MACOSX/") || name.endsWith(".DS_Store")) continue;

      const buffer = Buffer.from(await entry.async("uint8array"));
      total += buffer.byteLength;
      if (total > MAX_UNCOMPRESSED_BYTES) {
        throw new Error("ZIP uncompressed size exceeds limit");
      }
      const filename = name.includes("/") ? name.slice(name.lastIndexOf("/") + 1) : name;
      if (!filename) continue;
      files.push({
        path: name,
        filename,
        mimeType: guessMime(filename),
        buffer,
      });
    }

    return { label: zipPart.filename, files };
  }
}
