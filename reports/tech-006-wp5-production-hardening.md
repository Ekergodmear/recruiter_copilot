# TECH-006 WP-5 — Production Hardening

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Status | **READY FOR REVIEW** |
| Baseline | `founder-alpha-1` |
| Foundation Freeze | Intact |

---

## Deliverables

| Path | Role |
|------|------|
| `docs/PRODUCTION_HARDENING.md` | Secrets, firewall, least privilege, image hygiene, pre-public checklist |
| `.env.production.example` | Stronger secret / chmod guidance |
| `.dockerignore` | Exclude `backups/`, `deploy-history/` from image context |
| `docs/OPERATIONS_MONITORING.md` | Explicit exit code contract `0/1/2` |

---

## Evidence (host verify)

| Check | Result |
|-------|--------|
| `docker compose exec api whoami` | `node` (non-root) |
| Postgres ports | `5432/tcp` only — **not** `0.0.0.0:5432` |
| API ports | `0.0.0.0:3000->3000` (Tunnel target) |
| `git check-ignore .env.production` | Ignored via `.gitignore` |
| Monitor exit codes | Documented; live run returned `1` (disk WARN) with healthy API |

---

## Out of scope (confirmed)

WAF · IDS/IPS · Vault · Swarm · Kubernetes · service mesh · enterprise SIEM

---

## TECH-006 closure

With WP-5 merged, TECH-006 delivers:

1. Backup & restore (+ drill)  
2. Monitoring (+ log rotation)  
3. Deploy & rollback  
4. Incident runbook  
5. Hardening checklist  

No Domain / API / business / architecture redesign.
