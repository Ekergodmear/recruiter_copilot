import type { ConversationContext } from "./conversation-store";

export function ContextPanel({
  context,
  open,
  onClose,
}: {
  context: ConversationContext;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const rows: { label: string; value: string }[] = [];
  if (context.filters?.length) {
    rows.push({ label: "Filters", value: context.filters.join(" · ") });
  }
  if (context.candidateId) {
    rows.push({ label: "Candidate", value: context.candidateId });
  }
  if (context.jobDraft) {
    rows.push({ label: "Job draft", value: context.jobDraft.slice(0, 120) });
  }
  if (context.files?.length) {
    rows.push({ label: "Files", value: context.files.join(", ") });
  }
  if (context.recentActions?.length) {
    rows.push({ label: "Recent", value: context.recentActions.slice(0, 3).join(" → ") });
  }

  return (
    <aside className="hidden w-72 shrink-0 border-l border-[var(--color-rs-border)] bg-white lg:flex lg:flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-rs-border)] px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-rs-muted)]">
          Working memory
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-[var(--color-rs-muted)] hover:text-[var(--color-rs-fg)]"
        >
          Esc
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        {rows.length === 0 ? (
          <p className="text-xs text-[var(--color-rs-muted)]">
            Context appears as you search, upload, or draft. The Assistant keeps this thread’s
            working memory here.
          </p>
        ) : (
          rows.map((r) => (
            <div key={r.label}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-rs-subtle-fg)]">
                {r.label}
              </p>
              <p className="mt-0.5 text-[var(--color-rs-fg)]">{r.value}</p>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
