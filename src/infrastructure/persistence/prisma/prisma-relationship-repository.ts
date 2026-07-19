import type { PrismaClient } from "@prisma/client";
import type {
  CandidateJobRelationship,
  StageHistoryEntry,
  WorkflowStage,
} from "../../../modules/relationship/domain/types.js";
import type { RelationshipRepository } from "../../../modules/relationship/infrastructure/relationship-repository.js";

function serializeHistory(history: StageHistoryEntry[]): string {
  return JSON.stringify(history);
}

function parseHistory(raw: string): StageHistoryEntry[] {
  try {
    const parsed = JSON.parse(raw) as StageHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toRow(r: CandidateJobRelationship) {
  return {
    id: r.id,
    candidateId: r.candidateId,
    jobId: r.jobId,
    status: r.currentStage,
    currentStage: r.currentStage,
    stageHistory: serializeHistory(r.stageHistory),
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
  currentStage: string;
  stageHistory: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}): CandidateJobRelationship {
  const currentStage = (row.currentStage || row.status) as WorkflowStage;
  return {
    id: row.id,
    candidateId: row.candidateId,
    jobId: row.jobId,
    status: currentStage,
    currentStage,
    stageHistory: parseHistory(row.stageHistory),
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
