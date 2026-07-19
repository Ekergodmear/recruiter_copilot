import type { Job } from "../domain/types.js";
import type { JobRepository } from "./job-repository.js";

function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase();
}

export class InMemoryJobRepository implements JobRepository {
  private readonly jobs = new Map<string, Job>();
  /** skill (normalized) -> set of job ids currently posting that skill. */
  private readonly skillIndex = new Map<string, Set<string>>();

  async save(job: Job): Promise<void> {
    const previous = this.jobs.get(job.id);
    if (previous) {
      this.removeFromSkillIndex(previous);
    }
    this.jobs.set(job.id, job);
    this.addToSkillIndex(job);
  }

  async findById(id: string): Promise<Job | null> {
    return this.jobs.get(id) ?? null;
  }

  async findAll(): Promise<Job[]> {
    return [...this.jobs.values()]
      .filter((j) => !j.deletedAt)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async findOpenJobsBySkills(
    skills: readonly string[],
    excludeJobIds: ReadonlySet<string>,
    limit = 20,
  ): Promise<Job[]> {
    const overlapCount = new Map<string, number>();
    for (const skill of skills) {
      const jobIds = this.skillIndex.get(normalizeSkill(skill));
      if (!jobIds) continue;
      for (const jobId of jobIds) {
        if (excludeJobIds.has(jobId)) continue;
        overlapCount.set(jobId, (overlapCount.get(jobId) ?? 0) + 1);
      }
    }

    const candidates: { job: Job; overlap: number }[] = [];
    for (const [jobId, overlap] of overlapCount) {
      const job = this.jobs.get(jobId);
      if (!job || job.deletedAt || job.status !== "Open") continue;
      candidates.push({ job, overlap });
    }

    return candidates
      .sort((a, b) => b.overlap - a.overlap || b.job.updatedAt.localeCompare(a.job.updatedAt))
      .slice(0, limit)
      .map((c) => c.job);
  }

  private addToSkillIndex(job: Job): void {
    for (const skill of job.skills) {
      const key = normalizeSkill(skill);
      let set = this.skillIndex.get(key);
      if (!set) {
        set = new Set();
        this.skillIndex.set(key, set);
      }
      set.add(job.id);
    }
  }

  private removeFromSkillIndex(job: Job): void {
    for (const skill of job.skills) {
      const key = normalizeSkill(skill);
      const set = this.skillIndex.get(key);
      if (!set) continue;
      set.delete(job.id);
      if (set.size === 0) this.skillIndex.delete(key);
    }
  }
}
