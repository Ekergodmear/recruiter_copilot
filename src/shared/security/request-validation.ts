import { SecurityError } from "./errors.js";

/** System IDs: `prefix_` + alphanumerics (UuidIdGenerator style). Not RFC UUID. */
const RESOURCE_ID = /^[a-z][a-z0-9]*_[a-zA-Z0-9]+$/;

export function assertResourceId(value: string, label = "id"): void {
  if (!value || typeof value !== "string") {
    throw new SecurityError("INVALID_ID", `Invalid ${label}`, 400);
  }
  if (value.includes("/") || value.includes("\\") || value.includes("..") || value.includes("\0")) {
    throw new SecurityError("INVALID_ID", `Invalid ${label}`, 400);
  }
  if (value.length > 128 || !RESOURCE_ID.test(value)) {
    throw new SecurityError("INVALID_ID", `Invalid ${label}`, 400);
  }
}

/**
 * Reject unexpected JSON fields — keep API shape, only allow listed keys.
 */
export function pickAllowedFields<T extends Record<string, unknown>>(
  body: unknown,
  allowed: readonly string[],
): T {
  if (body === undefined || body === null) {
    return {} as T;
  }
  if (typeof body !== "object" || Array.isArray(body)) {
    throw new SecurityError("INVALID_BODY", "JSON object required", 400);
  }
  const input = body as Record<string, unknown>;
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(input).filter((k) => !allowedSet.has(k));
  if (unexpected.length > 0) {
    throw new SecurityError(
      "UNEXPECTED_FIELD",
      `Unexpected field(s): ${unexpected.slice(0, 5).join(", ")}`,
      400,
    );
  }
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in input) out[key] = input[key];
  }
  return out as T;
}

export function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SecurityError("INVALID_BODY", `${field} is required`, 400);
  }
  return value;
}

export function assertEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new SecurityError("INVALID_BODY", `Invalid ${field}`, 400);
  }
  return value as T;
}

export function assertIsoDate(value: unknown, field: string): string {
  const s = assertNonEmptyString(value, field);
  const t = Date.parse(s);
  if (!Number.isFinite(t)) {
    throw new SecurityError("INVALID_BODY", `Invalid ${field} date`, 400);
  }
  return s;
}
