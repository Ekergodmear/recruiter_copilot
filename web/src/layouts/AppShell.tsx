import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";

const primary = [
  { to: "/assistant", label: "Assistant", end: false },
];

const knowledge = [
  { to: "/candidates", label: "Candidates" },
  { to: "/jobs", label: "Jobs" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/analytics", label: "Analytics" },
  { to: "/inbox", label: "Review queue" },
  { to: "/search", label: "Search" },
];

const secondary = [
  { to: "/automation", label: "Automation" },
  { to: "/history", label: "History" },
  { to: "/settings", label: "Settings" },
];

function linkClass(isActive: boolean) {
  return `rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150 ${
    isActive
      ? "bg-[var(--color-rs-fg)] font-medium text-white"
      : "text-[var(--color-rs-muted)] hover:bg-[var(--color-rs-subtle)] hover:text-[var(--color-rs-fg)]"
  }`;
}

export function AppShell() {
  const [knowledgeOpen, setKnowledgeOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-[var(--color-rs-subtle)]">
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-[var(--color-rs-border)] bg-white">
        <div className="border-b border-[var(--color-rs-border)] px-3 py-4">
          <p className="text-sm font-semibold text-[var(--color-rs-fg)]">RecruiterSup</p>
          <p className="text-[11px] text-[var(--color-rs-muted)]">AI Recruiting Workspace</p>
        </div>
        <nav className="flex flex-1 flex-col gap-4 p-2">
          <div className="flex flex-col gap-0.5">
            {primary.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  linkClass(isActive || location.pathname.startsWith("/assistant"))
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setKnowledgeOpen((v) => !v)}
              className="mb-1 flex w-full items-center justify-between px-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-rs-subtle-fg)]"
            >
              Knowledge
              <span>{knowledgeOpen ? "−" : "+"}</span>
            </button>
            {knowledgeOpen ? (
              <div className="flex flex-col gap-0.5">
                {knowledge.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => linkClass(isActive)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-0.5">
            {secondary.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => linkClass(isActive)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <p className="border-t border-[var(--color-rs-border)] p-3 text-[10px] text-[var(--color-rs-subtle-fg)]">
          `/` Assistant · ⌘K Command
        </p>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
