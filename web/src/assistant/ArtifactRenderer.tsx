import { Link } from "react-router-dom";
import type { Artifact, ActPreviewArtifact } from "./conversation-store";

type Props = {
  artifacts: Artifact[];
  onConfirmAct?: (artifact: ActPreviewArtifact) => void;
  onCancelAct?: () => void;
  confirming?: boolean;
};

export function ArtifactRenderer({
  artifacts,
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
            <ul key={idx} className="divide-y divide-[var(--color-rs-border)] rounded-lg border border-[var(--color-rs-border)] bg-white">
              {a.items.map((item) => (
                <li
                  key={item.candidateId}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.subtitle ? (
                      <p className="text-xs text-[var(--color-rs-muted)]">{item.subtitle}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
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
          );
        }
        if (a.type === "import_result") {
          return (
            <div
              key={idx}
              className="rounded-lg border border-[var(--color-rs-border)] bg-white px-3 py-3 text-sm"
            >
              <p className="font-medium">Imported · {a.name}</p>
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
    </div>
  );
}
