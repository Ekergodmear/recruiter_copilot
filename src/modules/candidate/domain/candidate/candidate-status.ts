export type CandidateStatusValue = "draft" | "active" | "archived";

export class CandidateStatus {
  private constructor(readonly value: CandidateStatusValue) {}

  static draft(): CandidateStatus {
    return new CandidateStatus("draft");
  }

  static active(): CandidateStatus {
    return new CandidateStatus("active");
  }

  static archived(): CandidateStatus {
    return new CandidateStatus("archived");
  }

  /** Persistence rehydrate — not a business transition. */
  static from(value: CandidateStatusValue): CandidateStatus {
    return new CandidateStatus(value);
  }

  toString(): string {
    return this.value;
  }
}
