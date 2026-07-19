# TECH-006 — Production Hardening

| Field | Value |
|-------|-------|
| Date opened | 2026-07-19 |
| Status | **OPEN** — docs kickoff PR |
| Baseline | [`founder-alpha-1`](https://github.com/Ekergodmear/recruiter_copilot/releases/tag/founder-alpha-1) |
| Spec | [`sprints/tech-006-production-hardening.md`](../sprints/tech-006-production-hardening.md) |
| Foundation Freeze | Intact |

---

## Founder Alpha closure (context)

| Milestone | Status |
|-----------|--------|
| Foundation Freeze | Done |
| Sprint 1 | Done |
| Runtime production (Docker + Postgres + Prisma) | Done |
| Git baseline + tag | Done (`founder-alpha-1`) |
| CI | Green at ship |
| Rollback point | Yes |

GitHub Release UI: **not required** for Alpha (annotated tag sufficient).

---

## PR plan

| PR | Content | Status |
|----|---------|--------|
| PR-1 | Docs only (this spec + tracker) | In flight |
| PR-2 | WP-1 Backup & Restore (+ Recovery Drill) | Blocked on PR-1 |
| PR-3 | WP-3 Deployment / Rollback | Blocked on WP-1 |
| PR-4 | WP-4 Operations Runbook | Blocked on WP-3 |
| PR-5 | WP-2 Operations Monitoring | Blocked on WP-4 |
| PR-6 | WP-5 Hardening | Blocked on WP-5 predecessor |

---

## Work packages

| WP | Name | Status |
|----|------|--------|
| 1 | Backup & Restore | Pending (after docs merge) |
| 2 | Operations (logs / disk / health) | Pending |
| 3 | Deployment (update / rollback) | Pending |
| 4 | Operations Runbook | Pending |
| 5 | Production Hardening | Pending |

### WP-1 north star

> If the VPS dies today, we can restore the system in a reasonable time.

Must include a **Recovery Drill**: backup → wipe DB → restore → `/health` ok → app usable → data intact. Evidence required.

---

## Constraints

Ops / deploy / security only. No business logic, Domain, API, AI, or architecture changes.

---

## Next

1. Merge docs-only kickoff PR after TL review.
2. Open PR-2: implement WP-1 only.
