# ADR-002 — Knowledge Model Over Flat Columns

## Status
Accepted

## Date
2026-07-09

## Context
Traditional ATS stores `candidates.skills TEXT[]`, `english VARCHAR`, `salary INT`. No confidence, sources, or explainability.

## Decision
Store **Knowledge Objects** (KM-xxx) as first-class entities with value, confidence, sources, versioning. Candidate Profile is a read-model aggregate.

## Alternatives Considered
1. **JSON column on Candidate** — rejected: no versioning, no provenance
2. **EAV pattern** — rejected: query complexity without schema discipline
3. **Flat columns** — rejected: cannot support Explainable AI

## Consequences

### Positive
- Explainable AI native to data model
- Knowledge Growth Loop structurally supported
- Embeddings derived from structured knowledge

### Negative
- More tables/complexity than simple ATS
- Requires Knowledge Engine layer

## Related
- `24-knowledge-model/`
- ADR-003, ADR-006
