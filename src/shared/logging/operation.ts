import type { LogFields, Logger } from "./types.js";
import { setRequestOperation } from "./request-context.js";

/**
 * Time an async operation and emit a single structured log (STARTED optional via options).
 * No manual stopwatches — call sites wrap the work once.
 */
export async function withOperation<T>(
  logger: Logger,
  operation: string,
  fn: () => Promise<T>,
  fields?: LogFields & { logStart?: boolean },
): Promise<T> {
  const { logStart, ...rest } = fields ?? {};
  setRequestOperation(operation);
  if (logStart) {
    logger.info(`${operation} started`, { operation, result: "STARTED", ...rest });
  }
  const started = performance.now();
  try {
    const value = await fn();
    logger.info(`${operation} completed`, {
      operation,
      result: "SUCCESS",
      durationMs: Math.round(performance.now() - started),
      ...rest,
    });
    return value;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(`${operation} failed`, {
      operation,
      result: "FAILURE",
      durationMs: Math.round(performance.now() - started),
      error: error.message,
      stack: error.stack,
      ...rest,
    });
    throw err;
  }
}
