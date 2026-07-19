import { readFileSync } from "node:fs";
import { join } from "node:path";

export type BuildInfo = {
  version: string;
  buildTimestamp: string | null;
  service: string;
};

let cached: BuildInfo | null = null;

export function getBuildInfo(): BuildInfo {
  if (cached) return cached;
  let version = process.env.APP_VERSION ?? "0.0.0";
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      name?: string;
      version?: string;
    };
    version = process.env.APP_VERSION ?? pkg.version ?? version;
    cached = {
      version,
      buildTimestamp: process.env.BUILD_TIMESTAMP ?? null,
      service: process.env.SERVICE_NAME ?? pkg.name ?? "recruiter-copilot",
    };
  } catch {
    cached = {
      version,
      buildTimestamp: process.env.BUILD_TIMESTAMP ?? null,
      service: process.env.SERVICE_NAME ?? "recruiter-copilot",
    };
  }
  return cached;
}
