# ADR-001 — Event-Driven Internal Architecture

## Status
Accepted

## Date
2026-07-09

## Context
We need async processing, auditability, and loose coupling between recruitment modules. Early design exposed domain events as public API (`POST /events/ResumeUploaded`).

## Decision
- **Public API** uses business language (`POST /candidates/import-resume`)
- **Application Services** orchestrate and publish **internal Domain Events**
- Event Bus delivers to handlers (Timeline, Audit, Inference, etc.)
- Clients never see event names or event store

## Alternatives Considered
1. **CRUD-only REST** — rejected: no audit trail, tight coupling
2. **Public Event Store API** — rejected: leaks internal model, confuses clients
3. **Pure event sourcing externally** — rejected: recruitment users need familiar REST

## Consequences

### Positive
- Clean public API for recruiters and integrations
- Full internal traceability via events
- Ready for message queue / event bus without API changes

### Negative
- Two layers to maintain (API + events)
- Engineers must understand both languages

## Related
- `12-application-services/`
- `07-domain-events/`
- `_architecture.md`
