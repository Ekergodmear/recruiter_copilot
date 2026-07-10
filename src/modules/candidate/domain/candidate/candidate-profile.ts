export type SkillProfile = {
  skillId: string;
  normalizedName: string;
  confidence: number;
};

export class CandidateProfile {
  private constructor(
    readonly name: string,
    readonly summary: string,
    readonly skills: readonly SkillProfile[],
    readonly englishLevel: string,
  ) {}

  static create(params: {
    name: string;
    summary: string;
    skills: SkillProfile[];
    englishLevel: string;
  }): CandidateProfile {
    return new CandidateProfile(
      params.name,
      params.summary,
      Object.freeze([...params.skills]),
      params.englishLevel,
    );
  }

  withOverrides(params: {
    name?: string;
    summary?: string;
    skills?: SkillProfile[];
    englishLevel?: string;
  }): CandidateProfile {
    return CandidateProfile.create({
      name: params.name ?? this.name,
      summary: params.summary ?? this.summary,
      skills: params.skills ? [...params.skills] : [...this.skills],
      englishLevel: params.englishLevel ?? this.englishLevel,
    });
  }
}
