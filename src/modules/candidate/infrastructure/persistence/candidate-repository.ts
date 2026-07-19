import type { CandidateRecord } from "../../domain/candidate/candidate-record.js";
import type { CandidateId } from "../../domain/candidate/candidate-id.js";

export interface CandidateRepository {
  save(record: CandidateRecord): Promise<void>;
  findById(id: CandidateId): Promise<CandidateRecord | null>;
  /** UI list/search — Sprint 2: frontend needs inbox + candidate database without new domain types */
  findAll(): Promise<CandidateRecord[]>;
}
