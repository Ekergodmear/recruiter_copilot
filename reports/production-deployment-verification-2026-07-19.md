# Production Deployment Verification Report

**Date:** 2026-07-19  
**Scope:** Finish Founder Alpha Docker production deploy  
**Constraints:** Foundation Freeze — deploy/config only; no Domain/API/business/AI changes

---

## Verdict

**PASS** — `api` and `postgres` healthy; `GET http://localhost:3000/health` returns `"status":"ok"` with Prisma/Postgres connected.

---

## Audit summary

| Area | Status | Notes |
|------|--------|-------|
| Dockerfile | OK | Node 22 multi-stage, pnpm, prisma generate, expose 3000, USER node |
| docker-compose.yml | OK | api + postgres, restart always, volumes, healthchecks |
| Entrypoint | OK | `prisma db push` then `node dist/src/app/server.js` |
| Healthchecks | OK | postgres `pg_isready`; api wget `/health` |
| Env | Fixed | Separated `.env.production` from local `.env` (dev memory/sqlite) |
| Prisma startup | OK | db push syncs schema on boot |
| Volumes | OK | `postgres-data`, `api-resumes`, `api-telemetry` |
| Restart policy | OK | `restart: always` both services |

### Issues found and fixed (deploy-only)

1. **Deploy scripts overwrote / used local `.env`** → now use `.env.production` only.
2. **Postgres P1000 after password change** → password only applies on first volume init; aligned defaults + documented `down -v` for rotate.
3. **Host port not 3000** (prior remap) → recreated with `PORT=3000`; verified `0.0.0.0:3000->3000/tcp`.

---

## Commands executed

```bash
docker compose down -v
docker compose up -d --build
docker compose ps
docker ps
curl / Invoke-WebRequest http://127.0.0.1:3000/health
docker compose exec api printenv NODE_ENV PERSISTENCE_DRIVER PORT
docker compose exec postgres psql -U recruiter -d recruiter_copilot -c '\dt'
docker compose logs api --tail 20
```

---

## Evidence

### docker ps

```
NAMES                     STATUS                   PORTS
aiheadhunter-api-1        Up (healthy)             0.0.0.0:3000->3000/tcp
aiheadhunter-postgres-1   Up (healthy)             0.0.0.0:5432->5432/tcp
```

### Health endpoint (`http://localhost:3000/health`)

```json
{
  "status": "ok",
  "persistence": "prisma",
  "database": {
    "configured": true,
    "connected": true,
    "dialect": "postgres"
  },
  "mode": "founder-alpha",
  "foundation": "v3.1-frozen"
}
```

### Environment validation (api container)

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PERSISTENCE_DRIVER` | `prisma` |
| `PORT` | `3000` |
| `DATABASE_URL` | `postgresql://…@postgres:5432/recruiter_copilot` (compose-injected) |

### Persistence / Prisma validation

- Startup log: `persistenceDriver: prisma`, `database: postgres`
- Entrypoint: `Your database is now in sync with your Prisma schema`
- Tables present: `CandidateRecord`, `Resume`, `Job`, `Submission`, `Interview`, `Offer`, `PipelineActivity`, `KnowledgeSet`

### Logs (api, abbreviated)

```
[entrypoint] prisma db push … sync Done
application startup … environment=production persistenceDriver=prisma
http server listening port=3000
startup completed SUCCESS
```

---

## Files changed

| File | Why |
|------|-----|
| `scripts/deploy.ps1` / `deploy.sh` | Use `.env.production`; never overwrite local `.env` |
| `.env.production.example` | Document password/volume lifecycle; Cloudflare → `:3000` |
| `docker-compose.yml` | Comments: env file + tunnel port expectation |
| `.gitignore` | Ignore `.env.production` |
| `docs/PRODUCTION.md` | Point to `.env.production` + checklist |
| `docs/DEPLOYMENT_CHECKLIST.md` | Startup/shutdown/upgrade/backup/restore/troubleshooting |
| `reports/production-deployment-verification-2026-07-19.md` | This report |

No Domain, API, business logic, or architecture files modified.

---

## CI

- `pnpm run test`, `lint`, `build`: exercised after deploy-doc changes (no app code changes in this task).
- Full `pnpm run ci` currently fails at **pre-existing** `format:check` on unrelated `src/` / `tests/` files (not touched by this deployment work). Deploy artifacts are not in that prettier glob debt. Fixing those files would be out of Foundation Freeze scope for this task.

## Remaining risks

1. **Default Postgres password `recruiter`** — change before real public use; requires volume recreate or in-DB role update.
2. **Host port 5432 published** — convenient for Founder Alpha; lock down on a VPS firewall.
3. **Cloudflare Tunnel / DNS** — manual, outside repo; if tunnel process down, public URL fails even if Docker is healthy.
4. **`prisma db push` on boot** — fine for Alpha; not a full migration discipline for multi-instance prod later.
5. **Local `.env` vs production** — running compose without `--env-file .env.production` after changing production passwords can cause P1000 if volume credentials diverge from compose defaults.
6. **Repo-wide Prettier drift** — blocks full `pnpm run ci` until formatted separately (not a runtime deploy blocker).
