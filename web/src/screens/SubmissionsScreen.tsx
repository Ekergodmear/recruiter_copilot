import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { ListSkeleton } from "../components/Skeleton";

const STATUSES = [
  "",
  "Submitted",
  "Client Reviewing",
  "Interview Scheduled",
  "Interview Passed",
  "Interview Failed",
  "Offer Preparing",
  "Offer Sent",
  "Offer Accepted",
  "Offer Declined",
  "Placed",
  "Rejected",
  "Withdrawn",
];

export function SubmissionsScreen() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const debouncedQ = useDebouncedValue(q.trim(), 300);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["submissions", debouncedQ, status],
    queryFn: () =>
      api.listSubmissions({
        q: debouncedQ || undefined,
        status: status || undefined,
      }),
  });

  return (
    <div className="flex-1 p-4 sm:p-8">
      <h1 className="mb-2 text-xl font-semibold">Pipeline</h1>
      <p className="mb-6 text-sm text-slate-500">Search submissions across jobs.</p>

      <div className="mb-6 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Candidate, job, company…"
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s || "all"} value={s}>
              {s || "All status"}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />
      )}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : (data?.items ?? []).length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Submit a ready candidate from a Job to start the pipeline."
          action={
            <Link to="/jobs" className="text-sm font-medium underline">
              Open Jobs
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data!.items.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{s.candidateName}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.jobTitle}
                    {s.company ? ` · ${s.company}` : ""}
                  </td>
                  <td className="px-4 py-3">{s.status}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(s.submittedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/submissions/${s.id}`} className="text-sm font-medium underline">
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
