import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createAjv, type ErrorObject } from "./ajv.js";

const ajv = createAjv();

export type ValidationResult = {
  contractId: string;
  valid: boolean;
  errors: string[];
};

export function loadSchema(contractId: string, contractsDir = "contracts"): object {
  const path = resolve(contractsDir, `${contractId}-output.schema.json`);
  return JSON.parse(readFileSync(path, "utf-8")) as object;
}

export function validateAgainstContract(
  contractId: string,
  data: unknown,
  contractsDir = "contracts",
): ValidationResult {
  const schema = loadSchema(contractId, contractsDir);
  const validate = ajv.compile(schema);
  const valid = validate(data) as boolean;
  const errors =
    validate.errors?.map(
      (e: ErrorObject) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`,
    ) ?? [];

  return { contractId, valid, errors };
}

export function listContractSchemas(contractsDir = "contracts"): string[] {
  return readdirSync(resolve(contractsDir))
    .filter((f) => f.endsWith("-output.schema.json"))
    .map((f) => f.replace("-output.schema.json", ""));
}

export function validateAllFixtures(fixturesDir = "fixtures"): ValidationResult[] {
  const results: ValidationResult[] = [];
  const dir = resolve(fixturesDir);

  for (const contractId of listContractSchemas()) {
    const fixturePath = join(dir, `${contractId}-sample-output.json`);
    try {
      const data = JSON.parse(readFileSync(fixturePath, "utf-8")) as unknown;
      results.push(validateAgainstContract(contractId, data));
    } catch {
      results.push({
        contractId,
        valid: false,
        errors: [`Missing or invalid fixture: ${fixturePath}`],
      });
    }
  }

  return results;
}
