export class ResumeId {
  private constructor(readonly value: string) {}

  static create(value: string): ResumeId {
    if (!value.trim()) {
      throw new Error("ResumeId cannot be empty");
    }
    return new ResumeId(value);
  }

  toString(): string {
    return this.value;
  }
}
