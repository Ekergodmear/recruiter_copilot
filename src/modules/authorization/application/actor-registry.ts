import type { Role } from "../domain/types.js";

/**
 * Alpha Actor Registry — actorId → Role.
 * No SSO/OIDC in EPIC-009; config map only.
 */
export class ActorRegistry {
  private readonly map: Map<string, Role>;

  constructor(entries?: Record<string, Role>) {
    this.map = new Map(
      Object.entries(
        entries ?? {
          admin_alpha: "Admin",
          recruiter_alpha: "Recruiter",
          recruiter_beta: "Recruiter",
          viewer_alpha: "Viewer",
        },
      ),
    );
  }

  resolveRole(actorId: string): Role | null {
    const id = actorId.trim();
    if (!id) return null;
    return this.map.get(id) ?? null;
  }

  list(): Array<{ actorId: string; role: Role }> {
    return [...this.map.entries()].map(([actorId, role]) => ({ actorId, role }));
  }
}
