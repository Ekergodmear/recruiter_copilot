import type { PrismaClient } from "@prisma/client";
import type { JobRepository } from "../../../modules/job/infrastructure/job-repository.js";
import type {
  EmploymentType,
  Job,
  JobSource,
  JobStatus,
} from "../../../modules/job/domain/types.js";

type JobRow = {
  id: string;
  workspaceId: string;
  title: string;
  company: string;
  department: string;
  employmentType: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  experienceYears: number | null;
  englishRequirement: string;
  skillsJson: string;
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  status: string;
  ready: boolean;
  submissionCount: number;
  placementCount: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  rawJdText: string;
  source: string;
  notes: string;
};

function toRow(job: Job): JobRow {
  return {
    id: job.id,
    workspaceId: job.workspaceId,
    title: job.title,
    company: job.company,
    department: job.department,
    employmentType: job.employmentType,
    location: job.location,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    currency: job.currency,
    experienceYears: job.experienceYears,
    englishRequirement: job.englishRequirement,
    skillsJson: JSON.stringify(job.skills),
    description: job.description,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    benefits: job.benefits,
    status: job.status,
    ready: job.ready,
    submissionCount: job.submissionCount,
    placementCount: job.placementCount,
    deletedAt: job.deletedAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    createdBy: job.createdBy,
    rawJdText: job.rawJdText,
    source: job.source,
    notes: job.notes,
  };
}

function toJob(row: JobRow): Job {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    company: row.company,
    department: row.department,
    employmentType: row.employmentType as EmploymentType,
    location: row.location,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    currency: row.currency,
    experienceYears: row.experienceYears,
    englishRequirement: row.englishRequirement,
    skills: JSON.parse(row.skillsJson) as string[],
    description: row.description,
    responsibilities: row.responsibilities,
    requirements: row.requirements,
    benefits: row.benefits,
    status: row.status as JobStatus,
    ready: row.ready,
    submissionCount: row.submissionCount,
    placementCount: row.placementCount,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    rawJdText: row.rawJdText,
    source: (row.source as JobSource) || "manual",
    notes: row.notes ?? "",
  };
}

function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase();
}

export class PrismaJobRepository implements JobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(job: Job): Promise<void> {
    const row = toRow(job);
    await this.prisma.job.upsert({
      where: { id: row.id },
      create: row,
      update: row,
    });
  }

  async findById(id: string): Promise<Job | null> {
    const row = await this.prisma.job.findUnique({ where: { id } });
    return row ? toJob(row) : null;
  }

  async findAll(): Promise<Job[]> {
    const rows = await this.prisma.job.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(toJob);
  }

  async findOpenJobsBySkills(
    skills: readonly string[],
    excludeJobIds: ReadonlySet<string>,
    limit = 20,
  ): Promise<Job[]> {
    const open = await this.prisma.job.findMany({
      where: { status: "Open", deletedAt: null },
    });
    const normalized = skills.map(normalizeSkill);
    return open
      .filter((j) => !excludeJobIds.has(j.id))
      .map((row) => {
        const job = toJob(row);
        const jobSkills = new Set(job.skills.map(normalizeSkill));
        const overlap = normalized.filter((s) => jobSkills.has(s)).length;
        return { job, overlap };
      })
      .filter((x) => x.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap || b.job.updatedAt.localeCompare(a.job.updatedAt))
      .slice(0, limit)
      .map((x) => x.job);
  }
}
