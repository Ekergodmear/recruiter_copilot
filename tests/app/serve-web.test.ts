import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Fastify from "fastify";
import { registerWebSpa } from "../../src/app/serve-web.js";

describe("registerWebSpa", () => {
  let root: string | undefined;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = undefined;
    }
    delete process.env.WEB_STATIC_DIR;
  });

  it("returns false when dist/web is missing", async () => {
    const app = Fastify();
    const registered = await registerWebSpa(app, join(tmpdir(), "missing-web-spa"));
    expect(registered).toBe(false);
    await app.close();
  });

  it("serves index.html at / and keeps API 404 as JSON", async () => {
    root = mkdtempSync(join(tmpdir(), "web-spa-"));
    writeFileSync(join(root, "index.html"), "<!doctype html><title>RecruiterSup</title>");
    process.env.WEB_STATIC_DIR = root;

    const app = Fastify();
    app.get("/api/v1/ping", async () => ({ ok: true }));
    expect(await registerWebSpa(app, root)).toBe(true);

    const home = await app.inject({ method: "GET", url: "/" });
    expect(home.statusCode).toBe(200);
    expect(home.headers["content-type"]).toMatch(/text\/html/);
    expect(home.body).toContain("RecruiterSup");

    const spa = await app.inject({ method: "GET", url: "/candidates" });
    expect(spa.statusCode).toBe(200);
    expect(spa.body).toContain("RecruiterSup");

    const missingApi = await app.inject({ method: "GET", url: "/api/v1/nope" });
    expect(missingApi.statusCode).toBe(404);
    expect(missingApi.json().error).toBe("Not Found");

    await app.close();
  });
});
