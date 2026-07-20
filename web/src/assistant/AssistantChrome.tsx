import type { AssistantMode, ProgressStep } from "./conversation-store";

const modeClass: Record<AssistantMode, string> = {
  Ask: "border-[var(--color-rs-border)] text-[var(--color-rs-muted)] bg-[var(--color-rs-subtle)]",
  Analyze: "border-transparent text-[var(--color-rs-analyze)] bg-[var(--color-rs-analyze-bg)]",
  Act: "border-[var(--color-rs-border)] text-[#9a6700] bg-[#fff8c5]",
  Mixed: "border-[var(--color-rs-border)] text-[var(--color-rs-fg)] bg-[var(--color-rs-subtle)]",
};

/** Kept for Show details / rare chrome — not default timeline (D11). */
export function ModeBadge({ mode }: { mode: AssistantMode }) {
  return (
    <span
      className={`inline-flex rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tracking-wide ${modeClass[mode]}`}
    >
      {mode}
    </span>
  );
}

/** D11: one status line while working — no multi-step checkmarks. */
export function QuietStatus({ steps }: { steps: ProgressStep[] }) {
  const active = steps.find((s) => !s.done) ?? steps[steps.length - 1];
  if (!active || active.done) return null;
  return (
    <p className="mt-1 text-sm text-[var(--color-rs-muted)]" aria-live="polite">
      {active.label}
      <span className="ml-0.5 inline-block animate-pulse">…</span>
    </p>
  );
}
