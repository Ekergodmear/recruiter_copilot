import { buildFingerprint } from "./fingerprint.js";
import { extractParsedName } from "./name-heuristic.js";
import { findDuplicateMatches, type IdentityComparable } from "./duplicate-score.js";
import type { CandidateIdentity, DuplicateMatch, ParsedName } from "./types.js";

export class CandidateIdentityService {
  extractName(rawText: string): ParsedName {
    return extractParsedName(rawText);
  }

  buildIdentity(params: {
    name: string;
    email?: string | null;
    phone?: string | null;
    parsedName: ParsedName;
  }): CandidateIdentity {
    return {
      fingerprint: buildFingerprint({
        name: params.name,
        email: params.email,
        phone: params.phone,
      }),
      email: params.email?.trim() || null,
      phone: params.phone?.trim() || null,
      parsedName: params.parsedName,
    };
  }

  findDuplicates(target: IdentityComparable, others: IdentityComparable[]): DuplicateMatch[] {
    return findDuplicateMatches(target, others);
  }
}

export type { ParsedName, CandidateIdentity, DuplicateMatch, IdentityComparable };
export { extractParsedName } from "./name-heuristic.js";
export { buildFingerprint } from "./fingerprint.js";
export { normalizeName, normalizeEmail, normalizePhone } from "./normalize.js";
export { scoreDuplicate, findDuplicateMatches } from "./duplicate-score.js";
