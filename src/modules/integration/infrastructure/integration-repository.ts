import type { IntegrationRecord } from "../domain/types.js";

export interface IntegrationRepository {
  list(): Promise<IntegrationRecord[]>;
  findById(id: string): Promise<IntegrationRecord | null>;
  save(record: IntegrationRecord): Promise<void>;
}

export class InMemoryIntegrationRepository implements IntegrationRepository {
  private readonly items = new Map<string, IntegrationRecord>();

  async list(): Promise<IntegrationRecord[]> {
    return [...this.items.values()].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
    );
  }

  async findById(id: string): Promise<IntegrationRecord | null> {
    return this.items.get(id) ?? null;
  }

  async save(record: IntegrationRecord): Promise<void> {
    this.items.set(record.integrationId, record);
  }
}
