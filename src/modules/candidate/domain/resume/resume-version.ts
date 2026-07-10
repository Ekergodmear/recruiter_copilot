export class ResumeVersion {
  private constructor(readonly value: number) {}

  static initial(): ResumeVersion {
    return new ResumeVersion(1);
  }

  static create(value: number): ResumeVersion {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error("ResumeVersion must be a positive integer");
    }
    return new ResumeVersion(value);
  }

  toNumber(): number {
    return this.value;
  }
}
