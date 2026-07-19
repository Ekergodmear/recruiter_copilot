import { ConsoleLogger } from "./console-logger.js";
import type { Logger } from "./types.js";

export type { Logger, LogFields, LogLevel, LogEntry, LogResult } from "./types.js";
export { ConsoleLogger } from "./console-logger.js";
export {
  getRequestContext,
  enterRequestContext,
  runWithRequestContext,
  runWithRequestContextAsync,
  setRequestCandidateId,
  setRequestOperation,
  type RequestContextStore,
} from "./request-context.js";
export { getBuildInfo, type BuildInfo } from "./build-info.js";
export { withOperation } from "./operation.js";

let rootLogger: Logger | null = null;

export function createLogger(options?: ConstructorParameters<typeof ConsoleLogger>[0]): Logger {
  return new ConsoleLogger(options);
}

/** Process-wide logger (startup / shutdown / scripts). */
export function getLogger(): Logger {
  if (!rootLogger) rootLogger = createLogger();
  return rootLogger;
}

export function setLogger(logger: Logger): void {
  rootLogger = logger;
}
