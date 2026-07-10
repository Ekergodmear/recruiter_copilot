export const PROVENANCE_SOURCES = [
  "Resume",
  "Gemini",
  "Deterministic",
  "Recruiter Review",
  "LinkedIn",
  "Interview",
  "Client Feedback",
  "Assessment",
  "GitHub",
] as const;

export type ProvenanceSource = (typeof PROVENANCE_SOURCES)[number];

export const VERIFICATION_METHODS = [
  "AI",
  "Human",
  "Interview",
  "Assessment",
  "Client Feedback",
] as const;

export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export type KnowledgeProvenance = {
  source: ProvenanceSource;
  confidence?: number;
  providerId?: string;
};

export type RevisionAction = "accept" | "edit" | "reject" | "verify";

export type RevisionEntry = {
  value: string;
  actorId: string;
  recordedAt: string;
  reason?: string | null;
  action: RevisionAction;
};

export function formatProvenanceConfidence(provenance: KnowledgeProvenance): string {
  if (provenance.source === "Recruiter Review") {
    return "Human Verified";
  }
  if (provenance.confidence !== undefined) {
    return `${Math.round(provenance.confidence * 100)}%`;
  }
  return "—";
}
