# ADR-004 — Workspace Isolation

## Status
Accepted

## Date
2026-07-09

## Context
Multi-tenant recruitment SaaS. Data leak between agencies is catastrophic.

## Decision
Every business object belongs to exactly one Workspace. Cross-workspace access, search, and AI reasoning prohibited. Backend enforces — UI hiding insufficient.

## Alternatives Considered
1. **Row-level security only** — accepted as implementation of this decision
2. **Shared candidate pool** — rejected for v1

## Consequences
### Positive: Security, compliance readiness
### Negative: No cross-agency candidate sharing

## Related
- `04-business-rules.md` Workspace Rules
- `14-multi-tenancy.md` (pending)
