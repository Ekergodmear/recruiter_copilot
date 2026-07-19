import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { ListSkeleton } from "../components/Skeleton";

export function JobsScreen() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const debouncedQ = useDebouncedValue(q.trim(), 300);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["jobs", debouncedQ, status],
    queryFn: () =>
      api.listJobs({
        q: debouncedQ || undefined,
        status: status || undefined,
      }),
  });

  const items = data?.items ?? [];

  return (
    <div className="flex-1 p-4 sm:p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Jobs</h1>
          <p className="text-sm text-slate-500">Create and manage jobs without Excel.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/jobs/new")}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          + Create Job
        </button>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, company…"
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All status</option>
          <option value="Draft">Draft</option>
          <option value="Open">Open</option>
          <option value="Paused">Paused</option>
          <option value="Closed">Closed</option>
          <option value="Filled">Filled</option>
        </select>
      </div>

      {error && (
        <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />
      )}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          description="Create a job from a JD to start matching."
          action={
            <button
              type="button"
              onClick={() => navigate("/jobs/new")}
              className="text-sm font-medium underline"
            >
              Create Job
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Candidates</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((job) => (
                <tr key={job.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link to={`/jobs/${job.id}`} className="font-medium text-slate-900 underline">
                      {job.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{job.company}</td>
                  <td className="px-4 py-3 text-slate-600">{job.status}</td>
                  <td className="px-4 py-3 text-slate-600">{job.candidates}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(job.updatedAt).toLocaleString()}
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
