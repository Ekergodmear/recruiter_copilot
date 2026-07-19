import type { Insight, InsightContext } from "./insight.js";

export interface InsightProvider {
  readonly name: string;
  provide(context: InsightContext): Promise<Insight[]>;
}
