import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app/server.js";

describe("health endpoint", () => {
  it("returns ok with feature flags", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.sprint).toBe("1");
    expect(body.feature_flags["ai.parsing.enabled"]).toBe(true);
  });
});
