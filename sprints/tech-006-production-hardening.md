# TECH-006 — Production Hardening

| Field | Value |
|-------|-------|
| Status | **OPEN** (docs kickoff) |
| Baseline | `founder-alpha-1` (Founder Alpha v0.1.0) |
| Foundation Freeze | **Intact — required** |
| Mode | Ops / deploy / security only |

---

## Background

Founder Alpha is complete and tagged:

- Git baseline: `founder-alpha-1` on `main`
- Runtime verified (Docker + Postgres + Prisma + `/health`)
- CI green
- Cloudflare Tunnel (manual) → `localhost:3000`

From this point, `founder-alpha-1` is **Baseline 1.0**:

- No history rewrite, no force push to `main`
- All new work branches from this baseline
- Every change must be rollback-able to `founder-alpha-1`
- Prefer small PRs with evidence, not a large working-tree dump

TECH-006 hardens **how we run** the Alpha — not **what the product does**.

---

## PR plan (mandatory order)

```text
TECH-006
├── PR-1 Docs only          ← this kickoff
├── PR-2 WP-1 Backup & Restore
├── PR-3 WP-3 Deployment / Rollback
├── PR-4 WP-4 Operations Runbook
├── PR-5 WP-2 Operations Monitoring
└── PR-6 WP-5 Hardening
```

Do **not** start WP-N+1 until WP-N (or docs PR) is reviewed and merged.  
Do **not** start WP-2…WP-5 until **WP-1** is merged.

---

## Task

Deliver production operations capability in **five independent work packages**.

### WP-1 — Backup & Restore

**Goal (north star):**

> If the VPS dies today, we can restore the system in a reasonable time.

**Targets (Founder Alpha — directional, not contractual SLA)**

| Metric | Target | Meaning |
|--------|--------|---------|
| **RTO** | ≤ 30 minutes | Time from “decide to restore” until `/health` ok + app usable |
| **RPO** | ≤ 24 hours | Max acceptable data loss (= backup cadence; daily backup meets this) |

Example: VPS dies at 15:00; last backup 02:00; restore done 15:20 → RTO 20m (pass), RPO 13h (pass if daily backups).

**Includes**

- PostgreSQL backup script (local / Compose; e.g. `pg_dump`)
- Restore script
- Backup retention policy (local files; keep-N or age-based)
- Backup verification (file exists, non-empty, readable / `pg_restore --list` or equivalent)
- Documented recovery procedure
- **Recovery Drill** (required — see Acceptance Criteria)

**Does not include**

- S3 / AWS / Azure / GCS
- Cloud cron / managed backup services
- Kubernetes
- WAL shipping
- Point-in-time recovery (PITR)
- Replication / High Availability

### WP-2 — Operations

- Log rotation guidance (and/or Compose logging options)
- Disk usage checks for volumes + host
- Basic health monitoring (poll `/health`; alert = human/process, not a new platform)

### WP-3 — Deployment

- Safe update procedure (`compose up -d --build` with checks)
- Rollback procedure to previous image / tag `founder-alpha-1`
- Evidence checklist after each deploy

### WP-4 — Operations Runbook

SOP documents only (no product code):

- API down
- DB unhealthy / auth / disk
- Cloudflare Tunnel disconnected

### WP-5 — Production Hardening

- Secrets hygiene (`.env.production`, password rotation notes)
- Firewall / published ports (API only; Postgres not public — already done)
- Least privilege reminders (container user, host access)
- Docker image hygiene (non-root, prune, no secrets in image)

---

## Acceptance Criteria

### Cross-cutting

- [ ] No Domain / Application business-rule / API contract / AI / Memory Bank / architecture changes
- [ ] Each WP has its own short report under `reports/tech-006-wpN-*.md` (or sections in one report if tiny)
- [ ] `pnpm run ci` remains green after any code/script change
- [ ] Rollback to `founder-alpha-1` still documented and possible
- [ ] Changes land via small PRs from baseline — not an unreviewed mega-dump

### WP-1

- [ ] Operator can backup Postgres with one documented command/script
- [ ] Operator can restore with one documented command/script
- [ ] Retention policy is implemented or clearly automated in the backup script
- [ ] Backup verification step exists (not “file appeared” alone)
- [ ] Recovery procedure documented for a tired operator
- [ ] **Recovery Drill completed and evidenced** — full path:

  ```text
  backup
    → wipe / destroy database (or equivalent destructive step)
    → restore from backup
    → GET /health → "status":"ok" (DB connected)
    → application usable
    → known data still present
  ```

  Evidence in `reports/tech-006-wp1-backup-restore.md` (commands + outcome).  
  “Backup succeeded” alone is **not** enough.

### WP-2

- [ ] Logs cannot grow unbounded without a documented control
- [ ] Disk / volume check steps exist in checklist
- [ ] `/health` monitoring steps documented (cron, external ping, or equivalent — no new SaaS required)

### WP-3

- [ ] Update + rollback SOPs exist and were dry-run or executed once
- [ ] Explicit “verify after deploy” steps (`compose ps`, `/health`)

### WP-4

- [ ] Three SOPs exist and are actionable by a tired operator at 2am
- [ ] Each SOP ends with “when to rollback to `founder-alpha-1`”

### WP-5

- [ ] Secrets / firewall / least-privilege / image hygiene documented
- [ ] No weakening of AWR security (Postgres not published; password not weak default in docs)

---

## Out of Scope (TECH-006 overall)

- Kubernetes, nginx, Redis, Terraform, Helm, ECS, autoscaling
- New reverse proxy in-repo
- Business features, AI modules, Domain redesign
- Changing public API contracts
- Replacing Cloudflare Tunnel setup (remains manual)
- Replacing `prisma db push` with migrate deploy (tracked separately; Beta)
- Fixing Fastify `disableRequestLogging` (GitHub issue #1)
- Cloud object-storage backups / PITR / replication (WP-1 explicitly excludes)

---

## Definition of Done

- All five WPs Accepted (or explicitly deferred by TL with reason)
- `docs/DEPLOYMENT_CHECKLIST.md` and/or `docs/PRODUCTION.md` updated with pointers to new SOPs
- TECH-006 closure report updated in `reports/tech-006-production-hardening.md`
- Baseline still: `founder-alpha-1` for rollback; new tag only if TL requests a hardening milestone

---

## Working rules (post–Founder Alpha)

```text
Branch from main @ founder-alpha-1 lineage
Small PR per WP (docs kickoff first)
Evidence > opinion
No force push
Rollback must remain possible
WP-1 before any other WP implementation
```
