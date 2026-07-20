import type { Clock } from "../../../shared/clock/index.js";
import type { IdGenerator } from "../../../shared/id-generator/index.js";
import type { CandidateRepository } from "../../candidate/infrastructure/persistence/candidate-repository.js";
import type { CandidateRecord } from "../../candidate/domain/candidate/candidate-record.js";
import {
  parseCandidateYears,
  parseExpectedSalary,
} from "../../matching/application/matching-inputs.js";
import type { JobRepository } from "../../job/infrastructure/job-repository.js";
import type { Job } from "../../job/domain/types.js";
import type { RelationshipRepository } from "../../relationship/infrastructure/relationship-repository.js";
import type { MatchingService } from "../../matching/application/matching-service.js";
import type { AuthorizationService } from "../../authorization/application/authorization-service.js";
import type { SavedSearchRepository } from "../infrastructure/saved-search-repository.js";
import type { SavedSearch, SearchHit, SearchQuery, SearchResult } from "../domain/types.js";

export class SearchServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SearchServiceError";
  }
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * EPIC-013 — read-only discovery composition.
 * Aggregates Candidate / Job / Workflow / Matching; never mutates SoT.
 */
export class SearchService {
  constructor(
    private readonly deps: {
      clock: Clock;
      idGenerator: IdGenerator;
      candidateRepository: CandidateRepository;
      jobRepository: JobRepository;
      relationshipRepository: RelationshipRepository;
      matchingService: MatchingService;
      authorizationService: AuthorizationService;
      savedSearchRepository: SavedSearchRepository;
    },
  ) {}

  async search(actorId: string, query: SearchQuery): Promise<SearchResult> {
    this.requireRead(actorId);
    const normalized = normalizeQuery(query);
    const includeCandidates = normalized.type === "all" || normalized.type === "candidate";
    const includeJobs = normalized.type === "all" || normalized.type === "job";

    const relationships = await this.deps.relationshipRepository.findAll();
    const stagesByCandidate = new Map<string, Set<string>>();
    const stagesByJob = new Map<string, Set<string>>();
    for (const rel of relationships) {
      addStage(stagesByCandidate, rel.candidateId, rel.currentStage);
      addStage(stagesByJob, rel.jobId, rel.currentStage);
    }

    const hits: SearchHit[] = [];

    if (includeCandidates) {
      const candidates = await this.deps.candidateRepository.findAll();
      for (const record of candidates) {
        const hit = await this.candidateHit(record, normalized, stagesByCandidate);
        if (hit) hits.push(hit);
      }
    }

    if (includeJobs) {
      const jobs = await this.deps.jobRepository.findAll();
      for (const job of jobs) {
        if (job.deletedAt) continue;
        const hit = this.jobHit(job, normalized, stagesByJob);
        if (hit) hits.push(hit);
      }
    }

    sortHits(hits, Boolean(normalized.minMatchScore != null && normalized.jobId));
    const total = hits.length;
    const limit = normalized.limit ?? DEFAULT_LIMIT;
    const offset = normalized.offset ?? 0;
    const items = hits.slice(offset, offset + limit);
    return { items, total };
  }

  async saveSearch(
    actorId: string,
    params: { name: string; query: SearchQuery },
  ): Promise<SavedSearch> {
    this.requireRead(actorId);
    const name = params.name?.trim() ?? "";
    if (!name) throw new SearchServiceError("INVALID_NAME", "name is required");
    const record: SavedSearch = {
      savedSearchId: this.deps.idGenerator.generateId("savedsearch"),
      actorId,
      name,
      query: normalizeQuery(params.query ?? {}),
      createdAt: this.deps.clock.nowIso(),
    };
    await this.deps.savedSearchRepository.save(record);
    return record;
  }

  async listSaved(actorId: string): Promise<{ items: SavedSearch[]; total: number }> {
    this.requireRead(actorId);
    const items = await this.deps.savedSearchRepository.listByActor(actorId);
    return { items, total: items.length };
  }

  async deleteSaved(actorId: string, savedSearchId: string): Promise<void> {
    this.requireRead(actorId);
    const ok = await this.deps.savedSearchRepository.delete(savedSearchId, actorId);
    if (!ok) throw new SearchServiceError("NOT_FOUND", "Saved search not found");
  }

  private requireRead(actorId: string): void {
    const decision = this.deps.authorizationService.authorize(actorId, "search.read");
    if (!decision.allowed) {
      throw new SearchServiceError(decision.code, decision.message);
    }
  }

  private async candidateHit(
    record: CandidateRecord,
    query: SearchQuery,
    stagesByCandidate: Map<string, Set<string>>,
  ): Promise<SearchHit | null> {
    const skills = splitSkills(record.knowledge.currentValue("skills"));
    const english = record.knowledge.currentValue("english") || "";
    const years = parseCandidateYears(record);
    const salary = parseExpectedSalary(record.workspace.salary);
    const name = record.candidate.profile.name || "";
    const summary = record.knowledge.currentValue("summary") || "";
    const stages = stagesByCandidate.get(record.candidateId);

    if (query.q && !textMatches(query.q, [name, skills.join(" "), english, summary])) {
      return null;
    }
    if (query.skills?.length && !skillsContainAll(skills, query.skills)) return null;
    if (query.english && !english.toLowerCase().includes(query.english.toLowerCase())) {
      return null;
    }
    if (query.experienceMin != null && (years == null || years < query.experienceMin)) {
      return null;
    }
    if (!salaryInRange(salary, query.salaryMin, query.salaryMax)) return null;
    if (query.stage && !stages?.has(query.stage)) return null;

    let score: number | null = null;
    if (query.minMatchScore != null) {
      if (!query.jobId) {
        throw new SearchServiceError(
          "INVALID_MATCH_FILTER",
          "jobId is required when minMatchScore is set",
        );
      }
      try {
        const result = await this.deps.matchingService.match({
          candidateId: record.candidateId,
          jobId: query.jobId,
        });
        score = result.overallMatchScore;
        if (score < query.minMatchScore) return null;
      } catch {
        return null;
      }
    }

    return {
      type: "candidate",
      id: record.candidateId,
      title: name || record.candidateId,
      subtitle: skills.slice(0, 5).join(", "),
      score,
      meta: {
        skills,
        english: english || undefined,
        experienceYears: years,
        stage: stages ? [...stages].sort()[0] : undefined,
      },
    };
  }

  private jobHit(
    job: Job,
    query: SearchQuery,
    stagesByJob: Map<string, Set<string>>,
  ): SearchHit | null {
    const skills = job.skills ?? [];
    const stages = stagesByJob.get(job.id);

    if (
      query.q &&
      !textMatches(query.q, [
        job.title,
        job.company,
        skills.join(" "),
        job.location,
        job.status,
        job.description,
      ])
    ) {
      return null;
    }
    if (query.skills?.length && !skillsContainAll(skills, query.skills)) return null;
    if (query.jobStatus && job.status !== query.jobStatus) return null;
    if (
      query.english &&
      !job.englishRequirement.toLowerCase().includes(query.english.toLowerCase())
    ) {
      return null;
    }
    if (
      query.experienceMin != null &&
      (job.experienceYears == null || job.experienceYears < query.experienceMin)
    ) {
      return null;
    }
    if (!jobSalaryOverlaps(job.salaryMin, job.salaryMax, query.salaryMin, query.salaryMax)) {
      return null;
    }
    if (query.stage && !stages?.has(query.stage)) return null;
    // Matching filter is Candidate-scoped in MVP
    if (query.minMatchScore != null) return null;

    return {
      type: "job",
      id: job.id,
      title: job.title,
      subtitle: [job.company, job.status].filter(Boolean).join(" · "),
      score: null,
      meta: {
        status: job.status,
        skills,
        english: job.englishRequirement || undefined,
        experienceYears: job.experienceYears,
        stage: stages ? [...stages].sort()[0] : undefined,
      },
    };
  }
}

function normalizeQuery(query: SearchQuery): SearchQuery {
  const skills = Array.isArray(query.skills)
    ? query.skills.map((s) => String(s).trim()).filter(Boolean)
    : typeof query.skills === "string"
      ? String(query.skills)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

  let limit =
    query.limit == null || Number.isNaN(Number(query.limit))
      ? DEFAULT_LIMIT
      : Math.floor(Number(query.limit));
  if (limit < 1) limit = 1;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  let offset =
    query.offset == null || Number.isNaN(Number(query.offset))
      ? 0
      : Math.floor(Number(query.offset));
  if (offset < 0) offset = 0;

  const type =
    query.type === "candidate" || query.type === "job" || query.type === "all" ? query.type : "all";

  return {
    q: query.q?.trim() || undefined,
    type,
    skills: skills?.length ? skills : undefined,
    english: query.english?.trim() || undefined,
    experienceMin:
      query.experienceMin == null || Number.isNaN(Number(query.experienceMin))
        ? undefined
        : Number(query.experienceMin),
    salaryMin:
      query.salaryMin == null || Number.isNaN(Number(query.salaryMin))
        ? undefined
        : Number(query.salaryMin),
    salaryMax:
      query.salaryMax == null || Number.isNaN(Number(query.salaryMax))
        ? undefined
        : Number(query.salaryMax),
    jobStatus: query.jobStatus?.trim() || undefined,
    stage: query.stage?.trim() || undefined,
    jobId: query.jobId?.trim() || undefined,
    minMatchScore:
      query.minMatchScore == null || Number.isNaN(Number(query.minMatchScore))
        ? undefined
        : Number(query.minMatchScore),
    limit,
    offset,
  };
}

function splitSkills(raw: string): string[] {
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function skillsContainAll(haystack: string[], needles: string[]): boolean {
  const set = new Set(haystack.map((s) => s.toLowerCase()));
  return needles.every((n) => set.has(n.toLowerCase()));
}

function textMatches(q: string, fields: string[]): boolean {
  const needle = q.toLowerCase();
  return fields.some((f) => f.toLowerCase().includes(needle));
}

function salaryInRange(value: number | null, min?: number, max?: number): boolean {
  if (min == null && max == null) return true;
  if (value == null) return false;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

/** Job band overlaps requested [salaryMin, salaryMax] when either side is set. */
function jobSalaryOverlaps(
  jobMin: number | null,
  jobMax: number | null,
  min?: number,
  max?: number,
): boolean {
  if (min == null && max == null) return true;
  if (jobMin == null && jobMax == null) return false;
  const lo = jobMin ?? jobMax!;
  const hi = jobMax ?? jobMin!;
  if (min != null && hi < min) return false;
  if (max != null && lo > max) return false;
  return true;
}

function addStage(map: Map<string, Set<string>>, key: string, stage: string): void {
  let set = map.get(key);
  if (!set) {
    set = new Set();
    map.set(key, set);
  }
  set.add(stage);
}

/** Deterministic: type asc, then id asc; with matching filter: score desc, then id asc. */
function sortHits(hits: SearchHit[], byScore: boolean): void {
  hits.sort((a, b) => {
    if (byScore) {
      const sa = a.score ?? -1;
      const sb = b.score ?? -1;
      if (sa !== sb) return sb - sa;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    }
    if (a.type !== b.type) return a.type < b.type ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
