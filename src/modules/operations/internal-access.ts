import type { FastifyRequest } from "fastify";
import type { AppConfig } from "../../shared/config/index.js";

function isLoopback(ip: string): boolean {
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

export function isOperationsDashboardEnabled(config: AppConfig): boolean {
  return config.operationsDashboardEnabled;
}

export function assertInternalOperationsAccess(request: FastifyRequest, config: AppConfig): void {
  if (!config.operationsDashboardEnabled) {
    throw Object.assign(new Error("Not found"), { statusCode: 404 });
  }

  if (config.nodeEnv === "production" && config.operationsDashboardLocalhostOnly) {
    const ip = request.ip;
    if (!isLoopback(ip)) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    }
  }
}
