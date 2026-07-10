import { ResumeId } from "./resume-id.js";
import { ResumeMetadata } from "./resume-metadata.js";
import { ResumeVersion } from "./resume-version.js";

export class Resume {
  private constructor(
    readonly id: ResumeId,
    readonly candidateId: string,
    readonly workspaceId: string,
    readonly version: ResumeVersion,
    readonly storageRef: string,
    readonly metadata: ResumeMetadata,
  ) {}

  static create(params: {
    id: ResumeId;
    candidateId: string;
    workspaceId: string;
    version: ResumeVersion;
    storageRef: string;
    metadata: ResumeMetadata;
  }): Resume {
    return new Resume(
      params.id,
      params.candidateId,
      params.workspaceId,
      params.version,
      params.storageRef,
      params.metadata,
    );
  }

  get idValue(): string {
    return this.id.toString();
  }
}
