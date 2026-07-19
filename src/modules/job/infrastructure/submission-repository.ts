import type { Submission } from "../domain/types.js";

export interface SubmissionRepository {
  save(submission: Submission): Promise<void>;
  findById(id: string): Promise<Submission | null>;
  findAll(): Promise<Submission[]>;
  findByJobId(jobId: string): Promise<Submission[]>;
  findByCandidateId(candidateId: string): Promise<Submission[]>;
  findByCandidateAndJob(candidateId: string, jobId: string): Promise<Submission | null>;
}
