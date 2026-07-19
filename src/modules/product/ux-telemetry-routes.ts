import type { FastifyInstance } from "fastify";
import type { Clock } from "../../shared/clock/index.js";
import {
  createTelemetryEvent,
  type TelemetryEventType,
  type TelemetryStore,
} from "../../shared/telemetry/index.js";
import { UuidIdGenerator } from "../../shared/id-generator/index.js";
import type { ReviewSessionMetricsService } from "../operations/founder-readiness/review-session-metrics-service.js";
import { pickAllowedFields, SecurityError } from "../../shared/security/index.js";

const UX_EVENT_TYPES = new Set<TelemetryEventType>([
  "entry_screen",
  "abandon_reason",
  "review_mode_used",
]);

const ENTRY_SCREENS = new Set([
  "Home",
  "Import",
  "Review",
  "Candidates",
  "CandidateDetail",
  "Search",
  "Jobs",
  "JobCreate",
  "JobDetail",
  "JobReview",
]);

const ABANDON_REASONS = new Set([
  "import_close_tab",
  "import_navigate_away",
  "review_back_not_ready",
  "review_close_tab_not_ready",
  "review_navigate_away_not_ready",
]);

const REVIEW_MODES = new Set(["focus", "flexible"]);

type UxTelemetryBody = {
  event_type: "entry_screen" | "abandon_reason" | "review_mode_used";
  screen?: string;
  abandon_reason?: string;
  review_mode?: string;
  session_id?: string;
  candidate_id?: string;
};

export function registerUxTelemetryRoutes(
  app: FastifyInstance,
  telemetry: TelemetryStore,
  clock: Clock,
  workspaceId: string,
  reviewSessionMetrics?: ReviewSessionMetricsService,
): void {
  const idGenerator = new UuidIdGenerator();

  app.post("/api/v1/telemetry", async (request, reply) => {
    let body: UxTelemetryBody;
    try {
      body = pickAllowedFields<UxTelemetryBody>(request.body, [
        "event_type",
        "screen",
        "abandon_reason",
        "review_mode",
        "session_id",
        "candidate_id",
      ]);
    } catch (error) {
      if (error instanceof SecurityError) {
        return reply.status(error.statusCode).send({ error: error.code, message: error.message });
      }
      throw error;
    }

    if (!body?.event_type || !UX_EVENT_TYPES.has(body.event_type)) {
      return reply.status(400).send({
        error: "INVALID_EVENT_TYPE",
        message: "event_type must be entry_screen or abandon_reason",
      });
    }

    if (body.event_type === "entry_screen") {
      if (!body.screen || !ENTRY_SCREENS.has(body.screen)) {
        return reply.status(400).send({
          error: "INVALID_SCREEN",
          message: "screen is required for entry_screen",
        });
      }
    }

    if (body.event_type === "abandon_reason") {
      if (!body.abandon_reason || !ABANDON_REASONS.has(body.abandon_reason)) {
        return reply.status(400).send({
          error: "INVALID_ABANDON_REASON",
          message: "abandon_reason is required for abandon_reason",
        });
      }
    }

    if (body.event_type === "review_mode_used") {
      if (!body.review_mode || !REVIEW_MODES.has(body.review_mode)) {
        return reply.status(400).send({
          error: "INVALID_REVIEW_MODE",
          message: "review_mode must be focus or flexible",
        });
      }
    }

    if (body.review_mode && !REVIEW_MODES.has(body.review_mode)) {
      return reply.status(400).send({
        error: "INVALID_REVIEW_MODE",
        message: "review_mode must be focus or flexible",
      });
    }

    telemetry.record(
      createTelemetryEvent(
        {
          event_type: body.event_type,
          trace_id: `ux_${idGenerator.generateId("trace")}`,
          correlation_id: body.session_id ?? idGenerator.generateId("corr"),
          workspace_id: workspaceId,
          actor_id: "recruiter_alpha",
          latency_ms: 0,
          session_id: body.session_id,
          screen: body.screen,
          abandon_reason: body.abandon_reason,
          review_mode: body.review_mode as "focus" | "flexible" | undefined,
          candidate_id: body.candidate_id,
        },
        clock,
      ),
    );

    if (
      body.event_type === "abandon_reason" &&
      body.candidate_id &&
      body.abandon_reason?.startsWith("review_")
    ) {
      reviewSessionMetrics?.abandon(body.candidate_id);
    }

    return { ok: true };
  });
}
