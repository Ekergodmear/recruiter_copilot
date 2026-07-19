# TECH-006 — Production Hardening

| Field | Value |
|-------|-------|
| Date opened | 2026-07-19 |
| Status | **OPEN** |
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
| PR-1 | Docs only | **Merged** (#2) |
| PR-2 | WP-1 Backup & Restore | **Merged** (#3) |
| PR-3 | WP-3 Deployment / Rollback | In flight |
| PR-4 | WP-4 Operations Runbook | Blocked on WP-3 |
| PR-5 | WP-2 Operations Monitoring | Blocked on WP-4 |
| PR-6 | WP-5 Hardening | Blocked on predecessor |

---

## Work packages

| WP | Name | Status |
|----|------|--------|
| 1 | Backup & Restore | **Done** — `reports/tech-006-wp1-backup-restore.md` |
| 2 | Operations (logs / disk / health) | Pending |
| 3 | Deployment (update / rollback) | In progress — `reports/tech-006-wp3-deploy-rollback.md` |
| 4 | Operations Runbook | Pending |
| 5 | Production Hardening | Pending |

---

## Constraints

Ops / deploy / security only. No business logic, Domain, API, AI, or architecture changes.
