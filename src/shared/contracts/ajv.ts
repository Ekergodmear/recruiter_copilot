import AjvPkg from "ajv";
import addFormatsPkg from "ajv-formats";
import type { ErrorObject, ValidateFunction } from "ajv";

type AjvConstructor = new (options?: object) => {
  compile: (schema: object) => ValidateFunction;
};

export function createAjv(options: object = { allErrors: true, strict: false }) {
  const Ajv = (AjvPkg as unknown as { default: AjvConstructor }).default;
  const addFormats = (
    addFormatsPkg as unknown as {
      default: (ajv: ReturnType<AjvConstructor["prototype"]["compile"]>) => void;
    }
  ).default;

  const ajv = new Ajv(options);
  addFormats(ajv as never);
  return ajv;
}

export type { ErrorObject, ValidateFunction };
