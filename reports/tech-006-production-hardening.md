# TECH-006 — Production Hardening

| Field | Value |
|-------|-------|
| Date opened | 2026-07-19 |
| Status | **OPEN** |
| Baseline | [`founder-alpha-1`](https://github.com/Ekergodmear/recruiter_copilot/releases/tag/founder-alpha-1) |
| Spec | [`sprints/tech-006-production-hardening.md`](../sprints/tech-006-production-hardening.md) |
| Foundation Freeze | Intact |

---

## PR plan

| PR | Content | Status |
|----|---------|--------|
| PR-1 | Docs only | **Merged** (#2) |
| PR-2 | WP-1 Backup & Restore | **Merged** (#3) |
| PR-3 | WP-3 Deployment / Rollback | **Merged** (#4) |
| PR-4 | WP-4 Operations Runbook | In flight |
| PR-5 | WP-2 Operations Monitoring | Blocked on WP-4 |
| PR-6 | WP-5 Hardening | Blocked on predecessor |

---

## Work packages

| WP | Name | Status |
|----|------|--------|
| 1 | Backup & Restore | **Done** |
| 2 | Operations (logs / disk / health) | Pending |
| 3 | Deployment (update / rollback) | **Done** |
| 4 | Operations Runbook | In progress — `reports/tech-006-wp4-operations-runbook.md` |
| 5 | Production Hardening | Pending |

---

## Constraints

Ops / deploy / security only. No business logic, Domain, API, AI, or architecture changes.
