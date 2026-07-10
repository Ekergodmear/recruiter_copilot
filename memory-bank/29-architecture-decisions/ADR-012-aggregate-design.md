# ADR-012 — Aggregate Design (Deferred)

## Status
Accepted — **Enforce in Sprint 1 code**. Full `08-domain-model.md` deferred to Phase 2.

## Date
2026-07-09

## Context
Transaction boundaries undefined. Without aggregate roots, risk of inconsistent writes (e.g. updating SkillKnowledge without Candidate aggregate consistency).

## Decision
**Sprint 1 aggregate roots (enforce in code):**

| Aggregate Root | Contains (entities/VO) | Not aggregate |
|----------------|--------------------------|---------------|
| **Candidate** | Candidate Profile ref, owns KO collection | Resume (entity), SkillKnowledge (entity) |
| **Job** | Job, Pipeline, Requirements | Skill (normalized ref) |
| **Submission** | Submission, Interview refs | — |
| **Placement** | Placement | — |
| **Workspace** | Tenant config | — |

Rules:
- External references by ID only
- One transaction = one aggregate root mutation
- Resume is immutable entity under Candidate — not its own aggregate
- SkillKnowledge modified only through Knowledge module APIs

**Phase 2:** Full `08-domain-model.md` with diagrams, invariants, factory methods.

## Alternatives Considered
1. **Everything is aggregate** — rejected: transaction hell
2. **Anemic domain model** — rejected: business rules leak to services
3. **Full domain model doc now** — rejected: blocks Sprint 1

## Consequences
### Positive: Clear transaction scope for Sprint 1
### Negative: Full DDD tactical patterns documented later

## Related
- `24-knowledge-model/KM-001`
- `05-ubiquitous-language.md`
