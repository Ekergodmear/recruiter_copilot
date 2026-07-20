/**
 * Phase 1 — Recruiter Assistant conversation store (client-side).
 * Deep-linkable via /assistant/c/:id. Persist in localStorage.
 * Pattern IDs: P-ASK-FIND, P-AN-CV, P-ACT-CREATE (Sprint 0 Grammar).
 * D11 Quiet AI: transparency / intent / confidence are for Show details only.
 */

export type AssistantMode = "Ask" | "Analyze" | "Act" | "Mixed";

/** Single running status line (D11) — not a multi-step tool theatre. */
export type ProgressStep = {
  id: string;
  label: string;
  done: boolean;
};

export type CandidateCardArtifact = {
  type: "candidate_cards";
  headline?: string;
  items: {
    candidateId: string;
    name: string;
    subtitle?: string;
    score?: number;
  }[];
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

/** Technical metadata — hidden behind Show details (D11). */
export type Transparency = {
  tools: string[];
  data: string;
  why: string;
  confidence?: string;
  intent?: string;
  slots?: string[];
  model?: string;
};

export type TimelineMessage = {
  id: string;
  role: "user" | "assistant";
  createdAt: string;
  text?: string;
  mode?: AssistantMode;
  patternId?: string;
  /** While busy: one Quiet status step. Cleared or marked done when finished. */
  progress?: ProgressStep[];
  artifacts?: Artifact[];
  transparency?: Transparency;
  /** Suggested next intents (chips) — keeps the workspace loop open. */
  nextActions?: string[];
  /** Elapsed ms — shown quietly as “AI response · Xs”. */
  elapsedMs?: number;
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
