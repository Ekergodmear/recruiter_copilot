import { createHash } from "node:crypto";
import type { DocumentClass } from "../../domain/ingestion-job.js";

export type RawSourceFile = {
  path: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

export function contentHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function packageFingerprint(hashes: string[]): string {
  const sorted = [...hashes].sort();
  return createHash("sha256").update(sorted.join("|")).digest("hex");
}

export function classifyDocument(file: RawSourceFile): DocumentClass {
  const name = file.filename.toLowerCase();
  const path = file.path.toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";

  if (["jpg", "jpeg", "png", "gif", "webp", "txt", "md", "exe", "dmg"].includes(ext)) {
    return "unsupported";
  }
  if (
    ["xlsx", "xls", "csv"].includes(ext) ||
    /salary|compensation|band|payroll/.test(name + path)
  ) {
    return "salary";
  }
  if (
    /(?:^|\/|\\)(?:jd|job[-_\s]?desc|job[-_\s]?description|requirement)/i.test(path + "/" + name) ||
    /\b(jd|job[-_\s]?description)\b/i.test(name)
  ) {
    return "jd";
  }
  if (["pdf", "doc", "docx"].includes(ext)) {
    if (/offer|contract|nda|invoice/.test(name)) return "other";
    return "cv";
  }
  return "unsupported";
}

export function guessMime(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (ext === "doc") return "application/msword";
  if (ext === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/octet-stream";
}
