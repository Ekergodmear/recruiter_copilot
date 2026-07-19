import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { CandidateKnowledgePanel } from "./CandidateKnowledgePanel";
import { InsightsPanel } from "../components/InsightsPanel";

type Tab = "overview" | "knowledge";

export function CandidateDetailScreen() {
  const { id = "" } = useParams();
  const [tab, setTab] = useState<Tab>("overview");
  const { data, isLoading, error } = useQuery({
    queryKey: ["review", id],
    queryFn: () => api.getReview(id),
    enabled: Boolean(id),
  });

  if (isLoading) return <p className="p-8 text-sm text-slate-500">Loading…</p>;
  if (error || !data) {
    return <p className="p-8 text-sm text-red-600">{(error as Error)?.message ?? "Not found"}</p>;
  }

  return (
    <div className="flex-1 p-8">
      <Link to="/candidates" className="text-sm text-slate-600 hover:text-slate-900">
        ← Candidates
      </Link>
      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{data.name}</h1>
        <p className="text-sm text-slate-500">
          {data.ready ? "Ready" : "In review"} · Imported{" "}
          {new Date(data.uploadedAt).toLocaleString()}
        </p>
      </header>

      {(data.possibleDuplicates?.length ?? 0) > 0 ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Possible duplicate candidate found.</p>
          <ul className="mt-2 space-y-1">
            {data.possibleDuplicates!.map((dup) => (
              <li key={dup.candidateId}>
                <Link to={`/candidates/${dup.candidateId}`} className="underline">
                  {dup.name}
                </Link>{" "}
                · score {dup.score} · {dup.candidateId}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mb-6 flex gap-4 border-b border-slate-200">
        {(
          [
            ["overview", "Overview"],
            ["knowledge", "Knowledge"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`border-b-2 px-1 pb-2 text-sm font-medium ${
              tab === key
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          <InsightsPanel screen="candidate" candidateId={id} />
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            {data.diff.map((row) => (
              <div key={row.field} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">{row.label}</p>
                <p className="mt-2 text-sm text-slate-800">{row.current}</p>
              </div>
            ))}
          </div>

          {!data.ready && (
            <Link
              to={`/review/${id}`}
              className="inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Continue review
            </Link>
          )}
        </>
      ) : (
        <CandidateKnowledgePanel candidateId={id} />
      )}
    </div>
  );
}
