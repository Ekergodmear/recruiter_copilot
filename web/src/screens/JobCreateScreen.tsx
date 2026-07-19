import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { ErrorState } from "../components/EmptyState";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";

type Mode = "manual" | "jd";

export function JobCreateScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("manual");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [status, setStatus] = useState("Draft");
  const [notes, setNotes] = useState("");
  const [description, setDescription] = useState("");

  const [text, setText] = useState("");
  const [jdCompany, setJdCompany] = useState("");

  const manualMutation = useMutation({
    mutationFn: () =>
      api.createJobManual({
        title,
        company,
        location: location || undefined,
        employmentType,
        salaryMin: salaryMin ? Number(salaryMin) : null,
        salaryMax: salaryMax ? Number(salaryMax) : null,
        status,
        notes: notes || undefined,
        description: description || undefined,
      }),
    onSuccess: (job) => {
      toast("Job created");
      navigate(`/jobs/${job.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const jdMutation = useMutation({
    mutationFn: () => api.createJobFromText({ text, company: jdCompany || undefined }),
    onSuccess: (job) => {
      toast("JD parsed — review next");
      navigate(`/jobs/${job.id}/review`);
    },
    onError: (err: Error) => setError(err.message),
  });

  useUnsavedChanges(
    (mode === "manual"
      ? title.trim().length > 0 || company.trim().length > 0
      : text.trim().length > 0) &&
      !manualMutation.isPending &&
      !jdMutation.isPending &&
      !uploading,
  );

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const job = await api.createJobFromFile(file, jdCompany || undefined);
      toast("JD parsed — review next");
      navigate(`/jobs/${job.id}/review`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl flex-1 p-8">
      <h1 className="mb-2 text-xl font-semibold">Create Job</h1>
      <p className="mb-6 text-sm text-slate-500">
        Manual create sets source = manual (immutable). JD paste remains available.
      </p>

      <div className="mb-6 flex gap-2 border-b border-slate-200">
        {(
          [
            ["manual", "Manual"],
            ["jd", "From JD"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setMode(key);
              setError(null);
            }}
            className={`border-b-2 px-3 pb-2 text-sm font-medium ${
              mode === key ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "manual" ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            manualMutation.mutate();
          }}
        >
          <Field label="Title *" value={title} onChange={setTitle} required />
          <Field label="Company *" value={company} onChange={setCompany} required />
          <Field label="Location" value={location} onChange={setLocation} />
          <label className="block text-xs font-semibold uppercase text-slate-500">
            Employment type
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case"
            >
              <option value="full_time">full_time</option>
              <option value="part_time">part_time</option>
              <option value="contract">contract</option>
              <option value="internship">internship</option>
              <option value="other">other</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Salary min" value={salaryMin} onChange={setSalaryMin} />
            <Field label="Salary max" value={salaryMax} onChange={setSalaryMax} />
          </div>
          <label className="block text-xs font-semibold uppercase text-slate-500">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case"
            >
              <option value="Draft">Draft</option>
              <option value="Open">Open</option>
              <option value="Paused">Paused</option>
              <option value="Closed">Closed</option>
              <option value="Filled">Filled</option>
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase text-slate-500">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case"
            />
          </label>
          <label className="block text-xs font-semibold uppercase text-slate-500">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case"
            />
          </label>
          <button
            type="submit"
            disabled={!title.trim() || !company.trim() || manualMutation.isPending}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {manualMutation.isPending ? "Saving…" : "Create Job"}
          </button>
        </form>
      ) : (
        <>
          <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">
            Company (optional)
          </label>
          <input
            value={jdCompany}
            onChange={(e) => setJdCompany(e.target.value)}
            className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Acme Corp"
          />
          <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">
            Paste JD
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Job title, requirements, skills, English, salary…"
          />
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!text.trim() || jdMutation.isPending}
              onClick={() => {
                setError(null);
                jdMutation.mutate();
              }}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {jdMutation.isPending ? "Parsing…" : "Parse & Review"}
            </button>
            <label className="cursor-pointer text-sm font-medium text-slate-900 underline">
              {uploading ? "Uploading…" : "Or upload PDF/DOCX"}
              <input
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                disabled={uploading}
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </label>
          </div>
        </>
      )}

      {error && (
        <div className="mt-4">
          <ErrorState message={error} onRetry={() => setError(null)} />
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-semibold uppercase text-slate-500">
      {label}
      <input
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case"
      />
    </label>
  );
}
