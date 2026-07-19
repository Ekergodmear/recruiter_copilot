import type { FastifyInstance } from "fastify";
import type { Clock } from "../../../shared/clock/index.js";
import type { IdGenerator } from "../../../shared/id-generator/index.js";
import { createTelemetryEvent, type TelemetryStore } from "../../../shared/telemetry/index.js";
import {
  KnowledgeEvolutionError,
  KnowledgeEvolutionService,
} from "../application/knowledge-evolution-service.js";
import type { CandidateInsightService } from "../application/candidate-insight-service.js";
import type { InsightEngine } from "../insights/insight-engine.js";
import type { InsightScreen } from "../insights/insight.js";
import { PROVENANCE_SOURCES } from "../../candidate/domain/knowledge/knowledge-provenance.js";

export function registerKnowledgeRoutes(
  app: FastifyInstance,
  service: KnowledgeEvolutionService,
  clock: Clock,
  defaultActorId = "recruiter_local",
): void {
  app.get<{ Params: { candidateId: string } }>(
    "/api/v1/knowledge/:candidateId",
    async (request, reply) => {
      try {
        return await service.getCandidateKnowledge(request.params.candidateId);
      } catch (err) {
        return mapError(err, reply);
      }
    },
  );

  app.get<{ Params: { candidateId: string } }>(
    "/api/v1/knowledge/:candidateId/history",
    async (request, reply) => {
      try {
        return await service.getHistory(request.params.candidateId);
      } catch (err) {
        return mapError(err, reply);
      }
    },
  );

  app.patch<{
    Params: { id: string };
    Body: { newValue?: string; value?: string; reason?: string; actorId?: string };
  }>("/api/v1/knowledge/:id", async (request, reply) => {
    try {
      const newValue = request.body?.newValue ?? request.body?.value;
      if (typeof newValue !== "string") {
        return reply.code(400).send({
          code: "INVALID_BODY",
          message: "newValue is required",
          timestamp: clock.nowIso(),
        });
      }
      return await service.patchKnowledge({
        knowledgeId: request.params.id,
        actorId: request.body?.actorId ?? defaultActorId,
        newValue,
        reason: request.body?.reason ?? null,
      });
    } catch (err) {
      return mapError(err, reply);
    }
  });

  app.post<{
    Params: { id: string };
    Body: {
      source?: string;
      confidence?: number;
      note?: string;
      actorId?: string;
    };
  }>("/api/v1/knowledge/:id/evidence", async (request, reply) => {
    try {
      const source = request.body?.source;
      const confidence = request.body?.confidence;
      if (
        typeof source !== "string" ||
        !PROVENANCE_SOURCES.includes(source as (typeof PROVENANCE_SOURCES)[number])
      ) {
        return reply.code(400).send({
          code: "INVALID_BODY",
          message: `source must be one of: ${PROVENANCE_SOURCES.join(", ")}`,
          timestamp: clock.nowIso(),
        });
      }
      if (typeof confidence !== "number") {
        return reply.code(400).send({
          code: "INVALID_BODY",
          message: "confidence is required (0–1)",
          timestamp: clock.nowIso(),
        });
      }

      const snapshot = await service.addEvidence({
        knowledgeId: request.params.id,
        actorId: request.body?.actorId ?? defaultActorId,
        source: source as (typeof PROVENANCE_SOURCES)[number],
        confidence,
        note: request.body?.note ?? null,
      });
      return reply.code(201).send(snapshot);
    } catch (err) {
      return mapError(err, reply);
    }
  });
}

export function registerInsightRoutes(
  app: FastifyInstance,
  deps: {
    candidateInsightService: CandidateInsightService;
    insightEngine: InsightEngine;
    telemetry: TelemetryStore;
    clock: Clock;
    idGenerator: IdGenerator;
  },
): void {
  app.get<{ Params: { candidateId: string }; Querystring: { screen?: string } }>(
    "/api/v1/candidates/:candidateId/insights",
    async (request) => {
      const screen = parseScreen(request.query.screen, "candidate");
      const insights = await deps.candidateInsightService.getInsights(
        request.params.candidateId,
        screen,
      );
      return { candidateId: request.params.candidateId, insights };
    },
  );

  app.get<{ Params: { jobId: string } }>("/api/v1/jobs/:jobId/insights", async (request) => {
    const insights = await deps.insightEngine.getInsights({
      type: "job",
      jobId: request.params.jobId,
      screen: "job",
    });
    return { jobId: request.params.jobId, insights };
  });

  app.get<{ Params: { submissionId: string } }>(
    "/api/v1/submissions/:submissionId/insights",
    async (request) => {
      const insights = await deps.insightEngine.getInsights({
        type: "submission",
        submissionId: request.params.submissionId,
        screen: "submission",
      });
      return { submissionId: request.params.submissionId, insights };
    },
  );

  app.get<{ Params: { interviewId: string } }>(
    "/api/v1/interviews/:interviewId/insights",
    async (request) => {
      const insights = await deps.insightEngine.getInsights({
        type: "interview",
        interviewId: request.params.interviewId,
        screen: "interview",
      });
      return { interviewId: request.params.interviewId, insights };
    },
  );

  app.post<{ Body: { screen?: string; insight_id?: string } }>(
    "/api/v1/insights/click",
    async (request, reply) => {
      const screen = request.body?.screen;
      const insightId = request.body?.insight_id;
      if (!screen || !insightId) {
        return reply.code(400).send({
          code: "INVALID_BODY",
          message: "screen and insight_id are required",
        });
      }
      deps.telemetry.record(
        createTelemetryEvent(
          {
            event_type: "insight_clicked",
            trace_id: deps.idGenerator.generateId("trace"),
            latency_ms: 0,
            screen,
            insight_id: insightId,
          },
          deps.clock,
        ),
      );
      return { ok: true };
    },
  );
}

/** @deprecated Use registerInsightRoutes */
export function registerCandidateInsightRoutes(
  app: FastifyInstance,
  service: CandidateInsightService,
): void {
  app.get<{ Params: { candidateId: string } }>(
    "/api/v1/candidates/:candidateId/insights",
    async (request) => {
      const insights = await service.getInsights(request.params.candidateId);
      return { candidateId: request.params.candidateId, insights };
    },
  );
}

function parseScreen(raw: string | undefined, fallback: InsightScreen): InsightScreen {
  if (
    raw === "review" ||
    raw === "candidate" ||
    raw === "job" ||
    raw === "submission" ||
    raw === "interview"
  ) {
    return raw;
  }
  return fallback;
}

function mapError(err: unknown, reply: { code: (n: number) => { send: (b: unknown) => unknown } }) {
  if (err instanceof KnowledgeEvolutionError) {
    const status = err.code === "NOT_FOUND" ? 404 : 400;
    return reply.code(status).send({ code: err.code, message: err.message });
  }
  throw err;
}
