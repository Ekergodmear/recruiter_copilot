/**
 * D10 — Language-agnostic Intent → Structured Parameters → Tool.
 * VI / EN / mixed / shorthand all map to the same Intent + slots.
 * Ask | Analyze | Act modes are unchanged (Sprint 0).
 */

export type IntentMode = "Ask" | "Analyze" | "Act" | "Mixed";

export type IntentName =
  | "SEARCH_CANDIDATE"
  | "ANALYZE_CV"
  | "MATCH_JOB"
  | "CREATE_JOB"
  | "INGEST_CV_WORKFLOW"
  | "HELP";

export type CandidateSearchSlots = {
  role?: string;
  skills: string[];
  location?: string;
  salaryMaxM?: number;
  salaryMinM?: number;
  english?: string;
  workModel?: "remote" | "hybrid" | "onsite";
  seniority?: string;
  priority?: "high" | "normal";
};

export type ParsedIntent = {
  intent: IntentName;
  mode: IntentMode;
  patternId: string;
  /** Human-readable filter chips for Working Memory */
  filterLabels: string[];
  search: CandidateSearchSlots;
  /** Free-text query passed to listCandidates / search APIs */
  searchQuery: string;
  raw: string;
};

const SKILL_ALIASES: { re: RegExp; skill: string }[] = [
  { re: /\bjava\b(?!\s*script)/i, skill: "Java" },
  { re: /\bjavascript\b|\bjs\b/i, skill: "JavaScript" },
  { re: /\btypescript\b|\bts\b/i, skill: "TypeScript" },
  { re: /\breact(?:\.?js)?\b/i, skill: "React" },
  { re: /\bnode(?:\.?js)?\b/i, skill: "Node.js" },
  { re: /\bgolang\b|\bgo\b(?!\w)/i, skill: "Golang" },
  { re: /\bkubernetes\b|\bk8s\b/i, skill: "Kubernetes" },
  { re: /\bdocker\b/i, skill: "Docker" },
  { re: /\baws\b/i, skill: "AWS" },
  { re: /\bpython\b/i, skill: "Python" },
  { re: /\.?\bnet\b|\bc#\b/i, skill: ".NET" },
  { re: /\bphp\b/i, skill: "PHP" },
  { re: /\bvue(?:\.?js)?\b/i, skill: "Vue" },
  { re: /\bangular\b/i, skill: "Angular" },
];

function extractSkills(text: string): string[] {
  const out: string[] = [];
  for (const { re, skill } of SKILL_ALIASES) {
    if (re.test(text) && !out.includes(skill)) out.push(skill);
  }
  return out;
}

function extractLocation(text: string): string | undefined {
  if (/\bhcm\b|hồ\s*chí\s*minh|ho\s*chi\s*minh|sài\s*gòn|saigon/i.test(text)) return "HCM";
  if (/\bhanoi\b|hà\s*nội|ha\s*noi/i.test(text)) return "Hanoi";
  if (/\bđà\s*nẵng|da\s*nang|danang\b/i.test(text)) return "Da Nang";
  if (/\bremote\b|làm\s*remote/i.test(text)) return undefined; // work model, not city
  return undefined;
}

function extractWorkModel(text: string): CandidateSearchSlots["workModel"] | undefined {
  if (/\bhybrid\b|lai\b/i.test(text)) return "hybrid";
  if (/\bremote\b|từ\s*xa/i.test(text)) return "remote";
  if (/\bonsite\b|on-site|văn\s*phòng|office\b/i.test(text)) return "onsite";
  return undefined;
}

function extractSalaryM(text: string): { min?: number; max?: number } {
  const t = text
    .replace(/triệu/gi, "m")
    .replace(/tr\b/gi, "m")
    .replace(/,\s*/g, "");

  // 50-60m / 50–60 triệu
  const range = t.match(/(\d+)\s*[-–~]\s*(\d+)\s*m\b/i);
  if (range) {
    return { min: Number(range[1]), max: Number(range[2]) };
  }

  // under / dưới / < / khoảng X m
  const under = t.match(/(?:under|dưới|<=|<|khoảng|around|~)\s*(\d+)\s*m\b/i);
  if (under) return { max: Number(under[1]) };

  // bare "60m" / "60M" near salary words or alone in shorthand
  const bare = t.match(/(?:lương|salary|\$)?\s*(\d+)\s*m\b/i);
  if (bare) return { max: Number(bare[1]) };

  return {};
}

function extractEnglish(text: string): string | undefined {
  if (/\bb2\b|tiếng\s*anh\s*(khá|tốt)|english\s*(good|fluent|b2)/i.test(text)) return "B2+";
  if (/\bc1\b|fluent/i.test(text)) return "C1";
  if (/\bb1\b/i.test(text)) return "B1";
  return undefined;
}

function extractSeniority(text: string): string | undefined {
  if (/\plead\b|tech\s*lead|team\s*lead/i.test(text)) return "Lead";
  if (/\bsenior\b|\bsr\.?\b/i.test(text)) return "Senior";
  if (/\bmid\b|middle\b/i.test(text)) return "Mid";
  if (/\bjunior\b|\bjr\.?\b/i.test(text)) return "Junior";
  return undefined;
}

function extractRole(text: string, skills: string[], seniority?: string): string | undefined {
  const leadSkill = skills[0];
  if (/\breact\s*lead|lead\s*react/i.test(text)) return "React Lead";
  if (seniority && leadSkill) return `${seniority} ${leadSkill}`;
  if (leadSkill && /\bdeveloper\b|\bdev\b|\bengineer\b|\bứng\s*viên\b/i.test(text)) {
    return `${leadSkill} Developer`;
  }
  if (leadSkill) return leadSkill;
  const m = text.match(
    /(?:tìm|find|search|cần)\s+(.+?)(?:\s+(?:ở|in|tại|hcm|hanoi|dưới|under|lương|salary)|\s*$)/i,
  );
  if (m?.[1] && m[1].length < 40) return m[1].trim();
  return undefined;
}

function isUrgent(text: string): boolean {
  return /\bcần\s*gấp|urgent|asap|gấp\b/i.test(text);
}

function detectIntentName(normalized: string): IntentName {
  const p = normalized;

  // Mixed workflow: review + create candidate
  if (
    (/\b(review|đánh\s*giá|xem\s*cv|phân\s*tích)\b/i.test(p) || /\bcv\b/i.test(p)) &&
    (/\btạo\s*candidate|create\s*candidate|nếu\s*hợp|if\s*(?:good|fit|ok)/i.test(p) ||
      /\bkhách\s*gửi|client\s*sent/i.test(p))
  ) {
    return "INGEST_CV_WORKFLOW";
  }

  if (
    /\b(match|matching)\b.*\b(jd|job)\b/i.test(p) ||
    /\b(jd|job)\b.*\b(match|phù\s*hợp|hợp)\b/i.test(p) ||
    /jd\s*này\s*có\s*ai|tìm\s*người\s*cho\s*(job|jd)|có\s*cv\s*nào\s*hợp|find\s*candidates?\s*for\s*this\s*jd/i.test(
      p,
    )
  ) {
    return "MATCH_JOB";
  }

  if (
    /\b(create|tạo)\b.*\b(job|jd|vị\s*trí)\b/i.test(p) ||
    /\b(job|jd)\b.*\b(create|tạo|from)\b/i.test(p)
  ) {
    return "CREATE_JOB";
  }

  if (
    /\b(review|đánh\s*giá|phân\s*tích|analyze|score)\b/i.test(p) ||
    /cv\s*này|resume\s*này|xem\s*cv|cv\s*này\s*ổn|review\s*(this\s*)?(cv|resume)/i.test(p)
  ) {
    return "ANALYZE_CV";
  }

  // SEARCH: explicit verbs OR shorthand skill+location/salary OR "có ai"
  if (
    /\b(find|search|tìm|tìm\s*kiếm|có\s*ai|ai\s*biết|cần\b)/i.test(p) ||
    extractSkills(p).length > 0 ||
    /\b\d+\s*m\b/i.test(p) ||
    /\bhcm\b|\bhanoi\b/i.test(p)
  ) {
    return "SEARCH_CANDIDATE";
  }

  return "HELP";
}

function buildFilterLabels(slots: CandidateSearchSlots): string[] {
  const labels: string[] = [];
  if (slots.role) labels.push(slots.role);
  else labels.push(...slots.skills);
  if (slots.location) labels.push(slots.location);
  if (slots.salaryMaxM != null) labels.push(`≤${slots.salaryMaxM}M`);
  if (slots.salaryMinM != null && slots.salaryMaxM == null) labels.push(`≥${slots.salaryMinM}M`);
  if (slots.workModel) labels.push(slots.workModel);
  if (slots.english) labels.push(`English ${slots.english}`);
  if (slots.priority === "high") labels.push("Priority: High");
  return labels;
}

function buildSearchQuery(slots: CandidateSearchSlots): string {
  const parts = [
    slots.seniority,
    ...slots.skills,
    slots.role && !slots.skills.length ? slots.role : undefined,
  ].filter(Boolean) as string[];
  return parts.join(" ").trim();
}

function modeForIntent(intent: IntentName): { mode: IntentMode; patternId: string } {
  switch (intent) {
    case "SEARCH_CANDIDATE":
    case "HELP":
      return { mode: "Ask", patternId: "P-ASK-FIND" };
    case "ANALYZE_CV":
      return { mode: "Analyze", patternId: "P-AN-CV" };
    case "MATCH_JOB":
      return { mode: "Analyze", patternId: "P-AN-JD" };
    case "CREATE_JOB":
      return { mode: "Act", patternId: "P-ACT-CREATE" };
    case "INGEST_CV_WORKFLOW":
      return { mode: "Mixed", patternId: "P-MIX-HIRE" };
    default:
      return { mode: "Ask", patternId: "P-ASK-FIND" };
  }
}

/**
 * Normalize any recruiter utterance → Intent + structured slots.
 * Same SEARCH_CANDIDATE for VI / EN / mixed / shorthand.
 */
export function parseIntent(rawInput: string): ParsedIntent {
  const raw = rawInput.trim();
  const normalized = raw.replace(/\s+/g, " ");

  const intent = detectIntentName(normalized);
  const { mode, patternId } = modeForIntent(intent);

  const skills = extractSkills(normalized);
  const location = extractLocation(normalized);
  const workModel = extractWorkModel(normalized);
  const salary = extractSalaryM(normalized);
  const english = extractEnglish(normalized);
  const seniority = extractSeniority(normalized);
  const role = extractRole(normalized, skills, seniority);
  const priority = isUrgent(normalized) ? ("high" as const) : undefined;

  const search: CandidateSearchSlots = {
    role,
    skills,
    location,
    salaryMaxM: salary.max,
    salaryMinM: salary.min,
    english,
    workModel,
    seniority,
    priority,
  };

  return {
    intent,
    mode,
    patternId,
    filterLabels: buildFilterLabels(search),
    search,
    searchQuery: buildSearchQuery(search) || normalized.slice(0, 80),
    raw,
  };
}

/** @deprecated use parseIntent — kept for gradual migration */
export function classifyIntent(prompt: string): {
  mode: IntentMode;
  patternId: string;
  kind: "find" | "review" | "create_job" | "help" | "match_job" | "workflow";
} {
  const p = parseIntent(prompt);
  const kind =
    p.intent === "SEARCH_CANDIDATE"
      ? "find"
      : p.intent === "ANALYZE_CV"
        ? "review"
        : p.intent === "CREATE_JOB"
          ? "create_job"
          : p.intent === "MATCH_JOB"
            ? "match_job"
            : p.intent === "INGEST_CV_WORKFLOW"
              ? "workflow"
              : "help";
  return { mode: p.mode, patternId: p.patternId, kind };
}

export function extractSearchQuery(prompt: string): string {
  return parseIntent(prompt).searchQuery;
}
