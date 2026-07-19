import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { AnalyticsSnapshot } from "../api/types";

function SnapshotPanels({ data }: { data: AnalyticsSnapshot }) {
  const stagesWithCount = data.stageDistribution.stages.filter((s) => s.count > 0);
  const conversions = data.funnel.conversions.filter((c) => c.reachedFrom > 0);
  const timeRows = data.timeToStage.byStage.filter((t) => t.sampleSize > 0);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-slate-900">Counts</h2>
        <p className="mt-1 text-xs text-slate-500">
          Derived from Candidate / Job / Relationship · generated {data.generatedAt}
        </p>
        <div className="mt-3 flex flex-wrap gap-6 text-sm text-slate-800">
          <p>
            Candidates <span className="font-semibold">{data.counts.candidates}</span>
          </p>
          <p>
            Jobs <span className="font-semibold">{data.counts.jobs}</span>
          </p>
          <p>
            Relationships <span className="font-semibold">{data.counts.relationships}</span>
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Stage distribution</h2>
        <p className="mt-1 text-xs text-slate-500">
          Traceable to relationship IDs (Workflow Intelligence)
        </p>
        {stagesWithCount.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No relationships yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {stagesWithCount.map((s) => (
              <li
                key={s.stage}
                className="flex justify-between gap-4 border-b border-slate-100 py-1"
              >
                <span>{s.stage}</span>
                <span className="text-slate-600">
                  {s.count}{" "}
                  <span className="text-xs text-slate-400">
                    ({s.relationshipIds.slice(0, 3).join(", ")}
                    {s.relationshipIds.length > 3 ? "…" : ""})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Stage conversion</h2>
        <p className="mt-1 text-xs text-slate-500">
          rate = transitions(A→B) / relationships that reached A (Stage History)
        </p>
        {conversions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No conversion samples yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {conversions.map((c) => (
              <li key={`${c.from}-${c.to}`} className="border-b border-slate-100 py-1">
                {c.from} → {c.to}:{" "}
                <span className="font-medium">
                  {c.rate == null ? "—" : `${Math.round(c.rate * 100)}%`}
                </span>{" "}
                <span className="text-slate-500">
                  ({c.movedTo}/{c.reachedFrom})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Match score distribution</h2>
        <p className="mt-1 text-xs text-slate-500">
          On-demand via Matching Intelligence · source={data.matchScoreDistribution.source} ·{" "}
          {data.matchScoreDistribution.totalComputed} computed
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {data.matchScoreDistribution.buckets.map((b) => (
            <li key={b.label} className="flex justify-between border-b border-slate-100 py-1">
              <span>{b.label}</span>
              <span>
                {b.count}
                {b.items[0] ? (
                  <span className="ml-2 text-xs text-slate-400">
                    e.g. {b.items[0].overallMatchScore} ({b.items[0].relationshipId})
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Time-to-stage</h2>
        <p className="mt-1 text-xs text-slate-500">
          Days between consecutive Stage History timestamps (null when not computable)
        </p>
        {timeRows.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Not enough history to compute durations.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {timeRows.map((t) => (
              <li key={t.stage} className="border-b border-slate-100 py-1">
                {t.stage}: avg {t.averageDays}d · median {t.medianDays}d (n={t.sampleSize})
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function AnalyticsScreen() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: () => api.getAnalyticsOverview(),
  });

  return (
    <div className="flex-1 p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Read-only aggregates from Candidate, Job, Relationship, Workflow, and Matching. Analytics
        does not own business rules or change pipeline state.
      </p>

      {isLoading && <p className="mt-6 text-sm text-slate-500">Loading…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{(error as Error).message ?? "Failed"}</p>}
      {data && (
        <div className="mt-8 max-w-2xl">
          <SnapshotPanels data={data} />
          <p className="mt-8 text-xs text-slate-500">
            Job pipeline snapshot: open a{" "}
            <Link to="/jobs" className="underline">
              Job
            </Link>{" "}
            → Analytics tab.
          </p>
        </div>
      )}
    </div>
  );
}

export function JobAnalyticsPanel({ jobId }: { jobId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["job-analytics", jobId],
    queryFn: () => api.getJobAnalytics(jobId),
    enabled: Boolean(jobId),
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading job analytics…</p>;
  if (error) {
    return <p className="text-sm text-red-600">{(error as Error).message ?? "Failed"}</p>;
  }
  if (!data) return null;
  return (
    <div className="max-w-2xl">
      <p className="mb-4 text-sm text-slate-600">
        Job pipeline snapshot (scope=job). Match scores computed on demand — not persisted.
      </p>
      <SnapshotPanels data={data} />
    </div>
  );
}
