import type { Resume } from "../../domain/resume/resume.js";
import type { ResumeId } from "../../domain/resume/resume-id.js";

export interface ResumeRepository {
  save(resume: Resume): Promise<void>;
  findById(id: ResumeId): Promise<Resume | null>;
  /** TECH-003 — batched load for integrity checks (additive; existing methods unchanged). */
  findAll(): Promise<Resume[]>;
}
