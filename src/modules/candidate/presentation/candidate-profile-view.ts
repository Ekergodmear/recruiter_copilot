import type { CandidateProfile, SkillProfile } from "../domain/candidate/candidate-profile.js";

export type CandidateProfileView = {
  candidateId: string;
  name: string;
  summary: string;
  skills: string[];
  resumeVersion: number;
};

export function toCandidateProfileView(params: {
  candidateId: string;
  profile: CandidateProfile;
  resumeVersion: number;
}): CandidateProfileView {
  return {
    candidateId: params.candidateId,
    name: params.profile.name,
    summary: params.profile.summary,
    skills: params.profile.skills.map((s: SkillProfile) => s.normalizedName),
    resumeVersion: params.resumeVersion,
  };
}
