import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import JSZip from "jszip";
import { SystemClock } from "../../src/shared/clock/index.js";
import { UuidIdGenerator } from "../../src/shared/id-generator/index.js";
import { IngestionEngine } from "../../src/modules/ingestion/application/ingestion-engine.js";
import {
  InMemoryFingerprintStore,
  InMemoryIngestionJobRepository,
} from "../../src/modules/ingestion/infrastructure/ingestion-job-repository.js";
import {
  classifyDocument,
  packageFingerprint,
  contentHash,
} from "../../src/modules/ingestion/application/stages/classify.js";
import { ZipSourceAdapter } from "../../src/modules/ingestion/application/source-adapters/zip-adapter.js";
import { createTestDocx } from "../helpers/create-test-docx.js";

function fakeImportService() {
  let n = 0;
  return {
    async importResume(command: { filename: string; file: Buffer }) {
      n += 1;
      return {
        candidateId: `cand_${createHash("sha256").update(command.file).digest("hex").slice(0, 8)}`,
        name: command.filename,
        summary: "ok",
        skills: ["Java"],
        resumeVersion: 1,
      };
    },
    get callCount() {
      return n;
    },
  };
}

describe("EPIC-015 Ingestion Engine", () => {
  it("classifies CV / JD / salary / unsupported", () => {
    expect(
      classifyDocument({
        path: "Java/a.pdf",
        filename: "a.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("x"),
      }),
    ).toBe("cv");
    expect(
      classifyDocument({
        path: "jd/Backend.pdf",
        filename: "Backend.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("x"),
      }),
    ).toBe("jd");
    expect(
      classifyDocument({
        path: "salary.xlsx",
        filename: "salary.xlsx",
        mimeType: "application/octet-stream",
        buffer: Buffer.from("x"),
      }),
    ).toBe("salary");
    expect(
      classifyDocument({
        path: "readme.txt",
        filename: "readme.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("x"),
      }),
    ).toBe("unsupported");
  });

  it("ZipSourceAdapter extracts nested files and skips mac junk", async () => {
    const zip = new JSZip();
    zip.file("Java/a.pdf", Buffer.from("%PDF-1.4 fake"));
    zip.file("__MACOSX/._x", Buffer.from("x"));
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    const adapter = new ZipSourceAdapter();
    const { files } = await adapter.extract({
      parts: [{ filename: "pack.zip", mimeType: "application/zip", buffer: buf }],
    });
    expect(files.map((f) => f.path)).toEqual(["Java/a.pdf"]);
  });

  it("creates Knowledge via pipeline; second package is idempotent", async () => {
    const docx = await createTestDocx(["Nguyen Van A", "Senior Java", "HCM"]);
    const importer = fakeImportService();
    const engine = new IngestionEngine({
      clock: new SystemClock(),
      idGenerator: new UuidIdGenerator(),
      jobs: new InMemoryIngestionJobRepository(),
      fingerprints: new InMemoryFingerprintStore(),
      candidateImport: importer as never,
      workspaceId: "ws_test",
      runInline: true,
    });

    const job1 = await engine.createJobFromUpload({
      parts: [
        {
          filename: "a.docx",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          buffer: docx,
        },
      ],
      sourceHint: "multi_file",
      autoConfirmScope: "cv",
    });
    expect(job1.status === "Completed" || job1.status === "CompletedWithWarnings").toBe(true);
    expect(job1.report?.imported).toBe(1);
    expect(importer.callCount).toBe(1);

    const job2 = await engine.createJobFromUpload({
      parts: [
        {
          filename: "a.docx",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          buffer: docx,
        },
      ],
      sourceHint: "multi_file",
      autoConfirmScope: "cv",
    });
    expect(job2.report?.imported).toBe(0);
    expect(job2.report!.duplicate).toBeGreaterThanOrEqual(1);
    expect(importer.callCount).toBe(1);
  });

  it("mixed package awaits confirmation before persist", async () => {
    const docx = await createTestDocx(["CV person"]);
    const engine = new IngestionEngine({
      clock: new SystemClock(),
      idGenerator: new UuidIdGenerator(),
      jobs: new InMemoryIngestionJobRepository(),
      fingerprints: new InMemoryFingerprintStore(),
      candidateImport: fakeImportService() as never,
      workspaceId: "ws_test",
      runInline: true,
    });

    const preview = await engine.createJobFromUpload({
      parts: [
        {
          filename: "cv.docx",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          buffer: docx,
        },
        {
          filename: "jd-backend.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("%PDF-1.4"),
          relativePath: "jd/jd-backend.pdf",
        },
      ],
      sourceHint: "folder",
    });
    expect(preview.status).toBe("AwaitingConfirmation");
    expect(preview.preview.cv).toBe(1);
    expect(preview.preview.jd).toBe(1);

    const done = await engine.confirmJob(preview.id, "cv");
    expect(done.report?.imported).toBe(1);
  });

  it("packageFingerprint is order-independent", () => {
    const a = contentHash(Buffer.from("1"));
    const b = contentHash(Buffer.from("2"));
    expect(packageFingerprint([a, b])).toBe(packageFingerprint([b, a]));
  });

  it("listJobs supports audit Ask history", async () => {
    const docx = await createTestDocx(["Audit"]);
    const jobs = new InMemoryIngestionJobRepository();
    const engine = new IngestionEngine({
      clock: new SystemClock(),
      idGenerator: new UuidIdGenerator(),
      jobs,
      fingerprints: new InMemoryFingerprintStore(),
      candidateImport: fakeImportService() as never,
      workspaceId: "ws_test",
      runInline: true,
    });
    await engine.createJobFromUpload({
      parts: [
        {
          filename: "a.docx",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          buffer: docx,
        },
      ],
      autoConfirmScope: "cv",
    });
    const list = await engine.listJobs();
    expect(list.length).toBe(1);
    expect(list[0].sourceLabel).toContain("a.docx");
  });
});
