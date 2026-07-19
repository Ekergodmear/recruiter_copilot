import type { PrismaClient } from "@prisma/client";
import type { SubmissionRepository } from "../../../modules/job/infrastructure/submission-repository.js";
import type { Submission, SubmissionStatus } from "../../../modules/job/domain/types.js";

function toSubmission(row: {
  id: string;
  candidateId: string;
  jobId: string;
  submittedBy: string;
  submittedAt: string;
  status: string;
  notes: string;
  updatedAt: string;
}): Submission {
  return {
    id: row.id,
    candidateId: row.candidateId,
    jobId: row.jobId,
    submittedBy: row.submittedBy,
    submittedAt: row.submittedAt,
    status: row.status as SubmissionStatus,
    notes: row.notes,
    updatedAt: row.updatedAt,
  };
}

export class PrismaSubmissionRepository implements SubmissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(submission: Submission): Promise<void> {
    await this.prisma.submission.upsert({
      where: { id: submission.id },
      create: submission,
      update: submission,
    });
  }

  async findById(id: string): Promise<Submission | null> {
    const row = await this.prisma.submission.findUnique({ where: { id } });
    return row ? toSubmission(row) : null;
  }

  async findAll(): Promise<Submission[]> {
    const rows = await this.prisma.submission.findMany({
      orderBy: { submittedAt: "desc" },
    });
    return rows.map(toSubmission);
  }

  async findByJobId(jobId: string): Promise<Submission[]> {
    const rows = await this.prisma.submission.findMany({
      where: { jobId },
      orderBy: { submittedAt: "desc" },
    });
    return rows.map(toSubmission);
  }

  async findByCandidateId(candidateId: string): Promise<Submission[]> {
    const rows = await this.prisma.submission.findMany({
      where: { candidateId },
      orderBy: { submittedAt: "desc" },
    });
    return rows.map(toSubmission);
  }

  async findByCandidateAndJob(candidateId: string, jobId: string): Promise<Submission | null> {
    const row = await this.prisma.submission.findUnique({
      where: { candidateId_jobId: { candidateId, jobId } },
    });
    return row ? toSubmission(row) : null;
  }
}
