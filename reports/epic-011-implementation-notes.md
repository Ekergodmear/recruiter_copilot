# EPIC-011 Implementation Notes

| Field    | Value                         |
| -------- | ----------------------------- |
| Spec     | PR #41 (+ AC-7b)              |
| Baseline | `main @ 9442340`              |

## Provider Port

All three providers (`csv`, `webhook`, `ats_mock`) implement the same `IntegrationProvider` surface. Orchestration lives in `IntegrationService` only.

## Application Service boundary

| Direction | Path |
| --------- | ---- |
| Import execute | `JobService.createManual(...)` only |
| Import rollback (AC-7b) | `JobService.softDelete(...)` for ids created in the failed batch |
| Export | `JobService.list(...)` → provider codec (CSV/JSON) |

No Prisma/repository access from Integration providers.

## Preview → Confirm → Execute

- Preview: parse only; no SoT writes  
- Execute: requires `confirmed: true`  
- Disabled integration → execute rejected  

## MVP import entity

Alpha CSV/ATS/Webhook import targets **Jobs** (stable Application Service without resume files). Candidate resume import remains `POST /candidates/import-resume` (unchanged).
