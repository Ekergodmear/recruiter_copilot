# ADR-011 — Bounded Context Strategy (Deferred)

## Status
Accepted — **Implement Phase 2**. Sprint 1 uses modular monolith module boundaries.

## Date
2026-07-09

## Context
Architecture v3.0 lacks explicit DDD Bounded Contexts. Without them, Candidate/Recruitment/Knowledge responsibilities may bleed across modules. Full `30-bounded-contexts/` folder would expand Foundation before runnable code.

## Decision
**Sprint 1:** Modular monolith with six module folders acting as soft bounded contexts:
- `candidate` — Candidate, Resume, import
- `job` — Job, client jobs
- `recruitment` — Submission, Interview, Pipeline, Placement
- `knowledge` — Knowledge Objects, Inference, KE storage
- `identity` — Auth, workspace, RBAC
- `notification` — Notifications, reminders

Modules communicate via Domain Events only — no cross-module direct repository access.

**Phase 2:** Formalize `30-bounded-contexts/` with context maps, anti-corruption layers, and optional service extraction.

## Alternatives Considered
1. **Full bounded context docs now** — rejected: over-engineering before MVP
2. **No boundaries** — rejected: guaranteed spaghetti at scale
3. **Microservices from day 1** — rejected: premature

## Consequences
### Positive: Ship fast with clear seams for later split
### Negative: Boundaries enforced by convention until Phase 2 formalization

## Related
- `_architecture-review.md`
- ADR-013, ADR-012
