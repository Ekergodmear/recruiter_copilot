import type { CandidateKnowledgeSet } from "../domain/candidate-knowledge-set.js";

export interface KnowledgeRepository {
  save(set: CandidateKnowledgeSet): Promise<void>;
  findByCandidateId(candidateId: string): Promise<CandidateKnowledgeSet | null>;
  findObjectById(knowledgeId: string): Promise<{
    set: CandidateKnowledgeSet;
    objectId: string;
  } | null>;
  findAll(): Promise<CandidateKnowledgeSet[]>;
}

export class InMemoryKnowledgeRepository implements KnowledgeRepository {
  private readonly byCandidate = new Map<string, CandidateKnowledgeSet>();
  private readonly objectIndex = new Map<string, string>();

  async save(set: CandidateKnowledgeSet): Promise<void> {
    this.byCandidate.set(set.candidateId, set);
    for (const obj of set.objects) {
      this.objectIndex.set(obj.id, set.candidateId);
    }
  }

  async findByCandidateId(candidateId: string): Promise<CandidateKnowledgeSet | null> {
    return this.byCandidate.get(candidateId) ?? null;
  }

  async findObjectById(knowledgeId: string): Promise<{
    set: CandidateKnowledgeSet;
    objectId: string;
  } | null> {
    const candidateId = this.objectIndex.get(knowledgeId);
    if (!candidateId) return null;
    const set = this.byCandidate.get(candidateId);
    if (!set) return null;
    if (!set.findById(knowledgeId)) return null;
    return { set, objectId: knowledgeId };
  }

  async findAll(): Promise<CandidateKnowledgeSet[]> {
    return [...this.byCandidate.values()].sort((a, b) =>
      a.candidateId.localeCompare(b.candidateId),
    );
  }
}
