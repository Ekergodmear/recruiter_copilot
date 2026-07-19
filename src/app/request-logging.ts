import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import {
  enterRequestContext,
  getLogger,
  setRequestOperation,
  type Logger,
} from "../shared/logging/index.js";

declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
    correlationId: string;
  }
}

/**
 * Propagates requestId / correlationId via AsyncLocalStorage for the request lifecycle.
 * Unhandled errors → single structured log (no duplicates from this plugin).
 */
export function registerRequestLogging(app: FastifyInstance, logger: Logger = getLogger()): void {
  app.addHook("onRequest", async (request, reply) => {
    const requestId =
      (typeof request.headers["x-request-id"] === "string" && request.headers["x-request-id"]) ||
      randomUUID();
    const correlationId =
      (typeof request.headers["x-correlation-id"] === "string" &&
        request.headers["x-correlation-id"]) ||
      requestId;

    request.requestId = requestId;
    request.correlationId = correlationId;
    reply.header("x-request-id", requestId);
    reply.header("x-correlation-id", correlationId);

    enterRequestContext({
      requestId,
      correlationId,
      operation: `${request.method} ${request.url}`,
    });
  });

  app.addHook("preHandler", async (request) => {
    enterRequestContext({
      requestId: request.requestId,
      correlationId: request.correlationId,
      operation: `${request.method} ${request.routeOptions?.url ?? request.url}`,
    });
    setRequestOperation(`${request.method} ${request.routeOptions?.url ?? request.url}`);
  });

  app.addHook("onResponse", async (request, reply) => {
    enterRequestContext({
      requestId: request.requestId,
      correlationId: request.correlationId,
    });
    const op = `${request.method} ${request.routeOptions?.url ?? request.url}`;
    const fields = {
      operation: op,
      result: (reply.statusCode < 400 ? "SUCCESS" : "FAILURE") as "SUCCESS" | "FAILURE",
      durationMs: Math.round(reply.elapsedTime),
    };
    if (request.routeOptions?.url === "/health" || request.url.startsWith("/health")) {
      logger.debug("http request", fields);
      return;
    }
    logger.info("http request", fields);
  });

  // Error handler lives in security-plugin (single place — no stack leakage to clients).
}
