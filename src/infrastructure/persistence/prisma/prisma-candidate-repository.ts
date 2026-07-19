import type { PrismaClient } from "@prisma/client";
import type { CandidateRepository } from "../../../modules/candidate/infrastructure/persistence/candidate-repository.js";
import type { CandidateRecord } from "../../../modules/candidate/domain/candidate/candidate-record.js";
import type { CandidateId } from "../../../modules/candidate/domain/candidate/candidate-id.js";
import { candidateRecordToRow, rowToCandidateRecord } from "./mappers/candidate-mapper.js";

export class PrismaCandidateRepository implements CandidateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(record: CandidateRecord): Promise<void> {
    const row = candidateRecordToRow(record);
    await this.prisma.candidateRecord.upsert({
      where: { id: row.id },
      create: row,
      update: row,
    });
  }

  async findById(id: CandidateId): Promise<CandidateRecord | null> {
    const row = await this.prisma.candidateRecord.findUnique({
      where: { id: id.toString() },
    });
    return row ? rowToCandidateRecord(row) : null;
  }

  async findAll(): Promise<CandidateRecord[]> {
    const rows = await this.prisma.candidateRecord.findMany({
      orderBy: { uploadedAt: "desc" },
    });
    return rows.map(rowToCandidateRecord);
  }
}
