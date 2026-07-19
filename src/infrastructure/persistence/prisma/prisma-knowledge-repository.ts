import type { PrismaClient } from "@prisma/client";
import type { KnowledgeRepository } from "../../../modules/knowledge/infrastructure/knowledge-repository.js";
import { CandidateKnowledgeSet } from "../../../modules/knowledge/domain/candidate-knowledge-set.js";
import { KnowledgeObject } from "../../../modules/knowledge/domain/knowledge-object.js";
import type {
  KnowledgeObjectSnapshot,
  KnowledgeSignal,
} from "../../../modules/knowledge/domain/types.js";

export class PrismaKnowledgeRepository implements KnowledgeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(set: CandidateKnowledgeSet): Promise<void> {
    const objects = set.objects.map((o) => {
      const snap = o.toSnapshot();
      return {
        id: snap.id,
        candidateId: snap.candidateId,
        workspaceId: snap.workspaceId,
        field: snap.field,
        originalValue: snap.originalValue,
        currentValue: snap.currentValue,
        revisions: snap.revisions,
        revisionNumber: snap.revisionNumber,
        evidence: snap.evidence,
        confidence: snap.confidence,
        confidenceHistory: snap.confidenceHistory,
        signals: snap.signals,
        status: snap.status,
        lastUpdated: snap.lastUpdated,
        verifiedCount: snap.verifiedCount,
      };
    });
    const data = {
      candidateId: set.candidateId,
      workspaceId: set.workspaceId,
      objectsJson: JSON.stringify(objects),
      candidateSignalsJson: JSON.stringify(set.candidateSignals),
    };
    await this.prisma.knowledgeSet.upsert({
      where: { candidateId: set.candidateId },
      create: data,
      update: data,
    });
  }

  async findByCandidateId(candidateId: string): Promise<CandidateKnowledgeSet | null> {
    const row = await this.prisma.knowledgeSet.findUnique({ where: { candidateId } });
    return row ? this.toSet(row) : null;
  }

  async findObjectById(knowledgeId: string): Promise<{
    set: CandidateKnowledgeSet;
    objectId: string;
  } | null> {
    const all = await this.findAll();
    for (const set of all) {
      if (set.findById(knowledgeId)) {
        return { set, objectId: knowledgeId };
      }
    }
    return null;
  }

  async findAll(): Promise<CandidateKnowledgeSet[]> {
    const rows = await this.prisma.knowledgeSet.findMany({
      orderBy: { candidateId: "asc" },
    });
    return rows.map((r) => this.toSet(r));
  }

  private toSet(row: {
    candidateId: string;
    workspaceId: string;
    objectsJson: string;
    candidateSignalsJson: string;
  }): CandidateKnowledgeSet {
    const snapshots = JSON.parse(row.objectsJson) as Omit<KnowledgeObjectSnapshot, "analytics">[];
    const signals = JSON.parse(row.candidateSignalsJson) as KnowledgeSignal[];
    return CandidateKnowledgeSet.create({
      candidateId: row.candidateId,
      workspaceId: row.workspaceId,
      objects: snapshots.map((s) => KnowledgeObject.fromSnapshot(s)),
      candidateSignals: signals,
    });
  }
}
