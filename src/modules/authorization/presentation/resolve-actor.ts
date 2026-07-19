import type { FastifyRequest } from "fastify";

/** Default Alpha actor when client omits identity (keeps existing tests green). */
export const DEFAULT_ACTOR_ID = "recruiter_alpha";

/**
 * Resolve actorId from header → body → query → default.
 * Header: x-actor-id
 */
export function resolveActorId(request: FastifyRequest): string {
  const header = request.headers["x-actor-id"];
  if (typeof header === "string" && header.trim()) {
    return header.trim();
  }
  if (Array.isArray(header) && header[0]?.trim()) {
    return header[0].trim();
  }

  const body = request.body as { actorId?: unknown } | undefined;
  if (body && typeof body.actorId === "string" && body.actorId.trim()) {
    return body.actorId.trim();
  }

  const query = request.query as { actorId?: unknown } | undefined;
  if (query && typeof query.actorId === "string" && query.actorId.trim()) {
    return query.actorId.trim();
  }

  return DEFAULT_ACTOR_ID;
}
