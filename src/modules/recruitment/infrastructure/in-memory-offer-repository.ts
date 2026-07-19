import type { Offer } from "../domain/types.js";
import type { OfferRepository } from "./offer-repository.js";

export class InMemoryOfferRepository implements OfferRepository {
  private readonly items = new Map<string, Offer>();

  async save(offer: Offer): Promise<void> {
    this.items.set(offer.id, offer);
  }

  async findById(id: string): Promise<Offer | null> {
    return this.items.get(id) ?? null;
  }

  async findBySubmissionId(submissionId: string): Promise<Offer[]> {
    return [...this.items.values()]
      .filter((o) => o.submissionId === submissionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findAll(): Promise<Offer[]> {
    return [...this.items.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
}
