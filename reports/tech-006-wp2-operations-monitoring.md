# TECH-006 WP-2 — Operations Monitoring

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Status | **VERIFY PASS** (monitor executed) |
| Baseline | `founder-alpha-1` |
| Foundation Freeze | Intact |

---

## Deliverables

| Path | Role |
|------|------|
| `scripts/ops/monitor.ps1` / `monitor.sh` | One-shot health/container/disk/backup/log check |
| `docs/OPERATIONS_MONITORING.md` | Operator guide + optional cron/Task Scheduler |
| `docker-compose.yml` | `json-file` log rotation `10m` × 5 files |
| Runbook | Incident severity table (TL note from WP-4) |

**Not included:** Prometheus, Grafana, ELK, Loki, Datadog, New Relic, OTel, Alertmanager.

---

## Verification (2026-07-19)

```powershell
.\scripts\ops\monitor.ps1
```

| Check | Result |
|-------|--------|
| api / postgres healthy | **OK** |
| `/health` status=ok, DB connected | **OK** |
| Backup age (~0.26h < 24h) | **OK** |
| API log error patterns | **OK** (none) |
| Disk used % | **WARN** 85.4% ≥ 80% (host C:) — exit code `1` |
| Compose log config on api | `json-file` `max-size=10m` `max-file=5` |

`RESULT=WARN` is correct behavior on this host (disk threshold), not a script failure. Critical path (containers + health) passed.

---

## How to use

- Ad-hoc: run `monitor.*` after deploy or when unsure  
- Scheduled: host cron / Task Scheduler every 15 minutes (documented)  
- On exit `2` → [OPERATIONS_RUNBOOK.md](../docs/OPERATIONS_RUNBOOK.md)  
- On exit `1` → treat as P3 severity  

---

## Scope confirmation

No Domain / API / Prisma schema / business logic changes. Compose change limited to logging driver options.
