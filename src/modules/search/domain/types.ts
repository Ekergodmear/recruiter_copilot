/**
 * EPIC-013 — Search & Discovery (read-only composition).
 * Search discovers information; it does not change information.
 * Search derives from the Source of Truth; it never becomes the Source of Truth.
 */

export type SearchHitType = "candidate" | "job";

export type SearchHit = {
  type: SearchHitType;
  id: string;
  title: string;
  subtitle: string;
  /** Present when Matching filter applied (0..100, MatchingService scale). */
  score: number | null;
  meta: {
    stage?: string;
    status?: string;
    skills?: string[];
    english?: string;
    experienceYears?: number | null;
  };
};

export type SearchQuery = {
  q?: string;
  type?: "candidate" | "job" | "all";
  skills?: string[];
  english?: string;
  experienceMin?: number;
  salaryMin?: number;
  salaryMax?: number;
  jobStatus?: string;
  stage?: string;
  jobId?: string;
  /** 0..100 — compared to MatchingService.overallMatchScore */
  minMatchScore?: number;
  limit?: number;
  offset?: number;
};

export type SearchResult = {
  items: SearchHit[];
  total: number;
};

export type SavedSearch = {
  savedSearchId: string;
  actorId: string;
  name: string;
  query: SearchQuery;
  createdAt: string;
};
