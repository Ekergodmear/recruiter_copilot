# Backup & Restore (TECH-006 WP-1)

Founder Alpha — **local** PostgreSQL backups via Docker Compose. No cloud object storage.

**Baseline:** `founder-alpha-1`  
**Targets:** RTO ≤ 30 minutes · RPO ≤ 24 hours (daily backup cadence)

---

## Prerequisites

- Stack running: `docker compose --env-file .env.production up -d`
- `.env.production` present (not committed)
- Postgres is **not** published to the host — scripts use `docker compose exec`

---

## Backup

```powershell
# Windows
.\scripts\backup\backup.ps1
```

```bash
# Linux / macOS / Git Bash
chmod +x scripts/backup/*.sh
./scripts/backup/backup.sh
```

Creates `backups/postgres-<db>-<utc-timestamp>.dump` (custom format).

**Verification (automatic):** file size + `pg_restore -l` TOC listing.

**Retention:** keep newest `BACKUP_KEEP` dumps (default **7**). Set via env:

```bash
BACKUP_KEEP=14 ./scripts/backup/backup.sh
```

---

## Restore

```powershell
.\scripts\backup\restore.ps1 -DumpPath backups\postgres-recruiter_copilot-YYYYMMDDTHHMMSSZ.dump
```

```bash
./scripts/backup/restore.sh backups/postgres-recruiter_copilot-YYYYMMDDTHHMMSSZ.dump
```

**Effect:** stops API → drops & recreates database → `pg_restore` → starts API → waits for `/health` `"status":"ok"`.

---

## Recovery procedure (VPS loss)

1. Provision host + Docker; clone repo at known-good tag (`founder-alpha-1` or later).
2. Restore `.env.production` (secrets — stored offline / password manager).
3. `docker compose --env-file .env.production up -d --build` (fresh volumes OK).
4. Copy latest `.dump` onto the host under `backups/`.
5. Run restore script against that dump.
6. Confirm `GET http://localhost:3000/health` and sample data.
7. Re-attach Cloudflare Tunnel → `localhost:3000` if needed.

If dump is older than 24h, you have missed the RPO target — take more frequent backups.

---

## Recovery Drill (required for WP-1)

Must prove restore works, not only that backup files appear:

```text
insert known marker into an existing Prisma table (e.g. Job)
  → backup
  → wipe database
  → restore
  → GET /health → status ok
  → marker present / app usable
```

Do **not** create ad-hoc tables for markers: Alpha API entrypoint runs `prisma db push` on start and will refuse to drop unknown tables without `--accept-data-loss`.

Evidence: `reports/tech-006-wp1-backup-restore.md`

---

## Out of scope

S3/GCS/Azure · cloud cron · WAL shipping · PITR · replication · HA · Kubernetes
