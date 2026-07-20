import type { AssistantMode, ProgressStep } from "./conversation-store";

const modeClass: Record<AssistantMode, string> = {
  Ask: "border-[var(--color-rs-border)] text-[var(--color-rs-muted)] bg-[var(--color-rs-subtle)]",
  Analyze: "border-transparent text-[var(--color-rs-analyze)] bg-[var(--color-rs-analyze-bg)]",
  Act: "border-[var(--color-rs-border)] text-[#9a6700] bg-[#fff8c5]",
  Mixed: "border-[var(--color-rs-border)] text-[var(--color-rs-fg)] bg-[var(--color-rs-subtle)]",
};

export function ModeBadge({ mode }: { mode: AssistantMode }) {
  return (
    <span
      className={`inline-flex rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tracking-wide ${modeClass[mode]}`}
    >
      {mode}
    </span>
  );
}

export function ProgressSteps({ steps }: { steps: ProgressStep[] }) {
  if (!steps.length) return null;
  return (
    <ul className="mt-2 space-y-1 font-mono text-xs text-[var(--color-rs-muted)]">
      {steps.map((s) => (
        <li key={s.id} className="flex gap-2">
          <span className="w-3 shrink-0">{s.done ? "✓" : "·"}</span>
          <span className={s.done ? "text-[var(--color-rs-fg)]" : ""}>{s.label}</span>
        </li>
      ))}
    </ul>
  );
}
