import { describe, expect, it } from "vitest";
import { Resume } from "../../src/modules/candidate/domain/resume/resume.js";
import { ResumeId } from "../../src/modules/candidate/domain/resume/resume-id.js";
import { ResumeMetadata } from "../../src/modules/candidate/domain/resume/resume-metadata.js";
import { ResumeVersion } from "../../src/modules/candidate/domain/resume/resume-version.js";

describe("Resume aggregate", () => {
  it("creates immutable versioned resume", () => {
    const resume = Resume.create({
      id: ResumeId.create("resume_001"),
      candidateId: "candidate_001",
      workspaceId: "ws_001",
      version: ResumeVersion.initial(),
      storageRef: "ws_001/resume_001/file.pdf",
      metadata: ResumeMetadata.create({
        filename: "file.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 1024,
        sourceType: "manual_upload",
        uploadedAt: "2026-07-09T00:00:00.000Z",
      }),
    });

    expect(resume.version.toNumber()).toBe(1);
    expect(resume.metadata.filename).toBe("file.pdf");
  });

  it("rejects invalid resume version", () => {
    expect(() => ResumeVersion.create(0)).toThrow();
  });
});
