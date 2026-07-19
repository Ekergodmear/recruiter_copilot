import type { Clock } from "../../../shared/clock/index.js";
import type { IdGenerator } from "../../../shared/id-generator/index.js";
import type { ActorRegistry } from "../../authorization/application/actor-registry.js";
import type { ActionResult } from "../../automation/domain/types.js";
import type { CollaborationNote, Notification } from "../domain/types.js";
import type { NotificationRepository } from "../infrastructure/notification-repository.js";
import { extractMentionedActorIds } from "./mention-parser.js";

export class NotificationServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "NotificationServiceError";
  }
}

/**
 * EPIC-010 — consume capability outcomes; inform users; never execute actions.
 */
export class NotificationService {
  constructor(
    private readonly deps: {
      clock: Clock;
      idGenerator: IdGenerator;
      repository: NotificationRepository;
      actors: ActorRegistry;
    },
  ) {}

  async listForActor(
    recipientId: string,
    filter?: "unread" | "read" | "all",
  ): Promise<{ items: Notification[]; unreadCount: number }> {
    const all = await this.deps.repository.listByRecipient(recipientId);
    const unreadCount = all.filter((n) => n.readAt == null).length;
    const items =
      filter === "unread"
        ? all.filter((n) => n.readAt == null)
        : filter === "read"
          ? all.filter((n) => n.readAt != null)
          : all;
    return { items, unreadCount };
  }

  async markRead(id: string, recipientId: string): Promise<Notification> {
    const before = await this.deps.repository.findById(id);
    if (!before || before.recipientId !== recipientId) {
      throw new NotificationServiceError("NOT_FOUND", "Notification not found");
    }
    const readAt = this.deps.clock.nowIso();
    const after = await this.deps.repository.markRead(id, recipientId, readAt);
    if (!after) {
      throw new NotificationServiceError("NOT_FOUND", "Notification not found");
    }
    // AC-3b — content immutability
    if (
      after.type !== before.type ||
      after.title !== before.title ||
      after.body !== before.body ||
      after.createdAt !== before.createdAt ||
      after.recipientId !== before.recipientId ||
      JSON.stringify(after.source) !== JSON.stringify(before.source)
    ) {
      throw new NotificationServiceError("IMMUTABLE_VIOLATION", "Notification content changed");
    }
    return after;
  }

  async markAllRead(recipientId: string): Promise<{ marked: number }> {
    const marked = await this.deps.repository.markAllRead(recipientId, this.deps.clock.nowIso());
    return { marked };
  }

  /** Fan-out after Relationship assign (changed only). */
  async onAssignment(params: {
    assigneeId: string;
    relationshipId: string;
    candidateId: string;
    jobId: string;
    actorId?: string;
  }): Promise<void> {
    const recipientId = params.assigneeId.trim();
    if (!recipientId || !this.deps.actors.resolveRole(recipientId)) return;
    await this.create({
      recipientId,
      type: "assignment",
      title: "Candidate assigned to you",
      body: `Relationship ${params.relationshipId} was assigned to you.`,
      source: {
        capability: "assignment",
        relationshipId: params.relationshipId,
        candidateId: params.candidateId,
        jobId: params.jobId,
        actorId: params.actorId,
      },
    });
  }

  /** Fan-out after Workflow stage change (actual change only). */
  async onStageChanged(params: {
    relationshipId: string;
    candidateId: string;
    jobId: string;
    previousStage: string;
    newStage: string;
    assigneeId?: string | null;
    actorId?: string;
  }): Promise<void> {
    const recipientId = params.assigneeId?.trim();
    if (!recipientId || !this.deps.actors.resolveRole(recipientId)) return;
    await this.create({
      recipientId,
      type: "workflow.stage_changed",
      title: "Workflow stage changed",
      body: `Stage moved ${params.previousStage} → ${params.newStage}.`,
      source: {
        capability: "workflow",
        relationshipId: params.relationshipId,
        candidateId: params.candidateId,
        jobId: params.jobId,
        actorId: params.actorId,
      },
    });
  }

  /** Fan-out after successful Automation Action Result (!noop). */
  async onAutomationCompleted(result: ActionResult): Promise<void> {
    if (!result.success || result.noop) return;
    const recipientId = result.actorId.trim();
    if (!recipientId || !this.deps.actors.resolveRole(recipientId)) return;
    await this.create({
      recipientId,
      type: "automation.completed",
      title: "Automation completed",
      body: `Action ${result.actionType} completed successfully.`,
      source: {
        capability: "automation",
        relationshipId: result.target.relationshipId,
        candidateId: result.target.candidateId,
        jobId: result.target.jobId,
        actionId: result.actionId,
        actorId: result.actorId,
      },
    });
  }

  /**
   * Thin collaboration note + mention fan-out.
   * Does not execute Workflow/Automation.
   */
  async createNote(params: {
    body: string;
    authorId: string;
    relationshipId?: string;
    candidateId?: string;
  }): Promise<{ note: CollaborationNote; mentionNotifications: number }> {
    const body = params.body?.trim() ?? "";
    if (!body) {
      throw new NotificationServiceError("INVALID_BODY", "body is required");
    }
    const authorId = params.authorId.trim();
    if (!authorId || !this.deps.actors.resolveRole(authorId)) {
      throw new NotificationServiceError("UNKNOWN_ACTOR", "authorId is not a known actor");
    }

    const mentioned = extractMentionedActorIds(body, this.deps.actors).filter(
      (id) => id !== authorId,
    );
    const note: CollaborationNote = {
      id: this.deps.idGenerator.generateId("note"),
      body,
      authorId,
      createdAt: this.deps.clock.nowIso(),
      relationshipId: params.relationshipId?.trim() || undefined,
      candidateId: params.candidateId?.trim() || undefined,
      mentionedActorIds: mentioned,
    };
    await this.deps.repository.saveNote(note);

    let mentionNotifications = 0;
    for (const recipientId of mentioned) {
      await this.create({
        recipientId,
        type: "mention",
        title: "You were mentioned",
        body: `${authorId} mentioned you in a note.`,
        source: {
          capability: "collaboration",
          noteId: note.id,
          relationshipId: note.relationshipId,
          candidateId: note.candidateId,
          actorId: authorId,
        },
      });
      mentionNotifications += 1;
    }
    return { note, mentionNotifications };
  }

  private async create(params: {
    recipientId: string;
    type: Notification["type"];
    title: string;
    body: string;
    source: Notification["source"];
  }): Promise<Notification> {
    const notification: Notification = {
      id: this.deps.idGenerator.generateId("notif"),
      recipientId: params.recipientId,
      type: params.type,
      title: params.title,
      body: params.body,
      createdAt: this.deps.clock.nowIso(),
      readAt: null,
      source: params.source,
    };
    await this.deps.repository.append(notification);
    return notification;
  }
}
