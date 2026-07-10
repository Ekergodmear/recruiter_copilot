import type { ParsedDocument } from "./types.js";

export interface OcrEngine {
  extractText(buffer: Buffer): Promise<string>;
}

export class NoOpOcrEngine implements OcrEngine {
  async extractText(): Promise<string> {
    return "";
  }
}

export async function applyOcrIfRequired(
  buffer: Buffer,
  requiresOcr: boolean,
  engine: OcrEngine,
  existingText: string,
): Promise<{ text: string; ocrApplied: boolean }> {
  if (!requiresOcr || existingText.trim().length > 0) {
    return { text: existingText, ocrApplied: false };
  }

  const ocrText = await engine.extractText(buffer);
  return { text: ocrText, ocrApplied: true };
}

export function buildParsedDocument(
  text: string,
  format: ParsedDocument["format"],
  ocrApplied: boolean,
  metadata: Record<string, string> = {},
): ParsedDocument {
  return { rawText: text, format, ocrApplied, metadata };
}
