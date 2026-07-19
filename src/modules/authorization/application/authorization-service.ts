import {
  ROLE_PERMISSIONS,
  isPermission,
  type AuthorizeDecision,
  type Permission,
  type Role,
} from "../domain/types.js";
import type { ActorRegistry } from "./actor-registry.js";

/**
 * Central Allow/Deny evaluator.
 * Deny-by-default for unknown permissions and unknown actors.
 */
export class AuthorizationService {
  constructor(private readonly actors: ActorRegistry) {}

  authorize(
    actorId: string,
    permission: string,
    resource?: { type?: string; id?: string },
  ): AuthorizeDecision {
    // MVP is RBAC-only; resource reserved for future ABAC (out of scope).
    void resource;
    const id = actorId?.trim() ?? "";
    if (!id) {
      return {
        allowed: false,
        actorId: id,
        role: null,
        permission,
        code: "UNKNOWN_ACTOR",
        message: "actorId is required",
      };
    }

    if (!isPermission(permission)) {
      return {
        allowed: false,
        actorId: id,
        role: this.actors.resolveRole(id),
        permission,
        code: "UNKNOWN_PERMISSION",
        message: `Unknown permission: ${permission}`,
      };
    }

    const role = this.actors.resolveRole(id);
    if (!role) {
      return {
        allowed: false,
        actorId: id,
        role: null,
        permission,
        code: "UNKNOWN_ACTOR",
        message: `Unknown actor: ${id}`,
      };
    }

    const allowed = ROLE_PERMISSIONS[role].includes(permission as Permission);
    if (!allowed) {
      return {
        allowed: false,
        actorId: id,
        role,
        permission,
        code: "FORBIDDEN",
        message: `Role ${role} cannot ${permission}`,
      };
    }

    return {
      allowed: true,
      actorId: id,
      role,
      permission: permission as Permission,
    };
  }

  roleOf(actorId: string): Role | null {
    return this.actors.resolveRole(actorId);
  }
}
