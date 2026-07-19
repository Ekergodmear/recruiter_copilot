import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { KnowledgeObject } from "../api/knowledge-types";

const FIELD_LABELS: Record<string, string> = {
  summary: "Summary",
  skills: "Skills",
  english: "English",
  years_of_experience: "Years of experience",
};

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function FieldCard({
  object,
  candidateId,
}: {
  object: KnowledgeObject;
  candidateId: string;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(object.currentValue);
  const [evidenceSource, setEvidenceSource] = useState("Interview");
  const [evidenceNote, setEvidenceNote] = useState("");

  const patch = useMutation({
    mutationFn: () => api.patchKnowledge(object.id, { newValue: value }),
    onSuccess: () => {
      setEditing(false);
      void qc.invalidateQueries({ queryKey: ["knowledge", candidateId] });
      void qc.invalidateQueries({ queryKey: ["knowledge-history", candidateId] });
    },
  });

  const addEvidence = useMutation({
    mutationFn: () =>
      api.addKnowledgeEvidence(object.id, {
        source: evidenceSource,
        confidence: 0.95,
        note: evidenceNote || undefined,
      }),
    onSuccess: () => {
      setEvidenceNote("");
      void qc.invalidateQueries({ queryKey: ["knowledge", candidateId] });
      void qc.invalidateQueries({ queryKey: ["knowledge-history", candidateId] });
    },
  });

  return (
    <article className="border-b border-slate-200 py-6 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {FIELD_LABELS[object.field] ?? object.field}
          </h3>
          <p className="mt-1 text-sm text-slate-700">{object.currentValue}</p>
          <p className="mt-1 text-xs text-slate-500">
            Original AI: {object.originalValue} · Rev #{object.revisionNumber} ·{" "}
            {object.status}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-5">
          <div>
            <dt className="uppercase tracking-wide text-slate-400">Confidence</dt>
            <dd className="font-medium text-slate-800">{pct(object.analytics.confidence)}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide text-slate-400">Evidence</dt>
            <dd className="font-medium text-slate-800">{object.analytics.evidenceCount}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide text-slate-400">Revisions</dt>
            <dd className="font-medium text-slate-800">{object.analytics.revisionCount}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide text-slate-400">Verified</dt>
            <dd className="font-medium text-slate-800">{object.analytics.verifiedCount}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide text-slate-400">Updated</dt>
            <dd className="font-medium text-slate-800">
              {new Date(object.analytics.lastUpdated).toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>

      <section className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Confidence evolution
        </h4>
        <ol className="mt-2 space-y-1 text-sm text-slate-700">
          {object.confidenceHistory.map((point, idx) => (
            <li key={`${point.recordedAt}-${idx}`}>
              {point.source}: {pct(point.confidence)}
              {idx < object.confidenceHistory.length - 1 ? " →" : ""}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence</h4>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {object.evidence.map((ev) => (
            <li key={ev.id}>
              {ev.source} · {pct(ev.confidence)} · {new Date(ev.createdAt).toLocaleString()}
              {ev.note ? ` — ${ev.note}` : ""}
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-600">
            Source
            <select
              className="mt-1 block rounded border border-slate-300 px-2 py-1 text-sm"
              value={evidenceSource}
              onChange={(e) => setEvidenceSource(e.target.value)}
            >
              {["Interview", "Client Feedback", "Assessment", "Recruiter Review", "Resume"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="text-xs text-slate-600">
            Note
            <input
              className="mt-1 block w-48 rounded border border-slate-300 px-2 py-1 text-sm"
              value={evidenceNote}
              onChange={(e) => setEvidenceNote(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
            onClick={() => addEvidence.mutate()}
            disabled={addEvidence.isPending}
          >
            Add evidence
          </button>
        </div>
      </section>

      <section className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Revision history
        </h4>
        {object.revisions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No revisions yet.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {object.revisions.map((rev) => (
              <li key={rev.id} className="border-l-2 border-slate-300 pl-3">
                <p>
                  {rev.oldValue} → {rev.newValue}
                </p>
                <p className="text-xs text-slate-500">
                  {rev.actor} · {rev.source} · {new Date(rev.timestamp).toLocaleString()}
                  {rev.reason ? ` · ${rev.reason}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Signals</h4>
        {object.signals.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No field signals yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {object.signals.map((s) => (
              <li key={s.id}>
                {s.type} · {s.actor} · {new Date(s.timestamp).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-4">
        {editing ? (
          <div className="space-y-2">
            <textarea
              className="w-full rounded border border-slate-300 p-2 text-sm"
              rows={3}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                onClick={() => patch.mutate()}
                disabled={patch.isPending}
              >
                Save revision
              </button>
              <button
                type="button"
                className="rounded border border-slate-300 px-3 py-1.5 text-xs"
                onClick={() => {
                  setEditing(false);
                  setValue(object.currentValue);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="text-sm font-medium text-slate-900 underline"
            onClick={() => setEditing(true)}
          >
            Correct value
          </button>
        )}
      </div>
    </article>
  );
}

export function CandidateKnowledgePanel({ candidateId }: { candidateId: string }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["knowledge", candidateId],
    queryFn: () => api.getCandidateKnowledge(candidateId),
    enabled: Boolean(candidateId),
  });

  const history = useQuery({
    queryKey: ["knowledge-history", candidateId],
    queryFn: () => api.getKnowledgeHistory(candidateId),
    enabled: Boolean(candidateId),
  });

  const timeline = useMemo(() => data?.timeline ?? history.data?.timeline ?? [], [data, history.data]);

  if (isLoading) return <p className="text-sm text-slate-500">Loading knowledge…</p>;
  if (error || !data) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600">{(error as Error)?.message ?? "Knowledge not found"}</p>
        <button type="button" className="text-sm underline" onClick={() => void refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-slate-900">Current Knowledge</h2>
        <p className="mt-1 text-sm text-slate-600">
          Every recruiter decision appends history. Original values are never overwritten.
        </p>
        <div className="mt-2">
          {data.objects.map((obj) => (
            <FieldCard key={obj.id} object={obj} candidateId={candidateId} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Knowledge History</h2>
        <p className="mt-1 text-sm text-slate-600">
          Original AI → Recruiter → Interview → Client → Current Truth
        </p>
        <ol className="mt-4 space-y-3 border-l border-slate-300 pl-4">
          {timeline.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-400" />
              <p className="text-sm font-medium text-slate-900">
                {event.label}
                {event.field ? ` · ${FIELD_LABELS[event.field] ?? event.field}` : ""}
              </p>
              {event.value ? <p className="text-sm text-slate-700">{event.value}</p> : null}
              <p className="text-xs text-slate-500">
                {new Date(event.timestamp).toLocaleString()}
                {event.actor ? ` · ${event.actor}` : ""}
                {event.confidence != null ? ` · ${pct(event.confidence)}` : ""}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Candidate signals</h2>
        {data.signals.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No pipeline signals yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {data.signals.map((s) => (
              <li key={s.id}>
                {s.type} · {s.actor} · {new Date(s.timestamp).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
