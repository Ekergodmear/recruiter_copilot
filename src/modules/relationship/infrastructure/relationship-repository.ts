import type { CandidateJobRelationship } from "../domain/types.js";

export interface RelationshipRepository {
  save(relationship: CandidateJobRelationship): Promise<void>;
  findById(id: string): Promise<CandidateJobRelationship | null>;
  findByCandidateAndJob(
    candidateId: string,
    jobId: string,
  ): Promise<CandidateJobRelationship | null>;
  findByCandidateId(candidateId: string): Promise<CandidateJobRelationship[]>;
  findByJobId(jobId: string): Promise<CandidateJobRelationship[]>;
  /** EPIC-007 Analytics — list all relationships (read). */
  findAll(): Promise<CandidateJobRelationship[]>;
}
