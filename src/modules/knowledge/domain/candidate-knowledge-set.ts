import type { KnowledgeObject } from "./knowledge-object.js";
import type { KnowledgeSignal, KnowledgeTimelineEvent } from "./types.js";

export class CandidateKnowledgeSet {
  private constructor(
    readonly candidateId: string,
    readonly workspaceId: string,
    readonly objects: readonly KnowledgeObject[],
    readonly candidateSignals: readonly KnowledgeSignal[],
  ) {}

  static create(params: {
    candidateId: string;
    workspaceId: string;
    objects: KnowledgeObject[];
    candidateSignals?: KnowledgeSignal[];
  }): CandidateKnowledgeSet {
    return new CandidateKnowledgeSet(
      params.candidateId,
      params.workspaceId,
      params.objects,
      params.candidateSignals ?? [],
    );
  }

  withObjects(objects: KnowledgeObject[]): CandidateKnowledgeSet {
    return new CandidateKnowledgeSet(
      this.candidateId,
      this.workspaceId,
      objects,
      this.candidateSignals,
    );
  }

  withCandidateSignal(signal: KnowledgeSignal): CandidateKnowledgeSet {
    return new CandidateKnowledgeSet(this.candidateId, this.workspaceId, this.objects, [
      ...this.candidateSignals,
      signal,
    ]);
  }

  findById(id: string): KnowledgeObject | undefined {
    return this.objects.find((o) => o.id === id);
  }

  findByField(field: string): KnowledgeObject | undefined {
    return this.objects.find((o) => o.field === field);
  }

  replace(object: KnowledgeObject): CandidateKnowledgeSet {
    return this.withObjects(this.objects.map((o) => (o.id === object.id ? object : o)));
  }

  buildTimeline(): KnowledgeTimelineEvent[] {
    const events: KnowledgeTimelineEvent[] = [];

    for (const obj of this.objects) {
      events.push({
        id: `${obj.id}:original`,
        kind: "original_ai",
        field: obj.field,
        label: "Original AI",
        value: obj.originalValue,
        confidence: obj.confidenceHistory[0]?.confidence ?? null,
        actor: null,
        source: obj.evidence[0]?.source ?? "Resume",
        timestamp: obj.evidence[0]?.createdAt ?? obj.lastUpdated,
      });

      for (const rev of obj.revisions) {
        const kind =
          rev.source === "Interview"
            ? "interview"
            : rev.source === "Client Feedback"
              ? "client_feedback"
              : rev.source === "Assessment"
                ? "assessment"
                : "recruiter_edit";
        events.push({
          id: rev.id,
          kind,
          field: obj.field,
          label: kind === "recruiter_edit" ? "Recruiter Edit" : String(rev.source),
          value: rev.newValue,
          confidence: null,
          actor: rev.actor,
          source: String(rev.source),
          timestamp: rev.timestamp,
        });
      }

      for (const ev of obj.evidence.slice(1)) {
        events.push({
          id: ev.id,
          kind: "evidence",
          field: obj.field,
          label: `Evidence: ${ev.source}`,
          value: ev.note ?? null,
          confidence: ev.confidence,
          actor: null,
          source: ev.source,
          timestamp: ev.createdAt,
        });
      }

      for (const signal of obj.signals) {
        events.push({
          id: signal.id,
          kind: mapSignalKind(signal.type),
          field: obj.field,
          label: `Signal: ${signal.type}`,
          value: null,
          confidence: null,
          actor: signal.actor,
          source: signal.type,
          timestamp: signal.timestamp,
        });
      }

      events.push({
        id: `${obj.id}:current`,
        kind: "current_truth",
        field: obj.field,
        label: "Current Truth",
        value: obj.currentValue,
        confidence: obj.confidence,
        actor: null,
        source: null,
        timestamp: obj.lastUpdated,
      });
    }

    for (const signal of this.candidateSignals) {
      events.push({
        id: signal.id,
        kind: mapSignalKind(signal.type),
        field: signal.field,
        label: `Signal: ${signal.type}`,
        value: null,
        confidence: null,
        actor: signal.actor,
        source: signal.type,
        timestamp: signal.timestamp,
      });
    }

    return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}

function mapSignalKind(type: string): KnowledgeTimelineEvent["kind"] {
  if (type === "accept") return "accept";
  if (type === "reject") return "reject";
  if (type === "verify") return "verify";
  if (type.startsWith("interview")) return "interview";
  if (type.startsWith("offer") || type === "placement") return "client_feedback";
  return "signal";
}
