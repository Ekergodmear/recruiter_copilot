import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  ConsoleLogger,
  enterRequestContext,
  getRequestContext,
  withOperation,
} from "../../src/shared/logging/index.js";

describe("structured logging", () => {
  const logs: string[] = [];
  beforeEach(() => {
    logs.length = 0;
    vi.spyOn(console, "log").mockImplementation((line: string) => {
      logs.push(String(line));
    });
    vi.spyOn(console, "error").mockImplementation((line: string) => {
      logs.push(String(line));
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits JSON in json format with request context fields", () => {
    const logger = new ConsoleLogger({ format: "json", minLevel: "info" });
    enterRequestContext({
      requestId: "req_1",
      correlationId: "corr_1",
      candidateId: "cand_1",
    });
    logger.info("hello", { operation: "resume_import", result: "SUCCESS", durationMs: 12 });

    const entry = JSON.parse(logs[0]!);
    expect(entry.level).toBe("INFO");
    expect(entry.operation).toBe("resume_import");
    expect(entry.correlationId).toBe("corr_1");
    expect(entry.requestId).toBe("req_1");
    expect(entry.candidateId).toBe("cand_1");
    expect(entry.durationMs).toBe(12);
    expect(entry.result).toBe("SUCCESS");
    expect(entry.timestamp).toBeTruthy();
    expect(entry.service).toBeTruthy();
  });

  it("withOperation records duration and result", async () => {
    const logger = new ConsoleLogger({ format: "json", minLevel: "info" });
    const value = await withOperation(logger, "verify:data", async () => 42);
    expect(value).toBe(42);
    const entry = JSON.parse(logs[0]!);
    expect(entry.operation).toBe("verify:data");
    expect(entry.result).toBe("SUCCESS");
    expect(typeof entry.durationMs).toBe("number");
  });

  it("propagates request context via enterWith", () => {
    enterRequestContext({ requestId: "r", correlationId: "c" });
    expect(getRequestContext()?.correlationId).toBe("c");
  });
});
