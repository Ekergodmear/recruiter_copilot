import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { InsightsPanel } from "../components/InsightsPanel";

type Tab = "overview" | "requirements" | "candidates" | "pipeline" | "timeline";

export function JobDetailScreen() {
  const { id = "" } = useParams();
  const [tab, setTab] = useState<Tab>("overview");
  const queryClient = useQueryClient();

  const { data: job, isLoading, error } = useQuery({
    queryKey: ["job", id],
    queryFn: () => api.getJob(id),
    enabled: Boolean(id),
  });

  const { data: matches } = useQuery({
    queryKey: ["job-matches", id],
    queryFn: () => api.getJobMatches(id),
    enabled: Boolean(id) && tab === "candidates",
  });

  const { data: submissions } = useQuery({
    queryKey: ["job-submissions", id],
    queryFn: () => api.getJobSubmissions(id),
    enabled: Boolean(id) && (tab === "candidates" || tab === "pipeline" || tab === "timeline"),
  });

  const { data: pipeline } = useQuery({
    queryKey: ["job-pipeline", id],
    queryFn: () => api.getJobPipeline(id),
    enabled: Boolean(id) && (tab === "pipeline" || tab === "overview"),
  });

  const { data: activities } = useQuery({
    queryKey: ["job-activities", id],
    queryFn: () => api.getJobActivities(id),
    enabled: Boolean(id) && tab === "timeline",
  });

  const submitMutation = useMutation({
    mutationFn: (candidateId: string) => api.submitCandidate(id, { candidateId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["job-submissions", id] });
      void queryClient.invalidateQueries({ queryKey: ["job", id] });
      void queryClient.invalidateQueries({ queryKey: ["job-pipeline", id] });
      void queryClient.invalidateQueries({ queryKey: ["job-activities", id] });
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e: Error) => alert(e.message),
  });

  const submittedIds = new Set((submissions?.items ?? []).map((s) => s.candidateId));

  if (isLoading) return <div className="p-8 text-sm text-slate-500">Loading job…</div>;
  if (error || !job) {
    return <div className="p-8 text-sm text-red-600">{(error as Error)?.message ?? "Not found"}</div>;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "requirements", label: "Requirements" },
    { id: "candidates", label: "Candidates" },
    { id: "pipeline", label: "Pipeline" },
    { id: "timeline", label: "Timeline" },
  ];

  return (
    <div className="flex-1 p-8">
      <div className="mb-6">
        <Link to="/jobs" className="text-sm text-slate-500 hover:text-slate-900">
          ← Jobs
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{job.title}</h1>
            <p className="text-sm text-slate-500">
              {job.company} · {job.location || "—"} · {job.status}
              {!job.ready && (
                <Link to={`/jobs/${id}/review`} className="ml-2 underline">
                  Continue review
                </Link>
              )}
            </p>
          </div>
          <p className="text-sm text-slate-500">
            {job.submissionCount} submitted · {job.placementCount ?? 0} placed
          </p>
        </div>
      </div>

      <InsightsPanel screen="job" jobId={id} />

      <div className="mb-6 flex gap-2 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.id
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Info label="Title" value={job.title} />
          <Info label="Company" value={job.company} />
          <Info label="Location" value={job.location || "—"} />
          <Info label="Status" value={job.status} />
          <Info
            label="Salary"
            value={
              job.salaryMin == null && job.salaryMax == null
                ? "—"
                : `${job.currency} ${job.salaryMin ?? "?"} – ${job.salaryMax ?? "?"}`
            }
          />
          <Info label="English" value={job.englishRequirement || "—"} />
          <Info
            label="Experience"
            value={job.experienceYears == null ? "—" : `${job.experienceYears} years`}
          />
          <Info label="Skills" value={job.skills.join(", ") || "—"} />
        </div>
      )}

      {tab === "requirements" && (
        <div className="space-y-4">
          <Block title="Skills" body={job.skills.join(", ") || "—"} />
          <Block title="English" body={job.englishRequirement || "—"} />
          <Block
            title="Salary"
            body={
              job.salaryMin == null && job.salaryMax == null
                ? "—"
                : `${job.currency} ${job.salaryMin ?? "?"} – ${job.salaryMax ?? "?"}`
            }
          />
          <Block title="Responsibilities" body={job.responsibilities || "—"} />
          <Block title="Requirements" body={job.requirements || "—"} />
          <Block title="Benefits" body={job.benefits || "—"} />
        </div>
      )}

      {tab === "candidates" && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">
              Ready candidates · Rule match
            </h2>
            {(matches?.items ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No ready candidates yet.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Candidate</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Matched Skills</th>
                      <th className="px-4 py-3">English</th>
                      <th className="px-4 py-3">Experience</th>
                      <th className="px-4 py-3">Ready</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {matches!.items.map((m) => (
                      <tr key={m.candidateId} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 font-medium">{m.name}</td>
                        <td className="px-4 py-3">{m.score}%</td>
                        <td className="px-4 py-3 text-slate-600">
                          {m.matchedSkills.join(", ") || "—"}
                        </td>
                        <td className="px-4 py-3">{m.english}</td>
                        <td className="px-4 py-3">
                          {m.experienceYears == null ? "—" : m.experienceYears}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {m.readyAt ? new Date(m.readyAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {submittedIds.has(m.candidateId) ? (
                            <span className="text-xs text-emerald-700">Submitted</span>
                          ) : (
                            <button
                              type="button"
                              disabled={submitMutation.isPending}
                              onClick={() => submitMutation.mutate(m.candidateId)}
                              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Submit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Submissions</h2>
            {(submissions?.items ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No submissions yet.</p>
            ) : (
              <ul className="space-y-2">
                {submissions!.items.map((s) => (
                  <li
                    key={s.id}
                    className="flex justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <Link to={`/submissions/${s.id}`} className="font-medium underline">
                      {s.candidateName}
                    </Link>
                    <span className="text-slate-500">
                      {s.status} · {new Date(s.submittedAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "pipeline" && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Submitted" value={pipeline?.submitted ?? 0} />
            <Stat label="Client Review" value={pipeline?.clientReviewing ?? 0} />
            <Stat label="Interviewing" value={pipeline?.interviewing ?? 0} />
            <Stat label="Offers" value={pipeline?.offers ?? 0} />
            <Stat label="Placements" value={pipeline?.placements ?? 0} />
            <Stat label="Rejected" value={pipeline?.rejected ?? 0} />
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Submissions</h2>
            {(submissions?.items ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No submissions yet.</p>
            ) : (
              <ul className="space-y-2">
                {submissions!.items.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <div>
                      <Link to={`/submissions/${s.id}`} className="font-medium underline">
                        {s.candidateName}
                      </Link>
                      <p className="text-xs text-slate-500">{s.status}</p>
                    </div>
                    <Link
                      to={`/submissions/${s.id}`}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium"
                    >
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "timeline" && (
        <ul className="space-y-2">
          {(activities?.items ?? []).length === 0 ? (
            <li className="text-sm text-slate-500">No activity yet.</li>
          ) : (
            activities!.items.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <span className="font-medium">{a.message}</span>
                <span className="ml-2 text-slate-500">
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs uppercase text-slate-500">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value}</p>
    </div>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="mb-1 text-xs font-semibold uppercase text-slate-500">{title}</p>
      <p className="whitespace-pre-wrap text-sm text-slate-800">{body}</p>
    </div>
  );
}
