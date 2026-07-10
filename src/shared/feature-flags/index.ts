import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";

export type FeatureFlagDefinition = {
  default: boolean;
  description: string;
};

export type FeatureFlagsFile = {
  version: string;
  sprint: number;
  flags: Record<string, FeatureFlagDefinition>;
};

export type FeatureFlags = Record<string, boolean>;

export function loadFeatureFlagsFile(path: string): FeatureFlagsFile {
  const content = readFileSync(resolve(path), "utf-8");
  const parsed = yaml.load(content) as FeatureFlagsFile;
  if (!parsed?.flags) {
    throw new Error(`Invalid feature flags file: ${path}`);
  }
  return parsed;
}

export function resolveFeatureFlags(
  file: FeatureFlagsFile,
  overrides: Record<string, boolean> = {},
): FeatureFlags {
  const resolved: FeatureFlags = {};
  for (const [key, def] of Object.entries(file.flags)) {
    resolved[key] = overrides[key] ?? def.default;
  }
  return resolved;
}

export function isEnabled(flags: FeatureFlags, key: string): boolean {
  return flags[key] === true;
}

export function getFeatureFlagsPath(): string {
  return process.env.FEATURE_FLAGS_FILE ?? "feature-flags/sprint-1.yaml";
}
