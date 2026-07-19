import { NavLink, Outlet } from "react-router-dom";

const nav = [
  { to: "/", label: "Inbox", end: true },
  { to: "/candidates", label: "Candidates" },
  { to: "/jobs", label: "Jobs" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/analytics", label: "Analytics" },
  { to: "/search", label: "Search" },
];

export function AppShell() {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-5">
          <p className="text-sm font-semibold text-slate-900">Recruit Intelligence</p>
          <p className="text-xs text-slate-500">Zero friction recruiting</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
