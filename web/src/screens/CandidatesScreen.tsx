import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { ListSkeleton } from "../components/Skeleton";

type SortKey = "updated" | "created";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function CandidatesScreen() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  const debouncedQ = useDebouncedValue(q.trim(), 300);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["candidates", debouncedQ, sort],
    queryFn: () =>
      api.listCandidates({
        ready: true,
        q: debouncedQ || undefined,
        sort,
      }),
  });

  const items = data?.items ?? [];

  return (
    <div className="flex-1 p-4 sm:p-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Candidates</h1>
        <p className="text-sm text-slate-500">
          Candidate Workspace — open a profile to view and edit without reopening the CV.
        </p>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="Search name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:max-w-sm"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
          >
            <option value="updated">Updated</option>
            <option value="created">Created</option>
          </select>
        </label>
        {isFetching && !isLoading ? (
          <span className="text-xs text-slate-400">Updating…</span>
        ) : null}
      </div>

      {error && (
        <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />
      )}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          title={debouncedQ ? "No matches" : "No ready candidates yet"}
          description={
            debouncedQ
              ? "Try another name or email."
              : "Review CVs from Inbox first. Ready candidates land here."
          }
          action={
            !debouncedQ ? (
              <Link to="/" className="text-sm font-medium underline">
                Go to Inbox
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Experience</th>
                <th className="px-4 py-3 font-semibold">English</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.candidateId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.currentTitle || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.company || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.experience || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.english || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{formatWhen(item.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/candidates/${item.candidateId}`}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
