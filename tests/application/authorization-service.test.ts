import { describe, expect, it } from "vitest";
import { ActorRegistry } from "../../src/modules/authorization/application/actor-registry.js";
import { AuthorizationService } from "../../src/modules/authorization/application/authorization-service.js";

describe("EPIC-009 AuthorizationService", () => {
  const authz = new AuthorizationService(new ActorRegistry());

  it("allows Recruiter to execute automation and write candidates", () => {
    expect(authz.authorize("recruiter_alpha", "automation.execute").allowed).toBe(true);
    expect(authz.authorize("recruiter_alpha", "candidate.write").allowed).toBe(true);
    expect(authz.authorize("recruiter_alpha", "admin.manage").allowed).toBe(false);
  });

  it("allows Viewer to read but denies automation and writes", () => {
    expect(authz.authorize("viewer_alpha", "analytics.read").allowed).toBe(true);
    expect(authz.authorize("viewer_alpha", "copilot.use").allowed).toBe(true);
    expect(authz.authorize("viewer_alpha", "notification.read").allowed).toBe(true);
    expect(authz.authorize("viewer_alpha", "notification.write").allowed).toBe(false);
    expect(authz.authorize("viewer_alpha", "integration.read").allowed).toBe(true);
    expect(authz.authorize("viewer_alpha", "integration.execute").allowed).toBe(false);
    expect(authz.authorize("viewer_alpha", "audit.read").allowed).toBe(false);
    expect(authz.authorize("recruiter_alpha", "audit.read").allowed).toBe(true);
    expect(authz.authorize("viewer_alpha", "automation.execute").allowed).toBe(false);
    expect(authz.authorize("viewer_alpha", "candidate.write").allowed).toBe(false);
  });

  it("allows Admin admin.manage", () => {
    expect(authz.authorize("admin_alpha", "admin.manage").allowed).toBe(true);
    expect(authz.authorize("admin_alpha", "automation.execute").allowed).toBe(true);
  });

  it("deny-by-default for unknown permission", () => {
    const decision = authz.authorize("recruiter_alpha", "not.a.real.permission");
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.code).toBe("UNKNOWN_PERMISSION");
    }
  });

  it("denies unknown actor", () => {
    const decision = authz.authorize("ghost_user", "candidate.read");
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.code).toBe("UNKNOWN_ACTOR");
    }
  });
});
