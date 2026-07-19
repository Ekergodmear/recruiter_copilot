import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type {
  CopilotResponse,
  JobWorkspacePatch,
  MatchingResult,
  WorkflowStage,
} from "../api/types";
import { WORKFLOW_STAGES } from "../api/types";
import { InsightsPanel } from "../components/InsightsPanel";

type Tab = "overview" | "relationships" | "requirements" | "candidates" | "pipeline" | "timeline";

export function JobDetailScreen() {
  const { id = "" } = useParams();
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [candIdInput, setCandIdInput] = useState("");
  const [relError, setRelError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<WorkflowStage | "">("");
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchingResult | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchLoadingId, setMatchLoadingId] = useState<string | null>(null);
  const [copilotCandidateId, setCopilotCandidateId] = useState<string | null>(null);
  const [copilot, setCopilot] = useState<CopilotResponse | null>(null);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const [copilotBusy, setCopilotBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    employmentType: "full_time",
    salaryMin: "",
    salaryMax: "",
    currency: "USD",
    status: "Draft",
    notes: "",
  });
  const queryClient = useQueryClient();

  const {
    data: job,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["job", id],
    queryFn: () => api.getJob(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!job) return;
    setForm({
      title: job.title,
      company: job.company,
      location: job.location ?? "",
      employmentType: job.employmentType || "full_time",
      salaryMin: job.salaryMin == null ? "" : String(job.salaryMin),
      salaryMax: job.salaryMax == null ? "" : String(job.salaryMax),
      currency: job.currency || "USD",
      status: job.status,
      notes: job.notes ?? "",
    });
  }, [job]);

  const saveMutation = useMutation({
    mutationFn: (body: JobWorkspacePatch) => api.updateJob(id, body),
    onSuccess: async () => {
      setSaveError(null);
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["job", id] });
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  const { data: jobRels, refetch: refetchJobRels } = useQuery({
    queryKey: ["job-relationships", id, stageFilter],
    queryFn: () => api.listJobRelationships(id, stageFilter ? { stage: stageFilter } : undefined),
    enabled: Boolean(id) && tab === "relationships",
  });

  const { data: candidatesForRel } = useQuery({
    queryKey: ["candidates-for-rel"],
    queryFn: () => api.listCandidates({}),
    enabled: tab === "relationships",
  });

  const createJobRelMutation = useMutation({
    mutationFn: () =>
      api.createRelationship({
        candidateId: candIdInput,
        jobId: id,
      }),
    onSuccess: async () => {
      setRelError(null);
      setCandIdInput("");
      await refetchJobRels();
      await queryClient.invalidateQueries({ queryKey: ["candidate-relationships"] });
    },
    onError: (e: Error) => setRelError(e.message),
  });

  const updateJobRelMutation = useMutation({
    mutationFn: ({ relId, stage }: { relId: string; stage: WorkflowStage }) =>
      api.updateRelationshipStage(relId, stage),
    onSuccess: async () => {
      await refetchJobRels();
    },
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
    return (
      <div className="p-8 text-sm text-red-600">{(error as Error)?.message ?? "Not found"}</div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "relationships", label: "Relationships" },
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
              {job.company} · {job.location || "—"} · {job.status} · source {job.source}
              {!job.ready && (
                <Link to={`/jobs/${id}/review`} className="ml-2 underline">
                  Continue review
                </Link>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500">
              {job.submissionCount} submitted · {job.placementCount ?? 0} placed
            </p>
            {tab === "overview" && !editing && (
              <button
                type="button"
                onClick={() => {
                  setSaveError(null);
                  setEditing(true);
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Edit
              </button>
            )}
          </div>
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

      {tab === "overview" &&
        (editing ? (
          <form
            className="max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate({
                title: form.title,
                company: form.company,
                location: form.location,
                employmentType: form.employmentType,
                salaryMin: form.salaryMin === "" ? null : Number(form.salaryMin),
                salaryMax: form.salaryMax === "" ? null : Number(form.salaryMax),
                currency: form.currency,
                status: form.status,
                notes: form.notes,
              });
            }}
          >
            <p className="text-sm text-slate-500">
              Edit allowed fields only. Source ({job.source}) is not editable.
            </p>
            {(
              [
                ["title", "Title"],
                ["company", "Company"],
                ["location", "Location"],
                ["currency", "Currency"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="text-slate-600">{label}</span>
                <input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  required={key === "title" || key === "company"}
                />
              </label>
            ))}
            <label className="block text-sm">
              <span className="text-slate-600">Employment type</span>
              <select
                value={form.employmentType}
                onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="full_time">full_time</option>
                <option value="part_time">part_time</option>
                <option value="contract">contract</option>
                <option value="internship">internship</option>
                <option value="other">other</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-slate-600">Salary min</span>
                <input
                  value={form.salaryMin}
                  onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Salary max</span>
                <input
                  value={form.salaryMax}
                  onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-slate-600">Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="Draft">Draft</option>
                <option value="Open">Open</option>
                <option value="Paused">Paused</option>
                <option value="Closed">Closed</option>
                <option value="Filled">Filled</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saveMutation.isPending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setSaveError(null);
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Section title="Basic">
                <Info label="Title" value={job.title} />
                <Info label="Company" value={job.company} />
                <Info label="Location" value={job.location || "—"} />
                <Info label="Employment type" value={job.employmentType || "—"} />
                <Info label="Status" value={job.status} />
              </Section>
              <Section title="Salary">
                <Info
                  label="Range"
                  value={
                    job.salaryMin == null && job.salaryMax == null
                      ? "—"
                      : `${job.currency} ${job.salaryMin ?? "?"} – ${job.salaryMax ?? "?"}`
                  }
                />
              </Section>
              <Section title="Description">
                <Info label="Description" value={job.description || "—"} />
              </Section>
              <Section title="Requirements">
                <Info label="Requirements" value={job.requirements || "—"} />
                <Info label="Skills" value={job.skills.join(", ") || "—"} />
              </Section>
              <Section title="Benefits">
                <Info label="Benefits" value={job.benefits || "—"} />
              </Section>
              <Section title="Notes">
                <Info label="Notes" value={job.notes || "—"} />
              </Section>
              <Section title="Metadata">
                <Info label="Source" value={job.source} />
                <Info label="Created" value={new Date(job.createdAt).toLocaleString()} />
                <Info label="Updated" value={new Date(job.updatedAt).toLocaleString()} />
                <Info label="Job ID" value={job.id} />
              </Section>
            </div>
          </div>
        ))}

      {tab === "relationships" && (
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">Relate a Candidate</h2>
            <p className="mt-1 text-xs text-slate-500">
              Association only — not matching. Starts at Current Stage <strong>Sourced</strong>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <select
                value={candIdInput}
                onChange={(e) => setCandIdInput(e.target.value)}
                className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select candidate…</option>
                {(candidatesForRel?.items ?? []).map((c) => (
                  <option key={c.candidateId} value={c.candidateId}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!candIdInput || createJobRelMutation.isPending}
                onClick={() => createJobRelMutation.mutate()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {relError && <p className="mt-2 text-sm text-red-600">{relError}</p>}
          </section>
          <section className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <label className="text-xs font-medium text-slate-600" htmlFor="stage-filter">
              Filter by Current Stage
            </label>
            <select
              id="stage-filter"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as WorkflowStage | "")}
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
            >
              <option value="">All stages</option>
              {WORKFLOW_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </section>
          <ul className="space-y-2">
            {(jobRels?.items ?? []).length === 0 ? (
              <li className="text-sm text-slate-500">No candidates related yet.</li>
            ) : (
              jobRels!.items.map((r) => (
                <li
                  key={r.id}
                  className="space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link to={`/candidates/${r.candidateId}`} className="font-medium underline">
                      {r.candidateName ?? r.candidateId}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={matchLoadingId === r.id}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-800 disabled:opacity-50"
                        onClick={async () => {
                          setMatchError(null);
                          setMatchLoadingId(r.id);
                          try {
                            const result = await api.getMatching(r.candidateId, id);
                            setMatchResult(result);
                            setCopilotCandidateId(r.candidateId);
                          } catch (e) {
                            setMatchResult(null);
                            setMatchError(e instanceof Error ? e.message : "Match failed");
                          } finally {
                            setMatchLoadingId(null);
                          }
                        }}
                      >
                        {matchLoadingId === r.id ? "Matching…" : "Match"}
                      </button>
                      <select
                        value={r.currentStage ?? r.status}
                        onChange={(e) =>
                          updateJobRelMutation.mutate({
                            relId: r.id,
                            stage: e.target.value as WorkflowStage,
                          })
                        }
                        className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                      >
                        {WORKFLOW_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-slate-600 underline"
                    onClick={() => setExpandedHistory((cur) => (cur === r.id ? null : r.id))}
                  >
                    {expandedHistory === r.id ? "Hide" : "Show"} stage history (
                    {(r.stageHistory ?? []).length})
                  </button>
                  {expandedHistory === r.id && (
                    <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-600">
                      {(r.stageHistory ?? []).map((h, i) => (
                        <li key={`${r.id}-${i}`}>
                          {h.previousStage ?? "—"} → {h.newStage} ·{" "}
                          {new Date(h.changedAt).toLocaleString()}
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              ))
            )}
          </ul>
          {matchError && <p className="text-sm text-red-600">{matchError}</p>}
          {matchResult && (
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-slate-900">Matching Result</h3>
                <p className="text-xs text-slate-500">
                  Evidence first · Score second · not persisted
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Evidence</p>
                <ul className="mt-1 space-y-1 text-slate-800">
                  <li>Matched skills: {matchResult.evidence.matchedSkills.join(", ") || "—"}</li>
                  <li>Missing skills: {matchResult.evidence.missingSkills.join(", ") || "—"}</li>
                  <li>
                    Experience: {matchResult.evidence.experience.status} (
                    {matchResult.evidence.experience.actualYears ?? "?"} /{" "}
                    {matchResult.evidence.experience.requiredYears ?? "?"} yrs)
                  </li>
                  <li>
                    English: {matchResult.evidence.english.status} (
                    {matchResult.evidence.english.actual} vs {matchResult.evidence.english.required}
                    )
                  </li>
                  <li>
                    Salary: {matchResult.evidence.salary.status} (
                    {matchResult.evidence.salary.expectedSalary ?? "?"} vs{" "}
                    {matchResult.evidence.salary.jobSalaryMin ?? "?"}-
                    {matchResult.evidence.salary.jobSalaryMax ?? "?"}{" "}
                    {matchResult.evidence.salary.currency})
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">
                  Overall Match Score (from evidence)
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {matchResult.overallMatchScore}
                </p>
                <p className="text-xs text-slate-500">
                  Breakdown: skills {matchResult.scoreBreakdown.skills} · experience{" "}
                  {matchResult.scoreBreakdown.experience} · english{" "}
                  {matchResult.scoreBreakdown.english} · salary {matchResult.scoreBreakdown.salary}
                </p>
              </div>
            </section>
          )}
          {copilotCandidateId && (
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <div>
                <h3 className="font-semibold text-slate-900">AI Recruiter Copilot</h3>
                <p className="text-xs text-slate-500">
                  Evidence → AI Suggestion · read-only · does not change Match Score or Workflow
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["Explain Match", () => api.copilotExplainMatch(copilotCandidateId, id)],
                    [
                      "Summarize Candidate",
                      () => api.copilotSummarizeCandidate(copilotCandidateId),
                    ],
                    ["Summarize Job", () => api.copilotSummarizeJob(id)],
                    ["Draft Outreach", () => api.copilotDraftOutreach(copilotCandidateId, id)],
                    [
                      "Interview Questions",
                      () => api.copilotSuggestInterviewQuestions(copilotCandidateId, id),
                    ],
                  ] as const
                ).map(([label, run]) => (
                  <button
                    key={label}
                    type="button"
                    disabled={copilotBusy}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium disabled:opacity-50"
                    onClick={async () => {
                      setCopilotError(null);
                      setCopilotBusy(true);
                      try {
                        setCopilot(await run());
                      } catch (e) {
                        setCopilot(null);
                        setCopilotError(e instanceof Error ? e.message : "Copilot failed");
                      } finally {
                        setCopilotBusy(false);
                      }
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {copilotError && <p className="text-sm text-red-600">{copilotError}</p>}
              {copilot && (
                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Evidence (platform)
                    </p>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-800">
                      {JSON.stringify(copilot.evidence, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                      AI Suggestion
                    </p>
                    <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-amber-100 bg-amber-50/40 p-3 text-xs text-slate-800">
                      {copilot.aiSuggestion}
                    </pre>
                  </div>
                </div>
              )}
            </section>
          )}
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{value}</p>
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
