import type { Offer } from "../domain/types.js";

export interface OfferRepository {
  save(offer: Offer): Promise<void>;
  findById(id: string): Promise<Offer | null>;
  findBySubmissionId(submissionId: string): Promise<Offer[]>;
  findAll(): Promise<Offer[]>;
}
