import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { ListSkeleton } from "../components/Skeleton";

export function CandidatesScreen() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => api.listCandidates({ ready: true }),
  });

  const items = data?.items ?? [];

  return (
    <div className="flex-1 p-4 sm:p-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Knowledge Library</h1>
        <p className="text-sm text-slate-500">Confirmed candidates — ready for search and jobs.</p>
      </header>

      {error && (
        <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />
      )}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No ready candidates yet"
          description="Review CVs from Inbox first. Ready candidates land here."
          action={
            <Link to="/" className="text-sm font-medium underline">
              Go to Inbox
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.candidateId}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <p className="font-medium text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-500">{item.skillsPreview}</p>
              </div>
              <Link
                to={`/candidates/${item.candidateId}`}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
