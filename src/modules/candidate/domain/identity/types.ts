export type ParsedNameSource = "header" | "heuristic";

export type ParsedName = {
  value: string;
  confidence: number;
  source: ParsedNameSource;
};

export type CandidateIdentity = {
  fingerprint: string;
  email: string | null;
  phone: string | null;
  parsedName: ParsedName;
};

export type DuplicateMatch = {
  candidateId: string;
  name: string;
  score: number;
};
