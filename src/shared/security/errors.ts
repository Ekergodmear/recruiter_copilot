/** Presentation-layer security errors — HTTP shape matches existing `{ error, message }`. */
export class SecurityError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "SecurityError";
  }
}
