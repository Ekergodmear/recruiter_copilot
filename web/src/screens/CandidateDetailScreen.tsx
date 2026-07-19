import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { CandidateWorkspacePatch } from "../api/types";
import { CandidateKnowledgePanel } from "./CandidateKnowledgePanel";

type Tab = "workspace" | "knowledge";

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

  const { data, isLoading, error } = useQuery({
    queryKey: ["workspace", id],
    queryFn: () => api.getWorkspace(id),
    enabled: Boolean(id),
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

      {tab === "workspace" ? (
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
