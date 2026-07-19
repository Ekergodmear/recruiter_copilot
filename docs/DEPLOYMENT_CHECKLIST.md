# Deployment Checklist — Founder Alpha

Foundation Freeze. Docker Compose only (`api` + `postgres`). No Kubernetes, nginx, Redis, or reverse-proxy changes in-repo.

**Public URL (manual Cloudflare Tunnel):** `https://app.recruittersup.online` → `http://localhost:3000`

---

## 1. Startup

```bash
# First time on a host: create production env (do not overwrite local .env used for pnpm dev)
cp .env.production.example .env.production
# REQUIRED: replace POSTGRES_PASSWORD=CHANGE_ME_BEFORE_PRODUCTION with a strong secret

# Recommended (explicit production env)
docker compose --env-file .env.production up -d --build

# Also valid when compose defaults match volume credentials
docker compose up -d --build

# Or helper
./scripts/deploy.sh          # Linux / macOS
.\scripts\deploy.ps1         # Windows
```

Wait until both services are healthy:

```bash
docker compose ps
curl -s http://localhost:3000/health
```

Expect `"status":"ok"` and `"persistence":"prisma"` with `database.connected: true`.

---

## 2. Shutdown

```bash
# Stop containers; keep volumes (DB + resumes + telemetry)
docker compose down

# Stop and DELETE all named volumes (DESTROYS DATA)
docker compose down -v
```

---

## 3. Upgrade / Rollback

See **[DEPLOY_ROLLBACK.md](./DEPLOY_ROLLBACK.md)** (TECH-006 WP-3).

```powershell
.\scripts\deploy\update.ps1
# rollback bad image (after an update that tagged :previous):
.\scripts\deploy\rollback.ps1 -Mode image
# rollback code to baseline tag:
.\scripts\deploy\rollback.ps1 -Mode git -Target founder-alpha-1
```

```bash
./scripts/deploy/update.sh
./scripts/deploy/rollback.sh image
./scripts/deploy/rollback.sh git founder-alpha-1
```

Always verify: `docker compose ps` + `curl -s http://localhost:3000/health`.

Entrypoint runs `prisma db push` on each start (schema sync). No separate migrate step for Founder Alpha. Data/schema damage → WP-1 restore.

---

## 4. Backup

See **[BACKUP_RESTORE.md](./BACKUP_RESTORE.md)** (TECH-006 WP-1).

```powershell
.\scripts\backup\backup.ps1
```

```bash
./scripts/backup/backup.sh
```

Named volumes (Compose project `aiheadhunter` by default):

| Volume | Contents |
|--------|----------|
| `aiheadhunter_postgres-data` | PostgreSQL data |
| `aiheadhunter_api-resumes` | Uploaded resumes |
| `aiheadhunter_api-telemetry` | Telemetry JSONL |

---

## 5. Restore

```powershell
.\scripts\backup\restore.ps1 -DumpPath backups\postgres-….dump
```

```bash
./scripts/backup/restore.sh backups/postgres-….dump
```

After restore: `curl -s http://localhost:3000/health` → `"status":"ok"`.

Postgres password is applied only on first volume init — restore scripts recreate the **database**, not the Postgres role/volume credentials.

---

## 6. Monitoring

Lightweight checks (no Prometheus/Grafana): **[OPERATIONS_MONITORING.md](./OPERATIONS_MONITORING.md)** (TECH-006 WP-2).

```powershell
.\scripts\ops\monitor.ps1
```

```bash
./scripts/ops/monitor.sh
```

Exit codes: `0` ok · `1` warn · `2` critical. On critical → runbook SOPs.

---

## 7. Incident runbook

Step-by-step SOPs: **[OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md)** (TECH-006 WP-4).

| Problem | Start at |
|---------|----------|
| API crash loop | SOP-1 |
| Postgres / connection | SOP-2 |
| `/health` not ok | SOP-3 |
| Tunnel / public URL only | SOP-4 |
| Disk full | SOP-5 |
| Backup failed | SOP-6 |

Always finish with the runbook **After every fix** checklist.

---

## 8. Troubleshooting (short)

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| API restart loop, `P1000 Authentication failed` | `POSTGRES_PASSWORD` ≠ password baked into `postgres-data` volume | Align password in `.env.production` **or** `docker compose down -v` and recreate (data loss) |
| Host not `:3000` / Tunnel 502 | Another process bound 3000, or `PORT` remap | Free port 3000; set `PORT=3000` in `.env.production`; recreate api |
| `unhealthy` api | App crash or DB down | `docker compose logs -f api` |
| Local `pnpm` / tests broken after deploy script | Old scripts overwrote `.env` | Keep `.env` for local (memory/sqlite); use `.env.production` for Compose |
| Prisma provider mismatch locally | Expected | Host schema stays sqlite; image injects postgresql at build |

```bash
docker compose logs -f api
docker compose logs -f postgres
docker compose restart api
docker inspect --format '{{.State.Health.Status}}' aiheadhunter-api-1
```

---

## 9. Verification steps

- [ ] `docker compose ps` → `api` and `postgres` both **healthy**
- [ ] `curl http://localhost:3000/health` → `"status":"ok"`
- [ ] Health JSON: `persistence` = `prisma`, `database.connected` = `true`, `database.dialect` = `postgres`
- [ ] `docker compose exec api printenv NODE_ENV` → `production`
- [ ] `docker compose exec api printenv PERSISTENCE_DRIVER` → `prisma`
- [ ] Ports: `0.0.0.0:3000->3000/tcp`
- [ ] Cloudflare Tunnel still points at `http://localhost:3000` (manual; out of repo)
- [ ] Optional: `https://app.recruittersup.online/health` returns ok

---

## 10. Security / hardening

Full checklist: **[PRODUCTION_HARDENING.md](./PRODUCTION_HARDENING.md)** (TECH-006 WP-5).

- Never ship with `POSTGRES_PASSWORD=CHANGE_ME_BEFORE_PRODUCTION`. Set a strong secret before first volume init.
- Keep `OPERATIONS_DASHBOARD_ENABLED=false` on public hosts.
- Postgres is **not** published to the host (`expose` only). Do not add `ports: 5432` for production.
- API container runs as non-root (`node`).
- Tunnel / TLS terminate at Cloudflare (manual) — not managed by this repo.
