import { createTelemetryEvent, type TelemetryStore } from "../../../shared/telemetry/index.js";
import type { Clock } from "../../../shared/clock/index.js";
import type { IdGenerator } from "../../../shared/id-generator/index.js";
import {
  highestSeverity,
  sortInsightsBySeverity,
  type Insight,
  type InsightContext,
  type InsightScreen,
} from "./insight.js";
import type { InsightProvider } from "./insight-provider.js";

export class InsightEngine {
  constructor(
    private readonly providers: readonly InsightProvider[],
    private readonly deps?: {
      telemetry?: TelemetryStore;
      clock?: Clock;
      idGenerator?: IdGenerator;
    },
  ) {}

  async getInsights(context: InsightContext, limit = 8): Promise<Insight[]> {
    const batches = await Promise.all(this.providers.map((p) => p.provide(context)));
    const insights = sortInsightsBySeverity(batches.flat()).slice(0, limit);
    this.emitRendered(context, insights);
    return insights;
  }

  private emitRendered(context: InsightContext, insights: Insight[]) {
    if (!this.deps?.telemetry || !this.deps.clock || !this.deps.idGenerator) return;
    const screen = resolveScreen(context);
    this.deps.telemetry.record(
      createTelemetryEvent(
        {
          event_type: "insight_rendered",
          trace_id: this.deps.idGenerator.generateId("trace"),
          latency_ms: 0,
          screen,
          insight_count: insights.length,
          highest_severity: highestSeverity(insights) ?? undefined,
        },
        this.deps.clock,
      ),
    );
  }
}

function resolveScreen(context: InsightContext): InsightScreen {
  if (context.screen) return context.screen;
  switch (context.type) {
    case "candidate":
      return "candidate";
    case "job":
      return "job";
    case "submission":
      return "submission";
    case "interview":
      return "interview";
  }
}
