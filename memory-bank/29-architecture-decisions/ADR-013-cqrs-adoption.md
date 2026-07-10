# ADR-013 — CQRS Adoption (Deferred)

## Status
Accepted — **Lightweight CQRS in Sprint 1**. Full command/projection catalog Phase 2.

## Date
2026-07-09

## Context
Current stack: Workflow → Event. Missing explicit Command → Handler → Domain → Events → Projection pattern.

## Decision
**Sprint 1 pattern:**

```
ImportResumeCommand
    ↓
CandidateImportService (handler)
    ↓
Domain validation + rules
    ↓
Publish ResumeUploaded, ResumeStored, ...
    ↓
Event handlers update projections
```

Commands live in Application Services — not separate `commands/` Memory Bank folder yet.

**Phase 2:** Formalize command catalog, command buses, separate read/write stores if needed.

## Alternatives Considered
1. **Full CQRS with event sourcing DB now** — rejected: complexity
2. **No commands, only REST** — rejected: loses traceability
3. **Command Memory Bank folder now** — rejected: duplication with App Services

## Consequences
### Positive: CQRS benefits without ceremony
### Negative: Command catalog not fully documented until Phase 2

## Related
- `12-application-services/CandidateImportService.md`
- ADR-001, ADR-014
