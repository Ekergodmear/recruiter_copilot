/**
 * EPIC-010 — Notifications & Collaboration (in-app only).
 * Informational records — do not execute actions or own business rules.
 */

export type NotificationType =
  "assignment" | "workflow.stage_changed" | "automation.completed" | "mention";

export type NotificationSource = {
  capability: "assignment" | "workflow" | "automation" | "collaboration";
  relationshipId?: string;
  candidateId?: string;
  jobId?: string;
  actionId?: string;
  noteId?: string;
  actorId?: string;
};

export type Notification = {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  /** Null while unread; set once when marked read. Content fields are immutable. */
  readAt: string | null;
  source: NotificationSource;
};

export type CollaborationNote = {
  id: string;
  body: string;
  authorId: string;
  createdAt: string;
  relationshipId?: string;
  candidateId?: string;
  mentionedActorIds: string[];
};
