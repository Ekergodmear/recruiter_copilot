import type { PrismaClient } from "@prisma/client";
import type { InterviewRepository } from "../../../modules/recruitment/infrastructure/interview-repository.js";
import type { Interview, InterviewDecision } from "../../../modules/recruitment/domain/types.js";

function toInterview(row: {
  id: string;
  submissionId: string;
  jobId: string;
  candidateId: string;
  round: number;
  type: string;
  date: string;
  interviewer: string;
  location: string;
  meetingLink: string;
  feedback: string;
  decision: string;
  status: string;
  createdAt: string;
  createdBy: string;
}): Interview {
  return {
    id: row.id,
    submissionId: row.submissionId,
    jobId: row.jobId,
    candidateId: row.candidateId,
    round: row.round,
    type: row.type,
    date: row.date,
    interviewer: row.interviewer,
    location: row.location,
    meetingLink: row.meetingLink,
    feedback: row.feedback,
    decision: row.decision as InterviewDecision,
    status: row.status as Interview["status"],
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

export class PrismaInterviewRepository implements InterviewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(interview: Interview): Promise<void> {
    await this.prisma.interview.upsert({
      where: { id: interview.id },
      create: interview,
      update: interview,
    });
  }

  async findById(id: string): Promise<Interview | null> {
    const row = await this.prisma.interview.findUnique({ where: { id } });
    return row ? toInterview(row) : null;
  }

  async findBySubmissionId(submissionId: string): Promise<Interview[]> {
    const rows = await this.prisma.interview.findMany({
      where: { submissionId },
      orderBy: [{ round: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toInterview);
  }

  async findByJobId(jobId: string): Promise<Interview[]> {
    const rows = await this.prisma.interview.findMany({
      where: { jobId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toInterview);
  }

  async findByCandidateId(candidateId: string): Promise<Interview[]> {
    const rows = await this.prisma.interview.findMany({
      where: { candidateId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toInterview);
  }

  async findAll(): Promise<Interview[]> {
    const rows = await this.prisma.interview.findMany({ orderBy: { id: "asc" } });
    return rows.map(toInterview);
  }
}
