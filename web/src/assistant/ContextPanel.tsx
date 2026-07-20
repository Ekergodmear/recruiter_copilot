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
          aria-label="Close context panel"
        >
          Esc
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-3 text-sm">
        <Section title="Current JD">
          {context.jobDraft ? (
            <p className="whitespace-pre-wrap text-[var(--color-rs-fg)]">
              {context.jobDraft.slice(0, 280)}
              {context.jobDraft.length > 280 ? "…" : ""}
            </p>
          ) : (
            <EmptyHint text="Paste or upload a JD in the composer to anchor this thread." />
          )}
        </Section>

        <Section title="Current search">
          {context.filters?.length ? (
            <ul className="flex flex-wrap gap-1">
              {context.filters.map((f) => (
                <li
                  key={f}
                  className="rounded-md border border-[var(--color-rs-border)] bg-[var(--color-rs-subtle)] px-1.5 py-0.5 text-xs"
                >
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint text="Ask “Find Senior Java in HCM…” to populate filters." />
          )}
        </Section>

        <Section title="Current candidate">
          {context.candidateId ? (
            <p className="font-mono text-xs text-[var(--color-rs-fg)]">{context.candidateId}</p>
          ) : (
            <EmptyHint text="Opens when you import or select a candidate." />
          )}
        </Section>

        <Section title="Uploaded files">
          {context.files?.length ? (
            <ul className="space-y-1 text-xs">
              {context.files.map((f) => (
                <li key={f} className="truncate text-[var(--color-rs-fg)]">
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint text="Upload CV or JD — files stay in this conversation." />
          )}
        </Section>

        <Section title="Recent actions">
          {context.recentActions?.length ? (
            <p className="text-xs text-[var(--color-rs-muted)]">
              {context.recentActions.join(" → ")}
            </p>
          ) : (
            <EmptyHint text="Tool runs in this thread appear here." />
          )}
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--color-rs-border)] pb-3 last:border-0">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-rs-subtle-fg)]">
        {title}
      </p>
      {children}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-xs leading-relaxed text-[var(--color-rs-subtle-fg)]">{text}</p>;
}
