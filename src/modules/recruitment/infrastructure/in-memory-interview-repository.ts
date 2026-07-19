import type { Interview } from "../domain/types.js";
import type { InterviewRepository } from "./interview-repository.js";

export class InMemoryInterviewRepository implements InterviewRepository {
  private readonly items = new Map<string, Interview>();

  async save(interview: Interview): Promise<void> {
    this.items.set(interview.id, interview);
  }

  async findById(id: string): Promise<Interview | null> {
    return this.items.get(id) ?? null;
  }

  async findBySubmissionId(submissionId: string): Promise<Interview[]> {
    return [...this.items.values()]
      .filter((i) => i.submissionId === submissionId)
      .sort((a, b) => a.round - b.round || a.createdAt.localeCompare(b.createdAt));
  }

  async findByJobId(jobId: string): Promise<Interview[]> {
    return [...this.items.values()]
      .filter((i) => i.jobId === jobId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async findByCandidateId(candidateId: string): Promise<Interview[]> {
    return [...this.items.values()]
      .filter((i) => i.candidateId === candidateId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findAll(): Promise<Interview[]> {
    return [...this.items.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
}
