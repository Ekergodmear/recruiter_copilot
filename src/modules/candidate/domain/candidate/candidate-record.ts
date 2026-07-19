import { Candidate } from "../candidate/candidate.js";
import type { VerifiedKnowledge } from "../knowledge/verified-knowledge.js";
import { CandidateProfile } from "../candidate/candidate-profile.js";
import { parseSkills } from "../knowledge/verified-knowledge.js";
import type { CandidateIdentity } from "../identity/types.js";
import {
  emptyCandidateWorkspace,
  mergeCandidateWorkspace,
  type CandidateWorkspace,
} from "./candidate-workspace.js";

export class CandidateRecord {
  private constructor(
    readonly candidate: Candidate,
    readonly knowledge: VerifiedKnowledge,
    readonly resumeVersion: number,
    readonly resumeId: string,
    readonly identity: CandidateIdentity | null,
    readonly workspace: CandidateWorkspace,
  ) {}

  static create(params: {
    candidate: Candidate;
    knowledge: VerifiedKnowledge;
    resumeVersion: number;
    resumeId: string;
    identity?: CandidateIdentity | null;
    workspace?: CandidateWorkspace | null;
  }): CandidateRecord {
    return new CandidateRecord(
      params.candidate,
      params.knowledge,
      params.resumeVersion,
      params.resumeId,
      params.identity ?? null,
      params.workspace ?? emptyCandidateWorkspace(params.knowledge.uploadedAt),
    );
  }

  get candidateId(): string {
    return this.candidate.idValue;
  }

  withKnowledge(knowledge: VerifiedKnowledge): CandidateRecord {
    const profile = this.toDisplayProfile(knowledge);
    const updatedCandidate = Candidate.restore({
      id: this.candidate.id,
      workspaceId: this.candidate.workspaceId,
      status: this.candidate.status,
      profile,
      createdAt: this.candidate.createdAt,
    });
    return new CandidateRecord(
      updatedCandidate,
      knowledge,
      this.resumeVersion,
      this.resumeId,
      this.identity,
      this.workspace,
    );
  }

  withIdentity(identity: CandidateIdentity): CandidateRecord {
    return new CandidateRecord(
      this.candidate,
      this.knowledge,
      this.resumeVersion,
      this.resumeId,
      identity,
      this.workspace,
    );
  }

  withName(name: string): CandidateRecord {
    const profile = this.candidate.profile.withOverrides({ name });
    const updatedCandidate = Candidate.restore({
      id: this.candidate.id,
      workspaceId: this.candidate.workspaceId,
      status: this.candidate.status,
      profile,
      createdAt: this.candidate.createdAt,
    });
    return new CandidateRecord(
      updatedCandidate,
      this.knowledge,
      this.resumeVersion,
      this.resumeId,
      this.identity,
      this.workspace,
    );
  }

  withWorkspace(patch: Partial<CandidateWorkspace>): CandidateRecord {
    return new CandidateRecord(
      this.candidate,
      this.knowledge,
      this.resumeVersion,
      this.resumeId,
      this.identity,
      mergeCandidateWorkspace(this.workspace, patch),
    );
  }

  toDisplayProfile(knowledge: VerifiedKnowledge = this.knowledge): CandidateProfile {
    const skillNames = parseSkills(knowledge.currentValue("skills"));
    return CandidateProfile.create({
      name: this.candidate.profile.name,
      summary: knowledge.currentValue("summary"),
      skills: skillNames.map((name) => ({
        skillId: `skill_${name.toLowerCase().replace(/\s+/g, "_")}`,
        normalizedName: name,
        confidence: 0.85,
      })),
      englishLevel: knowledge.currentValue("english"),
    });
  }
}
