import { Candidate } from "../candidate/candidate.js";
import type { VerifiedKnowledge } from "../knowledge/verified-knowledge.js";
import { CandidateProfile } from "../candidate/candidate-profile.js";
import { parseSkills } from "../knowledge/verified-knowledge.js";
import type { CandidateIdentity } from "../identity/types.js";

export class CandidateRecord {
  private constructor(
    readonly candidate: Candidate,
    readonly knowledge: VerifiedKnowledge,
    readonly resumeVersion: number,
    readonly resumeId: string,
    readonly identity: CandidateIdentity | null,
  ) {}

  static create(params: {
    candidate: Candidate;
    knowledge: VerifiedKnowledge;
    resumeVersion: number;
    resumeId: string;
    identity?: CandidateIdentity | null;
  }): CandidateRecord {
    return new CandidateRecord(
      params.candidate,
      params.knowledge,
      params.resumeVersion,
      params.resumeId,
      params.identity ?? null,
    );
  }

  get candidateId(): string {
    return this.candidate.idValue;
  }

  withKnowledge(knowledge: VerifiedKnowledge): CandidateRecord {
    const profile = this.toDisplayProfile(knowledge);
    const updatedCandidate = Candidate.create({
      id: this.candidate.id,
      workspaceId: this.candidate.workspaceId,
      profile,
      createdAt: this.candidate.createdAt,
    });
    return new CandidateRecord(
      updatedCandidate,
      knowledge,
      this.resumeVersion,
      this.resumeId,
      this.identity,
    );
  }

  withIdentity(identity: CandidateIdentity): CandidateRecord {
    return new CandidateRecord(
      this.candidate,
      this.knowledge,
      this.resumeVersion,
      this.resumeId,
      identity,
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
