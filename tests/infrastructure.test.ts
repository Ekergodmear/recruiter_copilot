import { describe, expect, it } from "vitest";
import { SystemClock } from "../src/shared/clock/index.js";
import {
  loadFeatureFlagsFile,
  resolveFeatureFlags,
  isEnabled,
} from "../src/shared/feature-flags/index.js";
import {
  computeHumanOverrideRate,
  createTelemetryEvent,
  validateTelemetryEvent,
  TelemetryRecorder,
} from "../src/shared/telemetry/index.js";
import { validateAgainstContract } from "../src/shared/contracts/validator.js";

const clock = new SystemClock();

describe("feature flags", () => {
  it("loads sprint-1 flags with defaults", () => {
    const file = loadFeatureFlagsFile("feature-flags/sprint-1.yaml");
    const flags = resolveFeatureFlags(file);

    expect(isEnabled(flags, "ai.parsing.enabled")).toBe(true);
    expect(isEnabled(flags, "ai.duplicate_detection.enabled")).toBe(false);
  });

  it("applies overrides", () => {
    const file = loadFeatureFlagsFile("feature-flags/sprint-1.yaml");
    const flags = resolveFeatureFlags(file, { "ai.parsing.enabled": false });

    expect(isEnabled(flags, "ai.parsing.enabled")).toBe(false);
  });
});

describe("telemetry", () => {
  it("validates required fields", () => {
    const event = createTelemetryEvent(
      {
        event_type: "inference_completed",
        contract_id: "KC-001",
        trace_id: "trace-1",
        model_id: "mock",
        provider_id: "mock-knowledge-extraction",
        latency_ms: 1200,
        outcome: "accepted",
        confidence_avg: 0.9,
      },
      clock,
    );

    expect(validateTelemetryEvent(event)).toBe(true);
  });

  it("records events via TelemetryRecorder", () => {
    const recorder = new TelemetryRecorder();
    recorder.record(
      createTelemetryEvent(
        {
          event_type: "inference_started",
          contract_id: "KC-001",
          trace_id: "trace-2",
          model_id: "mock",
          provider_id: "mock-knowledge-extraction",
          latency_ms: 0,
        },
        clock,
      ),
    );

    expect(recorder.getEvents()).toHaveLength(1);
  });

  it("computes human override rate", () => {
    expect(computeHumanOverrideRate(20, 2)).toBe(0.1);
    expect(computeHumanOverrideRate(0, 0)).toBe(0);
  });
});

describe("contract validator", () => {
  it("validates KC-001 fixture", async () => {
    const fixture = await import("../fixtures/KC-001-sample-output.json", {
      with: { type: "json" },
    });
    const result = validateAgainstContract("KC-001", fixture.default);
    expect(result.valid).toBe(true);
  });

  it("validates KC-002 fixture", async () => {
    const fixture = await import("../fixtures/KC-002-sample-output.json", {
      with: { type: "json" },
    });
    const result = validateAgainstContract("KC-002", fixture.default);
    expect(result.valid).toBe(true);
  });
});
