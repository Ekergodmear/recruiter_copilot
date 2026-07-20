import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { ArtifactRenderer } from "./ArtifactRenderer";
import { ModeBadge, ProgressSteps } from "./AssistantChrome";
import { ContextPanel } from "./ContextPanel";
import { useAssistantKeyboard } from "./useAssistantKeyboard";
import {
  classifyIntent,
  createEmptyConversation,
  extractSearchQuery,
  getConversation,
  newConversationId,
  titleFromPrompt,
  upsertConversation,
  type ActPreviewArtifact,
  type Conversation,
  type TimelineMessage,
} from "./conversation-store";

const SUGGESTIONS = [
  "Find Senior Java candidates in HCM",
  "Review this CV",
  "Create Backend Job from this JD",
  "Summarize today's recruiting work",
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function AssistantScreen() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileCvRef = useRef<HTMLInputElement>(null);
  const fileJdRef = useRef<HTMLInputElement>(null);

  const [conv, setConv] = useState<Conversation>(() => {
    if (conversationId) {
      return getConversation(conversationId) ?? createEmptyConversation(conversationId);
    }
    return createEmptyConversation();
  });
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [lastUserPrompt, setLastUserPrompt] = useState("");

  useEffect(() => {
    if (!conversationId) {
      const id = newConversationId();
      navigate(`/assistant/c/${id}`, { replace: true });
      return;
    }
    const existing = getConversation(conversationId);
    setConv(existing ?? createEmptyConversation(conversationId));
  }, [conversationId, navigate]);

  const persist = useCallback((next: Conversation) => {
    upsertConversation(next);
    setConv(next);
  }, []);

  const focusComposer = useCallback(() => {
    composerRef.current?.focus();
  }, []);

  useAssistantKeyboard({
    onFocusComposer: focusComposer,
    onCommandPalette: () => setCommandOpen(true),
    onEscape: () => {
      setCommandOpen(false);
      setContextOpen(false);
      composerRef.current?.blur();
    },
  });

  const submitPrompt = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setBusy(true);
    setLastUserPrompt(text);
    setPrompt("");

    const intent = classifyIntent(text);
    const userMsg: TimelineMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      createdAt: new Date().toISOString(),
      text,
    };
    const assistantId = `a_${Date.now()}`;
    const assistantPlaceholder: TimelineMessage = {
      id: assistantId,
      role: "assistant",
      createdAt: new Date().toISOString(),
      mode: intent.mode,
      patternId: intent.patternId,
      progress: [],
    };

    let base = getConversation(conv.id) ?? conv;
    base = {
      ...base,
      title: base.messages.length === 0 ? titleFromPrompt(text) : base.title,
      messages: [...base.messages, userMsg, assistantPlaceholder],
    };
    persist(base);

    const patchAssistant = (partial: Partial<TimelineMessage>, ctx?: Partial<Conversation["context"]>) => {
      const cur = getConversation(conv.id) ?? base;
      const next: Conversation = {
        ...cur,
        messages: cur.messages.map((m) => (m.id === assistantId ? { ...m, ...partial } : m)),
        context: { ...cur.context, ...ctx },
      };
      persist(next);
    };

    try {
      if (intent.kind === "find" || intent.kind === "help") {
        const q = intent.kind === "help" ? text : extractSearchQuery(text);
        const steps = [
          "Searching candidates…",
          "Reading database",
          "Applying text query",
          "Ranking",
          "Preparing cards",
        ];
        for (let i = 0; i < steps.length; i++) {
          patchAssistant({
            progress: steps.map((label, j) => ({
              id: `s${j}`,
              label,
              done: j <= i,
            })),
          });
          await sleep(160);
        }
        const { items } = await api.listCandidates({
          q: intent.kind === "help" ? undefined : q,
          ready: true,
        });
        const limited = items.slice(0, 12);
        patchAssistant(
          {
            progress: steps.map((label, j) => ({ id: `s${j}`, label, done: true })),
            artifacts: [
              {
                type: "answer",
                text:
                  limited.length === 0
                    ? `No ready candidates matched “${q}”. Try uploading CVs or broaden the query.`
                    : `Found ${limited.length} ready candidate${limited.length === 1 ? "" : "s"} for “${q}”.`,
              },
              {
                type: "candidate_cards",
                items: limited.map((c) => ({
                  candidateId: c.candidateId,
                  name: c.name,
                  subtitle: c.candidateId,
                })),
              },
            ],
            transparency: {
              tools: ["ListCandidates"],
              data: "workspace ready candidates",
              why: `Query filter q=${q || "(all ready)"}`,
            },
          },
          {
            filters: q ? [q] : ["ready=true"],
            recentActions: [...(base.context.recentActions ?? []), "search"].slice(-5),
          },
        );
      } else if (intent.kind === "review") {
        patchAssistant({
          artifacts: [
            {
              type: "answer",
              text: "Analyze mode: upload a CV with “Upload CV”, or open a candidate from Knowledge. Review produces a scorecard artifact (P-AN-CV).",
            },
          ],
          transparency: {
            tools: [],
            data: "none yet",
            why: "Waiting for CV upload or candidate selection",
          },
          progress: [{ id: "s0", label: "Waiting for CV…", done: false }],
        });
      } else if (intent.kind === "create_job") {
        const steps = ["Extracting JD intent…", "Prefilling job draft", "Preparing preview"];
        for (let i = 0; i < steps.length; i++) {
          patchAssistant({
            progress: steps.map((label, j) => ({ id: `s${j}`, label, done: j <= i })),
          });
          await sleep(160);
        }
        const titleMatch = text.match(/(?:job|vị trí)\s+(.+)$/i);
        const title = titleMatch?.[1]?.trim() || "Backend Engineer";
        const preview: ActPreviewArtifact = {
          type: "act_preview",
          title: `Create job · ${title}`,
          summary: "Write requires Preview → Confirm → Execute. No job is created until you Confirm.",
          payload: { kind: "create_job", title, text },
        };
        patchAssistant(
          {
            progress: steps.map((label, j) => ({ id: `s${j}`, label, done: true })),
            artifacts: [preview],
            transparency: {
              tools: ["JobPrefill (client)"],
              data: "user prompt only — not persisted until Confirm",
              why: "Act mode · P-ACT-CREATE",
            },
          },
          { jobDraft: text, recentActions: [...(base.context.recentActions ?? []), "draft_job"].slice(-5) },
        );
      }
    } catch (err) {
      patchAssistant({
        artifacts: [
          {
            type: "answer",
            text: err instanceof Error ? err.message : "Something went wrong.",
          },
        ],
        progress: [{ id: "err", label: "Failed", done: true }],
      });
    } finally {
      setBusy(false);
      focusComposer();
    }
  };

  const onConfirmAct = async (artifact: ActPreviewArtifact) => {
    if (artifact.payload.kind !== "create_job" || confirming) return;
    setConfirming(true);
    try {
      const job = await api.createJobFromText({
        text: artifact.payload.text || artifact.payload.title,
        company: "RecruiterSup",
      });
      const cur = getConversation(conv.id) ?? conv;
      const next: Conversation = {
        ...cur,
        messages: cur.messages.map((m) => {
          if (m.role !== "assistant" || !m.artifacts) return m;
          return {
            ...m,
            artifacts: m.artifacts.map((a) =>
              a.type === "act_preview" && !a.confirmed
                ? { ...a, confirmed: true, resultId: job.id }
                : a,
            ),
          };
        }),
        context: {
          ...cur.context,
          recentActions: [...(cur.context.recentActions ?? []), "create_job"].slice(-5),
        },
      };
      persist(next);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Create job failed");
    } finally {
      setConfirming(false);
    }
  };

  const onUploadCv = async (file: File) => {
    setBusy(true);
    const userMsg: TimelineMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      createdAt: new Date().toISOString(),
      text: `Upload CV · ${file.name}`,
    };
    const assistantId = `a_${Date.now()}`;
    let base = getConversation(conv.id) ?? conv;
    base = {
      ...base,
      title: base.messages.length === 0 ? `CV · ${file.name}` : base.title,
      messages: [
        ...base.messages,
        userMsg,
        {
          id: assistantId,
          role: "assistant",
          createdAt: new Date().toISOString(),
          mode: "Analyze",
          patternId: "P-AN-CV",
          progress: [],
        },
      ],
    };
    persist(base);

    const patch = (partial: Partial<TimelineMessage>, ctx?: Partial<Conversation["context"]>) => {
      const cur = getConversation(conv.id) ?? base;
      persist({
        ...cur,
        messages: cur.messages.map((m) => (m.id === assistantId ? { ...m, ...partial } : m)),
        context: { ...cur.context, ...ctx },
      });
    };

    const steps = [
      "Reading file…",
      "Importing resume",
      "Extracting profile fields",
      "Preparing review link",
    ];
    try {
      for (let i = 0; i < steps.length; i++) {
        patch({
          progress: steps.map((label, j) => ({ id: `s${j}`, label, done: j <= i })),
        });
        await sleep(140);
      }
      const imported = await api.importResume(file);
      patch(
        {
          progress: steps.map((label, j) => ({ id: `s${j}`, label, done: true })),
          artifacts: [
            {
              type: "answer",
              text: "CV imported. Open review for the Analyze scorecard (existing Review capability).",
            },
            {
              type: "import_result",
              candidateId: imported.candidateId,
              name: file.name,
              reviewPath: `/review/${imported.candidateId}`,
            },
          ],
          transparency: {
            tools: ["ImportResume"],
            data: "resume binary → candidate + knowledge",
            why: "Analyze · P-AN-CV",
            confidence: "n/a",
          },
        },
        {
          candidateId: imported.candidateId,
          files: [...(base.context.files ?? []), file.name].slice(-5),
          recentActions: [...(base.context.recentActions ?? []), "import_cv"].slice(-5),
        },
      );
    } catch (err) {
      patch({
        artifacts: [
          { type: "answer", text: err instanceof Error ? err.message : "Import failed" },
        ],
      });
    } finally {
      setBusy(false);
    }
  };

  const onUploadJd = async (file: File) => {
    const text = await file.text().catch(() => file.name);
    setPrompt((p) => (p ? `${p}\n\n${text.slice(0, 2000)}` : `Create job from JD:\n${text.slice(0, 2000)}`));
    focusComposer();
  };

  const onComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitPrompt(prompt);
      return;
    }
    if (e.key === "ArrowUp" && prompt === "" && lastUserPrompt) {
      e.preventDefault();
      setPrompt(lastUserPrompt);
    }
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const next = (suggestionIndex + 1) % SUGGESTIONS.length;
      setSuggestionIndex(next);
      setPrompt(SUGGESTIONS[next]);
    }
  };

  const isEmpty = conv.messages.length === 0;

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-rs-border)] bg-white px-4">
          <div>
            <p className="text-sm font-semibold text-[var(--color-rs-fg)]">Recruiter Assistant</p>
            <p className="text-[11px] text-[var(--color-rs-muted)]">
              {conv.title} · <span className="font-mono">{conv.id}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setContextOpen((v) => !v)}
              className="rounded-md border border-[var(--color-rs-border)] px-2 py-1 text-xs font-medium hover:bg-[var(--color-rs-subtle)]"
            >
              Context
            </button>
            <Link
              to="/assistant"
              className="rounded-md border border-[var(--color-rs-border)] px-2 py-1 text-xs font-medium hover:bg-[var(--color-rs-subtle)]"
              onClick={(e) => {
                e.preventDefault();
                navigate(`/assistant/c/${newConversationId()}`);
              }}
            >
              New
            </Link>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[800px] flex-1 flex-col px-4 py-6">
          {isEmpty ? (
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-rs-fg)]">
                What do you want to accomplish?
              </h1>
              <p className="mt-2 text-sm text-[var(--color-rs-muted)]">
                Express intent. Capabilities run as tools. Writes always Preview → Confirm →
                Execute.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSuggestionIndex(i);
                      setPrompt(s);
                      focusComposer();
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      i === suggestionIndex
                        ? "border-[var(--color-rs-fg)] bg-[var(--color-rs-subtle)]"
                        : "border-[var(--color-rs-border)] text-[var(--color-rs-muted)] hover:bg-[var(--color-rs-subtle)]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6 flex-1 space-y-4 overflow-y-auto">
              {conv.messages.map((m) => (
                <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] rounded-lg bg-[var(--color-rs-subtle)] px-3 py-2 text-sm"
                        : "max-w-full rounded-lg border border-[var(--color-rs-border)] bg-white px-3 py-3 text-sm"
                    }
                  >
                    {m.role === "assistant" && m.mode ? (
                      <div className="mb-2 flex items-center gap-2">
                        <ModeBadge mode={m.mode} />
                        {m.patternId ? (
                          <span className="font-mono text-[10px] text-[var(--color-rs-subtle-fg)]">
                            {m.patternId}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {m.text ? <p className="whitespace-pre-wrap">{m.text}</p> : null}
                    {m.progress ? <ProgressSteps steps={m.progress} /> : null}
                    {m.artifacts ? (
                      <ArtifactRenderer
                        artifacts={m.artifacts}
                        onConfirmAct={(a) => void onConfirmAct(a)}
                        confirming={confirming}
                      />
                    ) : null}
                    {m.transparency ? (
                      <div className="mt-3 border-t border-[var(--color-rs-border)] pt-2 font-mono text-[10px] leading-relaxed text-[var(--color-rs-muted)]">
                        <div>Tools: {m.transparency.tools.join(", ") || "—"}</div>
                        <div>Data: {m.transparency.data}</div>
                        <div>Why: {m.transparency.why}</div>
                        {m.transparency.confidence ? (
                          <div>Confidence: {m.transparency.confidence}</div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="sticky bottom-0 border border-[var(--color-rs-border)] bg-white shadow-sm rounded-xl p-3">
            <textarea
              ref={composerRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={onComposerKeyDown}
              disabled={busy}
              rows={3}
              placeholder="Find Senior Java in HCM…  (/ focus · ⇧Enter newline · Enter send)"
              className="w-full resize-none border-0 bg-transparent text-sm outline-none placeholder:text-[var(--color-rs-subtle-fg)]"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileCvRef.current?.click()}
                  className="rounded-md border border-[var(--color-rs-border)] px-2 py-1 text-xs font-medium hover:bg-[var(--color-rs-subtle)]"
                >
                  Upload CV
                </button>
                <button
                  type="button"
                  onClick={() => fileJdRef.current?.click()}
                  className="rounded-md border border-[var(--color-rs-border)] px-2 py-1 text-xs font-medium hover:bg-[var(--color-rs-subtle)]"
                >
                  Upload JD
                </button>
                <input
                  ref={fileCvRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onUploadCv(f);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={fileJdRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onUploadJd(f);
                    e.target.value = "";
                  }}
                />
              </div>
              <button
                type="button"
                disabled={busy || !prompt.trim()}
                onClick={() => void submitPrompt(prompt)}
                className="rounded-md bg-[var(--color-rs-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-rs-accent-hover)] disabled:opacity-40"
              >
                {busy ? "Working…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ContextPanel
        context={conv.context}
        open={contextOpen}
        onClose={() => setContextOpen(false)}
      />

      {commandOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 pt-[20vh]"
          role="dialog"
          onClick={() => setCommandOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-[var(--color-rs-border)] bg-white p-2 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-2 py-1 text-[11px] font-semibold uppercase text-[var(--color-rs-muted)]">
              Command
            </p>
            {[
              { label: "New conversation", run: () => navigate(`/assistant/c/${newConversationId()}`) },
              { label: "Focus composer", run: () => focusComposer() },
              { label: "Open Knowledge · Candidates", run: () => navigate("/candidates") },
              { label: "Review queue (legacy inbox)", run: () => navigate("/inbox") },
            ].map((cmd) => (
              <button
                key={cmd.label}
                type="button"
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--color-rs-subtle)]"
                onClick={() => {
                  setCommandOpen(false);
                  cmd.run();
                }}
              >
                {cmd.label}
              </button>
            ))}
            <p className="px-3 py-2 text-[10px] text-[var(--color-rs-subtle-fg)]">Esc to close</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
