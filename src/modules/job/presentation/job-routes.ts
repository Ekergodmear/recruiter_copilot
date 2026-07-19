import type { FastifyInstance } from "fastify";
import type { Clock } from "../../../shared/clock/index.js";
import { JobService, JobServiceError } from "../application/job-service.js";
import {
  cleanupMultipartTemp,
  pickAllowedFields,
  sanitizeUploadFilename,
  SecurityError,
} from "../../../shared/security/index.js";

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function detectMimeType(filename: string, reported?: string): string {
  if (reported && reported !== "application/octet-stream") return reported;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? reported ?? "application/octet-stream";
}

export function registerJobRoutes(
  app: FastifyInstance,
  jobService: JobService,
  _clock: Clock,
  actorId = "recruiter_alpha",
): void {
  app.get("/api/v1/jobs", async (request) => {
    const query = request.query as {
      status?: string;
      q?: string;
      company?: string;
      location?: string;
      sort?: string;
    };
    const sort = query.sort === "created" || query.sort === "updated" ? query.sort : "updated";
    return jobService.list({ ...query, sort });
  });

  app.post("/api/v1/jobs", async (request, reply) => {
    try {
      const contentType = request.headers["content-type"] ?? "";
      if (contentType.includes("multipart/form-data")) {
        const data = await request.file();
        if (!data) {
          return reply.status(400).send({ error: "FILE_REQUIRED", message: "file is required" });
        }
        try {
          const buffer = await data.toBuffer();
          const fields = data.fields as Record<string, { value?: string } | undefined>;
          const company =
            typeof fields.company === "object" && fields.company?.value
              ? fields.company.value
              : undefined;
          const filename = sanitizeUploadFilename(data.filename);
          const job = await jobService.createFromFile({
            file: buffer,
            filename,
            mimeType: detectMimeType(filename, data.mimetype),
            actorId,
            company,
          });
          return reply.status(201).send({ ...job, reviewUrl: `/jobs/${job.id}/review` });
        } finally {
          await cleanupMultipartTemp(data as { filepath?: string });
        }
      }

      const body = pickAllowedFields<{
        text?: string;
        company?: string;
        title?: string;
        location?: string;
        employmentType?: string;
        salaryMin?: number | null;
        salaryMax?: number | null;
        currency?: string;
        status?: string;
        notes?: string;
        description?: string;
        requirements?: string;
        benefits?: string;
      }>(request.body, [
        "text",
        "company",
        "title",
        "location",
        "employmentType",
        "salaryMin",
        "salaryMax",
        "currency",
        "status",
        "notes",
        "description",
        "requirements",
        "benefits",
      ]);

      // EPIC-002 manual create: title + company without JD text
      if (body?.title?.trim() && !body?.text?.trim()) {
        const job = await jobService.createManual({
          actorId,
          title: body.title,
          company: body.company ?? "",
          location: body.location,
          employmentType: body.employmentType as
            "full_time" | "part_time" | "contract" | "internship" | "other" | undefined,
          salaryMin: body.salaryMin,
          salaryMax: body.salaryMax,
          currency: body.currency,
          status: body.status as "Draft" | "Open" | "Paused" | "Closed" | "Filled" | undefined,
          notes: body.notes,
          description: body.description,
          requirements: body.requirements,
          benefits: body.benefits,
        });
        return reply.status(201).send(job);
      }

      if (!body?.text?.trim()) {
        return reply.status(400).send({
          error: "TEXT_REQUIRED",
          message: "text, file, or manual title+company required",
        });
      }
      const job = await jobService.createFromText({
        text: body.text,
        actorId,
        company: body.company,
      });
      return reply.status(201).send({ ...job, reviewUrl: `/jobs/${job.id}/review` });
    } catch (error) {
      return sendJobError(reply, error);
    }
  });

  app.get("/api/v1/jobs/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return await jobService.getById(id);
    } catch (error) {
      return sendJobError(reply, error);
    }
  });

  app.patch("/api/v1/jobs/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      let body: Record<string, unknown>;
      try {
        body = pickAllowedFields(request.body, [
          "title",
          "company",
          "location",
          "employmentType",
          "salaryMin",
          "salaryMax",
          "currency",
          "status",
          "notes",
          "description",
          "responsibilities",
          "requirements",
          "benefits",
          "department",
          "experienceYears",
          "englishRequirement",
          "skills",
        ]);
      } catch (error) {
        if (error instanceof SecurityError) {
          return reply.status(error.statusCode).send({ error: error.code, message: error.message });
        }
        throw error;
      }
      return await jobService.update(id, body);
    } catch (error) {
      return sendJobError(reply, error);
    }
  });

  app.delete("/api/v1/jobs/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await jobService.softDelete(id);
      return reply.status(204).send();
    } catch (error) {
      return sendJobError(reply, error);
    }
  });

  app.get("/api/v1/jobs/:id/review", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const job = await jobService.getById(id);
      return jobService.getReviewView(job);
    } catch (error) {
      return sendJobError(reply, error);
    }
  });

  app.post("/api/v1/jobs/:id/review", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = pickAllowedFields<{
        field: string;
        action: "accept" | "edit" | "reject";
        humanValue?: string;
      }>(request.body, ["field", "action", "humanValue"]);
      const job = await jobService.reviewField({
        jobId: id,
        field: body.field,
        action: body.action,
        humanValue: body.humanValue,
        actorId,
      });
      return jobService.getReviewView(job);
    } catch (error) {
      return sendJobError(reply, error);
    }
  });

  app.post("/api/v1/jobs/:id/mark-ready", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const job = await jobService.markReady(id, actorId);
      return job;
    } catch (error) {
      return sendJobError(reply, error);
    }
  });

  app.get("/api/v1/jobs/:id/matches", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const items = await jobService.matchedCandidates(id);
      return { items, total: items.length };
    } catch (error) {
      return sendJobError(reply, error);
    }
  });

  app.get("/api/v1/jobs/:id/submissions", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      return await jobService.listSubmissions(id);
    } catch (error) {
      return sendJobError(reply, error);
    }
  });

  app.post("/api/v1/jobs/:id/submissions", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = pickAllowedFields<{ candidateId: string; notes?: string }>(request.body, [
        "candidateId",
        "notes",
      ]);
      if (!body?.candidateId) {
        return reply
          .status(400)
          .send({ error: "CANDIDATE_REQUIRED", message: "candidateId is required" });
      }
      const submission = await jobService.submitCandidate({
        jobId: id,
        candidateId: body.candidateId,
        actorId,
        notes: body.notes,
      });
      return reply.status(201).send(submission);
    } catch (error) {
      return sendJobError(reply, error);
    }
  });
}

function sendJobError(
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (error instanceof SecurityError) {
    return reply.status(error.statusCode).send({ error: error.code, message: error.message });
  }
  if (error instanceof JobServiceError) {
    const status =
      error.code === "NOT_FOUND" || error.code === "CANDIDATE_NOT_FOUND"
        ? 404
        : error.code === "UNSUPPORTED_FORMAT" ||
            error.code === "TEXT_REQUIRED" ||
            error.code === "INVALID_FIELD" ||
            error.code === "INVALID_BODY" ||
            error.code === "INVALID_STATUS" ||
            error.code === "CANDIDATE_NOT_READY" ||
            error.code === "ALREADY_SUBMITTED" ||
            error.code === "EMPTY_DOCUMENT"
          ? 400
          : 422;
    return reply.status(status).send({ error: error.code, message: error.message });
  }
  throw error;
}
