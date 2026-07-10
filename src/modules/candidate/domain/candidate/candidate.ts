import { CandidateId } from "./candidate-id.js";
import { CandidateProfile } from "./candidate-profile.js";
import { CandidateStatus } from "./candidate-status.js";

export class Candidate {
  private constructor(
    readonly id: CandidateId,
    readonly workspaceId: string,
    readonly status: CandidateStatus,
    readonly profile: CandidateProfile,
    readonly createdAt: string,
  ) {}

  static create(params: {
    id: CandidateId;
    workspaceId: string;
    profile: CandidateProfile;
    createdAt: string;
  }): Candidate {
    return new Candidate(
      params.id,
      params.workspaceId,
      CandidateStatus.active(),
      params.profile,
      params.createdAt,
    );
  }

  get idValue(): string {
    return this.id.toString();
  }
}
