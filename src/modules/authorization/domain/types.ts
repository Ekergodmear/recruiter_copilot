/**
 * EPIC-009 — Administration & Authorization (platform RBAC).
 * Governs execution; does not own business rules.
 */

export type Role = "Admin" | "Recruiter" | "Viewer";

export const ROLES: Role[] = ["Admin", "Recruiter", "Viewer"];

export type Permission =
  | "candidate.read"
  | "candidate.write"
  | "job.read"
  | "job.write"
  | "relationship.read"
  | "relationship.write"
  | "workflow.execute"
  | "automation.execute"
  | "analytics.read"
  | "copilot.use"
  | "matching.read"
  | "admin.manage"
  | "notification.read"
  | "notification.write";

export const PERMISSIONS: Permission[] = [
  "candidate.read",
  "candidate.write",
  "job.read",
  "job.write",
  "relationship.read",
  "relationship.write",
  "workflow.execute",
  "automation.execute",
  "analytics.read",
  "copilot.use",
  "matching.read",
  "admin.manage",
  "notification.read",
  "notification.write",
];

/** Fixed Role → Permissions map (MVP — not user-editable). */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  Admin: [...PERMISSIONS],
  Recruiter: [
    "candidate.read",
    "candidate.write",
    "job.read",
    "job.write",
    "relationship.read",
    "relationship.write",
    "workflow.execute",
    "automation.execute",
    "analytics.read",
    "copilot.use",
    "matching.read",
    "notification.read",
    "notification.write",
  ],
  Viewer: [
    "candidate.read",
    "job.read",
    "relationship.read",
    "analytics.read",
    "copilot.use",
    "matching.read",
    "notification.read",
  ],
};

export type AuthorizeDecision =
  | { allowed: true; actorId: string; role: Role; permission: Permission }
  | {
      allowed: false;
      actorId: string;
      role: Role | null;
      permission: string;
      code: "FORBIDDEN" | "UNKNOWN_PERMISSION" | "UNKNOWN_ACTOR";
      message: string;
    };

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as string[]).includes(value);
}
