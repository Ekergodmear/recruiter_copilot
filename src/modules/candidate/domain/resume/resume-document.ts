import { detectDocument } from "../../../resume-processing/document-detector.js";
import type { DocumentFormat } from "../../../resume-processing/types.js";

export type ResumeViewerType = "pdf" | "docx" | "plain_text" | "ocr_image";

export type ResumeDocument = {
  candidateId: string;
  resumeId: string;
  filename: string;
  mimeType: string;
  format: DocumentFormat;
  viewerType: ResumeViewerType;
  buffer: Buffer;
  fileSizeBytes: number;
};

export function resolveViewerType(format: DocumentFormat): ResumeViewerType {
  switch (format) {
    case "pdf":
      return "pdf";
    case "docx":
      return "docx";
    case "image":
      return "ocr_image";
    default:
      return "plain_text";
  }
}

export function createResumeDocument(params: {
  candidateId: string;
  resumeId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): ResumeDocument {
  const detection = detectDocument(params.mimeType);
  return {
    candidateId: params.candidateId,
    resumeId: params.resumeId,
    filename: params.filename,
    mimeType: params.mimeType,
    format: detection.format,
    viewerType: resolveViewerType(detection.format),
    buffer: params.buffer,
    fileSizeBytes: params.buffer.length,
  };
}
