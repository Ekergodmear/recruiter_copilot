# ADR-008 — Inference Engine vs Knowledge Engine Split

## Status
Accepted

## Date
2026-07-09

## Context
"Knowledge Engine" was doing too much — parsing, storing, embedding, reasoning.

## Decision
- **Inference Engine (26)**: creates knowledge (factory)
- **Knowledge Engine (23)**: stores and serves knowledge (warehouse)
- Never merge into single "AI module"

## Alternatives Considered
1. **Monolithic AI service** — rejected: untestable, coupled

## Consequences
### Positive: Clear boundaries, independent scaling
### Negative: Two services to deploy

## Related
- `26-inference-engine/`
- `23-knowledge-engine/`
