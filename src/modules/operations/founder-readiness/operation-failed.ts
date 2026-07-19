import type { Clock } from "../../../shared/clock/index.js";
import { createTelemetryEvent, type TelemetryStore } from "../../../shared/telemetry/index.js";

export function emitOperationFailed(
  deps: {
    telemetry: TelemetryStore;
    clock: Clock;
  },
  params: {
    operation: string;
    errorCode: string;
    traceId: string;
    correlationId?: string;
    candidateId?: string;
    workspaceId?: string;
    actorId?: string;
  },
): void {
  deps.telemetry.record(
    createTelemetryEvent(
      {
        event_type: "operation_failed",
        trace_id: params.traceId,
        correlation_id: params.correlationId,
        workspace_id: params.workspaceId,
        actor_id: params.actorId ?? "recruiter_alpha",
        candidate_id: params.candidateId,
        latency_ms: 0,
        error_code: `${params.operation}:${params.errorCode}`,
        outcome: "failed",
        review_action: params.operation,
      },
      deps.clock,
    ),
  );
}
