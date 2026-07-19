import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { InMemoryTelemetryStore } from "../../src/shared/telemetry/index.js";
import { createTestDocx } from "../helpers/create-test-docx.js";

describe("Knowledge Evolution API", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let telemetry: InMemoryTelemetryStore;

  beforeEach(async () => {
    const storagePath = mkdtempSync(join(tmpdir(), "know-api-"));
    telemetry = new InMemoryTelemetryStore();
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: storagePath,
      TELEMETRY_PATH: join(storagePath, "telemetry.jsonl"),
      DEFAULT_WORKSPACE_ID: "ws_know",
      GEMINI_API_KEY: "",
    });
    const deps = createAppDependencies(config, telemetry);
    app = await buildApp(deps);
  });

  async function importCandidate() {
    const docx = await createTestDocx([
      "Jane Doe",
      "jane@example.com",
      "React",
      "Node",
      "5 years of experience",
      "English B2",
    ]);
    const boundary = "----knowboundary";
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="jane.docx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`,
      ),
      docx,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/candidates/import-resume",
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });
    expect(res.statusCode).toBe(201);
    return res.json() as { candidateId: string };
  }

  it("seeds knowledge on import and evolves on review + evidence", async () => {
    const { candidateId } = await importCandidate();

    const knowledgeRes = await app.inject({
      method: "GET",
      url: `/api/v1/knowledge/${candidateId}`,
    });
    expect(knowledgeRes.statusCode).toBe(200);
    const knowledge = knowledgeRes.json() as {
      objects: Array<{
        id: string;
        field: string;
        originalValue: string;
        currentValue: string;
        revisionNumber: number;
        evidence: unknown[];
        analytics: { confidence: number; evidenceCount: number };
      }>;
    };
    expect(knowledge.objects.length).toBe(4);
    const english = knowledge.objects.find((o) => o.field === "english");
    expect(english).toBeTruthy();
    expect(english!.revisionNumber).toBe(0);
    expect(english!.evidence.length).toBeGreaterThanOrEqual(1);

    const reviewRes = await app.inject({
      method: "POST",
      url: `/api/v1/candidates/${candidateId}/knowledge/review`,
      payload: {
        field: "english",
        action: "edit",
        humanValue: "C1",
        reason: "Wrong English",
      },
    });
    expect(reviewRes.statusCode).toBe(200);

    const afterReview = await app.inject({
      method: "GET",
      url: `/api/v1/knowledge/${candidateId}`,
    });
    const afterBody = afterReview.json() as typeof knowledge & {
      timeline: Array<{ kind: string }>;
      objects: Array<{
        id: string;
        field: string;
        originalValue: string;
        currentValue: string;
        revisionNumber: number;
        confidenceHistory: Array<{ confidence: number }>;
        signals: Array<{ type: string }>;
      }>;
    };
    const eng = afterBody.objects.find((o) => o.field === "english")!;
    expect(eng.originalValue).not.toBe("");
    expect(eng.currentValue).toBe("C1");
    expect(eng.revisionNumber).toBeGreaterThanOrEqual(1);
    expect(eng.confidenceHistory.length).toBeGreaterThanOrEqual(2);
    expect(eng.signals.some((s) => s.type === "correct")).toBe(true);
    expect(afterBody.timeline.some((e) => e.kind === "current_truth")).toBe(true);

    const evidenceRes = await app.inject({
      method: "POST",
      url: `/api/v1/knowledge/${eng.id}/evidence`,
      payload: {
        source: "Interview",
        confidence: 0.95,
        note: "Fluent in interview",
      },
    });
    expect(evidenceRes.statusCode).toBe(201);

    const historyRes = await app.inject({
      method: "GET",
      url: `/api/v1/knowledge/${candidateId}/history`,
    });
    expect(historyRes.statusCode).toBe(200);
    const history = historyRes.json() as {
      timeline: unknown[];
      confidenceByField: Record<string, unknown[]>;
    };
    expect(history.timeline.length).toBeGreaterThan(0);
    expect(history.confidenceByField.english?.length).toBeGreaterThan(0);

    const eventTypes = telemetry.getEvents().map((e) => e.event_type);
    expect(eventTypes).toContain("knowledge_revision_created");
    expect(eventTypes).toContain("knowledge_signal_recorded");
    expect(eventTypes).toContain("knowledge_evidence_added");
  });
});
