import type { ParsedName } from "./types.js";

const REJECTED_HEADERS = new Set(
  [
    "about",
    "about:",
    "profile",
    "profile:",
    "summary",
    "objective",
    "curriculum vitae",
    "cv",
    "resume",
    "personal information",
    "personal details",
    "thong tin ca nhan",
    "thông tin cá nhân",
    "gioi thieu",
    "giới thiệu",
    "tong quan",
    "tổng quan",
    "cong nghe",
    "công nghệ",
    "chi so chat luong",
    "chỉ số chất lượng",
    "contact",
    "contacts",
    "experience",
    "experiences",
    "working experience",
    "work experience",
    "education",
    "education and certificate",
    "certifications",
    "skills",
    "skills/proficiencies",
    "language programming",
    "framework",
    "database",
    "ui library",
    "work experience",
    "professional summary",
  ].map((h) => normalizeHeader(h)),
);

const NON_NAME_TOKENS =
  /\b(engineer|developer|software|frontend|backend|fullstack|manager|intern|consultant|analyst|designer|architect|specialist|lead|director|officer|experience|experiences|education|skills|availability|performance|quality|working|project|summary|about|framework|database|certification|certifications|university|institute|technology|technologies|telecommunications|languages|nationality|microservice|microservices|restful|mvc|sql|java|python|javascript|typescript|react|angular|spring|oracle|postgresql|mysql|html|css|api)\b/i;

const BULLET_PREFIX = /^[\u2022\u2023\u25E6\u2043\u2219•·●▪▫■□►▸❖★☆✓✔✗✘\-–—*]\s*/;

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isRejectedHeader(line: string): boolean {
  return REJECTED_HEADERS.has(normalizeHeader(line));
}

export function isSymbolHeavyLine(line: string): boolean {
  const chars = [...line];
  if (chars.length === 0) return true;
  const letterCount = chars.filter((c) => /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/.test(c)).length;
  if (letterCount === 0) return true;
  const symbolCount = chars.filter(
    (c) => !/[A-Za-z0-9\u00C0-\u024F\u1E00-\u1EFF\s.'-]/.test(c),
  ).length;
  return symbolCount / chars.length > 0.4;
}

function letterLength(word: string): number {
  return word.replace(/[^A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/g, "").length;
}

export function passesLengthHeuristic(line: string): boolean {
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 6) return false;
  // Allow single-letter initials (e.g. "NGUYEN VAN A"); still require ≥2 substantial words.
  const substantial = words.filter((w) => letterLength(w) >= 2);
  if (substantial.length < 2) return false;
  if (words.some((w) => letterLength(w) < 1)) return false;
  const len = line.length;
  return len >= 6 && len <= 60;
}

function uppercaseRatio(line: string): number {
  const letters = [...line].filter((c) => /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/.test(c));
  if (letters.length === 0) return 0;
  const upper = letters.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length;
  return upper / letters.length;
}

function looksLikeSentence(line: string): boolean {
  if (/[.!?]$/.test(line.trim())) return true;
  if (/\b(with|over|years|experience|managing|building|i am|i'm|i’m)\b/i.test(line)) return true;
  const words = line.split(/\s+/).filter(Boolean);
  return words.length >= 5 && uppercaseRatio(line) < 0.5;
}

function scoreCandidateLine(line: string, index: number): number {
  let score = 0.5;
  const upper = uppercaseRatio(line);
  if (upper >= 0.7) score += 0.2;
  else if (upper >= 0.35) score += 0.15;

  if (NON_NAME_TOKENS.test(line)) score -= 0.45;
  if (line.includes("@") || /\d{6,}/.test(line)) score -= 0.5;
  if (looksLikeSentence(line)) score -= 0.4;
  if (BULLET_PREFIX.test(line) || /^[•·●]/.test(line)) score -= 0.5;
  // Label: value rows (Nationality: Vietnam) are not names.
  if (/^[A-Za-z\u00C0-\u024F\u1E00-\u1EFF\s]{2,24}:/.test(line)) score -= 0.5;
  // Comma-separated skill lists.
  if ((line.match(/,/g) ?? []).length >= 2) score -= 0.35;
  // Org / phrase connectors rarely appear in personal names.
  if (/\band\b/i.test(line)) score -= 0.35;

  const words = line.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.length <= 4) score += 0.12;

  // Prefer early header-area lines (real names almost always appear first).
  if (index === 0) score += 0.35;
  else if (index <= 2) score += 0.2;
  else if (index <= 5) score += 0.05;

  return Math.max(0, Math.min(1, score));
}

/**
 * Pick the best human name from parsed resume text.
 * Does not touch the PDF/DOCX parser — operates on raw text only.
 */
export function extractParsedName(rawText: string): ParsedName {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let best: { line: string; score: number; source: ParsedName["source"] } | null = null;

  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    let line = lines[i]!;
    line = line.replace(BULLET_PREFIX, "").trim();
    if (!line) continue;
    if (isRejectedHeader(line)) continue;
    if (isSymbolHeavyLine(line)) continue;
    if (!passesLengthHeuristic(line)) continue;
    if (looksLikeSentence(line) && i > 2) continue;

    const score = scoreCandidateLine(line, i);
    if (score < 0.45) continue;

    const source: ParsedName["source"] = i <= 2 ? "header" : "heuristic";
    if (!best || score > best.score) {
      best = { line, score, source };
    }
  }

  // Weak late matches are usually skills/org lines when the real name was not parsed.
  if (!best || (best.score < 0.75 && best.source === "heuristic")) {
    return { value: "Unknown Candidate", confidence: 0.1, source: "heuristic" };
  }

  return {
    value: best.line.replace(/\s+/g, " ").trim(),
    confidence: Number(best.score.toFixed(2)),
    source: best.source,
  };
}
