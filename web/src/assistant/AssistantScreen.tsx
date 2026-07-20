import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { ArtifactRenderer } from "./ArtifactRenderer";
import { QuietStatus } from "./AssistantChrome";
import { ContextPanel } from "./ContextPanel";
import { useAssistantKeyboard } from "./useAssistantKeyboard";
import {
  createEmptyConversation,
  getConversation,
  newConversationId,
  titleFromPrompt,
  upsertConversation,
  type ActPreviewArtifact,
  type AssistantMode,
  type Conversation,
  type TimelineMessage,
} from "./conversation-store";
import { parseIntent } from "./intent";

const SUGGESTIONS = [
  "java hcm 60m",
  "Tìm Senior Java ở HCM dưới 60 triệu",
  "Review CV này",
  "JD này có ai phù hợp không?",
  "Create Backend Job from this JD",
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function greetingName(): string {
  try {
    const n = localStorage.getItem("rs.recruiter.displayName");
    if (n?.trim()) return n.trim();
  } catch {
    /* ignore */
  }
  return "Khôi";
}

function scoreForIndex(i: number, total: number): number {
  if (total <= 1) return 92;
  return Math.max(72, Math.round(92 - (i * 14) / Math.max(1, total - 1)));
}

export function AssistantScreen() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileCvRef = useRef<HTMLInputElement>(null);
  const fileFolderRef = useRef<HTMLInputElement>(null);
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

    const parsed = parseIntent(text);
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
      mode: parsed.mode as AssistantMode,
      patternId: parsed.patternId,
      progress: [],
    };

    let base = getConversation(conv.id) ?? conv;
    base = {
      ...base,
      title: base.messages.length === 0 ? titleFromPrompt(text) : base.title,
      messages: [...base.messages, userMsg, assistantPlaceholder],
    };
    persist(base);

    const patchAssistant = (
      partial: Partial<TimelineMessage>,
      ctx?: Partial<Conversation["context"]>,
    ) => {
      const cur = getConversation(conv.id) ?? base;
      const next: Conversation = {
        ...cur,
        messages: cur.messages.map((m) => (m.id === assistantId ? { ...m, ...partial } : m)),
        context: { ...cur.context, ...ctx },
      };
      persist(next);
    };

    const runSearch = async (opts: { status: string; why: string; emptyActions: string[] }) => {
      const t0 = Date.now();
      patchAssistant({
        progress: [{ id: "run", label: opts.status, done: false }],
      });
      await sleep(280);
      const q = parsed.searchQuery || undefined;
      const { items } = await api.listCandidates({
        q: parsed.intent === "HELP" ? undefined : q,
        ready: true,
      });
      const limited = items.slice(0, 12);
      const top = limited.slice(0, 3);
      const filters = parsed.filterLabels.length ? parsed.filterLabels : [];
      const answerText =
        limited.length === 0
          ? [
              "Không tìm thấy ứng viên phù hợp.",
              "",
              "Thử:",
              "• Upload thêm CV",
              "• Nâng mức lương / nới tiêu chí",
              "• Mở rộng khu vực sang Hybrid hoặc Remote",
            ].join("\n")
          : [
              `Tìm thấy ${limited.length} ứng viên phù hợp.`,
              "",
              "Top 3:",
              ...top.map((c, i) => `• ${c.name} — ${scoreForIndex(i, limited.length)}%`),
            ].join("\n");

      patchAssistant(
        {
          progress: [],
          elapsedMs: Date.now() - t0,
          artifacts: [
            { type: "answer", text: answerText },
            ...(limited.length > 0
              ? [
                  {
                    type: "candidate_cards" as const,
                    items: limited.map((c, i) => ({
                      candidateId: c.candidateId,
                      name: c.name,
                      subtitle: [c.currentTitle, c.company, c.skillsPreview]
                        .filter(Boolean)
                        .join(" · ")
                        .slice(0, 80),
                      score: scoreForIndex(i, limited.length),
                    })),
                  },
                ]
              : []),
          ],
          nextActions:
            limited.length > 0
              ? ["So sánh top 5", "Lưu search", "Tạo Job", "Câu hỏi phỏng vấn"]
              : opts.emptyActions,
          transparency: {
            tools: ["Candidate Search", "Matching Engine", "Knowledge"],
            data: "workspace ready candidates · list API",
            why: opts.why,
            intent: parsed.intent,
            slots: filters,
            confidence:
              limited.length > 0 ? String(scoreForIndex(0, limited.length) / 100) : undefined,
            model: "rules+workspace",
          },
        },
        {
          filters: filters.length ? filters : undefined,
          recentActions: [...(base.context.recentActions ?? []), "search"].slice(-5),
        },
      );
    };

    try {
      if (parsed.intent === "SEARCH_CANDIDATE" || parsed.intent === "HELP") {
        await runSearch({
          status: "Searching candidates",
          why: "Language-agnostic SEARCH_CANDIDATE (D10)",
          emptyActions: ["Upload CV", "Mở rộng tiêu chí", "Tạo Job"],
        });
      } else if (parsed.intent === "MATCH_JOB") {
        await runSearch({
          status: "Matching JD",
          why: "MATCH_JOB · search until job context is bound",
          emptyActions: ["Upload CV", "Upload JD", "Tạo Job"],
        });
      } else if (parsed.intent === "LIST_INGEST_JOBS") {
        const { items } = await api.listIngestionJobs(10);
        const lines =
          items.length === 0
            ? "Chưa có Ingestion Job nào."
            : items
                .map((j) => {
                  const r = j.report;
                  const counts = r ? `${r.imported} imported` : j.status;
                  return `• ${j.sourceLabel} — ${counts} (${j.status})`;
                })
                .join("\n");
        patchAssistant({
          progress: [],
          artifacts: [
            {
              type: "answer",
              text: `Import Jobs\n\n${lines}`,
            },
          ],
          nextActions: ["Upload CV", "java hcm 60m"],
          transparency: {
            tools: ["Ingestion Job history"],
            data: "ingestion-jobs store",
            why: "Assistant reads jobs — does not run import",
            intent: "LIST_INGEST_JOBS",
          },
        });
      } else if (parsed.intent === "ANALYZE_CV") {
        patchAssistant({
          progress: [],
          artifacts: [
            {
              type: "answer",
              text: "Gửi CV lên để mình review giúp bạn — kéo thả hoặc bấm Upload CV.",
            },
          ],
          nextActions: ["Upload CV", "java hcm 60m"],
          transparency: {
            tools: [],
            data: "none yet",
            why: "Waiting for CV upload",
            intent: "ANALYZE_CV",
            model: "rules+workspace",
          },
        });
      } else if (parsed.intent === "INGEST_CV_WORKFLOW") {
        patchAssistant({
          mode: "Mixed",
          progress: [],
          artifacts: [
            {
              type: "answer",
              text: "Ok — upload CV, mình sẽ parse, review, rồi xin Confirm trước khi tạo Candidate.",
            },
          ],
          nextActions: ["Upload CV"],
          transparency: {
            tools: ["Ingest workflow"],
            data: "pending upload",
            why: "Mixed hire flow",
            intent: "INGEST_CV_WORKFLOW",
            model: "rules+workspace",
          },
        });
      } else if (parsed.intent === "CREATE_JOB") {
        const t0 = Date.now();
        patchAssistant({
          progress: [{ id: "run", label: "Preparing job draft", done: false }],
        });
        await sleep(320);
        const title =
          parsed.search.role ||
          (parsed.search.skills[0] ? `${parsed.search.skills[0]} Engineer` : "Backend Engineer");
        const preview: ActPreviewArtifact = {
          type: "act_preview",
          title: `Tạo job · ${title}`,
          summary: "Chưa tạo gì cả — Confirm mới ghi vào Knowledge.",
          payload: { kind: "create_job", title, text },
        };
        patchAssistant(
          {
            progress: [],
            elapsedMs: Date.now() - t0,
            artifacts: [
              {
                type: "answer",
                text: `Đã soạn sẵn draft job “${title}”. Xác nhận bên dưới nếu đúng.`,
              },
              preview,
            ],
            nextActions: ["JD này có ai phù hợp không?", "Upload JD"],
            transparency: {
              tools: ["JD Prefill"],
              data: "user prompt — not persisted until Confirm",
              why: "Act · CREATE_JOB",
              intent: "CREATE_JOB",
              slots: parsed.filterLabels,
              model: "rules+workspace",
            },
          },
          {
            jobDraft: text,
            recentActions: [...(base.context.recentActions ?? []), "draft_job"].slice(-5),
          },
        );
      }
    } catch (err) {
      patchAssistant({
        artifacts: [
          {
            type: "answer",
            text: err instanceof Error ? err.message : "Có lỗi — thử lại giúp mình.",
          },
        ],
        progress: [],
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

  const onUploadCv = async (fileOrFiles: File | FileList | File[]) => {
    const files = Array.isArray(fileOrFiles)
      ? fileOrFiles
      : fileOrFiles instanceof FileList
        ? Array.from(fileOrFiles)
        : [fileOrFiles];
    if (!files.length) return;

    setBusy(true);
    const label = files.length === 1 ? files[0].name : `${files.length} files`;
    const userMsg: TimelineMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      createdAt: new Date().toISOString(),
      text: `Ingest · ${label}`,
    };
    const assistantId = `a_${Date.now()}`;
    let base = getConversation(conv.id) ?? conv;
    base = {
      ...base,
      title: base.messages.length === 0 ? `Ingest · ${label}` : base.title,
      messages: [
        ...base.messages,
        userMsg,
        {
          id: assistantId,
          role: "assistant",
          createdAt: new Date().toISOString(),
          mode: "Act",
          patternId: "P-ACT-INGEST",
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

    const isZip = files.length === 1 && files[0].name.toLowerCase().endsWith(".zip");
    const isFolder = files.some(
      (f) => !!(f as File & { webkitRelativePath?: string }).webkitRelativePath,
    );

    try {
      const t0 = Date.now();
      const totalBytes = files.reduce((n, f) => n + f.size, 0);
      const maxHint = 100 * 1024 * 1024;
      if (totalBytes > maxHint) {
        patch({
          progress: [],
          artifacts: [
            {
              type: "answer",
              text: `Gói quá lớn (${Math.round(totalBytes / (1024 * 1024))}MB). Hãy tách nhỏ hơn 100MB hoặc dùng ZIP.`,
            },
          ],
        });
        return;
      }
      patch({
        progress: [
          {
            id: "run",
            label: `Đã nhận ${files.length} tài liệu. Đang phân tích`,
            done: false,
          },
        ],
      });

      const job = await api.createIngestionJob(files, {
        sourceKind: isZip ? "zip" : isFolder ? "folder" : "multi_file",
      });

      if (job.status === "AwaitingConfirmation") {
        patch(
          {
            progress: [],
            elapsedMs: Date.now() - t0,
            artifacts: [
              {
                type: "answer",
                text: `Đã phát hiện ${job.preview.total} tài liệu trong “${job.sourceLabel}”. Chọn phạm vi trước khi ghi Knowledge.`,
              },
              {
                type: "ingest_preview",
                jobId: job.jobId,
                sourceLabel: job.sourceLabel,
                preview: job.preview,
              },
            ],
            nextActions: [],
            transparency: {
              tools: ["Ingestion Engine", "Classifier"],
              data: job.sourceLabel,
              why: "Import Preview — Confirm before persist",
              intent: "INGEST",
            },
          },
          {
            files: [...(base.context.files ?? []), label].slice(-5),
            recentActions: [...(base.context.recentActions ?? []), "ingest_preview"].slice(-5),
          },
        );
        return;
      }

      let current = job;
      while (
        current.status === "Queued" ||
        current.status === "Running" ||
        current.status === "Created"
      ) {
        patch({
          progress: [
            {
              id: "run",
              label: `Đang phân tích… (${current.progress.percent}%)`,
              done: false,
            },
          ],
        });
        await sleep(400);
        current = await api.getIngestionJob(current.jobId);
      }

      const report = current.report;
      patch(
        {
          progress: [],
          elapsedMs: Date.now() - t0,
          artifacts: [
            {
              type: "answer",
              text: report
                ? `Hoàn tất.\n\nImported ${report.imported}\nDuplicate ${report.duplicate}\nSkipped ${report.skipped}`
                : `Job ${current.status}`,
            },
            ...(report
              ? [
                  {
                    type: "ingest_report" as const,
                    jobId: current.jobId,
                    sourceLabel: current.sourceLabel,
                    report: {
                      imported: report.imported,
                      duplicate: report.duplicate,
                      skipped: report.skipped,
                      unsupported: report.unsupported,
                      failed: report.failed,
                      durationMs: report.durationMs,
                    },
                  },
                ]
              : []),
          ],
          nextActions: ["java hcm 60m", "Có bao nhiêu Java Senior?", "Hôm qua mình import gì?"],
          transparency: {
            tools: ["Ingestion Engine"],
            data: current.sourceLabel,
            why: "Ingestion Job complete",
            intent: "INGEST",
          },
        },
        {
          files: [...(base.context.files ?? []), label].slice(-5),
          recentActions: [...(base.context.recentActions ?? []), "ingest"].slice(-5),
        },
      );
    } catch (err) {
      patch({
        progress: [],
        artifacts: [
          { type: "answer", text: err instanceof Error ? err.message : "Ingest thất bại" },
        ],
      });
    } finally {
      setBusy(false);
    }
  };

  const confirmIngest = async (jobId: string, scope: "cv" | "cv_jd" | "all") => {
    setBusy(true);
    const assistantId = `a_${Date.now()}`;
    let base = getConversation(conv.id) ?? conv;
    base = {
      ...base,
      messages: [
        ...base.messages,
        {
          id: `u_${Date.now()}`,
          role: "user",
          createdAt: new Date().toISOString(),
          text: `Confirm ingest · ${scope}`,
        },
        {
          id: assistantId,
          role: "assistant",
          createdAt: new Date().toISOString(),
          mode: "Act",
          patternId: "P-ACT-INGEST",
          progress: [{ id: "run", label: "Đang import…", done: false }],
        },
      ],
    };
    persist(base);
    const patch = (partial: Partial<TimelineMessage>) => {
      const cur = getConversation(conv.id) ?? base;
      persist({
        ...cur,
        messages: cur.messages.map((m) => (m.id === assistantId ? { ...m, ...partial } : m)),
      });
    };
    try {
      const t0 = Date.now();
      await api.confirmIngestionJob(jobId, scope);
      let current = await api.getIngestionJob(jobId);
      while (current.status === "Queued" || current.status === "Running") {
        patch({
          progress: [
            {
              id: "run",
              label: `Đang phân tích… (${current.progress.percent}%)`,
              done: false,
            },
          ],
        });
        await sleep(400);
        current = await api.getIngestionJob(jobId);
      }
      const report = current.report;
      patch({
        progress: [],
        elapsedMs: Date.now() - t0,
        artifacts: [
          {
            type: "answer",
            text: report
              ? `Hoàn tất.\n\nImported ${report.imported}\nDuplicate ${report.duplicate}\nSkipped ${report.skipped}`
              : `Job ${current.status}`,
          },
          ...(report
            ? [
                {
                  type: "ingest_report" as const,
                  jobId: current.jobId,
                  sourceLabel: current.sourceLabel,
                  report: {
                    imported: report.imported,
                    duplicate: report.duplicate,
                    skipped: report.skipped,
                    unsupported: report.unsupported,
                    failed: report.failed,
                    durationMs: report.durationMs,
                  },
                },
              ]
            : []),
        ],
        nextActions: ["java hcm 60m", "Có bao nhiêu Java Senior?", "Hôm qua mình import gì?"],
      });
    } catch (err) {
      patch({
        progress: [],
        artifacts: [
          { type: "answer", text: err instanceof Error ? err.message : "Confirm failed" },
        ],
      });
    } finally {
      setBusy(false);
    }
  };

  const onUploadJd = async (file: File) => {
    const text = await file.text().catch(() => file.name);
    setPrompt((p) =>
      p ? `${p}\n\n${text.slice(0, 2000)}` : `Create job from JD:\n${text.slice(0, 2000)}`,
    );
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
                Good morning, {greetingName()}.
              </h1>
              <p className="mt-2 text-sm text-[var(--color-rs-muted)]">
                What do you want to accomplish today?
              </p>
              <div className="mt-6 border-t border-[var(--color-rs-border)] pt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-rs-subtle-fg)]">
                  Try asking
                </p>
                <div className="flex flex-wrap gap-2">
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
                <div className="mt-3 flex gap-2 text-xs text-[var(--color-rs-muted)]">
                  <span>Upload CV</span>
                  <span>·</span>
                  <span>Upload JD</span>
                </div>
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
                    {m.text ? <p className="whitespace-pre-wrap">{m.text}</p> : null}
                    {m.progress?.length ? <QuietStatus steps={m.progress} /> : null}
                    {m.artifacts ? (
                      <ArtifactRenderer
                        artifacts={m.artifacts}
                        transparency={m.transparency}
                        elapsedMs={m.elapsedMs}
                        nextActions={m.nextActions}
                        onNextAction={(action) => {
                          const m = /^confirm-ingest:([^:]+):(cv|cv_jd|all)$/.exec(action);
                          if (m) {
                            void confirmIngest(m[1], m[2] as "cv" | "cv_jd" | "all");
                            return;
                          }
                          if (action === "Upload CV") {
                            fileCvRef.current?.click();
                            return;
                          }
                          setPrompt(action);
                          focusComposer();
                        }}
                        onConfirmAct={(a) => void onConfirmAct(a)}
                        confirming={confirming}
                      />
                    ) : m.transparency ? (
                      <ArtifactRenderer
                        artifacts={[]}
                        transparency={m.transparency}
                        elapsedMs={m.elapsedMs}
                        nextActions={m.nextActions}
                        onNextAction={(action) => {
                          const m = /^confirm-ingest:([^:]+):(cv|cv_jd|all)$/.exec(action);
                          if (m) {
                            void confirmIngest(m[1], m[2] as "cv" | "cv_jd" | "all");
                            return;
                          }
                          if (action === "Upload CV") {
                            fileCvRef.current?.click();
                            return;
                          }
                          setPrompt(action);
                          focusComposer();
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="sticky bottom-0 z-10 mt-auto border border-[var(--color-rs-border)] bg-white shadow-sm rounded-xl p-3">
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
                  Upload CV / ZIP
                </button>
                <button
                  type="button"
                  onClick={() => fileFolderRef.current?.click()}
                  className="rounded-md border border-[var(--color-rs-border)] px-2 py-1 text-xs font-medium hover:bg-[var(--color-rs-subtle)]"
                >
                  Folder
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
                  accept=".pdf,.doc,.docx,.zip"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const list = e.target.files;
                    if (list?.length) void onUploadCv(list);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={fileFolderRef}
                  type="file"
                  // @ts-expect-error webkitdirectory is non-standard but supported in Chromium
                  webkitdirectory=""
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const list = e.target.files;
                    if (list?.length) void onUploadCv(list);
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
              {
                label: "New conversation",
                run: () => navigate(`/assistant/c/${newConversationId()}`),
              },
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
