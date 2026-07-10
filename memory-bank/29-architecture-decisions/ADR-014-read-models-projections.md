# ADR-014 — Read Models and Projections (Deferred)

## Status
Accepted — **Minimal projections in Sprint 1**. Full read model catalog Phase 2.

## Date
2026-07-09

## Context
UI must not read aggregate internals directly. Timeline, Search, Dashboard need defined projections. Full projection spec would delay MVP.

## Decision
**Sprint 1 read models (build as projections):**

| Read Model | Source Events | Consumer |
|------------|---------------|----------|
| **CandidateProfileView** | KnowledgeCreated, CandidateCreated | Recruiter UI |
| **ResumeListView** | ResumeStored | Recruiter UI |
| **ActivityTimelineView** | All business events | Recruiter UI |
| **ImportStatusView** | ResumeStored, ResumeParsed | Import API status endpoint |

UI reads **views only** — never raw `knowledge_objects` table from frontend queries.

**Phase 2 read models:**
- CandidateSearchView (semantic + filters)
- RecruiterDashboardView
- PipelineView
- ClientSubmissionView (client-safe subset)

**Phase 2:** `31-capability-map/` may reference these views — not before.

## Alternatives Considered
1. **UI queries aggregates directly** — rejected
2. **Full projection docs now** — rejected: over-engineering
3. **Single JSON blob per candidate** — rejected: defeats Knowledge Model

## Consequences
### Positive: Clean UI boundary from day 1
### Negative: Some views built incrementally

## Related
- ADR-002, ADR-013
- `02-user-personas.md` Client visibility rules
