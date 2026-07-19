import type { FastifyInstance } from "fastify";
import { disconnectPrisma } from "../infrastructure/persistence/prisma/prisma-client.js";
import { getLogger, withOperation, type Logger } from "../shared/logging/index.js";

let registered = false;
let shuttingDown = false;

/**
 * SIGINT / SIGTERM → close HTTP → disconnect Prisma → flush logs → exit.
 */
export function registerGracefulShutdown(app: FastifyInstance, logger: Logger = getLogger()): void {
  if (registered) return;
  registered = true;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    try {
      await withOperation(logger, "shutdown", async () => {
        logger.info("shutdown signal received", {
          operation: "shutdown",
          result: "STARTED",
          signal,
        });
        await app.close();
        await disconnectPrisma();
        await logger.flush();
      });
      process.exit(0);
    } catch (err) {
      logger.error("shutdown failed", {
        operation: "shutdown",
        result: "FAILURE",
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      await logger.flush();
      process.exit(1);
    }
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}
