import type { Job } from "../domain/types.js";

export interface JobRepository {
  save(job: Job): Promise<void>;
  findById(id: string): Promise<Job | null>;
  findAll(): Promise<Job[]>;
  /**
   * Open jobs whose skills intersect the given set, ranked by overlap count desc.
   * Backed by an inverted skill index — O(matching jobs), not O(all jobs).
   */
  findOpenJobsBySkills(
    skills: readonly string[],
    excludeJobIds: ReadonlySet<string>,
    limit?: number,
  ): Promise<Job[]>;
}
