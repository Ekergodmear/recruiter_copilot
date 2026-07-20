import { Link } from "react-router-dom";
import { loadConversations } from "../assistant/conversation-store";

export function HistoryScreen() {
  const items = loadConversations();

  return (
    <div className="mx-auto w-full max-w-[960px] flex-1 p-6">
      <h1 className="text-xl font-semibold">History</h1>
      <p className="mt-1 text-sm text-[var(--color-rs-muted)]">
        Past Assistant conversations (deep-linkable).
      </p>
      {items.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--color-rs-muted)]">
          No threads yet.{" "}
          <Link to="/assistant" className="font-medium text-[var(--color-rs-analyze)]">
            Start in Assistant
          </Link>
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-[var(--color-rs-border)] rounded-lg border border-[var(--color-rs-border)] bg-white">
          {items.map((c) => (
            <li key={c.id}>
              <Link
                to={`/assistant/c/${c.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-[var(--color-rs-subtle)]"
              >
                <span className="font-medium">{c.title}</span>
                <span className="font-mono text-[11px] text-[var(--color-rs-subtle-fg)]">
                  {c.id}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PlaceholderScreen({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[720px] flex-1 p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-[var(--color-rs-muted)]">{body}</p>
      <p className="mt-6 text-sm">
        <Link to="/assistant" className="font-medium text-[var(--color-rs-analyze)]">
          ← Recruiter Assistant
        </Link>
      </p>
    </div>
  );
}
