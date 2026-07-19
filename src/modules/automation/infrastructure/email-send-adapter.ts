import { createHash } from "node:crypto";

export type SendOutreachPayload = {
  to: string;
  subject: string;
  body: string;
  candidateId: string;
  jobId: string;
  relationshipId: string;
  actorId: string;
};

export type SendOutreachOutcome = {
  providerId: string;
  messageId: string;
  draftFingerprint: string;
};

export interface EmailSendAdapter {
  send(payload: SendOutreachPayload): Promise<SendOutreachOutcome>;
}

export function draftFingerprint(body: string): string {
  return createHash("sha256").update(body.trim()).digest("hex").slice(0, 16);
}

/**
 * CI / Alpha default — records send attempt without SMTP product.
 * Not a second email platform; real providers can plug in later without TECH redesign.
 */
export class MockEmailSendAdapter implements EmailSendAdapter {
  readonly sent: SendOutreachPayload[] = [];

  async send(payload: SendOutreachPayload): Promise<SendOutreachOutcome> {
    this.sent.push(payload);
    const fp = draftFingerprint(payload.body);
    return {
      providerId: "mock-email",
      messageId: `msg_${fp}`,
      draftFingerprint: fp,
    };
  }
}
