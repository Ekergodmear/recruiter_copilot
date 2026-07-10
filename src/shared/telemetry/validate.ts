import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAjv, type ErrorObject } from "../contracts/ajv.js";
import type { TelemetryEvent } from "./types.js";

const schemaPath = resolve("telemetry/schema.json");
const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));

const ajv = createAjv();
const validateSchema = ajv.compile(schema);

export function validateTelemetryEvent(event: unknown): event is TelemetryEvent {
  return validateSchema(event) as boolean;
}

export function formatValidationErrors(event: unknown): string {
  validateSchema(event);
  return (
    validateSchema.errors?.map((e: ErrorObject) => `${e.instancePath} ${e.message}`).join("; ") ??
    "invalid"
  );
}
