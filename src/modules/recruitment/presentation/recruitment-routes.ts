import type { FastifyInstance } from "fastify";
import { RecruitmentError, RecruitmentService } from "../application/recruitment-service.js";
import type { InterviewDecision, OfferStatus } from "../domain/types.js";
import type { SubmissionStatus } from "../../job/domain/types.js";
import { assertIsoDate, pickAllowedFields, SecurityError } from "../../../shared/security/index.js";

export function registerRecruitmentRoutes(
  app: FastifyInstance,
  recruitmentService: RecruitmentService,
  actorId = "recruiter_alpha",
): void {
  app.get("/api/v1/submissions", async (request) => {
    const query = request.query as {
      status?: string;
      recruiter?: string;
      jobId?: string;
      candidateId?: string;
      q?: string;
      from?: string;
      to?: string;
    };
    return recruitmentService.searchSubmissions(query);
  });

  app.get("/api/v1/submissions/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return await recruitmentService.getSubmissionDetail(id);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/api/v1/submissions/:id/status", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = pickAllowedFields<{ status: SubmissionStatus; notes?: string }>(request.body, [
        "status",
        "notes",
      ]);
      return await recruitmentService.updateStatus({
        submissionId: id,
        status: body.status,
        actorId,
        notes: body.notes,
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/submissions/:id/reject", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = pickAllowedFields<{ notes?: string }>(request.body, ["notes"]);
      return await recruitmentService.reject(id, actorId, body.notes);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/submissions/:id/withdraw", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = pickAllowedFields<{ notes?: string }>(request.body, ["notes"]);
      return await recruitmentService.withdraw(id, actorId, body.notes);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/submissions/:id/interviews", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = pickAllowedFields<{
        round?: number;
        type?: string;
        date: string;
        interviewer?: string;
        location?: string;
        meetingLink?: string;
      }>(request.body, ["round", "type", "date", "interviewer", "location", "meetingLink"]);
      if (!body?.date) {
        return reply.status(400).send({ error: "DATE_REQUIRED", message: "date is required" });
      }
      assertIsoDate(body.date, "date");
      const interview = await recruitmentService.scheduleInterview({
        submissionId: id,
        actorId,
        ...body,
      });
      return reply.status(201).send(interview);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/interviews/:id/complete", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = pickAllowedFields<{ decision: InterviewDecision; feedback?: string }>(
        request.body,
        ["decision", "feedback"],
      );
      return await recruitmentService.completeInterview({
        interviewId: id,
        actorId,
        decision: body.decision,
        feedback: body.feedback,
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/submissions/:id/offers", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = pickAllowedFields<{
        salary: string;
        startDate?: string;
        benefits?: string;
        notes?: string;
      }>(request.body, ["salary", "startDate", "benefits", "notes"]);
      if (!body?.salary?.trim()) {
        return reply.status(400).send({ error: "SALARY_REQUIRED", message: "salary is required" });
      }
      const offer = await recruitmentService.createOffer({
        submissionId: id,
        actorId,
        ...body,
      });
      return reply.status(201).send(offer);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/offers/:id/status", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = pickAllowedFields<{ status: OfferStatus }>(request.body, ["status"]);
      return await recruitmentService.updateOfferStatus({
        offerId: id,
        status: body.status,
        actorId,
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/submissions/:id/place", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return await recruitmentService.markPlaced(id, actorId);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/jobs/:id/pipeline", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return await recruitmentService.jobPipelineStats(id);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/jobs/:id/activities", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const items = await recruitmentService.jobTimeline(id);
      return { items, total: items.length };
    } catch (error) {
      return sendError(reply, error);
    }
  });
}

function sendError(
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (error instanceof SecurityError) {
    return reply.status(error.statusCode).send({ error: error.code, message: error.message });
  }
  if (error instanceof RecruitmentError) {
    const status =
      error.code === "NOT_FOUND" || error.code === "JOB_NOT_FOUND"
        ? 404
        : error.code === "ALREADY_PLACED"
          ? 409
          : 400;
    return reply.status(status).send({ error: error.code, message: error.message });
  }
  throw error;
}
