import type { Clock } from "../../../shared/clock/index.js";
import { CandidateId } from "../../candidate/domain/candidate/candidate-id.js";
import type { CandidateRepository } from "../../candidate/infrastructure/persistence/candidate-repository.js";
import type { JobRepository } from "../../job/infrastructure/job-repository.js";
import { computeMatchingResult } from "../domain/matching-engine.js";
import type { MatchingResult } from "../domain/types.js";
import { toMatchingCandidateInput, toMatchingJobInput } from "./matching-inputs.js";

export class MatchingServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "MatchingServiceError";
  }
}

/**
 * On-demand Matching — reads Candidate + Job, returns MatchingResult.
 * Does not persist. Does not mutate Candidate / Job / Relationship / Workflow.
 */
export class MatchingService {
  constructor(
    private readonly deps: {
      clock: Clock;
      candidateRepository: CandidateRepository;
      jobRepository: JobRepository;
    },
  ) {}

  async match(params: { candidateId: string; jobId: string }): Promise<MatchingResult> {
    const record = await this.deps.candidateRepository.findById(
      CandidateId.create(params.candidateId),
    );
    if (!record) {
      throw new MatchingServiceError("CANDIDATE_NOT_FOUND", "Candidate not found");
    }

    const job = await this.deps.jobRepository.findById(params.jobId);
    if (!job || job.deletedAt) {
      throw new MatchingServiceError("JOB_NOT_FOUND", "Job not found");
    }

    return computeMatchingResult(
      toMatchingCandidateInput(record),
      toMatchingJobInput(job),
      this.deps.clock.nowIso(),
    );
  }
}
