import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { ListSkeleton } from "../components/Skeleton";

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function HomeScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionComplete = searchParams.get("complete") === "1";
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["inbox"],
    queryFn: () => api.listCandidates({ ready: false }),
  });

  const items = data?.items ?? [];
  const estimatedMins = Math.max(1, Math.ceil(items.length * 1.5));

  const startSession = () => {
    if (items[0]) {
      navigate(`/review/${items[0].candidateId}?session=1`);
    }
  };

  return (
    <div className="mx-auto max-w-3xl flex-1 p-4 sm:p-8">
      {sessionComplete && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-center">
          <p className="text-lg font-medium text-emerald-900">Session Complete</p>
          <p className="text-sm text-emerald-700">All CVs in this session are reviewed.</p>
        </div>
      )}

      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Good morning</h1>
        <p className="mt-2 text-slate-600">
          {isLoading ? "…" : `${items.length} CV waiting`}
        </p>
        {!isLoading && items.length > 0 && (
          <p className="text-sm text-slate-500">Estimated review time: ~{estimatedMins} minutes</p>
        )}
      </header>

      {error && (
        <div className="mb-4">
          <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />
        </div>
      )}

      {items.length > 0 ? (
        <button
          type="button"
          onClick={startSession}
          className="mb-8 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Start Review
        </button>
      ) : !isLoading && !error ? (
        <div className="mb-8">
          <EmptyState
            title="Inbox Zero"
            description="You finished today's review."
            action={
              <Link to="/import" className="text-sm font-medium text-slate-900 underline">
                Import more resumes
              </Link>
            }
          />
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          CV waiting
        </h2>
        <Link
          to="/import"
          className="text-sm font-medium text-slate-900 underline-offset-2 hover:underline"
        >
          + Import Resume
        </Link>
      </div>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.candidateId}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <p className="font-medium text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-500">{formatRelative(item.uploadedAt)}</p>
              </div>
              <Link
                to={`/review/${item.candidateId}`}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
              >
                Review
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
