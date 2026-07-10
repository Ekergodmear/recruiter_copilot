# ADR-003 — Truth Model Layer

## Status
Accepted

## Date
2026-07-09

## Context
Multiple sources (Resume, Interview, Client, Recruiter) can contradict. Single confidence field cannot represent extraction vs truth vs business relevance.

## Decision
Add Truth Model layer with Truth Status, Evidence Weight, three confidence types (Phase 2). MVP uses single confidence; design for expansion.

## Alternatives Considered
1. **Highest source wins** — rejected: silent wrong answers
2. **Recruiter-only resolution** — rejected: no systematic conflict detection

## Consequences
### Positive: Explainable, trustworthy AI
### Negative: Phase 2 complexity deferred but designed

## Related
- `25-truth-model/`
