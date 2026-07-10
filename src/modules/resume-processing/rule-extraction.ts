import type { DeterministicFields, RuleExtractionResult } from "./types.js";

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
const LINKEDIN_RE = /https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/gi;
const GITHUB_RE = /https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/gi;
const URL_RE = /https?:\/\/[^\s)]+/gi;

const SKILL_KEYWORDS = [
  "javascript",
  "typescript",
  "react",
  "node",
  "python",
  "java",
  "sql",
  "aws",
  "docker",
  "kubernetes",
  "git",
  "agile",
];

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

export function extractDeterministicFields(rawText: string): RuleExtractionResult {
  const fields: DeterministicFields = {};
  const extractedFieldNames: string[] = [];

  const emails = rawText.match(EMAIL_RE);
  if (emails?.[0]) {
    fields.email = emails[0];
    extractedFieldNames.push("email");
  }

  const phones = rawText.match(PHONE_RE);
  if (phones?.[0]) {
    fields.phone = phones[0];
    extractedFieldNames.push("phone");
  }

  const linkedIn = rawText.match(LINKEDIN_RE);
  if (linkedIn?.[0]) {
    fields.linkedInUrl = linkedIn[0];
    extractedFieldNames.push("linkedInUrl");
  }

  const github = rawText.match(GITHUB_RE);
  if (github?.[0]) {
    fields.githubUrl = github[0];
    extractedFieldNames.push("githubUrl");
  }

  const urls = rawText.match(URL_RE) ?? [];
  const portfolio = urls.find((u) => !/linkedin|github/i.test(u));
  if (portfolio) {
    fields.portfolioUrl = portfolio;
    extractedFieldNames.push("portfolioUrl");
  }

  const lower = rawText.toLowerCase();
  const skills = SKILL_KEYWORDS.filter((skill) => lower.includes(skill));
  if (skills.length > 0) {
    fields.skills = unique(skills);
    extractedFieldNames.push("skills");
  }

  const yearsMatch = rawText.match(/(\d{1,2})\+?\s*years?\s+(?:of\s+)?experience/i);
  if (yearsMatch?.[1]) {
    fields.yearsOfExperience = Number(yearsMatch[1]);
    extractedFieldNames.push("yearsOfExperience");
  }

  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines[0] && lines[0].length < 80 && !lines[0].includes("@")) {
    fields.candidateName = lines[0];
    extractedFieldNames.push("candidateName");
  }

  return { fields, extractedFieldNames };
}

export function identifyKnowledgeGaps(fields: DeterministicFields): string[] {
  const gaps: string[] = [];
  if (!fields.skills?.length) gaps.push("skills");
  if (!fields.languages?.length) gaps.push("languages");
  if (fields.yearsOfExperience === undefined) gaps.push("seniority");
  return gaps;
}

export function mergeDeterministicOverProvider<T extends Record<string, unknown>>(
  deterministic: Record<string, unknown>,
  provider: T,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...provider };
  for (const [key, value] of Object.entries(deterministic)) {
    if (value !== undefined && value !== null && value !== "") {
      merged[key] = value;
    }
  }
  return merged;
}
