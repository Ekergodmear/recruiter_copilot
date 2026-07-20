import { basename } from "node:path";

const SAFE_NAME = /[^a-zA-Z0-9._\- ()[\]]+/g;

/**
 * Never trust client filename — strip paths, null bytes, and normalize.
 */
export function sanitizeUploadFilename(raw: string | undefined | null): string {
  // Normalize Windows separators so POSIX basename also strips path traversal.
  const normalized = String(raw ?? "upload.bin")
    .replace(/\0/g, "")
    .replace(/\\/g, "/");
  const base = basename(normalized);
  const cleaned = base.replace(SAFE_NAME, "_").replace(/^\.+/, "").trim();
  if (!cleaned || cleaned === "." || cleaned === "..") return "upload.bin";
  return cleaned.slice(0, 180);
}
