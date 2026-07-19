# Production deployment (Founder Alpha)

Foundation Freeze remains intact. This guide covers **Docker-only** packaging — no Domain / API / business-rule changes.

## Stack

| Service | Image / build | Role |
|---------|---------------|------|
| `api` | local `Dockerfile` (Node 22) | Recruiter Copilot API |
| `postgres` | `postgres:16-alpine` | Prisma persistence |

Volumes: `postgres-data`, `api-resumes`, `api-telemetry`.

## Prerequisites

- Docker Engine + Compose v2
- Open ports: `3000` (API only). Postgres stays on the Docker network (not published).

## Quick start

```bash
# 1. Production env (keep local .env for pnpm / tests — do not overwrite)
cp .env.production.example .env.production
# Edit POSTGRES_PASSWORD before any public deploy (requires volume recreate)

# 2. Build & run
docker compose --env-file .env.production up -d --build
# or: docker compose up -d --build  (uses compose defaults; credentials must match volume)

# Or helper scripts
./scripts/deploy.sh          # Linux / macOS / Git Bash
.\scripts\deploy.ps1         # Windows PowerShell
```

API: [http://localhost:3000/health](http://localhost:3000/health)  
Ops checklist: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) · Backup/restore: [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) · Deploy/rollback: [DEPLOY_ROLLBACK.md](./DEPLOY_ROLLBACK.md) · Incidents: [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) · Monitoring: [OPERATIONS_MONITORING.md](./OPERATIONS_MONITORING.md) · Hardening: [PRODUCTION_HARDENING.md](./PRODUCTION_HARDENING.md)  
Tunnel (manual): Cloudflare → `http://localhost:3000` → `app.recruittersup.online`

## Common commands

```bash
# Start (detached, rebuild if needed)
docker compose up -d --build

# Follow logs
docker compose logs -f
docker compose logs -f api
docker compose logs -f postgres

# Restart
docker compose restart
docker compose restart api

# Stop containers (keeps volumes)
docker compose down

# Stop and remove named volumes (DESTRUCTIVE — deletes DB data)
docker compose down -v
```

## Environment

See [`.env.production.example`](../.env.production.example).

Critical:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PERSISTENCE_DRIVER` | `prisma` |
| `DATABASE_URL` | set by compose from `POSTGRES_*` → `postgresql://…@postgres:5432/…` |

## Healthchecks

- **Postgres:** `pg_isready`
- **API:** `GET /health` must contain `"status":"ok"` (DB connectivity included)

```bash
docker compose ps
curl -s http://localhost:3000/health
```

## Image notes

- Multi-stage Node **22** LTS + pnpm
- `prisma generate` at build time
- Entrypoint runs `prisma db push` (Alpha only — replace with `migrate deploy` before Beta) then starts the API
- Build overlays Prisma `provider` to `postgresql` **inside the image only** — local/dev checkout stays SQLite for tests

## Security reminders (TECH-005)

- Change default Postgres password
- Keep `OPERATIONS_DASHBOARD_ENABLED=false` on public hosts
- Rate limiting defaults on in production compose
- Prefer reverse proxy (TLS) in front of port 3000 on a real VPS

## Foundation Freeze

No Domain, Application, Workflow, or REST contract changes are required for this deploy path.
