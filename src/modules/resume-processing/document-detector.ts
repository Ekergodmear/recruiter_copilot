import type { DocumentDetectionResult, DocumentFormat } from "./types.js";

const MIME_MAP: Record<string, DocumentFormat> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/png": "image",
  "image/jpeg": "image",
};

export function detectDocument(
  mimeType: string,
  hasSelectableText?: boolean,
): DocumentDetectionResult {
  const format = MIME_MAP[mimeType] ?? "unknown";
  const requiresOcr = format === "image" || (format === "pdf" && hasSelectableText === false);

  return { format, mimeType, requiresOcr };
}
