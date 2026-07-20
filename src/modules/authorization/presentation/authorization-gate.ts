import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AuthorizationService } from "../application/authorization-service.js";
import type { Permission } from "../domain/types.js";
import { resolveActorId } from "./resolve-actor.js";

type RouteRule = {
  method: string;
  /** Path without query; supports :param segments */
  path: string;
  permission: Permission;
};

/**
 * Minimum Spec wire-through surfaces (EPIC-009).
 * Paths use Fastify-style :params.
 */
export const AUTHORIZED_ROUTES: RouteRule[] = [
  // Candidates
  { method: "GET", path: "/api/v1/candidates", permission: "candidate.read" },
  { method: "GET", path: "/api/v1/candidates/:id", permission: "candidate.read" },
  { method: "GET", path: "/api/v1/candidates/:id/resume", permission: "candidate.read" },
  { method: "GET", path: "/api/v1/candidates/:id/resume/content", permission: "candidate.read" },
  { method: "GET", path: "/api/v1/candidates/:id/review", permission: "candidate.read" },
  { method: "GET", path: "/api/v1/candidates/:id/review/ui", permission: "candidate.read" },
  { method: "PATCH", path: "/api/v1/candidates/:id", permission: "candidate.write" },
  { method: "POST", path: "/api/v1/candidates/import-resume", permission: "candidate.write" },
  { method: "POST", path: "/api/v1/ingestion/jobs", permission: "candidate.write" },
  { method: "POST", path: "/api/v1/ingestion/jobs/:id/confirm", permission: "candidate.write" },
  { method: "GET", path: "/api/v1/ingestion/jobs", permission: "candidate.read" },
  { method: "GET", path: "/api/v1/ingestion/jobs/:id", permission: "candidate.read" },
  {
    method: "POST",
    path: "/api/v1/candidates/:id/knowledge/review",
    permission: "candidate.write",
  },
  { method: "PATCH", path: "/api/v1/candidates/:id/knowledge", permission: "candidate.write" },
  {
    method: "POST",
    path: "/api/v1/candidates/:id/knowledge/verify",
    permission: "candidate.write",
  },
  { method: "POST", path: "/api/v1/candidates/:id/mark-ready", permission: "candidate.write" },

  // Jobs
  { method: "GET", path: "/api/v1/jobs", permission: "job.read" },
  { method: "GET", path: "/api/v1/jobs/:id", permission: "job.read" },
  { method: "GET", path: "/api/v1/jobs/:id/review", permission: "job.read" },
  { method: "GET", path: "/api/v1/jobs/:id/matches", permission: "job.read" },
  { method: "GET", path: "/api/v1/jobs/:id/submissions", permission: "job.read" },
  { method: "GET", path: "/api/v1/jobs/:id/pipeline", permission: "job.read" },
  { method: "GET", path: "/api/v1/jobs/:id/activities", permission: "job.read" },
  { method: "POST", path: "/api/v1/jobs", permission: "job.write" },
  { method: "PATCH", path: "/api/v1/jobs/:id", permission: "job.write" },
  { method: "DELETE", path: "/api/v1/jobs/:id", permission: "job.write" },
  { method: "POST", path: "/api/v1/jobs/:id/review", permission: "job.write" },
  { method: "POST", path: "/api/v1/jobs/:id/mark-ready", permission: "job.write" },
  { method: "POST", path: "/api/v1/jobs/:id/submissions", permission: "job.write" },

  // Relationships / Workflow
  { method: "GET", path: "/api/v1/relationships/:id", permission: "relationship.read" },
  { method: "GET", path: "/api/v1/candidates/:id/relationships", permission: "relationship.read" },
  { method: "GET", path: "/api/v1/jobs/:id/relationships", permission: "relationship.read" },
  { method: "POST", path: "/api/v1/relationships", permission: "relationship.write" },
  { method: "PATCH", path: "/api/v1/relationships/:id", permission: "workflow.execute" },

  // Matching / Copilot / Analytics / Automation
  { method: "GET", path: "/api/v1/matching", permission: "matching.read" },
  { method: "POST", path: "/api/v1/copilot/explain-match", permission: "copilot.use" },
  { method: "POST", path: "/api/v1/copilot/summarize-candidate", permission: "copilot.use" },
  { method: "POST", path: "/api/v1/copilot/summarize-job", permission: "copilot.use" },
  { method: "POST", path: "/api/v1/copilot/draft-outreach", permission: "copilot.use" },
  {
    method: "POST",
    path: "/api/v1/copilot/suggest-interview-questions",
    permission: "copilot.use",
  },
  { method: "GET", path: "/api/v1/analytics/overview", permission: "analytics.read" },
  { method: "GET", path: "/api/v1/analytics/jobs/:jobId", permission: "analytics.read" },
  { method: "POST", path: "/api/v1/automation/stage-move", permission: "automation.execute" },
  { method: "POST", path: "/api/v1/automation/send-outreach", permission: "automation.execute" },
  { method: "POST", path: "/api/v1/automation/assign", permission: "automation.execute" },

  // Notifications / Collaboration (EPIC-010)
  // Mark-read gated by notification.read so Viewer can clear inbox; mention-create needs write.
  { method: "GET", path: "/api/v1/notifications", permission: "notification.read" },
  { method: "POST", path: "/api/v1/notifications/:id/read", permission: "notification.read" },
  { method: "POST", path: "/api/v1/notifications/read-all", permission: "notification.read" },
  { method: "POST", path: "/api/v1/collaboration/notes", permission: "notification.write" },

  // Integrations (EPIC-011)
  { method: "GET", path: "/api/v1/integrations", permission: "integration.read" },
  { method: "GET", path: "/api/v1/integrations/:id", permission: "integration.read" },
  { method: "POST", path: "/api/v1/integrations", permission: "integration.execute" },
  { method: "PATCH", path: "/api/v1/integrations/:id", permission: "integration.execute" },
  {
    method: "POST",
    path: "/api/v1/integrations/:id/test-connection",
    permission: "integration.execute",
  },
  {
    method: "POST",
    path: "/api/v1/integrations/:id/import/preview",
    permission: "integration.read",
  },
  {
    method: "POST",
    path: "/api/v1/integrations/:id/import/execute",
    permission: "integration.execute",
  },
  {
    method: "POST",
    path: "/api/v1/integrations/:id/export/preview",
    permission: "integration.read",
  },
  {
    method: "POST",
    path: "/api/v1/integrations/:id/export/execute",
    permission: "integration.execute",
  },

  // Audit (EPIC-012) — read-only query; no public write routes
  { method: "GET", path: "/api/v1/audit", permission: "audit.read" },
  { method: "GET", path: "/api/v1/audit/:id", permission: "audit.read" },

  // Search (EPIC-013) — read composition + actor-owned saved query definitions
  { method: "GET", path: "/api/v1/search", permission: "search.read" },
  { method: "GET", path: "/api/v1/search/saved", permission: "search.read" },
  { method: "POST", path: "/api/v1/search/saved", permission: "search.read" },
  { method: "DELETE", path: "/api/v1/search/saved/:id", permission: "search.read" },

  // Reports (EPIC-014) — read-only overview + CSV export
  { method: "GET", path: "/api/v1/reports/overview", permission: "report.read" },
  { method: "GET", path: "/api/v1/reports/export", permission: "report.read" },
];

function pathToRegex(path: string): RegExp {
  const escaped = path
    .split("/")
    .map((seg) => (seg.startsWith(":") ? "[^/]+" : seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return new RegExp(`^${escaped}$`);
}

const COMPILED = AUTHORIZED_ROUTES.map((r) => ({
  method: r.method.toUpperCase(),
  regex: pathToRegex(r.path),
  permission: r.permission,
}));

export function matchRoutePermission(method: string, urlPath: string): Permission | null {
  const m = method.toUpperCase();
  for (const rule of COMPILED) {
    if (rule.method === m && rule.regex.test(urlPath)) {
      return rule.permission;
    }
  }
  return null;
}

/**
 * Gate Spec surfaces via AuthorizationService.
 * /health and unmapped /api routes are not forced here (Alpha telemetry etc.).
 * Unknown permission strings inside authorize() are still deny-by-default.
 */
export function registerAuthorizationGate(
  app: FastifyInstance,
  authorizationService: AuthorizationService,
): void {
  app.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
    const path = request.url.split("?")[0] ?? "";
    if (!path.startsWith("/api/v1/")) return;

    const permission = matchRoutePermission(request.method, path);
    if (!permission) return;

    const actorId = resolveActorId(request);
    const decision = authorizationService.authorize(actorId, permission);
    if (!decision.allowed) {
      return reply.status(403).send({
        error: {
          code: decision.code,
          message: decision.message,
        },
      });
    }

    (request as FastifyRequest & { actorId?: string }).actorId = actorId;
  });
}
