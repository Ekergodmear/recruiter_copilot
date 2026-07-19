export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

export type LogResult = "SUCCESS" | "FAILURE" | "STARTED" | "SKIPPED" | string;

/** Structured fields shared by every log entry. */
export type LogFields = {
  service?: string;
  operation?: string;
  correlationId?: string;
  requestId?: string;
  candidateId?: string;
  durationMs?: number;
  result?: LogResult;
  error?: string;
  stack?: string;
  [key: string]: unknown;
};

export type LogEntry = LogFields & {
  timestamp: string;
  level: Uppercase<LogLevel>;
  message?: string;
};

export interface Logger {
  trace(message: string, fields?: LogFields): void;
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
  /** Optional flush for buffered sinks (console is sync — no-op). */
  flush(): Promise<void>;
}
