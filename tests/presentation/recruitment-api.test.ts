import { describe, expect, it, beforeEach } from "vitest";
import { buildApp, createAppDependencies } from "../../src/app/server.js";
import { AppConfig } from "../../src/shared/config/index.js";
import { InMemoryTelemetryStore } from "../../src/shared/telemetry/index.js";
import { createTestDocx } from "../helpers/create-test-docx.js";

describe("Recruitment Pipeline APIs", () => {
  let telemetry: InMemoryTelemetryStore;

  beforeEach(() => {
    telemetry = new InMemoryTelemetryStore();
  });

  it("runs submit → interview → offer → placement without Excel", async () => {
    const config = AppConfig.fromEnv({
      ...process.env,
      DEFAULT_WORKSPACE_ID: "ws_pipeline",
    });
    const deps = createAppDependencies(config, telemetry);
    const app = await buildApp(deps);

    const jobRes = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      payload: {
        text: `Frontend Developer
Company: Alpha
React TypeScript
English B2
5 years experience`,
        company: "Alpha",
      },
    });
    const jobId = jobRes.json().id;
    await app.inject({ method: "POST", url: `/api/v1/jobs/${jobId}/mark-ready` });

    const docx = await createTestDocx([
      "Jane Doe",
      "jane@example.com",
      "React",
      "TypeScript",
      "5 years of experience",
    ]);
    const imported = await deps.candidateImportService.importResume({
      file: docx,
      filename: "jane.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sourceType: "manual_upload",
      workspaceId: "ws_pipeline",
      actorId: "recruiter_alpha",
    });
    await deps.candidateEditService.markCandidateReady({
      candidateId: imported.candidateId,
      actorId: "recruiter_alpha",
    });

    const submit = await app.inject({
      method: "POST",
      url: `/api/v1/jobs/${jobId}/submissions`,
      payload: { candidateId: imported.candidateId },
    });
    expect(submit.statusCode).toBe(201);
    const submissionId = submit.json().id;

    const detail = await app.inject({
      method: "GET",
      url: `/api/v1/submissions/${submissionId}`,
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().activities.length).toBeGreaterThan(0);

    await app.inject({
      method: "PATCH",
      url: `/api/v1/submissions/${submissionId}/status`,
      payload: { status: "Client Reviewing" },
    });

    const interview = await app.inject({
      method: "POST",
      url: `/api/v1/submissions/${submissionId}/interviews`,
      payload: {
        date: "2026-07-15T10:00:00.000Z",
        type: "Technical",
        interviewer: "Hiring Manager",
      },
    });
    expect(interview.statusCode).toBe(201);
    const interviewId = interview.json().id;

    const completed = await app.inject({
      method: "POST",
      url: `/api/v1/interviews/${interviewId}/complete`,
      payload: { decision: "Passed", feedback: "Strong React" },
    });
    expect(completed.json().decision).toBe("Passed");

    const offer = await app.inject({
      method: "POST",
      url: `/api/v1/submissions/${submissionId}/offers`,
      payload: { salary: "USD 2000", startDate: "2026-08-01", benefits: "Health" },
    });
    expect(offer.statusCode).toBe(201);
    const offerId = offer.json().id;

    await app.inject({
      method: "POST",
      url: `/api/v1/offers/${offerId}/status`,
      payload: { status: "Sent" },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/offers/${offerId}/status`,
      payload: { status: "Accepted" },
    });

    const placed = await app.inject({
      method: "POST",
      url: `/api/v1/submissions/${submissionId}/place`,
    });
    expect(placed.statusCode).toBe(200);
    expect(placed.json().status).toBe("Placed");

    const job = await app.inject({ method: "GET", url: `/api/v1/jobs/${jobId}` });
    expect(job.json().placementCount).toBe(1);
    expect(job.json().status).toBe("Filled");

    const pipeline = await app.inject({
      method: "GET",
      url: `/api/v1/jobs/${jobId}/pipeline`,
    });
    expect(pipeline.json().placements).toBe(1);

    const search = await app.inject({
      method: "GET",
      url: "/api/v1/submissions?status=Placed&q=Jane",
    });
    expect(search.json().total).toBe(1);

    expect(telemetry.getEvents().some((e) => e.event_type === "submission_created")).toBe(true);
    expect(telemetry.getEvents().some((e) => e.event_type === "interview_created")).toBe(true);
    expect(telemetry.getEvents().some((e) => e.event_type === "interview_completed")).toBe(true);
    expect(telemetry.getEvents().some((e) => e.event_type === "offer_sent")).toBe(true);
    expect(telemetry.getEvents().some((e) => e.event_type === "offer_accepted")).toBe(true);
    expect(telemetry.getEvents().some((e) => e.event_type === "placement_created")).toBe(true);
  });
});
