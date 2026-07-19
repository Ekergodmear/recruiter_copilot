import type { Interview } from "../domain/types.js";

export interface InterviewRepository {
  save(interview: Interview): Promise<void>;
  findById(id: string): Promise<Interview | null>;
  findBySubmissionId(submissionId: string): Promise<Interview[]>;
  findByJobId(jobId: string): Promise<Interview[]>;
  findByCandidateId(candidateId: string): Promise<Interview[]>;
  findAll(): Promise<Interview[]>;
}
