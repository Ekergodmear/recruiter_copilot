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
    <div className="mt-3 space-y-3">
      {artifacts.map((a, idx) => {
        if (a.type === "answer") {
          return (
            <p key={idx} className="text-sm leading-relaxed text-[var(--color-rs-fg)]">
              {a.text}
            </p>
          );
        }
        if (a.type === "candidate_cards") {
          return (
            <div
              key={idx}
              className="overflow-hidden rounded-lg border border-[var(--color-rs-border)] bg-white"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-rs-border)] bg-[var(--color-rs-subtle)] px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-rs-muted)]">
                  {a.headline ?? "Search result"}
                </p>
                <p className="text-xs font-medium text-[var(--color-rs-fg)]">
                  {a.items.length} candidate{a.items.length === 1 ? "" : "s"}
                </p>
              </div>
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
                        <span className="font-mono text-xs font-semibold text-[var(--color-rs-accent)]">
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
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-rs-muted)]">
                Review artifact
              </p>
              <p className="mt-1 font-medium">Imported · {a.name}</p>
              <p className="mt-1 text-xs text-[var(--color-rs-muted)]">{a.candidateId}</p>
              <Link
                to={a.reviewPath}
                className="mt-3 inline-flex rounded-md bg-[var(--color-rs-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-rs-accent-hover)]"
              >
                Open review
              </Link>
            </div>
          );
        }
        if (a.type === "act_preview") {
          return (
            <div
              key={idx}
              className="rounded-lg border border-[var(--color-rs-border)] border-l-4 border-l-[#9a6700] bg-white px-3 py-3 text-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9a6700]">
                Preview · Confirm required
              </p>
              <p className="mt-1 font-medium">{a.title}</p>
              <p className="mt-1 text-[var(--color-rs-muted)]">{a.summary}</p>
              {a.confirmed && a.resultId ? (
                <Link
                  to={`/jobs/${a.resultId}`}
                  className="mt-3 inline-flex text-xs font-semibold text-[var(--color-rs-analyze)]"
                >
                  Open job →
                </Link>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={confirming}
                    onClick={() => onConfirmAct?.(a)}
                    className="rounded-md bg-[var(--color-rs-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-rs-accent-hover)] disabled:opacity-50"
                  >
                    {confirming ? "Executing…" : "Confirm"}
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
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-rs-subtle-fg)]">
            Suggested next actions
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {nextActions.map((action) => (
              <li key={action}>
                <button
                  type="button"
                  onClick={() => onNextAction?.(action)}
                  className="rounded-full border border-[var(--color-rs-border)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--color-rs-fg)] hover:bg-[var(--color-rs-subtle)]"
                >
                  ○ {action}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {transparency ? (
        <div className="border-t border-[var(--color-rs-border)] pt-2 font-mono text-[10px] leading-relaxed text-[var(--color-rs-muted)]">
          <p className="mb-1 font-sans text-[11px] font-semibold uppercase tracking-wide text-[var(--color-rs-subtle-fg)]">
            Used
          </p>
          <ul className="mb-2 space-y-0.5">
            {transparency.tools.map((t) => (
              <li key={t}>✓ {t}</li>
            ))}
          </ul>
          <div>Data · {transparency.data}</div>
          <div>Why · {transparency.why}</div>
          {transparency.confidence ? <div>Confidence · {transparency.confidence}</div> : null}
          {typeof elapsedMs === "number" ? <div>Time · {elapsedMs} ms</div> : null}
          <div>
            Generated ·{" "}
            {artifacts
              .map((a) =>
                a.type === "candidate_cards"
                  ? "Candidate List"
                  : a.type === "act_preview"
                    ? "Job Preview"
                    : a.type === "import_result"
                      ? "Review Artifact"
                      : "Answer",
              )
              .join(", ")}
          </div>
        </div>
      ) : null}
    </div>
  );
}
