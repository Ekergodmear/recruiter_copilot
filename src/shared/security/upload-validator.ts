import JSZip from "jszip";
import { SecurityError } from "./errors.js";
import { sanitizeUploadFilename } from "./filename.js";

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const EXT_TO_MIME: Record<string, string> = {
  pdf: PDF_MIME,
  docx: DOCX_MIME,
};

const ALLOWED_MIME = new Set([PDF_MIME, DOCX_MIME]);

export type ValidatedUpload = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
};

/**
 * Early upload validation — no parser / domain changes.
 * Rejects empty, oversized, bad mime/ext, and obviously corrupt PDF/DOCX.
 */
export async function validateResumeUpload(params: {
  buffer: Buffer;
  filename: string;
  reportedMime?: string;
  maxFileSizeBytes: number;
}): Promise<ValidatedUpload> {
  const filename = sanitizeUploadFilename(params.filename);
  const buffer = params.buffer;

  if (!buffer || buffer.length === 0) {
    throw new SecurityError("EMPTY_FILE", "Uploaded file is empty", 400);
  }
  if (buffer.length > params.maxFileSizeBytes) {
    throw new SecurityError("FILE_TOO_LARGE", "File exceeds maximum size", 413);
  }

  const ext = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";
  const mimeFromExt = EXT_TO_MIME[ext];
  if (!mimeFromExt) {
    throw new SecurityError(
      "UNSUPPORTED_FORMAT",
      "Unsupported file extension (pdf or docx required)",
      400,
    );
  }

  const reported = (params.reportedMime ?? "").toLowerCase().split(";")[0]!.trim();
  const mimeType = reported && reported !== "application/octet-stream" ? reported : mimeFromExt;

  if (!ALLOWED_MIME.has(mimeType)) {
    throw new SecurityError("UNSUPPORTED_FORMAT", `Unsupported mime type: ${mimeType}`, 400);
  }
  if (mimeType !== mimeFromExt) {
    throw new SecurityError("UNSUPPORTED_FORMAT", "MIME type does not match file extension", 400);
  }

  if (mimeType === PDF_MIME) {
    assertPdfMagic(buffer);
  } else {
    await assertDocxStructure(buffer);
  }

  return { buffer, filename, mimeType };
}

function assertPdfMagic(buffer: Buffer): void {
  const head = buffer.subarray(0, 5).toString("latin1");
  if (head !== "%PDF-") {
    throw new SecurityError("CORRUPT_FILE", "PDF file appears corrupted or invalid", 422);
  }
}

async function assertDocxStructure(buffer: Buffer): Promise<void> {
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new SecurityError("CORRUPT_FILE", "DOCX file appears corrupted or invalid", 422);
  }
  try {
    const zip = await JSZip.loadAsync(buffer);
    if (!zip.file("[Content_Types].xml") || !zip.file("word/document.xml")) {
      throw new SecurityError("CORRUPT_FILE", "DOCX file appears corrupted or invalid", 422);
    }
  } catch (err) {
    if (err instanceof SecurityError) throw err;
    throw new SecurityError("CORRUPT_FILE", "DOCX file appears corrupted or invalid", 422);
  }
}
