import type { Clock } from "../../../shared/clock/index.js";
import type { IdGenerator } from "../../../shared/id-generator/index.js";
import { createTelemetryEvent, type TelemetryStore } from "../../../shared/telemetry/index.js";
import type { ReviewSessionMetrics } from "./types.js";

type ActiveSession = {
  sessionId: string;
  candidateId: string;
  correlationId: string;
  startedAt: Date;
  fieldsEdited: number;
  knowledgeAccepted: number;
  knowledgeRejected: number;
  knowledgeCorrected: number;
};

/**
 * Tracks one review session per candidate: open Review → Ready or abandon.
 */
export class ReviewSessionMetricsService {
  private readonly active = new Map<string, ActiveSession>();
  private readonly completed: ReviewSessionMetrics[] = [];

  constructor(
    private readonly deps: {
      clock: Clock;
      idGenerator: IdGenerator;
      telemetry: TelemetryStore;
      workspaceId: string;
    },
  ) {}

  /** Session starts when candidate is opened in Review. */
  startSession(candidateId: string, correlationId?: string): ReviewSessionMetrics {
    const existing = this.active.get(candidateId);
    if (existing) {
      return this.toMetrics(existing);
    }

    const session: ActiveSession = {
      sessionId: this.deps.idGenerator.generateId("rsess"),
      candidateId,
      correlationId: correlationId ?? this.deps.idGenerator.generateId("corr"),
      startedAt: this.deps.clock.now(),
      fieldsEdited: 0,
      knowledgeAccepted: 0,
      knowledgeRejected: 0,
      knowledgeCorrected: 0,
    };
    this.active.set(candidateId, session);
    return this.toMetrics(session);
  }

  recordKnowledgeAction(
    candidateId: string,
    action: "accept" | "reject" | "edit" | "verify",
  ): void {
    const session = this.active.get(candidateId);
    if (!session) return;
    if (action === "accept" || action === "verify") session.knowledgeAccepted += 1;
    if (action === "reject") session.knowledgeRejected += 1;
    if (action === "edit") {
      session.knowledgeCorrected += 1;
      session.fieldsEdited += 1;
    }
  }

  completeReady(candidateId: string): ReviewSessionMetrics | null {
    return this.finish(candidateId, true);
  }

  abandon(candidateId: string): ReviewSessionMetrics | null {
    return this.finish(candidateId, false);
  }

  getCompletedSessions(): readonly ReviewSessionMetrics[] {
    return this.completed;
  }

  getActiveSession(candidateId: string): ReviewSessionMetrics | null {
    const s = this.active.get(candidateId);
    return s ? this.toMetrics(s) : null;
  }

  private finish(candidateId: string, ready: boolean): ReviewSessionMetrics | null {
    const session = this.active.get(candidateId);
    if (!session) return null;
    this.active.delete(candidateId);

    const completedAt = this.deps.clock.now();
    const durationMs = Math.max(0, completedAt.getTime() - session.startedAt.getTime());
    const metrics: ReviewSessionMetrics = {
      sessionId: session.sessionId,
      candidateId: session.candidateId,
      startedAt: session.startedAt,
      completedAt,
      durationMs,
      fieldsEdited: session.fieldsEdited,
      knowledgeAccepted: session.knowledgeAccepted,
      knowledgeRejected: session.knowledgeRejected,
      knowledgeCorrected: session.knowledgeCorrected,
      ready,
    };
    this.completed.push(metrics);

    this.deps.telemetry.record(
      createTelemetryEvent(
        {
          event_type: "review_session_completed",
          trace_id: this.deps.idGenerator.generateId("trace"),
          correlation_id: session.correlationId,
          workspace_id: this.deps.workspaceId,
          actor_id: "recruiter_alpha",
          candidate_id: candidateId,
          session_id: session.sessionId,
          latency_ms: durationMs,
          ttqc_ms: durationMs,
          fields_overridden: metrics.fieldsEdited,
          fields_reviewed:
            metrics.knowledgeAccepted + metrics.knowledgeRejected + metrics.knowledgeCorrected,
          outcome: ready ? "accepted" : "pending",
          review_action: ready ? "ready" : "abandoned",
        },
        this.deps.clock,
      ),
    );

    return metrics;
  }

  private toMetrics(session: ActiveSession): ReviewSessionMetrics {
    const now = this.deps.clock.now();
    return {
      sessionId: session.sessionId,
      candidateId: session.candidateId,
      startedAt: session.startedAt,
      durationMs: Math.max(0, now.getTime() - session.startedAt.getTime()),
      fieldsEdited: session.fieldsEdited,
      knowledgeAccepted: session.knowledgeAccepted,
      knowledgeRejected: session.knowledgeRejected,
      knowledgeCorrected: session.knowledgeCorrected,
      ready: false,
    };
  }
}
