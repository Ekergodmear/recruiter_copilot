# Deploy & Rollback (TECH-006 WP-3)

Founder Alpha — Docker Compose only. No CI/CD, Kubernetes, Helm, ArgoCD, blue/green, or canary.

**Baseline rollback tag:** `founder-alpha-1`  
**Related:** [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) (WP-1) · [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

---

## Principles

1. **Backup before risky updates** (schema, Prisma, or data migrations).
2. **Verify after every change** (`compose ps` + `GET /health`).
3. Prefer **small deploys** from `main` after PR merge.
4. Keep a recorded **pre-deploy** git SHA + image id (scripts write under `deploy-history/`, gitignored).

---

## Safe update

### Manual

```bash
# 1) (Recommended) backup DB
./scripts/backup/backup.sh          # or backup.ps1

# 2) Get code
git fetch origin
git checkout main
git pull origin main

# 3) Deploy
docker compose --env-file .env.production up -d --build

# 4) Verify
docker compose --env-file .env.production ps
curl -s http://localhost:3000/health
```

Expect both services **healthy** and `"status":"ok"` with `database.connected: true`.

### Scripted

```powershell
.\scripts\deploy\update.ps1
# optional skip backup:
.\scripts\deploy\update.ps1 -SkipBackup
```

```bash
./scripts/deploy/update.sh
SKIP_BACKUP=1 ./scripts/deploy/update.sh
```

What the script does:

1. Optionally runs WP-1 backup  
2. Records pre-deploy git SHA + `api` image id → `deploy-history/`  
3. Tags current image as `aiheadhunter-api:previous`  
4. `docker compose up -d --build`  
5. Waits for `/health` ok  
6. Records post-deploy SHA + image id  

---

## Rollback

Choose the **smallest** rollback that restores service.

### A) Image rollback (fast — same machine)

Use when the new image misbehaves but DB is fine:

```powershell
.\scripts\deploy\rollback.ps1 -Mode image
```

```bash
./scripts/deploy/rollback.sh image
```

Restarts `api` from local tag `aiheadhunter-api:previous` (created by `update.*`).

### B) Git tag / SHA rollback (code + rebuild)

Use when you need a known-good tree (e.g. `founder-alpha-1`):

```powershell
.\scripts\deploy\rollback.ps1 -Mode git -Target founder-alpha-1
```

```bash
./scripts/deploy/rollback.sh git founder-alpha-1
```

Steps: `git checkout <target>` → `compose up -d --build` → health check.

**Warning:** checking out an old tag moves the working tree. Return to `main` after the emergency:

```bash
git checkout main
git pull origin main
```

### C) Compose recreate

If containers are wedged but image/code are fine:

```bash
docker compose --env-file .env.production up -d --force-recreate
docker compose --env-file .env.production ps
curl -s http://localhost:3000/health
```

### D) Database rollback (data / schema damage)

If the app is healthy but **data** is wrong, or entrypoint/`db push` left the DB unusable:

1. Keep API stopped if needed: `docker compose --env-file .env.production stop api`  
2. Restore last good dump — see [BACKUP_RESTORE.md](./BACKUP_RESTORE.md)  
3. Start API and verify `/health` + sample data  

Do **not** `docker compose down -v` unless you intend to destroy volumes.

---

## Deployment verification (mandatory)

After **update** or **rollback**:

| Check | Pass criteria |
|-------|----------------|
| `docker compose ps` | `api` and `postgres` **healthy** |
| `GET /health` | `"status":"ok"` |
| Persistence | `"persistence":"prisma"`, `database.connected: true` |
| Port | Host still serves Tunnel target (`localhost:3000` by default) |

Optional: hit one read-only business path you know (e.g. list jobs) if marker data exists.

---

## Out of scope (WP-3)

- GitHub Actions / CI deploy pipelines  
- Kubernetes, Helm, ArgoCD  
- Blue/green, canary, service mesh  
- Remote image registry (optional later; not required for Alpha)  

---

## Decision matrix (operator quick pick)

| Situation | Action |
|-----------|--------|
| Deploy failed, DB unchanged | Rollback **image** (`rollback.* -Mode image`) |
| Deploy failed, migration / `db push` damaged data | **Restore DB** (WP-1) + rollback **image** |
| Tunnel down / 502 from Cloudflare | Do **not** rollback app — fix Tunnel (see [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md)) |
| Docker image bad / API crash-loop after update | Rollback **image** |
| Data corrupted / wrong rows | **Restore DB** (WP-1) |
| Need known-good full tree | Git rollback to `founder-alpha-1` |
| Containers wedged, image/code fine | Compose force-recreate |

### Rollback modes (detail)

| Symptom | First try |
|---------|-----------|
| Bad new build, DB fine | **A) Image** (`previous`) |
| Need exact baseline code | **B) Git** `founder-alpha-1` |
| Containers stuck | **C) Force-recreate** |
| Data loss / bad migration | **D) WP-1 restore** |
