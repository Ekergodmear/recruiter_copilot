import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { CollaborationNote, Notification } from "../domain/types.js";

export interface NotificationRepository {
  append(notification: Notification): Promise<void>;
  listByRecipient(recipientId: string): Promise<Notification[]>;
  findById(id: string): Promise<Notification | null>;
  /** Updates readAt only — never mutates content/source/createdAt. */
  markRead(id: string, recipientId: string, readAt: string): Promise<Notification | null>;
  markAllRead(recipientId: string, readAt: string): Promise<number>;
  saveNote(note: CollaborationNote): Promise<void>;
}

export class InMemoryNotificationRepository implements NotificationRepository {
  private readonly items: Notification[] = [];
  private readonly notes: CollaborationNote[] = [];

  async append(notification: Notification): Promise<void> {
    this.items.push(notification);
  }

  async listByRecipient(recipientId: string): Promise<Notification[]> {
    return this.items
      .filter((n) => n.recipientId === recipientId)
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  }

  async findById(id: string): Promise<Notification | null> {
    return this.items.find((n) => n.id === id) ?? null;
  }

  async markRead(id: string, recipientId: string, readAt: string): Promise<Notification | null> {
    const item = this.items.find((n) => n.id === id && n.recipientId === recipientId);
    if (!item) return null;
    if (item.readAt == null) {
      item.readAt = readAt;
    }
    return { ...item };
  }

  async markAllRead(recipientId: string, readAt: string): Promise<number> {
    let count = 0;
    for (const item of this.items) {
      if (item.recipientId === recipientId && item.readAt == null) {
        item.readAt = readAt;
        count += 1;
      }
    }
    return count;
  }

  async saveNote(note: CollaborationNote): Promise<void> {
    this.notes.push(note);
  }
}

/** JSONL notifications + notes under STORAGE_PATH — MVP inbox, not Audit platform. */
export class FileNotificationRepository implements NotificationRepository {
  private readonly items: Notification[] = [];
  private readonly notes: CollaborationNote[] = [];
  private loaded = false;

  constructor(
    private readonly notificationsPath: string,
    private readonly notesPath: string,
  ) {}

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.loadJsonl(this.notificationsPath, this.items);
    this.loadJsonl(this.notesPath, this.notes);
  }

  private loadJsonl<T>(path: string, into: T[]): void {
    if (!existsSync(path)) return;
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        into.push(JSON.parse(line) as T);
      } catch {
        // skip corrupt lines
      }
    }
  }

  private appendLine(path: string, value: unknown): void {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${JSON.stringify(value)}\n`, "utf8");
  }

  private rewriteNotifications(): void {
    mkdirSync(dirname(this.notificationsPath), { recursive: true });
    const body = this.items.map((n) => JSON.stringify(n)).join("\n");
    writeFileSync(this.notificationsPath, body ? `${body}\n` : "", "utf8");
  }

  async append(notification: Notification): Promise<void> {
    this.ensureLoaded();
    this.items.push(notification);
    this.appendLine(this.notificationsPath, notification);
  }

  async listByRecipient(recipientId: string): Promise<Notification[]> {
    this.ensureLoaded();
    return this.items
      .filter((n) => n.recipientId === recipientId)
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  }

  async findById(id: string): Promise<Notification | null> {
    this.ensureLoaded();
    return this.items.find((n) => n.id === id) ?? null;
  }

  async markRead(id: string, recipientId: string, readAt: string): Promise<Notification | null> {
    this.ensureLoaded();
    const item = this.items.find((n) => n.id === id && n.recipientId === recipientId);
    if (!item) return null;
    if (item.readAt == null) {
      item.readAt = readAt;
      this.rewriteNotifications();
    }
    return { ...item };
  }

  async markAllRead(recipientId: string, readAt: string): Promise<number> {
    this.ensureLoaded();
    let count = 0;
    for (const item of this.items) {
      if (item.recipientId === recipientId && item.readAt == null) {
        item.readAt = readAt;
        count += 1;
      }
    }
    if (count > 0) this.rewriteNotifications();
    return count;
  }

  async saveNote(note: CollaborationNote): Promise<void> {
    this.ensureLoaded();
    this.notes.push(note);
    this.appendLine(this.notesPath, note);
  }
}
