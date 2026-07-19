import type { CandidateJobRelationship } from "../domain/types.js";
import type { RelationshipRepository } from "./relationship-repository.js";

export class InMemoryRelationshipRepository implements RelationshipRepository {
  private readonly store = new Map<string, CandidateJobRelationship>();

  async save(relationship: CandidateJobRelationship): Promise<void> {
    this.store.set(relationship.id, relationship);
  }

  async findById(id: string): Promise<CandidateJobRelationship | null> {
    return this.store.get(id) ?? null;
  }

  async findByCandidateAndJob(
    candidateId: string,
    jobId: string,
  ): Promise<CandidateJobRelationship | null> {
    for (const r of this.store.values()) {
      if (r.candidateId === candidateId && r.jobId === jobId) return r;
    }
    return null;
  }

  async findByCandidateId(candidateId: string): Promise<CandidateJobRelationship[]> {
    return [...this.store.values()]
      .filter((r) => r.candidateId === candidateId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async findByJobId(jobId: string): Promise<CandidateJobRelationship[]> {
    return [...this.store.values()]
      .filter((r) => r.jobId === jobId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}
