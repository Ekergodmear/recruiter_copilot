import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { FieldDiffRow } from "../api/types";
import { trackAbandon, trackReviewMode, type ReviewMode } from "../telemetry/ux";
import { useToast } from "../components/Toast";
import { InsightsPanel } from "../components/InsightsPanel";
import { ErrorState } from "../components/EmptyState";
import { PanelSkeleton } from "../components/Skeleton";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";

export function ReviewScreen() {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const sessionMode = searchParams.get("session") === "1";
  const reviewMode: ReviewMode = sessionMode ? "focus" : "flexible";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const readyRef = useRef(false);
  const abandonTrackedRef = useRef(false);
  const modeTrackedForRef = useRef<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["review", id],
    queryFn: () => api.getReview(id),
    enabled: Boolean(id),
  });

  readyRef.current = data?.ready ?? false;
  useUnsavedChanges(Boolean(editingField));

  const recordAbandon = (reason: Parameters<typeof trackAbandon>[0]) => {
    if (abandonTrackedRef.current || readyRef.current) return;
    abandonTrackedRef.current = true;
    trackAbandon(reason, id, reviewMode);
  };

  useEffect(() => {
    // One event per candidate visit (not per keystroke/render) — EPIC-002 mode split.
    if (!id || modeTrackedForRef.current === id) return;
    modeTrackedForRef.current = id;
    abandonTrackedRef.current = false;
    trackReviewMode(reviewMode, id);
  }, [id, reviewMode]);

  useEffect(() => {
    const onBeforeUnload = () => {
      recordAbandon("review_close_tab_not_ready");
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      recordAbandon("review_navigate_away_not_ready");
    };
  }, [id]);

  const { data: inbox } = useQuery({
    queryKey: ["inbox"],
    queryFn: () => api.listCandidates({ ready: false }),
  });

  const inboxIds = (inbox?.items ?? []).map((i) => i.candidateId);
  const sessionIndex = inboxIds.indexOf(id);
  const sessionTotal = inboxIds.length;
  const sessionDone = sessionIndex >= 0 ? sessionIndex : 0;
  const fields = data?.diff ?? [];

  useEffect(() => {
    setFocusIndex(0);
    setEditingField(null);
  }, [id]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["review", id] });
    void queryClient.invalidateQueries({ queryKey: ["inbox"] });
    void queryClient.invalidateQueries({ queryKey: ["candidates"] });
  };

  const runAction = async (
    field: string,
    action: "accept" | "edit" | "reject",
    humanValue?: string,
  ) => {
    setBusy(true);
    try {
      await api.reviewField(id, { field, action, humanValue });
      invalidate();
      setEditingField(null);
      if (action === "accept") toast("Approved");
      if (action === "edit") toast("Corrected");
      if (action === "reject") toast("Skipped");
    } finally {
      setBusy(false);
    }
  };

  const readyAndNext = async () => {
    setBusy(true);
    try {
      const nextId = sessionMode ? inboxIds[sessionIndex + 1] : undefined;
      if (!data?.ready) {
        await api.markReady(id, reviewMode);
        invalidate();
        toast("Candidate Ready");
      }
      if (sessionMode && nextId) {
        navigate(`/review/${nextId}?session=1`, { replace: true });
      } else if (sessionMode) {
        navigate("/?complete=1");
      } else {
        navigate("/candidates");
      }
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const goCandidate = (delta: number) => {
    const next = inboxIds[sessionIndex + delta];
    if (!next) return;
    const qs = sessionMode ? "?session=1" : "";
    navigate(`/review/${next}${qs}`, { replace: sessionMode });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) {
        if (e.key === "Escape" && editingField) {
          setEditingField(null);
        }
        return;
      }
      if (busy || !data) return;
      const row = fields[focusIndex];
      const key = e.key.toLowerCase();

      if (key === "j") {
        e.preventDefault();
        goCandidate(1);
        return;
      }
      if (key === "k") {
        e.preventDefault();
        goCandidate(-1);
        return;
      }
      if (key === "n") {
        e.preventDefault();
        void readyAndNext();
        return;
      }
      if (!row) return;
      if (key === "a") {
        e.preventDefault();
        void runAction(row.field, "accept");
        setFocusIndex((i) => Math.min(i + 1, fields.length - 1));
      } else if (key === "e") {
        e.preventDefault();
        setEditingField(row.field);
        setEditValue(row.current);
      } else if (key === "s") {
        e.preventDefault();
        void runAction(row.field, "reject");
        setFocusIndex((i) => Math.min(i + 1, fields.length - 1));
      } else if (key === "arrowdown") {
        e.preventDefault();
        setFocusIndex((i) => Math.min(i + 1, fields.length - 1));
      } else if (key === "arrowup") {
        e.preventDefault();
        setFocusIndex((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyboard binds latest handlers each render intentionally via deps below
  }, [busy, data, editingField, fields, focusIndex, id, inboxIds, sessionIndex, sessionMode]);

  const shell = (content: ReactNode) =>
    sessionMode ? (
      <div className="min-h-screen bg-slate-100">{content}</div>
    ) : (
      <div className="flex-1">{content}</div>
    );

  if (isLoading) {
    return shell(
      <div className="p-6">
        <PanelSkeleton />
      </div>,
    );
  }

  if (error || !data) {
    return shell(
      <div className="p-8">
        <ErrorState
          message={(error as Error)?.message ?? "Not found"}
          onRetry={() => void refetch()}
        />
      </div>,
    );
  }

  return shell(
    <div className="flex h-full min-h-screen flex-col">
      {sessionMode && sessionTotal > 0 && (
        <div className="border-b border-slate-200 bg-white px-6 py-4">
          <div className="mb-2 flex justify-between text-sm text-slate-600">
            <span>
              {sessionDone + 1} / {sessionTotal}
            </span>
            <span>{Math.max(0, sessionTotal - sessionDone - 1)} CV left</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-slate-900 transition-all"
              style={{ width: `${((sessionDone + 1) / sessionTotal) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row lg:p-6">
        <section className="flex-1 rounded-xl border border-slate-200 bg-white lg:min-h-[480px]">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Resume</h2>
            <p className="text-xs text-slate-500">{data.resume?.filename ?? "—"}</p>
          </div>
          {data.resume?.contentUrl ? (
            <iframe
              title="Resume preview"
              src={data.resume.contentUrl}
              className="h-[420px] w-full border-0"
            />
          ) : (
            <p className="p-4 text-sm text-slate-500">No preview available.</p>
          )}
        </section>

        <section className="w-full shrink-0 space-y-4 lg:w-96">
          <InsightsPanel screen="review" candidateId={id} />
          {(data.possibleDuplicates?.length ?? 0) > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">Possible duplicate candidate found.</p>
              <ul className="mt-2 space-y-1">
                {data.possibleDuplicates!.map((dup) => (
                  <li key={dup.candidateId}>
                    {dup.name} · score {dup.score} · {dup.candidateId}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Knowledge</h2>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">A E S · N · J K</p>
            </div>
            <div className="space-y-3">
              {data.diff.map((row, index) => (
                <FieldRow
                  key={row.field}
                  row={row}
                  busy={busy}
                  focused={focusIndex === index}
                  editing={editingField === row.field}
                  editValue={editValue}
                  onApprove={() => void runAction(row.field, "accept")}
                  onSkip={() => void runAction(row.field, "reject")}
                  onCorrect={() => {
                    setEditingField(row.field);
                    setEditValue(row.current);
                    setFocusIndex(index);
                  }}
                  onSaveEdit={() => void runAction(row.field, "edit", editValue)}
                  onCancelEdit={() => setEditingField(null)}
                  onEditValueChange={setEditValue}
                  onFocus={() => setFocusIndex(index)}
                />
              ))}
            </div>
          </div>

          {data.reviewQueue.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-700">Review queue</h2>
              <ul className="space-y-1 text-sm text-slate-600">
                {data.reviewQueue.map((q) => (
                  <li key={q.field}>
                    {q.priorityLabel} {q.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4">
        {!sessionMode && (
          <Link
            to="/"
            className="text-sm text-slate-600 hover:text-slate-900"
            onClick={() => recordAbandon("review_back_not_ready")}
          >
            ← Back to Inbox
          </Link>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            disabled={busy || data.ready}
            onClick={() => void readyAndNext()}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {data.ready ? "Ready ✓" : "Ready & Next →"}
          </button>
        </div>
      </footer>
    </div>,
  );
}

function FieldRow({
  row,
  busy,
  focused,
  editing,
  editValue,
  onApprove,
  onSkip,
  onCorrect,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onFocus,
}: {
  row: FieldDiffRow;
  busy: boolean;
  focused: boolean;
  editing: boolean;
  editValue: string;
  onApprove: () => void;
  onSkip: () => void;
  onCorrect: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (v: string) => void;
  onFocus: () => void;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        focused ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-100"
      }`}
      onClick={onFocus}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-slate-500">{row.label}</span>
        <span className="text-xs text-slate-400">{row.provenance?.confidenceLabel}</span>
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            className="w-full rounded border border-slate-300 p-2 text-sm"
            rows={2}
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs font-medium text-slate-900"
              onClick={onSaveEdit}
              disabled={busy}
            >
              Save
            </button>
            <button type="button" className="text-xs text-slate-500" onClick={onCancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mb-2 text-sm text-slate-800">{row.current || "—"}</p>
      )}
      {!editing && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCorrect}
            className="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
          >
            Correct
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onSkip}
            className="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}
