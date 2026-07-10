export type { TelemetryEvent, TelemetryEventType } from "./types.js";
export {
  createTelemetryEvent,
  computeHumanOverrideRate,
  computeAiAcceptanceRate,
  computeVerificationRate,
  computeReviewCompletionRate,
} from "./types.js";
export type { TelemetryStore } from "./store.js";
export { InMemoryTelemetryStore, FileTelemetryStore } from "./store.js";
export { validateTelemetryEvent, formatValidationErrors } from "./validate.js";

import { InMemoryTelemetryStore } from "./store.js";
import type { TelemetryStore } from "./store.js";
import type { TelemetryEvent } from "./types.js";

/** In-memory store for tests and local dev without file persistence */
export class TelemetryRecorder implements TelemetryStore {
  private readonly store = new InMemoryTelemetryStore();

  record(event: TelemetryEvent): void {
    this.store.record(event);
  }

  getEvents(): readonly TelemetryEvent[] {
    return this.store.getEvents();
  }

  clear(): void {
    this.store.clear();
  }
}

export const telemetryRecorder = new TelemetryRecorder();
