/**
 * Phase 1 — Recruiter Assistant conversation store (client-side).
 * Deep-linkable via /assistant/c/:id. Persist in localStorage.
 * Pattern IDs: P-ASK-FIND, P-AN-CV, P-ACT-CREATE (Sprint 0 Grammar).
 */

export type AssistantMode = "Ask" | "Analyze" | "Act" | "Mixed";

export type ProgressStep = {
  id: string;
  label: string;
  done: boolean;
};

export type CandidateCardArtifact = {
  type: "candidate_cards";
  items: { candidateId: string; name: string; subtitle?: string }[];
};

export type AnswerArtifact = {
  type: "answer";
  text: string;
};

export type ImportArtifact = {
  type: "import_result";
  candidateId: string;
  name: string;
  reviewPath: string;
};

export type ActPreviewArtifact = {
  type: "act_preview";
  title: string;
  summary: string;
  payload: { kind: "create_job"; title: string; text: string };
  confirmed?: boolean;
  resultId?: string;
};

export type Artifact =
  | CandidateCardArtifact
  | AnswerArtifact
  | ImportArtifact
  | ActPreviewArtifact;

export type Transparency = {
  tools: string[];
  data: string;
  why: string;
  confidence?: string;
};

export type TimelineMessage = {
  id: string;
  role: "user" | "assistant";
  createdAt: string;
  text?: string;
  mode?: AssistantMode;
  patternId?: string;
  progress?: ProgressStep[];
  artifacts?: Artifact[];
  transparency?: Transparency;
};

export type ConversationContext = {
  filters?: string[];
  candidateId?: string;
  jobDraft?: string;
  files?: string[];
  recentActions?: string[];
};

export type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
  messages: TimelineMessage[];
  context: ConversationContext;
};

const STORAGE_KEY = "rs.assistant.conversations.v1";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function newConversationId(): string {
  return uid("c");
}

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [];
  }
}

export function saveConversations(list: Conversation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getConversation(id: string): Conversation | undefined {
  return loadConversations().find((c) => c.id === id);
}

export function upsertConversation(conv: Conversation): void {
  const list = loadConversations().filter((c) => c.id !== conv.id);
  list.unshift({ ...conv, updatedAt: new Date().toISOString() });
  saveConversations(list.slice(0, 50));
}

export function createEmptyConversation(id = newConversationId()): Conversation {
  return {
    id,
    title: "New conversation",
    updatedAt: new Date().toISOString(),
    messages: [],
    context: {},
  };
}

export function titleFromPrompt(prompt: string): string {
  const t = prompt.trim().replace(/\s+/g, " ");
  return t.length > 48 ? `${t.slice(0, 48)}…` : t || "New conversation";
}

/** Heuristic intent → mode + pattern (no LLM; Sprint 0 Phase 1). */
export function classifyIntent(prompt: string): {
  mode: AssistantMode;
  patternId: string;
  kind: "find" | "review" | "create_job" | "help";
} {
  const p = prompt.toLowerCase();
  if (
    /\b(create|tạo)\b.*\b(job|jd|vị trí)\b/.test(p) ||
    /\b(job|jd)\b.*\b(create|tạo|from)\b/.test(p)
  ) {
    return { mode: "Act", patternId: "P-ACT-CREATE", kind: "create_job" };
  }
  if (/\b(review|phân tích|score)\b/.test(p) || /\bcv\b/.test(p)) {
    return { mode: "Analyze", patternId: "P-AN-CV", kind: "review" };
  }
  if (
    /\b(find|search|tìm|ai biết|senior|java|react|developer|hcm|candidate)\b/.test(p)
  ) {
    return { mode: "Ask", patternId: "P-ASK-FIND", kind: "find" };
  }
  return { mode: "Ask", patternId: "P-ASK-FIND", kind: "help" };
}

export function extractSearchQuery(prompt: string): string {
  return prompt
    .replace(/^(find|search|tìm|tìm kiếm)\s+/i, "")
    .replace(/\s+under\s+\d+\s*m?/i, "")
    .trim() || prompt.trim();
}
