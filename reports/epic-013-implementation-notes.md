# EPIC-013 Implementation Notes

| Field    | Value                                      |
| -------- | ------------------------------------------ |
| Spec     | PR #47 (+ AC-10b Determinism, AC-10c Pagination) |
| Baseline | `main @ 1b715f9`                           |

## Read composition

| Source        | Usage                                              |
| ------------- | -------------------------------------------------- |
| Candidate     | `candidateRepository.findAll()` + knowledge/workspace |
| Job           | `jobRepository.findAll()` (skip soft-deleted)      |
| Workflow      | Relationship `currentStage` for stage filter       |
| Matching      | `MatchingService.match` for `minMatchScore` (0..100); not persisted |

## Determinism & pagination

1. Filter full set  
2. Sort: `type` asc then `id` asc (or `score` desc then `id` when Matching filter)  
3. Slice `offset` / `limit` (default limit 50, max 100)

## Saved Searches

- JSONL under `STORAGE_PATH/saved-searches.jsonl`  
- Stores **query definitions** only (actor-owned)  
- Re-run = live `SearchService.search`

## AuthZ

- `search.read` — Admin, Recruiter, Viewer  
- Routes: `GET /search`, `GET|POST /search/saved`, `DELETE /search/saved/:id`
