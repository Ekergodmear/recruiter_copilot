import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { CandidateWorkspacePatch, WorkflowStage } from "../api/types";
import { WORKFLOW_STAGES } from "../api/types";
import { CandidateKnowledgePanel } from "./CandidateKnowledgePanel";

type Tab = "workspace" | "relationships" | "knowledge";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="mt-3 space-y-2 text-sm text-slate-800">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap">{value.trim() ? value : "—"}</p>
    </div>
  );
}

export function CandidateDetailScreen() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("workspace");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    salary: "",
    note: "",
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [jobIdInput, setJobIdInput] = useState("");
  const [relError, setRelError] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["workspace", id],
    queryFn: () => api.getWorkspace(id),
    enabled: Boolean(id),
  });

  const { data: relationships, refetch: refetchRels } = useQuery({
    queryKey: ["candidate-relationships", id],
    queryFn: () => api.listCandidateRelationships(id),
    enabled: Boolean(id) && tab === "relationships",
  });

  const { data: jobs } = useQuery({
    queryKey: ["jobs-for-rel"],
    queryFn: () => api.listJobs({ sort: "updated" }),
    enabled: tab === "relationships",
  });

  const createRelMutation = useMutation({
    mutationFn: () =>
      api.createRelationship({
        candidateId: id,
        jobId: jobIdInput,
      }),
    onSuccess: async () => {
      setRelError(null);
      setJobIdInput("");
      await refetchRels();
      await queryClient.invalidateQueries({ queryKey: ["job-relationships"] });
    },
    onError: (e: Error) => setRelError(e.message),
  });

  const updateRelMutation = useMutation({
    mutationFn: ({ relId, stage }: { relId: string; stage: WorkflowStage }) =>
      api.updateRelationshipStage(relId, stage),
    onSuccess: async () => {
      await refetchRels();
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      name: data.name,
      phone: data.phone,
      email: data.email,
      salary: data.salary,
      note: data.note,
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (body: CandidateWorkspacePatch) => api.updateWorkspace(id, body),
    onSuccess: async () => {
      setSaveError(null);
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["workspace", id] });
      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (err) => {
      setSaveError((err as Error).message);
    },
  });

  if (isLoading) return <p className="p-8 text-sm text-slate-500">Loading…</p>;
  if (error || !data) {
    return <p className="p-8 text-sm text-red-600">{(error as Error)?.message ?? "Not found"}</p>;
  }

  return (
    <div className="flex-1 p-4 sm:p-8">
      <Link to="/candidates" className="text-sm text-slate-600 hover:text-slate-900">
        ← Candidates
      </Link>
      <header className="mt-4 mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{data.name}</h1>
          <p className="text-sm text-slate-500">
            {data.ready ? "Ready" : "In review"} · Updated{" "}
            {new Date(data.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          {!data.ready && (
            <Link
              to={`/review/${id}`}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Continue review
            </Link>
          )}
          {tab === "workspace" && !editing && (
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
      </header>

      <div className="mb-6 flex gap-4 border-b border-slate-200">
        {(
          [
            ["workspace", "Workspace"],
            ["relationships", "Jobs"],
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

      {tab === "relationships" ? (
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">Relate to a Job</h2>
            <p className="mt-1 text-xs text-slate-500">
              Association only — not matching. New relationships start at Current Stage{" "}
              <strong>Sourced</strong>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <select
                value={jobIdInput}
                onChange={(e) => setJobIdInput(e.target.value)}
                className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select job…</option>
                {(jobs?.items ?? []).map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} · {j.company}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!jobIdInput || createRelMutation.isPending}
                onClick={() => createRelMutation.mutate()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {relError && <p className="mt-2 text-sm text-red-600">{relError}</p>}
          </section>
          <ul className="space-y-2">
            {(relationships?.items ?? []).length === 0 ? (
              <li className="text-sm text-slate-500">No jobs related yet.</li>
            ) : (
              relationships!.items.map((r) => (
                <li
                  key={r.id}
                  className="space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link to={`/jobs/${r.jobId}`} className="font-medium underline">
                        {r.jobTitle ?? r.jobId}
                      </Link>
                      <p className="text-xs text-slate-500">{r.jobCompany}</p>
                    </div>
                    <select
                      value={r.currentStage ?? r.status}
                      onChange={(e) =>
                        updateRelMutation.mutate({
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
        </div>
      ) : tab === "workspace" ? (
        editing ? (
          <form
            className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate({
                name: form.name,
                phone: form.phone,
                email: form.email,
                salary: form.salary,
                note: form.note,
              });
            }}
          >
            <p className="text-sm text-slate-500">
              Edit contact and notes only. Raw resume is not modified.
            </p>
            {(
              [
                ["name", "Name"],
                ["phone", "Phone"],
                ["email", "Email"],
                ["salary", "Salary"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="text-slate-600">{label}</span>
                <input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  required={key === "name"}
                />
              </label>
            ))}
            <label className="block text-sm">
              <span className="text-slate-600">Note</span>
              <textarea
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
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
                  setForm({
                    name: data.name,
                    phone: data.phone,
                    email: data.email,
                    salary: data.salary,
                    note: data.note,
                  });
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Basic Info">
              <Field label="Name" value={data.name} />
              <Field label="Phone" value={data.phone} />
              <Field label="Email" value={data.email} />
              <Field label="Current title" value={data.currentTitle} />
              <Field label="Company" value={data.company} />
              <Field label="Summary" value={data.summary} />
            </Section>
            <Section title="Skills">
              <Field label="Skills" value={data.skills} />
            </Section>
            <Section title="Experience">
              <Field label="Years / experience" value={data.experience} />
            </Section>
            <Section title="Education">
              <Field label="Education" value={data.education} />
            </Section>
            <Section title="English">
              <Field label="English" value={data.english} />
            </Section>
            <Section title="Salary">
              <Field label="Salary" value={data.salary} />
            </Section>
            <Section title="Notes">
              <Field label="Note" value={data.note} />
            </Section>
          </div>
        )
      ) : (
        <CandidateKnowledgePanel candidateId={id} />
      )}
    </div>
  );
}
