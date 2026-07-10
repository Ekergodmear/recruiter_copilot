import type { ParsedDocument } from "./types.js";

export interface DocumentParser {
  readonly format: ParsedDocument["format"];
  parse(buffer: Buffer): Promise<string>;
}

export class PdfParser implements DocumentParser {
  readonly format = "pdf" as const;

  async parse(buffer: Buffer): Promise<string> {
    try {
      const { default: pdfParse } = await import("pdf-parse");
      const result = await pdfParse(buffer);
      return result.text ?? "";
    } catch {
      return "";
    }
  }
}

export class DocxParser implements DocumentParser {
  readonly format = "docx" as const;

  async parse(buffer: Buffer): Promise<string> {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }
}

export function getParser(format: ParsedDocument["format"]): DocumentParser | null {
  if (format === "pdf") return new PdfParser();
  if (format === "docx") return new DocxParser();
  return null;
}
