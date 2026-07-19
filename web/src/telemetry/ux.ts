export type EntryScreen =
  | "Home"
  | "Import"
  | "Review"
  | "Candidates"
  | "CandidateDetail"
  | "Search"
  | "Jobs"
  | "JobCreate"
  | "JobDetail"
  | "JobReview";

export type AbandonReason =
  | "import_close_tab"
  | "import_navigate_away"
  | "review_back_not_ready"
  | "review_close_tab_not_ready"
  | "review_navigate_away_not_ready";

export type ReviewMode = "focus" | "flexible";

const SESSION_KEY = "ux_session_id";
const ENTRY_KEY = "ux_entry_recorded";

export function getUxSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function resolveEntryScreen(pathname: string): EntryScreen {
  if (pathname === "/") return "Home";
  if (pathname === "/import") return "Import";
  if (pathname.startsWith("/review/")) return "Review";
  if (pathname === "/candidates") return "Candidates";
  if (pathname.startsWith("/candidates/")) return "CandidateDetail";
  if (pathname === "/search") return "Search";
  if (pathname === "/jobs") return "Jobs";
  if (pathname === "/jobs/new") return "JobCreate";
  if (pathname.endsWith("/review") && pathname.startsWith("/jobs/")) return "JobReview";
  if (pathname.startsWith("/jobs/")) return "JobDetail";
  return "Home";
}

function sendUxEvent(payload: Record<string, string | undefined>) {
  const body = JSON.stringify({
    session_id: getUxSessionId(),
    ...payload,
  });
  const url = "/api/v1/telemetry";
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}

export function trackEntryScreen(screen: EntryScreen) {
  if (sessionStorage.getItem(ENTRY_KEY)) return;
  sessionStorage.setItem(ENTRY_KEY, "1");
  sendUxEvent({ event_type: "entry_screen", screen });
}

export function trackAbandon(reason: AbandonReason, candidateId?: string, mode?: ReviewMode) {
  sendUxEvent({
    event_type: "abandon_reason",
    abandon_reason: reason,
    candidate_id: candidateId,
    review_mode: mode,
  });
}

/**
 * EPIC-002 — Review Workspace hypothesis validation.
 * Fired once per Review screen visit so the Operations Dashboard can answer
 * "Focus vs Flexible %" without guessing (see epic-002-review-workspace.md).
 */
export function trackReviewMode(mode: ReviewMode, candidateId: string) {
  sendUxEvent({
    event_type: "review_mode_used",
    review_mode: mode,
    candidate_id: candidateId,
  });
}
