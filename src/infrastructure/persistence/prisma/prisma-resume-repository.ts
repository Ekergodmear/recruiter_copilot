import type { PrismaClient } from "@prisma/client";
import type { ResumeRepository } from "../../../modules/candidate/infrastructure/persistence/resume-repository.js";
import { Resume } from "../../../modules/candidate/domain/resume/resume.js";
import { ResumeId } from "../../../modules/candidate/domain/resume/resume-id.js";
import { ResumeMetadata } from "../../../modules/candidate/domain/resume/resume-metadata.js";
import { ResumeVersion } from "../../../modules/candidate/domain/resume/resume-version.js";

export class PrismaResumeRepository implements ResumeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(resume: Resume): Promise<void> {
    const data = {
      id: resume.idValue,
      candidateId: resume.candidateId,
      workspaceId: resume.workspaceId,
      version: resume.version.toNumber(),
      storageRef: resume.storageRef,
      filename: resume.metadata.filename,
      mimeType: resume.metadata.mimeType,
      fileSizeBytes: resume.metadata.fileSizeBytes,
      sourceType: resume.metadata.sourceType,
      uploadedAt: resume.metadata.uploadedAt,
    };
    await this.prisma.resume.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async findById(id: ResumeId): Promise<Resume | null> {
    const row = await this.prisma.resume.findUnique({ where: { id: id.toString() } });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findAll(): Promise<Resume[]> {
    const rows = await this.prisma.resume.findMany();
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: {
    id: string;
    candidateId: string;
    workspaceId: string;
    version: number;
    storageRef: string;
    filename: string;
    mimeType: string;
    fileSizeBytes: number;
    sourceType: string;
    uploadedAt: string;
  }): Resume {
    return Resume.create({
      id: ResumeId.create(row.id),
      candidateId: row.candidateId,
      workspaceId: row.workspaceId,
      version: ResumeVersion.create(row.version),
      storageRef: row.storageRef,
      metadata: ResumeMetadata.create({
        filename: row.filename,
        mimeType: row.mimeType,
        fileSizeBytes: row.fileSizeBytes,
        sourceType: row.sourceType,
        uploadedAt: row.uploadedAt,
      }),
    });
  }
}
