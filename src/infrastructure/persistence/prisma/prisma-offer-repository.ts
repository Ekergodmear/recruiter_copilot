import type { PrismaClient } from "@prisma/client";
import type { OfferRepository } from "../../../modules/recruitment/infrastructure/offer-repository.js";
import type { Offer, OfferStatus } from "../../../modules/recruitment/domain/types.js";

function toOffer(row: {
  id: string;
  submissionId: string;
  jobId: string;
  candidateId: string;
  salary: string;
  startDate: string;
  benefits: string;
  notes: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}): Offer {
  return {
    id: row.id,
    submissionId: row.submissionId,
    jobId: row.jobId,
    candidateId: row.candidateId,
    salary: row.salary,
    startDate: row.startDate,
    benefits: row.benefits,
    notes: row.notes,
    status: row.status as OfferStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
  };
}

export class PrismaOfferRepository implements OfferRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(offer: Offer): Promise<void> {
    await this.prisma.offer.upsert({
      where: { id: offer.id },
      create: offer,
      update: offer,
    });
  }

  async findById(id: string): Promise<Offer | null> {
    const row = await this.prisma.offer.findUnique({ where: { id } });
    return row ? toOffer(row) : null;
  }

  async findBySubmissionId(submissionId: string): Promise<Offer[]> {
    const rows = await this.prisma.offer.findMany({
      where: { submissionId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toOffer);
  }

  async findAll(): Promise<Offer[]> {
    const rows = await this.prisma.offer.findMany({ orderBy: { id: "asc" } });
    return rows.map(toOffer);
  }
}
