import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { ListSkeleton } from "../components/Skeleton";

export function SearchScreen() {
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q.trim(), 300);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["search", debouncedQ],
    queryFn: () => api.listCandidates({ ready: true, q: debouncedQ }),
    enabled: debouncedQ.length > 0,
  });

  return (
    <div className="flex-1 p-4 sm:p-8">
      <h1 className="mb-2 text-xl font-semibold">Search</h1>
      <p className="mb-6 text-sm text-slate-500">Search confirmed candidates only.</p>

      <div className="mb-6">
        <input
          type="search"
          placeholder="React, English, name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          autoFocus
        />
        <p className="mt-1 text-xs text-slate-400">Results update as you type.</p>
      </div>

      {error && (
        <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />
      )}

      {!debouncedQ && (
        <EmptyState title="Type to search" description="Try a skill, name, or English level." />
      )}

      {debouncedQ && (isLoading || isFetching) && <ListSkeleton rows={3} />}

      {debouncedQ && !isLoading && !isFetching && data && (
        <>
          {data.items.length === 0 ? (
            <EmptyState
              title="No matches"
              description={`Nothing found for “${debouncedQ}”.`}
            />
          ) : (
            <ul className="space-y-2">
              {data.items.map((item) => (
                <li
                  key={item.candidateId}
                  className="flex justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <span className="font-medium">{item.name}</span>
                  <Link
                    to={`/candidates/${item.candidateId}`}
                    className="text-sm font-medium underline"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
