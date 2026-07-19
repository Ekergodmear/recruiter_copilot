# TECH-006 WP-1 — Backup & Restore

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Status | **DRILL PASS** (evidence below) |
| Baseline | `founder-alpha-1` |
| Spec | `sprints/tech-006-production-hardening.md` |
| Foundation Freeze | Intact |

---

## Deliverables

| Path | Role |
|------|------|
| `scripts/backup/backup.ps1` / `backup.sh` | Backup + verify + retention |
| `scripts/backup/restore.ps1` / `restore.sh` | Destructive restore + health wait |
| `docs/BACKUP_RESTORE.md` | Operator procedure |
| `backups/` | Local dump dir (gitignored `*.dump`) |

**Not changed:** Domain, API, Prisma schema, Docker architecture, business logic.

---

## Targets

| Metric | Target | Drill result |
|--------|--------|--------------|
| RTO | ≤ 30 min | **~9–15 s** (local Compose drill) |
| RPO | ≤ 24 h | Met by on-demand / daily local backups |

---

## Recovery Drill (executed 2026-07-19)

### Procedure

```text
1. Insert known marker row into "Job" (id = job_tech006_drill_*)
2. .\scripts\backup\backup.ps1  → verify size + pg_restore -l
3. STOP api; DROP DATABASE recruiter_copilot; CREATE DATABASE …
4. Confirm public tables = 0
5. .\scripts\backup\restore.ps1 -DumpPath <dump>
6. GET /health → "status":"ok", database.connected=true
7. SELECT marker from "Job" → row present
```

### Evidence

| Step | Result |
|------|--------|
| Marker id | `job_tech006_drill_20260719103530` |
| Dump | `backups/postgres-recruiter_copilot-20260719T033531Z.dump` (~15232 bytes, 54 TOC lines) |
| Wipe | `public_tables_after_wipe=0` |
| Restore script | `Restore OK - /health status=ok` |
| Health JSON | `"status":"ok"`, `"persistence":"prisma"`, `"database":{"connected":true,"dialect":"postgres"}` |
| Marker after restore | `job_tech006_drill_20260719103530 \| TECH006 Drill Marker` (1 row) |
| Elapsed | ~9–15 seconds (well under RTO 30m) |

### Health sample (post-restore)

```json
{
  "status": "ok",
  "persistence": "prisma",
  "database": {
    "configured": true,
    "connected": true,
    "dialect": "postgres"
  }
}
```

### Marker query (post-restore)

```text
 id                               | title
----------------------------------+----------------------
 job_tech006_drill_20260719103530 | TECH006 Drill Marker
```

---

## Operator notes

- Postgres is not published; scripts use `docker compose exec` / `cp`.
- Retention default: `BACKUP_KEEP=7`.
- Drill markers should use an **existing Prisma table** (e.g. `Job`). Ad-hoc tables break Alpha entrypoint `prisma db push` on API start.
- Dump files stay local under `backups/` (not committed).

---

## Out of scope (confirmed)

S3/GCS/Azure · cloud cron · WAL · PITR · replication · HA · Kubernetes
