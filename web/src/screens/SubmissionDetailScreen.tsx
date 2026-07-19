import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

import { useToast } from "../components/Toast";
import { ErrorState } from "../components/EmptyState";
import { PanelSkeleton } from "../components/Skeleton";
import { InsightsPanel } from "../components/InsightsPanel";

export function SubmissionDetailScreen() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [salary, setSalary] = useState("");
  const [startDate, setStartDate] = useState("");
  const [feedback, setFeedback] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["submission", id],
    queryFn: () => api.getSubmission(id),
    enabled: Boolean(id),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["submission", id] });
    void queryClient.invalidateQueries({ queryKey: ["submissions"] });
    if (data?.job?.id) {
      void queryClient.invalidateQueries({ queryKey: ["job", data.job.id] });
      void queryClient.invalidateQueries({ queryKey: ["job-pipeline", data.job.id] });
      void queryClient.invalidateQueries({ queryKey: ["job-activities", data.job.id] });
    }
  };

  const run = useMutation({
    mutationFn: async (fn: () => Promise<{ toast?: string } | unknown>) => {
      const result = await fn();
      return result;
    },
    onSuccess: (result) => {
      invalidate();
      if (result && typeof result === "object" && "toast" in result && result.toast) {
        toast(String(result.toast));
      }
    },
    onError: (e: Error) => toast(e.message),
  });

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

  const { submission, job, candidate, interviews, offers, activities } = data;
  const placed = submission.status === "Placed";

  return (
    <div className="flex-1 p-8">
      <Link to="/pipeline" className="text-sm text-slate-500 hover:text-slate-900">
        ← Pipeline
      </Link>
      {job && (
        <Link to={`/jobs/${job.id}`} className="ml-4 text-sm text-slate-500 underline">
          Job: {job.title}
        </Link>
      )}

      <header className="mt-3 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          {candidate?.name ?? submission.candidateId}
        </h1>
        <p className="text-sm text-slate-500">
          {job?.company} · {submission.status}
        </p>
      </header>

      <InsightsPanel screen="submission" submissionId={id} />
      {interviews[0] ? (
        <InsightsPanel screen="interview" interviewId={interviews[0].id} />
      ) : null}

      {!placed && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium"
            disabled={run.isPending}
            onClick={() =>
              run.mutate(() =>
                api.updateSubmissionStatus(id, { status: "Client Reviewing" }),
              )
            }
          >
            Client Review
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium"
            disabled={run.isPending || !interviewDate}
            onClick={() =>
              run.mutate(async () => {
                await api.scheduleInterview(id, {
                  date: new Date(interviewDate).toISOString(),
                  interviewer,
                  type: "Interview",
                });
                return { toast: "Interview Scheduled" };
              })
            }
          >
            Schedule Interview
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium"
            disabled={run.isPending || !salary.trim()}
            onClick={() =>
              run.mutate(() =>
                api.createOffer(id, { salary, startDate, benefits: "" }),
              )
            }
          >
            Send Offer (draft)
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium"
            disabled={run.isPending}
            onClick={() => run.mutate(() => api.rejectSubmission(id))}
          >
            Reject
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium"
            disabled={run.isPending}
            onClick={() => run.mutate(() => api.withdrawSubmission(id))}
          >
            Withdraw
          </button>
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
            disabled={run.isPending}
            onClick={() =>
              run.mutate(async () => {
                await api.markPlaced(id);
                return { toast: "Placement recorded" };
              })
            }
          >
            Mark Placed
          </button>
        </div>
      )}

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Interview date
          </span>
          <input
            type="datetime-local"
            value={interviewDate}
            onChange={(e) => setInterviewDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Interviewer
          </span>
          <input
            value={interviewer}
            onChange={(e) => setInterviewer(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Offer salary
          </span>
          <input
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            placeholder="USD 2000"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Start date
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Interviews</h2>
        {interviews.length === 0 ? (
          <p className="text-sm text-slate-500">No interviews yet.</p>
        ) : (
          <ul className="space-y-2">
            {interviews.map((iv) => (
              <li
                key={iv.id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    Round {iv.round} · {iv.type} · {iv.decision}
                  </span>
                  <span className="text-slate-500">{new Date(iv.date).toLocaleString()}</span>
                </div>
                {iv.decision === "Pending" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Feedback"
                      className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                      onClick={() =>
                        run.mutate(() =>
                          api.completeInterview(iv.id, {
                            decision: "Passed",
                            feedback,
                          }),
                        )
                      }
                    >
                      Passed
                    </button>
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                      onClick={() =>
                        run.mutate(() =>
                          api.completeInterview(iv.id, {
                            decision: "Failed",
                            feedback,
                          }),
                        )
                      }
                    >
                      Failed
                    </button>
                  </div>
                )}
                {iv.feedback && <p className="mt-1 text-slate-600">{iv.feedback}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Offers</h2>
        {offers.length === 0 ? (
          <p className="text-sm text-slate-500">No offers yet.</p>
        ) : (
          <ul className="space-y-2">
            {offers.map((o) => (
              <li
                key={o.id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {o.salary} · {o.status}
                  </span>
                  <span className="text-slate-500">{o.startDate || "—"}</span>
                </div>
                {o.status === "Draft" && (
                  <button
                    type="button"
                    className="mt-2 rounded border border-slate-300 px-2 py-1 text-xs"
                    onClick={() => run.mutate(() => api.updateOfferStatus(o.id, "Sent"))}
                  >
                    Mark Sent
                  </button>
                )}
                {o.status === "Sent" && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                      onClick={() => run.mutate(() => api.updateOfferStatus(o.id, "Accepted"))}
                    >
                      Accepted
                    </button>
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                      onClick={() => run.mutate(() => api.updateOfferStatus(o.id, "Declined"))}
                    >
                      Declined
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Timeline</h2>
        <ul className="space-y-2">
          {activities.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <span className="font-medium">{a.message}</span>
              <span className="ml-2 text-slate-500">
                {new Date(a.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
