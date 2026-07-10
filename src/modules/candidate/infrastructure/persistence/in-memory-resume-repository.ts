import type { Resume } from "../../domain/resume/resume.js";
import type { ResumeId } from "../../domain/resume/resume-id.js";
import type { ResumeRepository } from "./resume-repository.js";

export class InMemoryResumeRepository implements ResumeRepository {
  private readonly store = new Map<string, Resume>();

  async save(resume: Resume): Promise<void> {
    this.store.set(resume.idValue, resume);
  }

  async findById(id: ResumeId): Promise<Resume | null> {
    return this.store.get(id.toString()) ?? null;
  }
}
