export class ResumeMetadata {
  private constructor(
    readonly filename: string,
    readonly mimeType: string,
    readonly fileSizeBytes: number,
    readonly sourceType: string,
    readonly uploadedAt: string,
  ) {}

  static create(params: {
    filename: string;
    mimeType: string;
    fileSizeBytes: number;
    sourceType: string;
    uploadedAt: string;
  }): ResumeMetadata {
    return new ResumeMetadata(
      params.filename,
      params.mimeType,
      params.fileSizeBytes,
      params.sourceType,
      params.uploadedAt,
    );
  }
}
