# ADR-009 — Phased Intelligence Implementation

## Status
Accepted

## Date
2026-07-09

## Context
Full Truth Model + Knowledge Graph + Inference in MVP would delay product validation 12+ months.

## Decision
- **Phase 1 MVP**: KO + single confidence, basic KC, no truth runtime, no graph
- **Phase 2**: Truth Status, weights, multi-source
- **Phase 3**: Full graph, recommendation, copilot
- Design all phases in Memory Bank; implement Phase 1 only

## Alternatives Considered
1. **Big bang intelligence** — rejected: startup risk
2. **No design for Phase 2** — rejected: rework cost

## Consequences
### Positive: Shippable MVP, extensible design
### Negative: Some features feel "simple" initially

## Related
- `_architecture.md`
- `25-truth-model/`
