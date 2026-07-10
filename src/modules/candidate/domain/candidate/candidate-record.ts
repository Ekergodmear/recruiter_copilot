import { Candidate } from "../candidate/candidate.js";
import type { VerifiedKnowledge } from "../knowledge/verified-knowledge.js";
import { CandidateProfile } from "../candidate/candidate-profile.js";
import { parseSkills } from "../knowledge/verified-knowledge.js";

export class CandidateRecord {
  private constructor(
    readonly candidate: Candidate,
    readonly knowledge: VerifiedKnowledge,
    readonly resumeVersion: number,
    readonly resumeId: string,
  ) {}

  static create(params: {
    candidate: Candidate;
    knowledge: VerifiedKnowledge;
    resumeVersion: number;
    resumeId: string;
  }): CandidateRecord {
    return new CandidateRecord(
      params.candidate,
      params.knowledge,
      params.resumeVersion,
      params.resumeId,
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
    return new CandidateRecord(updatedCandidate, knowledge, this.resumeVersion, this.resumeId);
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
