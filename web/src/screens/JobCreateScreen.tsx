import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { ErrorState } from "../components/EmptyState";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";

export function JobCreateScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => api.createJobFromText({ text, company: company || undefined }),
    onSuccess: (job) => {
      toast("JD parsed — review next");
      navigate(`/jobs/${job.id}/review`);
    },
    onError: (err: Error) => setError(err.message),
  });

  useUnsavedChanges(text.trim().length > 0 && !createMutation.isPending && !uploading);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const job = await api.createJobFromFile(file, company || undefined);
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
      <p className="mb-6 text-sm text-slate-500">Paste a JD or upload PDF/DOCX.</p>

      <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">
        Company (optional)
      </label>
      <input
        value={company}
        onChange={(e) => setCompany(e.target.value)}
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
          disabled={!text.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {createMutation.isPending ? "Parsing…" : "Parse & Review"}
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

      {error && (
        <div className="mt-2">
          <ErrorState message={error} onRetry={() => setError(null)} />
        </div>
      )}
    </div>
  );
}
