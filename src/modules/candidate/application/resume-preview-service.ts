import { CandidateId } from "../domain/candidate/candidate-id.js";
import { ResumeId } from "../domain/resume/resume-id.js";
import { createResumeDocument, type ResumeDocument } from "../domain/resume/resume-document.js";
import type { CandidateRepository } from "../infrastructure/persistence/candidate-repository.js";
import type { ResumeRepository } from "../infrastructure/persistence/resume-repository.js";
import type { StoragePort } from "../infrastructure/storage/storage-port.js";
import { ResumeDocumentViewer, type RenderedResumePreview } from "./resume-document-viewer.js";

export class ResumePreviewError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ResumePreviewError";
  }
}

export type ResumePreviewMetadata = {
  candidateId: string;
  resumeId: string;
  filename: string;
  mimeType: string;
  viewerType: ResumeDocument["viewerType"];
  fileSizeBytes: number;
  contentUrl: string;
};

export class ResumePreviewService {
  private readonly viewer = new ResumeDocumentViewer();

  constructor(
    private readonly deps: {
      candidateRepository: CandidateRepository;
      resumeRepository: ResumeRepository;
      storage: StoragePort;
    },
  ) {}

  async getPreviewMetadata(candidateId: string): Promise<ResumePreviewMetadata> {
    const document = await this.loadDocument(candidateId);
    return {
      candidateId: document.candidateId,
      resumeId: document.resumeId,
      filename: document.filename,
      mimeType: document.mimeType,
      viewerType: document.viewerType,
      fileSizeBytes: document.fileSizeBytes,
      contentUrl: `/api/v1/candidates/${candidateId}/resume/content`,
    };
  }

  async renderPreview(candidateId: string): Promise<RenderedResumePreview> {
    const document = await this.loadDocument(candidateId);
    return this.viewer.render(document);
  }

  private async loadDocument(candidateId: string): Promise<ResumeDocument> {
    const id = CandidateId.create(candidateId);
    const record = await this.deps.candidateRepository.findById(id);
    if (!record) {
      throw new ResumePreviewError("NOT_FOUND", `Candidate not found: ${candidateId}`);
    }

    const resume = await this.deps.resumeRepository.findById(ResumeId.create(record.resumeId));
    if (!resume) {
      throw new ResumePreviewError(
        "RESUME_NOT_FOUND",
        `Resume not found for candidate: ${candidateId}`,
      );
    }

    const buffer = await this.deps.storage.read(resume.storageRef);
    return createResumeDocument({
      candidateId,
      resumeId: record.resumeId,
      filename: resume.metadata.filename,
      mimeType: resume.metadata.mimeType,
      buffer,
    });
  }
}
