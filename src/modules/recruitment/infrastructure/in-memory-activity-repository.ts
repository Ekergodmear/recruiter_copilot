import type { PipelineActivity } from "../domain/types.js";
import type { ActivityRepository } from "./activity-repository.js";

export class InMemoryActivityRepository implements ActivityRepository {
  private readonly items: PipelineActivity[] = [];

  async append(activity: PipelineActivity): Promise<void> {
    this.items.push(activity);
  }

  async findByJobId(jobId: string): Promise<PipelineActivity[]> {
    return this.items
      .filter((a) => a.jobId === jobId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async findBySubmissionId(submissionId: string): Promise<PipelineActivity[]> {
    return this.items
      .filter((a) => a.submissionId === submissionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
