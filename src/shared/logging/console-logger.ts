import type { LogEntry, LogFields, LogLevel, Logger } from "./types.js";
import { getRequestContext } from "./request-context.js";
import { getBuildInfo } from "./build-info.js";

const LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

export type ConsoleLoggerOptions = {
  /** production → JSON lines; development → human-readable */
  format?: "json" | "pretty";
  minLevel?: LogLevel;
  service?: string;
  base?: LogFields;
};

function resolveFormat(explicit?: "json" | "pretty"): "json" | "pretty" {
  if (explicit) return explicit;
  if (process.env.LOG_FORMAT === "json") return "json";
  if (process.env.LOG_FORMAT === "pretty") return "pretty";
  return process.env.NODE_ENV === "production" ? "json" : "pretty";
}

function resolveMinLevel(explicit?: LogLevel): LogLevel {
  const raw = (explicit ?? process.env.LOG_LEVEL ?? "info").toLowerCase();
  if (raw in LEVEL_ORDER) return raw as LogLevel;
  return "info";
}

function formatPretty(entry: LogEntry): string {
  const {
    timestamp,
    level,
    message,
    operation,
    correlationId,
    requestId,
    candidateId,
    durationMs,
    result,
    error,
    ...rest
  } = entry;
  const parts = [
    timestamp,
    level.padEnd(5),
    operation ? `[${operation}]` : "",
    message ?? "",
    result ? `result=${result}` : "",
    durationMs !== undefined ? `durationMs=${durationMs}` : "",
    correlationId ? `corr=${correlationId}` : "",
    requestId ? `req=${requestId}` : "",
    candidateId ? `candidate=${candidateId}` : "",
    error ? `error=${error}` : "",
  ].filter(Boolean);
  const extras = { ...rest };
  delete extras.service;
  const extraKeys = Object.keys(extras);
  const suffix =
    extraKeys.length > 0
      ? ` ${JSON.stringify(Object.fromEntries(extraKeys.map((k) => [k, extras[k]])))}`
      : "";
  return parts.join(" ") + suffix;
}

export class ConsoleLogger implements Logger {
  private readonly format: "json" | "pretty";
  private readonly minLevel: LogLevel;
  private readonly service: string;
  private readonly base: LogFields;

  constructor(options: ConsoleLoggerOptions = {}) {
    this.format = resolveFormat(options.format);
    this.minLevel = resolveMinLevel(options.minLevel);
    this.service = options.service ?? getBuildInfo().service;
    this.base = options.base ?? {};
  }

  child(fields: LogFields): Logger {
    return new ConsoleLogger({
      format: this.format,
      minLevel: this.minLevel,
      service: this.service,
      base: { ...this.base, ...fields },
    });
  }

  trace(message: string, fields?: LogFields): void {
    this.write("trace", message, fields);
  }
  debug(message: string, fields?: LogFields): void {
    this.write("debug", message, fields);
  }
  info(message: string, fields?: LogFields): void {
    this.write("info", message, fields);
  }
  warn(message: string, fields?: LogFields): void {
    this.write("warn", message, fields);
  }
  error(message: string, fields?: LogFields): void {
    this.write("error", message, fields);
  }

  async flush(): Promise<void> {
    // console is synchronous
  }

  private write(level: LogLevel, message: string, fields?: LogFields): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return;
    const ctx = getRequestContext();
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase() as Uppercase<LogLevel>,
      service: this.service,
      message,
      ...this.base,
      ...(ctx
        ? {
            correlationId: ctx.correlationId,
            requestId: ctx.requestId,
            candidateId: ctx.candidateId,
            operation: ctx.operation,
          }
        : {}),
      ...fields,
    };

    const line = this.format === "json" ? JSON.stringify(entry) : formatPretty(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }
}
