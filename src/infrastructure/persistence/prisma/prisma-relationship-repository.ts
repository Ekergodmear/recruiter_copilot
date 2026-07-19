import type { PrismaClient } from "@prisma/client";
import type { CandidateJobRelationship } from "../../../modules/relationship/domain/types.js";
import type { RelationshipStatus } from "../../../modules/relationship/domain/types.js";
import type { RelationshipRepository } from "../../../modules/relationship/infrastructure/relationship-repository.js";

function toRow(r: CandidateJobRelationship) {
  return {
    id: r.id,
    candidateId: r.candidateId,
    jobId: r.jobId,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    createdBy: r.createdBy,
  };
}

function toDomain(row: {
  id: string;
  candidateId: string;
  jobId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}): CandidateJobRelationship {
  return {
    id: row.id,
    candidateId: row.candidateId,
    jobId: row.jobId,
    status: row.status as RelationshipStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
  };
}

export class PrismaRelationshipRepository implements RelationshipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(relationship: CandidateJobRelationship): Promise<void> {
    const row = toRow(relationship);
    await this.prisma.candidateJobRelationship.upsert({
      where: { id: row.id },
      create: row,
      update: row,
    });
  }

  async findById(id: string): Promise<CandidateJobRelationship | null> {
    const row = await this.prisma.candidateJobRelationship.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByCandidateAndJob(
    candidateId: string,
    jobId: string,
  ): Promise<CandidateJobRelationship | null> {
    const row = await this.prisma.candidateJobRelationship.findUnique({
      where: { candidateId_jobId: { candidateId, jobId } },
    });
    return row ? toDomain(row) : null;
  }

  async findByCandidateId(candidateId: string): Promise<CandidateJobRelationship[]> {
    const rows = await this.prisma.candidateJobRelationship.findMany({
      where: { candidateId },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(toDomain);
  }

  async findByJobId(jobId: string): Promise<CandidateJobRelationship[]> {
    const rows = await this.prisma.candidateJobRelationship.findMany({
      where: { jobId },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(toDomain);
  }
}
