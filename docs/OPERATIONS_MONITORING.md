# Operations Monitoring (TECH-006 WP-2)

Founder Alpha — **know the system is alive** without a metrics platform.

**Not in scope:** Prometheus, Grafana, ELK, Loki, Datadog, New Relic, OTel collector, Alertmanager, cloud monitoring suites.

**Related:** [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) · [BACKUP_RESTORE.md](./BACKUP_RESTORE.md)

---

## What we monitor

| Signal | How | Threshold (default) |
|--------|-----|---------------------|
| API health | `GET /health` | Must contain `"status":"ok"`; DB connected |
| Containers | `docker compose ps` | `api` + `postgres` **running** + **healthy** |
| Disk | Free space on host volume hosting the repo / Docker data | Warn if used ≥ **80%** |
| Backup age | Newest `backups/postgres-*.dump` | Warn if older than **24h** (RPO) |
| Logs | Last 80 lines of `api` logs | Warn if ERROR / FAIL / P1000 / ENOSPC patterns |

---

## One-shot check

```powershell
.\scripts\ops\monitor.ps1
echo $LASTEXITCODE   # 0=ok, 1=warn, 2=critical
```

```bash
chmod +x scripts/ops/monitor.sh
./scripts/ops/monitor.sh
echo $?              # 0=ok, 1=warn, 2=critical
```

### Environment knobs

| Env | Default | Meaning |
|-----|---------|---------|
| `ENV_FILE` | `.env.production` | Compose env file |
| `PORT` | `3000` | Local health URL port |
| `BACKUP_DIR` | `backups` | Dump directory |
| `BACKUP_MAX_AGE_HOURS` | `24` | RPO-aligned warn |
| `DISK_WARN_PCT` | `80` | Disk used % warn |

---

## Scheduling (optional, host-native)

No cloud cron product required.

**Linux cron (every 15 minutes):**

```cron
*/15 * * * * cd /path/to/repo && ./scripts/ops/monitor.sh >> /var/log/recruiter-monitor.log 2>&1
```

**Windows Task Scheduler:** run `powershell -File C:\path\to\repo\scripts\ops\monitor.ps1` on a 15-minute trigger; redirect output to a log file if desired.

If exit code is `2`, open [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) at the matching SOP (usually SOP-1/2/3).  
If exit code is `1`, treat as **P3** (severity table in the runbook).

---

## Log rotation

Compose services use the Docker `json-file` driver with:

- `max-size: 10m`
- `max-file: 5`

per service (`docker-compose.yml`). This bounds container log growth on disk without ELK.

Apply by recreating containers after pull:

```bash
docker compose --env-file .env.production up -d
```

---

## Manual spot checks

```bash
docker compose --env-file .env.production ps
curl -s http://localhost:3000/health
docker compose --env-file .env.production logs api --tail 50
df -h .
ls -lt backups/postgres-*.dump | head
```

---

## Out of scope

Metrics databases, dashboards, distributed tracing, paging integrations, synthetic multi-region probes.
