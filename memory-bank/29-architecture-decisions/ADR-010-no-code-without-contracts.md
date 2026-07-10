# ADR-010 — No Intelligence Code Without Contracts

## Status
Accepted

## Date
2026-07-09

## Context
Risk of Cursor generating Inference Engine code directly from Memory Bank prose, bypassing defined interfaces.

## Decision
- **No IE-xxx implementation** without approved **KC-xxx**
- **No AI Provider** without KC it implements
- **No application code** from Memory Bank alone — must reference ADRs + KC + KM
- ADRs record *why*; KC records *interface*; KM records *schema*

## Alternatives Considered
1. **Code directly from workflows** — rejected: repeats ATS mistake
2. **Contracts optional** — rejected: LLM coupling returns

## Consequences

### Positive
- Enforced design-before-code for intelligence
- Reviewable interfaces
- Foundation phase truly complete before Sprint 1

### Negative
- Slower to first line of inference code
- More documents upfront (worth it for multi-year product)

## Related
- `27-knowledge-contracts/`
- `26-inference-engine/`
- ADR-006, ADR-007
