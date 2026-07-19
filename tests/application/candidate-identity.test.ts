import { describe, expect, it } from "vitest";
import {
  extractParsedName,
  isRejectedHeader,
  isSymbolHeavyLine,
} from "../../src/modules/candidate/application/identity/name-heuristic.js";
import { buildFingerprint } from "../../src/modules/candidate/application/identity/fingerprint.js";
import { normalizeName } from "../../src/modules/candidate/application/identity/normalize.js";
import {
  findDuplicateMatches,
  scoreDuplicate,
} from "../../src/modules/candidate/application/identity/duplicate-score.js";
import { CandidateIdentityService } from "../../src/modules/candidate/application/identity/candidate-identity-service.js";

describe("Name heuristic", () => {
  it("skips ABOUT: and picks NGUYEN VAN A", () => {
    const parsed = extractParsedName(`ABOUT:

NGUYEN VAN A
Software Engineer
nguyen@example.com`);
    expect(parsed.value).toBe("NGUYEN VAN A");
    expect(parsed.confidence).toBeGreaterThan(0.5);
  });

  it("skips THÔNG TIN CÁ NHÂN", () => {
    expect(isRejectedHeader("THÔNG TIN CÁ NHÂN")).toBe(true);
    const parsed = extractParsedName(`THÔNG TIN CÁ NHÂN

Tran Quoc Cuong
Backend Developer`);
    expect(parsed.value.toLowerCase()).toContain("cuong");
    expect(parsed.value.toLowerCase()).not.toContain("thông tin");
  });

  it("skips symbol / icon lines", () => {
    expect(isSymbolHeavyLine("☎ ✉ 🌐")).toBe(true);
    const parsed = extractParsedName(`☎ ✉ 🌐

CHUNG CHI CUONG
Developer`);
    expect(parsed.value).toBe("CHUNG CHI CUONG");
  });

  it("prefers uppercase human name over Software Engineer", () => {
    const parsed = extractParsedName(`Software Engineer

NGUYEN VAN A
Hanoi`);
    expect(parsed.value).toBe("NGUYEN VAN A");
  });
});

describe("Fingerprint & normalize", () => {
  it("normalizes Vietnamese accents deterministically", () => {
    expect(normalizeName("Nguyễn Văn A")).toBe("nguyenvana");
    expect(buildFingerprint({ name: "Nguyễn Văn A", email: "A@B.Com", phone: "+84 90-111" })).toBe(
      buildFingerprint({ name: "Nguyen Van A", email: "a@b.com", phone: "8490111" }),
    );
  });

  it("same CV twice yields same fingerprint", () => {
    const identity = new CandidateIdentityService();
    const name = identity.extractName("CHUNG NGUYEN\nchung@example.com\n0901234567");
    const a = identity.buildIdentity({
      name: name.value,
      email: "chung@example.com",
      phone: "0901234567",
      parsedName: name,
    });
    const b = identity.buildIdentity({
      name: name.value,
      email: "chung@example.com",
      phone: "0901234567",
      parsedName: name,
    });
    expect(a.fingerprint).toBe(b.fingerprint);
  });
});

describe("Duplicate scoring", () => {
  it("fingerprint match → 100", () => {
    const fp = buildFingerprint({ name: "Chung Nguyen", email: "a@b.com", phone: "1" });
    expect(
      scoreDuplicate(
        { candidateId: "c1", name: "Chung Nguyen", fingerprint: fp },
        { candidateId: "c2", name: "Other", fingerprint: fp },
      ),
    ).toBe(100);
  });

  it("same name + email → ≥90", () => {
    expect(
      scoreDuplicate(
        { candidateId: "c1", name: "Nguyen Van A", email: "a@b.com" },
        { candidateId: "c2", name: "NGUYEN VAN A", email: "a@b.com" },
      ),
    ).toBeGreaterThanOrEqual(90);
  });

  it("same name + phone → ≥90", () => {
    expect(
      scoreDuplicate(
        { candidateId: "c1", name: "Nguyen Van A", phone: "0901111222" },
        { candidateId: "c2", name: "Nguyen Van A", phone: "090-111-1222" },
      ),
    ).toBeGreaterThanOrEqual(90);
  });

  it("name only does not flag duplicate", () => {
    expect(
      scoreDuplicate(
        { candidateId: "c1", name: "Nguyen Van A" },
        { candidateId: "c2", name: "Nguyen Van A" },
      ),
    ).toBeNull();
    expect(
      findDuplicateMatches({ candidateId: "c1", name: "Nguyen Van A" }, [
        { candidateId: "c2", name: "Nguyen Van A" },
      ]),
    ).toHaveLength(0);
  });
});
