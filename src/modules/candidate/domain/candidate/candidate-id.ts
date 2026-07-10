export class CandidateId {
  private constructor(readonly value: string) {}

  static create(value: string): CandidateId {
    if (!value.trim()) {
      throw new Error("CandidateId cannot be empty");
    }
    return new CandidateId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: CandidateId): boolean {
    return this.value === other.value;
  }
}
