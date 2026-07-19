# TECH-006 WP-4 — Operations Runbook

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Status | **READY FOR REVIEW** (docs-only) |
| Baseline | `founder-alpha-1` |
| Foundation Freeze | Intact |

---

## Deliverables

| Path | Role |
|------|------|
| `docs/OPERATIONS_RUNBOOK.md` | SOP-1…SOP-6 + post-fix checklist |
| `docs/DEPLOY_ROLLBACK.md` | Expanded operator decision matrix (TL note) |
| Checklist / Production pointers | Updated |

## SOPs covered

1. API will not start / crash loop  
2. PostgreSQL will not connect  
3. `/health` reports error  
4. Cloudflare Tunnel disconnected  
5. Disk full  
6. Backup failed  

Each SOP ends with when to consider `founder-alpha-1` / WP-1 restore / WP-3 rollback.

## Scope

- Documentation only — no new automation platforms  
- No Domain / API / Prisma / architecture changes  

## Out of scope

Monitoring SaaS (WP-2), hardening checklists (WP-5), CI/CD, Kubernetes.
