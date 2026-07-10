import { getParser } from "../../resume-processing/document-parsers.js";
import type { ResumeDocument, ResumeViewerType } from "../domain/resume/resume-document.js";

export type RenderedResumePreview = {
  viewerType: ResumeViewerType;
  contentType: string;
  body: Buffer | string;
  filename: string;
};

export class ResumeDocumentViewer {
  async render(document: ResumeDocument): Promise<RenderedResumePreview> {
    switch (document.viewerType) {
      case "pdf":
        return this.renderPdf(document);
      case "docx":
        return this.renderDocx(document);
      case "ocr_image":
        return this.renderOcrPlaceholder(document);
      default:
        return this.renderPlainText(document);
    }
  }

  private renderPdf(document: ResumeDocument): RenderedResumePreview {
    return {
      viewerType: "pdf",
      contentType: "application/pdf",
      body: document.buffer,
      filename: document.filename,
    };
  }

  private async renderDocx(document: ResumeDocument): Promise<RenderedResumePreview> {
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml({ buffer: document.buffer });
    return {
      viewerType: "docx",
      contentType: "text/html; charset=utf-8",
      body: wrapHtmlDocument(document.filename, result.value),
      filename: document.filename,
    };
  }

  private async renderPlainText(document: ResumeDocument): Promise<RenderedResumePreview> {
    const parser = document.format !== "unknown" ? getParser(document.format) : null;
    let text = "";
    if (parser) {
      try {
        text = await parser.parse(document.buffer);
      } catch {
        text = "";
      }
    }
    if (!text.trim()) {
      text = document.buffer.toString("utf-8");
    }

    return {
      viewerType: "plain_text",
      contentType: "text/plain; charset=utf-8",
      body: text,
      filename: document.filename,
    };
  }

  private renderOcrPlaceholder(document: ResumeDocument): RenderedResumePreview {
    return {
      viewerType: "ocr_image",
      contentType: "text/html; charset=utf-8",
      body: wrapHtmlDocument(
        document.filename,
        `<p><strong>OCR image preview</strong> is planned for Phase 2.</p>
         <p>File: ${escapeHtml(document.filename)} (${document.mimeType})</p>`,
      ),
      filename: document.filename,
    };
  }
}

function wrapHtmlDocument(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Georgia, serif; margin: 16px; line-height: 1.5; color: #111; }
    p { margin: 0 0 12px; }
  </style>
</head>
<body>${content}</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
