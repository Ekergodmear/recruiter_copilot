# PostgreSQL Production Guide

Baseline target: persistence via **Prisma → PostgreSQL 16**, restart-safe core aggregates, Docker Compose deploy.

## Architecture summary

| Layer | Implementation |
| ----- | -------------- |
| Framework | Fastify (`src/app/server.ts`) |
| ORM | Prisma 5 (`prisma/schema.prisma`, provider=`postgresql`) |
| DI | `createRepositories(config)` — `memory` \| `prisma` |
| Core SoT repos | Prisma when `PERSISTENCE_DRIVER=prisma` |
| Aux stores | JSONL under `STORAGE_PATH` (audit, notifications, saved searches, automation actions, integrations registry) |
| Files | Resume binaries + telemetry JSONL on volumes |

## Health contract (production)

```json
{
  "status": "ok",
  "persistence": "postgres",
  "database": {
    "configured": true,
    "connected": true,
    "dialect": "postgres",
    "latencyMs": 2
  }
}
```

## Deploy

```bash
cp .env.production.example .env.production
# set POSTGRES_PASSWORD + JWT_SECRET

docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production ps
curl -s http://localhost:3000/health
```

Entrypoint runs `prisma migrate deploy` then starts the API.

Optional seed on boot: `RUN_DB_SEED=true` in `.env.production`.

Manual seed:

```bash
docker compose --env-file .env.production exec api \
  node /app/prisma-cli.js db seed
```

## Nginx + SSL (optional)

```bash
# HTTP reverse proxy
docker compose --env-file .env.production --profile proxy up -d --build

# Issue cert + enable TLS (DNS must point here)
# Set DOMAIN + CERTBOT_EMAIL in .env.production
./scripts/ssl-init.sh
```

## Backup / restore

```bash
./scripts/backup.sh          # → backups/postgres-*.dump (pg_dump custom)
./scripts/restore.sh backups/postgres-….dump
```

Windows: `scripts/backup/backup.ps1`, `scripts/backup/restore.ps1`.

See also `docs/BACKUP_RESTORE.md`.

## Rollback

```bash
./scripts/deploy/rollback.sh image
# or
./scripts/deploy/rollback.sh git <tag>
```

See `docs/DEPLOY_ROLLBACK.md`.

## CI / Deploy automation

- `.github/workflows/ci.yml` — Postgres service + migrate + `pnpm run ci`
- `.github/workflows/deploy.yml` — build/migrate smoke; SSH deploy when `DEPLOY_HOST` / `DEPLOY_SSH_KEY` secrets are set

Required secrets for remote deploy: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, optional `DEPLOY_PATH`.
