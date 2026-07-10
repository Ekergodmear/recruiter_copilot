export type ImportResumeCommand = {
  file: Buffer;
  filename: string;
  mimeType: string;
  sourceType: string;
  workspaceId: string;
  actorId?: string;
};

export type ImportResumeResult = {
  candidateId: string;
  name: string;
  summary: string;
  skills: string[];
  resumeVersion: number;
};

export class ImportResumeError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ImportResumeError";
  }
}
