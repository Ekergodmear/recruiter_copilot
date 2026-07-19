# Operations Runbook (TECH-006 WP-4)

Founder Alpha — **incident SOPs** for a tired operator. Step-by-step. No new platforms.

**Assumptions:** Docker Compose on one host · API on `localhost:3000` · Cloudflare Tunnel (manual) · Postgres not published · Baseline tag `founder-alpha-1`

**Related:** [DEPLOY_ROLLBACK.md](./DEPLOY_ROLLBACK.md) · [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) · [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

**Env file:** `.env.production` (use `docker compose --env-file .env.production …` everywhere below).

---

## After every fix — verification checklist

Do this before declaring the incident closed:

1. `docker compose --env-file .env.production ps` → `api` and `postgres` are **healthy**
2. `curl -s http://localhost:3000/health` → `"status":"ok"`
3. Health JSON: `persistence` = `prisma`, `database.connected` = `true`
4. Optional: one known read (e.g. jobs/candidates) if you have sample data
5. If public URL matters: open `https://app.recruittersup.online/health` (Tunnel path)

If still failing → see decision matrix in [DEPLOY_ROLLBACK.md](./DEPLOY_ROLLBACK.md).

---

## SOP-1 — API will not start / crash loop

### Symptoms

- `docker compose ps` shows `api` **Restarting** or **unhealthy**
- `docker compose logs api` repeats errors
- Host `:3000` connection refused

### Steps

1. Capture logs (do not clear them yet):

   ```bash
   docker compose --env-file .env.production logs api --tail 200
   ```

2. Confirm Postgres is healthy first (API depends on it):

   ```bash
   docker compose --env-file .env.production ps postgres
   ```

   If Postgres is down → **SOP-2**.

3. Common Alpha failure: `prisma db push` refuses because of unexpected tables / data-loss warning.

   - Prefer **restore from last good backup** (WP-1) over inventing schema fixes under pressure.
   - Do **not** casually add `--accept-data-loss` in production without understanding what will be dropped.

4. If the failure started right after a deploy:

   ```powershell
   .\scripts\deploy\rollback.ps1 -Mode image
   ```

5. If image rollback is not enough, restore DB then retry API:

   ```powershell
   .\scripts\backup\restore.ps1 -DumpPath backups\<latest>.dump
   ```

6. Last resort for code: git rollback to baseline (moves working tree):

   ```powershell
   .\scripts\deploy\rollback.ps1 -Mode git -Target founder-alpha-1
   ```

7. Run **After every fix** checklist.

### When to escalate / rollback to `founder-alpha-1`

- Unknown crash after deploy and image rollback does not stabilize within ~15 minutes.

---

## SOP-2 — PostgreSQL will not connect

### Symptoms

- Health: `database.connected: false` or API logs `P1000` / connection refused
- `postgres` container unhealthy or exited

### Steps

1. Status + logs:

   ```bash
   docker compose --env-file .env.production ps postgres
   docker compose --env-file .env.production logs postgres --tail 200
   ```

2. Restart Postgres only:

   ```bash
   docker compose --env-file .env.production restart postgres
   ```

   Wait until healthy, then restart API:

   ```bash
   docker compose --env-file .env.production restart api
   ```

3. Auth failures (`P1000`): password in `.env.production` no longer matches volume (password only applied on **first** volume init).

   - Do **not** change `POSTGRES_PASSWORD` hoping it updates a live volume.
   - Options: restore known-good volume/DB from backup on a fresh volume, or recover the previous password from your secret store.

4. Disk full often looks like DB failures → **SOP-5**.

5. If data is corrupt / empty after partial restore → WP-1 restore from last known-good dump.

6. Run **After every fix** checklist.

### When to use `founder-alpha-1`

- Rare for pure DB issues. Prefer backup restore. Use git baseline only if API code and DB expectations diverged after a bad deploy.

---

## SOP-3 — `/health` reports error (not ok)

### Symptoms

- HTTP non-200, or body without `"status":"ok"`
- Or `status: ok` but `database.connected: false`

### Steps

1. Read the body:

   ```bash
   curl -sS http://localhost:3000/health
   ```

2. Branch:

   | Observation | Go to |
   |-------------|--------|
   | Connection refused | **SOP-1** |
   | `database.connected: false` | **SOP-2** |
   | Container restarting | **SOP-1** |
   | Healthy locally, public URL fails | **SOP-4** |

3. If health failed only after deploy → image rollback (WP-3).

4. Run **After every fix** checklist.

---

## SOP-4 — Cloudflare Tunnel disconnected / public URL down

### Symptoms

- `https://app.recruittersup.online/health` fails
- Local `http://localhost:3000/health` still **ok**

### Steps

1. **Do not rollback the app** if local health is fine. This is edge/network.

2. Confirm local API:

   ```bash
   curl -s http://localhost:3000/health
   docker compose --env-file .env.production ps
   ```

3. Confirm Tunnel process on the host (how you installed it — service / `cloudflared` CLI). Restart Tunnel per your host setup.

4. Confirm Tunnel still targets `http://localhost:3000` (not an old remapped port).

5. Confirm host firewall allows local loopback to the API (Tunnel runs on the same machine).

6. Re-test public `/health`.

7. If local is also down → **SOP-1** / **SOP-3**, then re-check Tunnel.

### When to rollback app

- Only if local `/health` is also failing. Tunnel alone is not a reason to roll back image/git.

---

## SOP-5 — Disk full

### Symptoms

- Writes fail; Postgres cannot extend files; Docker “no space left”
- Backups fail mid-write

### Steps

1. Check free space (host):

   ```bash
   df -h
   ```

   Windows: check the drive hosting Docker Desktop data + the repo `backups/` folder.

2. Safe reclaim (prefer in this order):

   - Prune old dumps: keep newest N under `backups/` (`BACKUP_KEEP`, default 7) — run a successful backup once retention is configured, or delete oldest `postgres-*.dump` manually.
   - `docker image prune` (unused images only).
   - Clear old `deploy-history/` text files if huge (optional).
   - **Avoid** `docker volume prune` unless you intend to destroy data volumes.

3. Restart Postgres/API if they crashed due to ENOSPC:

   ```bash
   docker compose --env-file .env.production restart postgres api
   ```

4. Take a fresh backup once space is free (prove backup works again).

5. Run **After every fix** checklist.

### When to restore

- If DB became corrupt during a full-disk event → WP-1 restore from last good dump **before** the incident.

---

## SOP-6 — Backup failed

### Symptoms

- `backup.ps1` / `backup.sh` exits non-zero
- Dump missing, too small, or `pg_restore -l` fails

### Steps

1. Confirm stack healthy — especially Postgres (**SOP-2** if not).

2. Re-run backup and capture output:

   ```powershell
   .\scripts\backup\backup.ps1
   ```

3. Check disk space (**SOP-5**).

4. Confirm `.env.production` exists and `POSTGRES_*` match the running DB.

5. Confirm `docker compose exec postgres` works (Postgres not published — scripts need exec).

6. If backups keep failing: prioritize fixing Postgres/disk; do **not** deploy risky changes until a verified backup exists.

7. When backup succeeds: note path under `backups/` and confirm size + TOC verification message.

### When to rollback app

- Backup failure alone ≠ rollback. Rollback only if a deploy caused DB instability.

---

## Quick index

| Problem | SOP |
|---------|-----|
| API crash loop / won’t start | SOP-1 |
| Postgres / auth / connection | SOP-2 |
| `/health` not ok | SOP-3 |
| Tunnel / public URL only | SOP-4 |
| Disk full | SOP-5 |
| Backup failed | SOP-6 |

---

## Out of scope (WP-4)

- New monitoring SaaS, PagerDuty, etc. (see WP-2 later)
- New automation daemons beyond existing scripts
- Architecture or business code changes
