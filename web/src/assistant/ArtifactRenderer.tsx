import { useState } from "react";
import { Link } from "react-router-dom";
import type { Artifact, ActPreviewArtifact, Transparency } from "./conversation-store";

type Props = {
  artifacts: Artifact[];
  transparency?: Transparency;
  elapsedMs?: number;
  nextActions?: string[];
  onNextAction?: (action: string) => void;
  onConfirmAct?: (artifact: ActPreviewArtifact) => void;
  onCancelAct?: () => void;
  confirming?: boolean;
};

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function TechnicalDetails({
  transparency,
  elapsedMs,
}: {
  transparency: Transparency;
  elapsedMs?: number;
}) {
  const [open, setOpen] = useState(false);
  const seconds =
    typeof elapsedMs === "number" ? formatElapsed(elapsedMs) : null;

  return (
    <div className="border-t border-[var(--color-rs-border)] pt-2">
      <div className="flex items-center gap-2 text-[11px] text-[var(--color-rs-subtle-fg)]">
        <span>AI response{seconds ? ` · ${seconds}` : ""}</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-[var(--color-rs-subtle)] hover:text-[var(--color-rs-muted)]"
          aria-expanded={open}
          title="Show details"
        >
          <span aria-hidden>ⓘ</span>
          <span>{open ? "Hide details" : "Show details"}</span>
        </button>
      </div>
      {open ? (
        <dl className="mt-2 space-y-1 font-mono text-[10px] leading-relaxed text-[var(--color-rs-muted)]">
          {transparency.intent ? (
            <div>
              <dt className="inline font-sans text-[10px] font-semibold uppercase tracking-wide text-[var(--color-rs-subtle-fg)]">
                Intent{" "}
              </dt>
              <dd className="inline">{transparency.intent}</dd>
            </div>
          ) : null}
          {transparency.slots?.length ? (
            <div>
              <dt className="mb-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-[var(--color-rs-subtle-fg)]">
                Slots
              </dt>
              <dd>
                <ul className="space-y-0.5">
                  {transparency.slots.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="mb-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-[var(--color-rs-subtle-fg)]">
              Tools
            </dt>
            <dd>
              <ul className="space-y-0.5">
                {transparency.tools.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt className="inline font-sans text-[10px] font-semibold uppercase tracking-wide text-[var(--color-rs-subtle-fg)]">
              Sources{" "}
            </dt>
            <dd className="inline">{transparency.data}</dd>
          </div>
          <div>
            <dt className="inline font-sans text-[10px] font-semibold uppercase tracking-wide text-[var(--color-rs-subtle-fg)]">
              Why{" "}
            </dt>
            <dd className="inline">{transparency.why}</dd>
          </div>
          {transparency.confidence ? (
            <div>
              <dt className="inline font-sans text-[10px] font-semibold uppercase tracking-wide text-[var(--color-rs-subtle-fg)]">
                Confidence{" "}
              </dt>
              <dd className="inline">{transparency.confidence}</dd>
            </div>
          ) : null}
          {typeof elapsedMs === "number" ? (
            <div>
              <dt className="inline font-sans text-[10px] font-semibold uppercase tracking-wide text-[var(--color-rs-subtle-fg)]">
                Time{" "}
              </dt>
              <dd className="inline">{formatElapsed(elapsedMs)}</dd>
            </div>
          ) : null}
          {transparency.model ? (
            <div>
              <dt className="inline font-sans text-[10px] font-semibold uppercase tracking-wide text-[var(--color-rs-subtle-fg)]">
                Model{" "}
              </dt>
              <dd className="inline">{transparency.model}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

export function ArtifactRenderer({
  artifacts,
  transparency,
  elapsedMs,
  nextActions,
  onNextAction,
  onConfirmAct,
  onCancelAct,
  confirming,
}: Props) {
  return (
    <div className="mt-1 space-y-3">
      {artifacts.map((a, idx) => {
        if (a.type === "answer") {
          return (
            <p
              key={idx}
              className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-rs-fg)]"
            >
              {a.text}
            </p>
          );
        }
        if (a.type === "candidate_cards") {
          if (a.items.length === 0) return null;
          return (
            <div key={idx} className="overflow-hidden rounded-lg border border-[var(--color-rs-border)] bg-white">
              <ul className="divide-y divide-[var(--color-rs-border)]">
                {a.items.map((item) => (
                  <li
                    key={item.candidateId}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      {item.subtitle ? (
                        <p className="truncate text-xs text-[var(--color-rs-muted)]">
                          {item.subtitle}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {typeof item.score === "number" ? (
                        <span className="text-xs font-semibold text-[var(--color-rs-accent)]">
                          {item.score}%
                        </span>
                      ) : null}
                      <Link
                        to={`/review/${item.candidateId}`}
                        className="rounded-md border border-[var(--color-rs-border)] px-2 py-1 text-xs font-medium hover:bg-[var(--color-rs-subtle)]"
                      >
                        Review
                      </Link>
                      <Link
                        to={`/candidates/${item.candidateId}`}
                        className="rounded-md border border-[var(--color-rs-border)] px-2 py-1 text-xs font-medium hover:bg-[var(--color-rs-subtle)]"
                      >
                        Open
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        if (a.type === "import_result") {
          return (
            <div
              key={idx}
              className="rounded-lg border border-[var(--color-rs-border)] bg-white px-3 py-3 text-sm"
            >
              <p className="font-medium">Đã import · {a.name}</p>
              <Link
                to={a.reviewPath}
                className="mt-3 inline-flex rounded-md bg-[var(--color-rs-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-rs-accent-hover)]"
              >
                Mở review
              </Link>
            </div>
          );
        }
        if (a.type === "ingest_preview") {
          return (
            <div
              key={idx}
              className="rounded-lg border border-[var(--color-rs-border)] bg-white px-3 py-3 text-sm"
            >
              <p className="font-medium">Đã phát hiện · {a.sourceLabel}</p>
              <ul className="mt-2 space-y-0.5 text-[var(--color-rs-muted)]">
                <li>{a.preview.cv} CV</li>
                <li>{a.preview.jd} JD</li>
                <li>{a.preview.salary} Salary sheet</li>
                <li>{a.preview.other + a.preview.unsupported} file khác</li>
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md bg-[var(--color-rs-accent)] px-3 py-1.5 text-xs font-semibold text-white"
                  onClick={() => onNextAction?.(`confirm-ingest:${a.jobId}:cv`)}
                >
                  Chỉ import CV
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[var(--color-rs-border)] px-3 py-1.5 text-xs font-medium"
                  onClick={() => onNextAction?.(`confirm-ingest:${a.jobId}:cv_jd`)}
                >
                  CV + JD
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[var(--color-rs-border)] px-3 py-1.5 text-xs font-medium"
                  onClick={() => onNextAction?.(`confirm-ingest:${a.jobId}:all`)}
                >
                  Import tất cả
                </button>
              </div>
            </div>
          );
        }
        if (a.type === "ingest_report") {
          const r = a.report;
          const secs = Math.round(r.durationMs / 1000);
          return (
            <div
              key={idx}
              className="rounded-lg border border-[var(--color-rs-border)] bg-white px-3 py-3 text-sm"
            >
              <p className="font-medium">Import completed · {a.sourceLabel}</p>
              <ul className="mt-2 grid grid-cols-2 gap-1 text-[var(--color-rs-muted)]">
                <li>Imported · {r.imported}</li>
                <li>Duplicate · {r.duplicate}</li>
                <li>Skipped · {r.skipped}</li>
                <li>Unsupported · {r.unsupported}</li>
                <li>Failed · {r.failed}</li>
                <li>
                  Duration · {secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`}
                </li>
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to="/candidates"
                  className="rounded-md bg-[var(--color-rs-accent)] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Open Imported Candidates
                </Link>
                <button
                  type="button"
                  className="rounded-md border border-[var(--color-rs-border)] px-3 py-1.5 text-xs font-medium"
                  onClick={() => onNextAction?.("Review Failed Files")}
                >
                  Review Failed Files
                </button>
              </div>
            </div>
          );
        }
        if (a.type === "act_preview") {
          return (
            <div
              key={idx}
              className="rounded-lg border border-[var(--color-rs-border)] border-l-4 border-l-[#9a6700] bg-white px-3 py-3 text-sm"
            >
              <p className="text-xs font-semibold text-[#9a6700]">Cần xác nhận trước khi tạo</p>
              <p className="mt-1 font-medium">{a.title}</p>
              <p className="mt-1 text-[var(--color-rs-muted)]">{a.summary}</p>
              {a.confirmed && a.resultId ? (
                <Link
                  to={`/jobs/${a.resultId}`}
                  className="mt-3 inline-flex text-xs font-semibold text-[var(--color-rs-analyze)]"
                >
                  Mở job →
                </Link>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={confirming}
                    onClick={() => onConfirmAct?.(a)}
                    className="rounded-md bg-[var(--color-rs-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-rs-accent-hover)] disabled:opacity-50"
                  >
                    {confirming ? "Đang tạo…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    disabled={confirming}
                    onClick={onCancelAct}
                    className="rounded-md border border-[var(--color-rs-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-rs-subtle)]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        }
        return null;
      })}

      {nextActions && nextActions.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {nextActions.map((action) => (
            <li key={action}>
              <button
                type="button"
                onClick={() => onNextAction?.(action)}
                className="rounded-full border border-[var(--color-rs-border)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--color-rs-fg)] hover:bg-[var(--color-rs-subtle)]"
              >
                {action}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {transparency ? (
        <TechnicalDetails transparency={transparency} elapsedMs={elapsedMs} />
      ) : null}
    </div>
  );
}
