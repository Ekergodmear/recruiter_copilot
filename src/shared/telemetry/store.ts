import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { TelemetryEvent } from "./types.js";
import { validateTelemetryEvent } from "./validate.js";

export interface TelemetryStore {
  record(event: TelemetryEvent): void;
  getEvents(): readonly TelemetryEvent[];
  clear(): void;
}

export class InMemoryTelemetryStore implements TelemetryStore {
  private events: TelemetryEvent[] = [];

  record(event: TelemetryEvent): void {
    if (!validateTelemetryEvent(event)) {
      throw new Error("Invalid telemetry event");
    }
    this.events.push(event);
  }

  getEvents(): readonly TelemetryEvent[] {
    return this.events;
  }

  clear(): void {
    this.events = [];
  }
}

export class FileTelemetryStore implements TelemetryStore {
  constructor(private readonly filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
  }

  record(event: TelemetryEvent): void {
    if (!validateTelemetryEvent(event)) {
      throw new Error("Invalid telemetry event");
    }
    appendFileSync(this.filePath, `${JSON.stringify(event)}\n`, "utf-8");
  }

  getEvents(): TelemetryEvent[] {
    if (!existsSync(this.filePath)) {
      return [];
    }
    return readFileSync(this.filePath, "utf-8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as TelemetryEvent);
  }

  clear(): void {
    if (existsSync(this.filePath)) {
      appendFileSync(this.filePath, "", { flag: "w" });
    }
  }
}
