import type { PrismaClient } from "@prisma/client";
import type { ActivityRepository } from "../../../modules/recruitment/infrastructure/activity-repository.js";
import type { ActivityType, PipelineActivity } from "../../../modules/recruitment/domain/types.js";

function toActivity(row: {
  id: string;
  jobId: string;
  submissionId: string | null;
  candidateId: string | null;
  type: string;
  message: string;
  actorId: string;
  createdAt: string;
}): PipelineActivity {
  return {
    id: row.id,
    jobId: row.jobId,
    submissionId: row.submissionId,
    candidateId: row.candidateId,
    type: row.type as ActivityType,
    message: row.message,
    actorId: row.actorId,
    createdAt: row.createdAt,
  };
}

export class PrismaActivityRepository implements ActivityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async append(activity: PipelineActivity): Promise<void> {
    await this.prisma.pipelineActivity.create({
      data: {
        id: activity.id,
        jobId: activity.jobId,
        submissionId: activity.submissionId,
        candidateId: activity.candidateId,
        type: activity.type,
        message: activity.message,
        actorId: activity.actorId,
        createdAt: activity.createdAt,
      },
    });
  }

  async findByJobId(jobId: string): Promise<PipelineActivity[]> {
    const rows = await this.prisma.pipelineActivity.findMany({
      where: { jobId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toActivity);
  }

  async findBySubmissionId(submissionId: string): Promise<PipelineActivity[]> {
    const rows = await this.prisma.pipelineActivity.findMany({
      where: { submissionId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toActivity);
  }
}
