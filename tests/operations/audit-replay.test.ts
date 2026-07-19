import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { AppConfig } from "../../src/shared/config/index.js";
import { createAppDependencies } from "../../src/app/server.js";
import { InMemoryTelemetryStore } from "../../src/shared/telemetry/index.js";
import { createTestDocx } from "../helpers/create-test-docx.js";

describe("AuditReplayService", () => {
  it("replays import → ready → submission → placement deterministically", async () => {
    const root = mkdtempSync(join(tmpdir(), "audit-replay-"));
    const config = AppConfig.fromEnv({
      ...process.env,
      STORAGE_PATH: join(root, "storage"),
      TELEMETRY_PATH: join(root, "t.jsonl"),
      DEFAULT_WORKSPACE_ID: "ws_audit",
      NODE_ENV: "development",
    });
    const deps = createAppDependencies(config, new InMemoryTelemetryStore());
    const docx = await createTestDocx([
      "Audit Replay Candidate",
      "audit@example.com",
      "TypeScript",
      "5 years of experience",
    ]);

    const imported = await deps.candidateImportService.importResume({
      file: docx,
      filename: "audit.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sourceType: "manual_upload",
      workspaceId: "ws_audit",
      actorId: "recruiter",
    });

    await deps.candidateEditService.getReview(imported.candidateId);
    await deps.candidateEditService.reviewKnowledge({
      candidateId: imported.candidateId,
      field: "summary",
      action: "accept",
      actorId: "recruiter",
    });
    await deps.candidateEditService.markCandidateReady({
      candidateId: imported.candidateId,
      actorId: "recruiter",
    });

    const job = await deps.jobService.createFromText({
      text: "Backend Engineer\nCompany: Test\nTypeScript Node.js\nEnglish B2\n5 years",
      company: "Test",
      actorId: "recruiter",
    });
    await deps.jobService.markReady(job.id, "recruiter");
    const submission = await deps.jobService.submitCandidate({
      jobId: job.id,
      candidateId: imported.candidateId,
      actorId: "recruiter",
    });
    const interview = await deps.recruitmentService.scheduleInterview({
      submissionId: submission.id,
      actorId: "recruiter",
      date: "2026-07-15T10:00:00.000Z",
    });
    await deps.recruitmentService.completeInterview({
      interviewId: interview.id,
      actorId: "recruiter",
      decision: "Passed",
    });
    const offer = await deps.recruitmentService.createOffer({
      submissionId: submission.id,
      actorId: "recruiter",
      salary: "1000",
    });
    await deps.recruitmentService.updateOfferStatus({
      offerId: offer.id,
      status: "Sent",
      actorId: "recruiter",
    });
    await deps.recruitmentService.updateOfferStatus({
      offerId: offer.id,
      status: "Accepted",
      actorId: "recruiter",
    });
    await deps.recruitmentService.markPlaced(submission.id, "recruiter");

    const a = await deps.auditReplayService.replay(imported.candidateId);
    const b = await deps.auditReplayService.replay(imported.candidateId);
    expect(a.steps.length).toBeGreaterThan(0);
    expect(JSON.stringify(a.steps)).toBe(JSON.stringify(b.steps));
    const kinds = a.steps.map((s) => s.kind);
    expect(kinds).toContain("import");
    expect(kinds).toContain("ready");
    expect(kinds).toContain("submission");
    expect(kinds).toContain("interview");
    expect(kinds).toContain("offer");
    expect(kinds).toContain("placement");
  });
});
