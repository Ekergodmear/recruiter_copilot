# ADR-005 — Append-Only History and Versioning

## Status
Accepted

## Date
2026-07-09

## Context
Recruitment knowledge must survive audits, disputes, and recruiter turnover. Deleting history destroys competitive advantage.

## Decision
Activities, Audit Logs, Resume versions, Knowledge Object versions are append-only. Soft delete preferred. Knowledge corrections create new versions.

## Alternatives Considered
1. **Hard delete with cascade** — rejected
2. **Overwrite in place** — rejected

## Consequences
### Positive: Full audit trail, Knowledge Growth Loop
### Negative: Storage growth (acceptable)

## Related
- `04-business-rules.md`
- `12-event-audit-trail.md` (pending)
