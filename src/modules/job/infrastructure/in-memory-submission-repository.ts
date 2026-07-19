import type { Submission } from "../domain/types.js";
import type { SubmissionRepository } from "./submission-repository.js";

export class InMemorySubmissionRepository implements SubmissionRepository {
  private readonly items = new Map<string, Submission>();

  async save(submission: Submission): Promise<void> {
    this.items.set(submission.id, submission);
  }

  async findById(id: string): Promise<Submission | null> {
    return this.items.get(id) ?? null;
  }

  async findAll(): Promise<Submission[]> {
    return [...this.items.values()].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  async findByJobId(jobId: string): Promise<Submission[]> {
    return [...this.items.values()]
      .filter((s) => s.jobId === jobId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  async findByCandidateId(candidateId: string): Promise<Submission[]> {
    return [...this.items.values()]
      .filter((s) => s.candidateId === candidateId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  async findByCandidateAndJob(candidateId: string, jobId: string): Promise<Submission | null> {
    return (
      [...this.items.values()].find((s) => s.candidateId === candidateId && s.jobId === jobId) ??
      null
    );
  }
}
