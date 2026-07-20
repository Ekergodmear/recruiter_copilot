# EPIC-014 Implementation Notes

| Field    | Value            |
| -------- | ---------------- |
| Spec     | PR #50           |
| Baseline | `main @ 07a657b` |

## Composition

| Source     | Usage                                      |
| ---------- | ------------------------------------------ |
| Analytics  | `getOverview()` → JSON + overview CSV      |
| Audit repo | CSV `kind=audit` (AuthZ = `report.read`)   |
| Candidate  | CSV `kind=candidates` (id asc)             |
| Job        | CSV `kind=jobs` (id asc, skip deleted)     |

## Determinism

- Overview CSV: fixed metric key order + stage name asc  
- Candidates/Jobs: sort by id ascending  
- Audit: newest-first (matches Audit Query)  

## AuthZ

- `report.read` — Admin, Recruiter, Viewer  
- Routes: `GET /reports/overview`, `GET /reports/export`
