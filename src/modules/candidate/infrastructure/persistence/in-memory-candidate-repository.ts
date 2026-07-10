import type { CandidateRecord } from "../../domain/candidate/candidate-record.js";
import type { CandidateId } from "../../domain/candidate/candidate-id.js";
import type { CandidateRepository } from "./candidate-repository.js";

export class InMemoryCandidateRepository implements CandidateRepository {
  private readonly store = new Map<string, CandidateRecord>();

  async save(record: CandidateRecord): Promise<void> {
    this.store.set(record.candidateId, record);
  }

  async findById(id: CandidateId): Promise<CandidateRecord | null> {
    return this.store.get(id.toString()) ?? null;
  }
}
