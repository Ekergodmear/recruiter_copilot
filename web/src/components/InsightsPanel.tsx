import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Insight, InsightScreen } from "../api/types";

const SEVERITY_STYLE: Record<Insight["severity"], string> = {
  critical: "border-rose-200 bg-rose-50 text-rose-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-slate-200 bg-slate-50 text-slate-800",
};

type InsightsPanelProps =
  | {
      screen: "candidate" | "review";
      candidateId: string;
      jobId?: never;
      submissionId?: never;
      interviewId?: never;
    }
  | { screen: "job"; jobId: string; candidateId?: never; submissionId?: never; interviewId?: never }
  | {
      screen: "submission";
      submissionId: string;
      candidateId?: never;
      jobId?: never;
      interviewId?: never;
    }
  | {
      screen: "interview";
      interviewId: string;
      candidateId?: never;
      jobId?: never;
      submissionId?: never;
    };

/**
 * "Things you should know" — rule-based decision support from stored Knowledge.
 * No LLM. No new screens.
 */
export function InsightsPanel(props: InsightsPanelProps) {
  const screen = props.screen;
  const queryKey =
    props.screen === "candidate" || props.screen === "review"
      ? ["insights", "candidate", props.candidateId, screen]
      : props.screen === "job"
        ? ["insights", "job", props.jobId]
        : props.screen === "submission"
          ? ["insights", "submission", props.submissionId]
          : ["insights", "interview", props.interviewId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      if (props.screen === "candidate" || props.screen === "review") {
        return api.getCandidateInsights(props.candidateId, screen);
      }
      if (props.screen === "job") return api.getJobInsights(props.jobId);
      if (props.screen === "submission") return api.getSubmissionInsights(props.submissionId);
      return api.getInterviewInsights(props.interviewId);
    },
    enabled: Boolean(
      props.screen === "candidate" || props.screen === "review"
        ? props.candidateId
        : props.screen === "job"
          ? props.jobId
          : props.screen === "submission"
            ? props.submissionId
            : props.interviewId,
    ),
  });

  const insights = data?.insights ?? [];
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    // Server already emits insight_rendered; avoid duplicate client beacon.
    trackedRef.current = queryKey.join(":");
  }, [queryKey, insights.length]);

  if (isLoading) {
    return (
      <div className="mb-6 h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Things you should know
      </p>
      <ul className="space-y-2">
        {insights.map((insight) => (
          <li key={insight.id}>
            <button
              type="button"
              className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm ${SEVERITY_STYLE[insight.severity]}`}
              onClick={() => void api.trackInsightClick(screen as InsightScreen, insight.id)}
            >
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide opacity-70">
                {insight.severity}
              </span>
              <span>
                <span className="font-medium">{insight.title}</span>
                <span className="mt-0.5 block opacity-90">{insight.description}</span>
                {insight.action ? (
                  <span className="mt-1 block text-xs font-semibold underline">
                    {insight.action}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
