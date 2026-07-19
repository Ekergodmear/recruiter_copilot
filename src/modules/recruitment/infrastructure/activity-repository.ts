import type { PipelineActivity } from "../domain/types.js";

export interface ActivityRepository {
  append(activity: PipelineActivity): Promise<void>;
  findByJobId(jobId: string): Promise<PipelineActivity[]>;
  findBySubmissionId(submissionId: string): Promise<PipelineActivity[]>;
}
