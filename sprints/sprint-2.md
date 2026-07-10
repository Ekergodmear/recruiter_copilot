# Sprint 2 — Recruiter Candidate Workspace

**Status:** Blocked — gated on Sprint 1 Alpha Validation  
**Starts when:** ≥30 real CVs imported + telemetry review approved by CTO

---

## Sprint Goal

> Recruiter can manage candidates in a workspace: list, detail, edit, view resume, import history, basic search.

## Background

Duplicate Detection has low value without a place to manage candidates. Semantic search and embeddings need a real data pool first. CTO decision: workspace before intelligence features.

## In Scope

- Candidate List
- Candidate Detail
- Candidate Edit (extends AH-003)
- Resume Viewer (extends AH-001)
- Import History (extends AH-005)
- Basic Search — SQL + normalized skills (not semantic)

## Out of Scope

- Semantic search
- Embeddings / pgvector matching
- Duplicate detection
- Truth Runtime
- Graph
- Job management
- Client management
- Authentication (unless CTO adds)
- Dashboard analytics UI

## Gate from Sprint 1

Sprint 2 **must not start** until:

| Metric | Target |
|--------|--------|
| Real CVs imported | ≥ 30 |
| Upload Success Rate | > 95% |
| Average Parse Time | < 8s |
| Human Override Rate | < 20% |
| Parse Failure | < 5% |
| Recruiter Satisfaction | ≥ 4/5 |
| Daily Active Usage | ≥ 1 session/day |
| Time Saved | ≥ 30% |
| TTQC | Decreasing trend |

## Tasks

_To be broken down after Alpha Validation data review._

## References

- `sprints/alpha-hardening.md` — overlap with AH-001, AH-003, AH-005
- ADR-016 — provider layer unchanged
- ADR-000 — KPIs govern quality gates
