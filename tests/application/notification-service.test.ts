import { describe, expect, it } from "vitest";
import { ActorRegistry } from "../../src/modules/authorization/application/actor-registry.js";
import { NotificationService } from "../../src/modules/notification/application/notification-service.js";
import { InMemoryNotificationRepository } from "../../src/modules/notification/infrastructure/notification-repository.js";
import { SystemClock } from "../../src/shared/clock/index.js";
import { UuidIdGenerator } from "../../src/shared/id-generator/index.js";

describe("EPIC-010 NotificationService", () => {
  function makeService() {
    const repository = new InMemoryNotificationRepository();
    const service = new NotificationService({
      clock: new SystemClock(),
      idGenerator: new UuidIdGenerator(),
      repository,
      actors: new ActorRegistry(),
    });
    return { service, repository };
  }

  it("creates assignment notification for known assignee", async () => {
    const { service } = makeService();
    await service.onAssignment({
      assigneeId: "recruiter_beta",
      relationshipId: "rel_1",
      candidateId: "c1",
      jobId: "j1",
      actorId: "recruiter_alpha",
    });
    const feed = await service.listForActor("recruiter_beta");
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]?.type).toBe("assignment");
    expect(feed.items[0]?.readAt).toBeNull();
  });

  it("mark read only changes readAt (immutability)", async () => {
    const { service } = makeService();
    await service.onAssignment({
      assigneeId: "recruiter_beta",
      relationshipId: "rel_1",
      candidateId: "c1",
      jobId: "j1",
    });
    const before = (await service.listForActor("recruiter_beta")).items[0]!;
    const after = await service.markRead(before.id, "recruiter_beta");
    expect(after.readAt).toBeTruthy();
    expect(after.type).toBe(before.type);
    expect(after.title).toBe(before.title);
    expect(after.body).toBe(before.body);
    expect(after.createdAt).toBe(before.createdAt);
    expect(after.source).toEqual(before.source);
    expect(after.recipientId).toBe(before.recipientId);
  });

  it("parses mentions against Actor Registry only", async () => {
    const { service } = makeService();
    const { note, mentionNotifications } = await service.createNote({
      body: "Hey @recruiter_beta and @ghost_user please review",
      authorId: "recruiter_alpha",
      relationshipId: "rel_1",
    });
    expect(note.mentionedActorIds).toEqual(["recruiter_beta"]);
    expect(mentionNotifications).toBe(1);
    const feed = await service.listForActor("recruiter_beta");
    expect(feed.items[0]?.type).toBe("mention");
  });

  it("skips automation.completed for noop results", async () => {
    const { service } = makeService();
    await service.onAutomationCompleted({
      actionId: "a1",
      actionType: "assign",
      actorId: "recruiter_alpha",
      executedAt: new Date().toISOString(),
      success: true,
      error: null,
      target: { relationshipId: "rel_1" },
      noop: true,
    });
    const feed = await service.listForActor("recruiter_alpha");
    expect(feed.items).toHaveLength(0);
  });
});
