import type { FastifyInstance, FastifyError } from "fastify";
import type { AppConfig } from "../shared/config/index.js";
import {
  applySecurityHeaders,
  assertResourceId,
  InMemoryRateLimiter,
  SecurityError,
} from "../shared/security/index.js";
import { enterRequestContext, getLogger, type Logger } from "../shared/logging/index.js";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function registerSecurityPlugin(
  app: FastifyInstance,
  config: AppConfig,
  logger: Logger = getLogger(),
): void {
  const limiter = new InMemoryRateLimiter({
    enabled: config.rateLimitEnabled,
    windowMs: config.rateLimitWindowMs,
    maxRequests: config.rateLimitMax,
  });

  app.addHook("onRequest", async (request, reply) => {
    applySecurityHeaders(reply);

    const path = request.url.split("?")[0] ?? request.url;
    if (path === "/health" || path.startsWith("/health")) return;

    if (!MUTATING.has(request.method)) return;

    const ip =
      (typeof request.headers["x-forwarded-for"] === "string"
        ? request.headers["x-forwarded-for"].split(",")[0]?.trim()
        : undefined) ||
      request.ip ||
      "unknown";

    const result = limiter.check(ip);
    reply.header("X-RateLimit-Limit", String(config.rateLimitMax));
    reply.header("X-RateLimit-Remaining", String(result.remaining));
    if (result.limited) {
      reply.header("Retry-After", String(result.retryAfterSec));
      logger.warn("rate limit exceeded", {
        operation: "rate_limit",
        result: "FAILURE",
        ip,
      });
      return reply.status(429).send({
        error: "RATE_LIMITED",
        message: "Too many requests",
      });
    }
  });

  app.addHook("preHandler", async (request, reply) => {
    const params = request.params as Record<string, unknown> | undefined;
    if (!params) return;
    for (const [key, value] of Object.entries(params)) {
      if (key === "id" || key.endsWith("Id") || key === "candidateId" || key === "jobId") {
        if (typeof value !== "string") {
          return reply.status(400).send({ error: "INVALID_ID", message: `Invalid ${key}` });
        }
        try {
          assertResourceId(value, key);
        } catch (err) {
          if (err instanceof SecurityError) {
            return reply.status(err.statusCode).send({ error: err.code, message: err.message });
          }
          throw err;
        }
      }
    }
  });

  // Harden public error responses — details stay in structured logs only.
  app.setErrorHandler((error: FastifyError | SecurityError, request, reply) => {
    if (reply.sent) return;

    enterRequestContext({
      requestId: request.requestId ?? "unknown",
      correlationId: request.correlationId ?? "unknown",
    });

    if (error instanceof SecurityError) {
      return reply.status(error.statusCode).send({ error: error.code, message: error.message });
    }

    const statusCode =
      "statusCode" in error && typeof error.statusCode === "number" && error.statusCode >= 400
        ? error.statusCode
        : 500;

    const code =
      statusCode >= 500
        ? "INTERNAL_ERROR"
        : ("code" in error && typeof error.code === "string" && error.code) || "REQUEST_ERROR";

    logger.error("unhandled error", {
      operation: `${request.method} ${request.routeOptions?.url ?? request.url}`,
      result: "FAILURE",
      requestId: request.requestId,
      correlationId: request.correlationId,
      error: error.message,
      stack: error.stack,
      statusCode,
    });

    const clientMessage =
      statusCode >= 500
        ? "Internal Server Error"
        : sanitizeClientMessage(error.message) || "Bad Request";

    void reply.status(statusCode).send({
      error: code,
      message: clientMessage,
    });
  });
}

function sanitizeClientMessage(message: string): string {
  // Strip filesystem / stack-ish leakage from rare 4xx framework messages.
  if (/[/\\].+\.(ts|js|node_modules)/i.test(message)) return "Bad Request";
  if (/at\s+\S+\s+\(/i.test(message)) return "Bad Request";
  return message.slice(0, 200);
}
