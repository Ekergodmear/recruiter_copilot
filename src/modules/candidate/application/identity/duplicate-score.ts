import { buildFingerprint } from "./fingerprint.js";
import { normalizeEmail, normalizeName, normalizePhone } from "./normalize.js";
import type { DuplicateMatch } from "./types.js";

export type IdentityComparable = {
  candidateId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  fingerprint?: string | null;
};

/**
 * Score potential duplicates.
 * - fingerprint match → 100
 * - same name + email → ≥90
 * - same name + phone → ≥90
 * - name only → not a duplicate (return null)
 */
export function scoreDuplicate(left: IdentityComparable, right: IdentityComparable): number | null {
  if (left.candidateId === right.candidateId) return null;

  const leftFp =
    left.fingerprint || buildFingerprint({ name: left.name, email: left.email, phone: left.phone });
  const rightFp =
    right.fingerprint ||
    buildFingerprint({ name: right.name, email: right.email, phone: right.phone });

  // Fingerprint equality counts only when contact data is present.
  // Name-only fingerprints (name||) must not auto-flag duplicates (Story 3 AC-4).
  const fingerprintHasContact = (fp: string) => {
    const [, emailPart = "", phonePart = ""] = fp.split("|");
    return Boolean(emailPart || phonePart);
  };
  if (leftFp && rightFp && leftFp === rightFp && fingerprintHasContact(leftFp)) {
    return 100;
  }

  const sameName =
    Boolean(normalizeName(left.name)) && normalizeName(left.name) === normalizeName(right.name);
  if (!sameName) return null;

  const leftEmail = normalizeEmail(left.email);
  const rightEmail = normalizeEmail(right.email);
  if (leftEmail && rightEmail && leftEmail === rightEmail) {
    return 95;
  }

  const leftPhone = normalizePhone(left.phone);
  const rightPhone = normalizePhone(right.phone);
  if (leftPhone && rightPhone && leftPhone === rightPhone) {
    return 92;
  }

  // Name-only match is not treated as a duplicate warning.
  return null;
}

export function findDuplicateMatches(
  target: IdentityComparable,
  others: IdentityComparable[],
  minScore = 90,
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  for (const other of others) {
    const score = scoreDuplicate(target, other);
    if (score !== null && score >= minScore) {
      matches.push({
        candidateId: other.candidateId,
        name: other.name,
        score,
      });
    }
  }
  return matches.sort((a, b) => b.score - a.score);
}
