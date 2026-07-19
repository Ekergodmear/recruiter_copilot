import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { ErrorState } from "../components/EmptyState";
import { PanelSkeleton } from "../components/Skeleton";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import { InsightsPanel } from "../components/InsightsPanel";

export function JobReviewScreen() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["job-review", id],
    queryFn: () => api.getJobReview(id),
    enabled: Boolean(id),
  });

  useUnsavedChanges(Boolean(editingField));

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["job-review", id] });
    void queryClient.invalidateQueries({ queryKey: ["job", id] });
    void queryClient.invalidateQueries({ queryKey: ["jobs"] });
  };

  const runAction = async (
    field: string,
    action: "accept" | "edit" | "reject",
    humanValue?: string,
  ) => {
    setBusy(true);
    try {
      await api.reviewJobField(id, { field, action, humanValue });
      invalidate();
      setEditingField(null);
    } finally {
      setBusy(false);
    }
  };

  const saveJob = async () => {
    setBusy(true);
    try {
      if (!data?.ready) {
        await api.markJobReady(id);
        invalidate();
      }
      toast("Job Saved");
      navigate(`/jobs/${id}`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <PanelSkeleton />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="p-8">
        <ErrorState
          message={(error as Error)?.message ?? "Not found"}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row lg:p-6">
        <section className="flex-1 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">JD Preview</h2>
          <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap text-sm text-slate-700">
            {data.rawJdText || "—"}
          </pre>
        </section>
        <section className="w-full shrink-0 space-y-3 lg:w-96">
          <InsightsPanel screen="job" jobId={id} />
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Parsed Knowledge</h2>
            <div className="space-y-3">
              {data.diff.map((row) => (
                <div key={row.field} className="rounded-lg border border-slate-100 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase text-slate-500">{row.label}</p>
                  {editingField === row.field ? (
                    <div className="space-y-2">
                      <textarea
                        className="w-full rounded border border-slate-300 p-2 text-sm"
                        rows={3}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs font-medium"
                          disabled={busy}
                          onClick={() => void runAction(row.field, "edit", editValue)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="text-xs text-slate-500"
                          onClick={() => setEditingField(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mb-2 text-sm text-slate-800">{row.current || "—"}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void runAction(row.field, "accept")}
                          className="rounded border border-slate-300 px-2 py-1 text-xs font-medium"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEditingField(row.field);
                            setEditValue(row.current);
                          }}
                          className="rounded border border-slate-300 px-2 py-1 text-xs font-medium"
                        >
                          Correct
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void runAction(row.field, "reject")}
                          className="rounded border border-slate-300 px-2 py-1 text-xs font-medium"
                        >
                          Skip
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <footer className="sticky bottom-0 flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
        <Link to="/jobs" className="text-sm text-slate-600">
          ← Jobs
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveJob()}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {data.ready ? "Open Job →" : "Save Job →"}
        </button>
      </footer>
    </div>
  );
}
