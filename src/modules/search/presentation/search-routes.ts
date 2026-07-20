import type { FastifyInstance } from "fastify";
import { resolveActorId } from "../../authorization/presentation/resolve-actor.js";
import { SearchService, SearchServiceError } from "../application/search-service.js";
import type { SearchQuery } from "../domain/types.js";

/**
 * EPIC-013 — Search & Discovery API (read composition + actor-owned saved queries).
 * Does not mutate Candidate / Job / Workflow / Matching.
 */
export function registerSearchRoutes(app: FastifyInstance, searchService: SearchService): void {
  app.get("/api/v1/search", async (request, reply) => {
    try {
      const actorId = resolveActorId(request);
      const q = request.query as Record<string, string | undefined>;
      const query = parseSearchQuery(q);
      return reply.status(200).send(await searchService.search(actorId, query));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/search/saved", async (request, reply) => {
    try {
      const actorId = resolveActorId(request);
      return reply.status(200).send(await searchService.listSaved(actorId));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/search/saved", async (request, reply) => {
    try {
      const actorId = resolveActorId(request);
      const body = request.body as { name?: string; query?: SearchQuery };
      const saved = await searchService.saveSearch(actorId, {
        name: body.name ?? "",
        query: body.query ?? {},
      });
      return reply.status(201).send(saved);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.delete("/api/v1/search/saved/:id", async (request, reply) => {
    try {
      const actorId = resolveActorId(request);
      const { id } = request.params as { id: string };
      await searchService.deleteSaved(actorId, id);
      return reply.status(204).send();
    } catch (error) {
      return sendError(reply, error);
    }
  });
}

function parseSearchQuery(q: Record<string, string | undefined>): SearchQuery {
  const skillsRaw = q.skills;
  const skills = skillsRaw
    ? skillsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  return {
    q: q.q,
    type: q.type as SearchQuery["type"],
    skills,
    english: q.english,
    experienceMin: q.experienceMin != null ? Number(q.experienceMin) : undefined,
    salaryMin: q.salaryMin != null ? Number(q.salaryMin) : undefined,
    salaryMax: q.salaryMax != null ? Number(q.salaryMax) : undefined,
    jobStatus: q.jobStatus,
    stage: q.stage,
    jobId: q.jobId,
    minMatchScore: q.minMatchScore != null ? Number(q.minMatchScore) : undefined,
    limit: q.limit != null ? Number(q.limit) : undefined,
    offset: q.offset != null ? Number(q.offset) : undefined,
  };
}

function sendError(
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (error instanceof SearchServiceError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "FORBIDDEN" ||
            error.code === "UNKNOWN_ACTOR" ||
            error.code === "UNKNOWN_PERMISSION"
          ? 403
          : 400;
    return reply.status(status).send({ error: { code: error.code, message: error.message } });
  }
  throw error;
}
