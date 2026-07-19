import type { Clock } from "../../../shared/clock/index.js";
import type { IdGenerator } from "../../../shared/id-generator/index.js";
import { CandidateId } from "../../candidate/domain/candidate/candidate-id.js";
import type { CandidateRepository } from "../../candidate/infrastructure/persistence/candidate-repository.js";
import type { JobRepository } from "../../job/infrastructure/job-repository.js";
import {
  RELATIONSHIP_STATUSES,
  type CandidateJobRelationship,
  type RelationshipStatus,
} from "../domain/types.js";
import type { RelationshipRepository } from "../infrastructure/relationship-repository.js";

export class RelationshipServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RelationshipServiceError";
  }
}

export class RelationshipService {
  constructor(
    private readonly deps: {
      clock: Clock;
      idGenerator: IdGenerator;
      relationshipRepository: RelationshipRepository;
      candidateRepository: CandidateRepository;
      jobRepository: JobRepository;
    },
  ) {}

  async create(params: {
    candidateId: string;
    jobId: string;
    status?: RelationshipStatus;
    actorId: string;
  }): Promise<CandidateJobRelationship> {
    const status = params.status ?? "Sourced";
    if (!RELATIONSHIP_STATUSES.includes(status)) {
      throw new RelationshipServiceError("INVALID_STATUS", `Invalid status: ${status}`);
    }

    const candidate = await this.deps.candidateRepository.findById(
      CandidateId.create(params.candidateId),
    );
    if (!candidate) {
      throw new RelationshipServiceError("CANDIDATE_NOT_FOUND", "Candidate not found");
    }

    const job = await this.deps.jobRepository.findById(params.jobId);
    if (!job || job.deletedAt) {
      throw new RelationshipServiceError("JOB_NOT_FOUND", "Job not found");
    }

    const existing = await this.deps.relationshipRepository.findByCandidateAndJob(
      params.candidateId,
      params.jobId,
    );
    if (existing) {
      throw new RelationshipServiceError(
        "DUPLICATE_RELATIONSHIP",
        "A relationship already exists for this candidate and job",
      );
    }

    const now = this.deps.clock.nowIso();
    const relationship: CandidateJobRelationship = {
      id: this.deps.idGenerator.generateId("rel"),
      candidateId: params.candidateId,
      jobId: params.jobId,
      status,
      createdAt: now,
      updatedAt: now,
      createdBy: params.actorId,
    };
    await this.deps.relationshipRepository.save(relationship);
    return relationship;
  }

  async updateStatus(params: {
    id: string;
    status: RelationshipStatus;
  }): Promise<CandidateJobRelationship> {
    if (!RELATIONSHIP_STATUSES.includes(params.status)) {
      throw new RelationshipServiceError("INVALID_STATUS", `Invalid status: ${params.status}`);
    }
    const current = await this.deps.relationshipRepository.findById(params.id);
    if (!current) {
      throw new RelationshipServiceError("NOT_FOUND", "Relationship not found");
    }
    const next: CandidateJobRelationship = {
      ...current,
      status: params.status,
      updatedAt: this.deps.clock.nowIso(),
    };
    await this.deps.relationshipRepository.save(next);
    return next;
  }

  async listByCandidate(candidateId: string) {
    const candidate = await this.deps.candidateRepository.findById(CandidateId.create(candidateId));
    if (!candidate) {
      throw new RelationshipServiceError("CANDIDATE_NOT_FOUND", "Candidate not found");
    }

    const items = await this.deps.relationshipRepository.findByCandidateId(candidateId);
    const enriched = await Promise.all(
      items.map(async (r) => {
        const job = await this.deps.jobRepository.findById(r.jobId);
        return {
          ...r,
          jobTitle: job?.title ?? r.jobId,
          jobCompany: job?.company ?? "",
          jobStatus: job?.status ?? null,
        };
      }),
    );
    return { items: enriched, total: enriched.length };
  }

  async listByJob(jobId: string) {
    const job = await this.deps.jobRepository.findById(jobId);
    if (!job || job.deletedAt) {
      throw new RelationshipServiceError("JOB_NOT_FOUND", "Job not found");
    }

    const items = await this.deps.relationshipRepository.findByJobId(jobId);
    const enriched = await Promise.all(
      items.map(async (r) => {
        const record = await this.deps.candidateRepository.findById(
          CandidateId.create(r.candidateId),
        );
        return {
          ...r,
          candidateName: record?.candidate.profile.name ?? r.candidateId,
        };
      }),
    );
    return { items: enriched, total: enriched.length };
  }
}
