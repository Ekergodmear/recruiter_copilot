# Production Hardening (TECH-006 WP-5)

Founder Alpha — **security & privilege checklist** before exposing the product. No Vault, WAF, IDS, Swarm, Kubernetes, or service mesh.

**Baseline:** `founder-alpha-1`  
**Related:** [PRODUCTION.md](./PRODUCTION.md) · [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) · [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md)

---

## 1. Secrets (`.env.production`)

| Rule | Detail |
|------|--------|
| Never commit | `.env.production` is gitignored. Only `.env.production.example` is in git. |
| Separate from local | Local `.env` may use sqlite/memory for dev — do not reuse for Compose production. |
| Strong DB password | Replace `CHANGE_ME_BEFORE_PRODUCTION` before first public traffic. |
| Password lifecycle | Postgres applies `POSTGRES_PASSWORD` **only on first volume init**. Rotating later needs a planned volume recreate + WP-1 restore, or in-DB `ALTER USER`. |
| Offline copy | Keep a copy of production secrets in a password manager / offline sealed note — not in chat, not in git. |
| Share carefully | Do not paste `.env.production` into tickets or screenshots. |
| Compose injection | `DATABASE_URL` is built in `docker-compose.yml` from `POSTGRES_*` — do not bake passwords into the image. |

### Quick checks

```bash
git check-ignore -v .env.production    # should be ignored
grep -R "CHANGE_ME_BEFORE_PRODUCTION" .env.production && echo "REPLACE PASSWORD"
```

---

## 2. Firewall / network exposure

**Current Compose posture (keep it):**

| Port | Published to host? | Notes |
|------|--------------------|-------|
| API `3000` | Yes (`PORT` → 3000) | Required for Cloudflare Tunnel → `localhost:3000` |
| Postgres `5432` | **No** (`expose` only) | Reachable only on Docker network |

### Host / VPS checklist

- [ ] Public firewall: **do not** open `5432` to the internet.
- [ ] Prefer Cloudflare Tunnel (or similar) so the host need not expose `3000` publicly if Tunnel runs on-box.
- [ ] If you must bind `3000` on a public NIC, restrict source IPs or terminate TLS at Cloudflare and keep origin locked down.
- [ ] SSH: key-only, non-default user, fail2ban or equivalent if the host is a VPS.
- [ ] Confirm: `docker compose ps` shows postgres as `5432/tcp` **without** `0.0.0.0:5432->…`.

---

## 3. Least privilege

| Layer | Alpha posture |
|-------|----------------|
| API container user | Runs as **`node`** (`USER node` in Dockerfile) — not root. |
| Filesystem | App data under `/app/data/*` owned by `node`; volumes for resumes/telemetry. |
| Host | Do not run Compose as root unnecessarily; protect `.env.production` mode `600` on Linux (`chmod 600 .env.production`). |
| Ops dashboard | Keep `OPERATIONS_DASHBOARD_ENABLED=false` on public hosts. |
| Rate limits | Keep `RATE_LIMIT_ENABLED=true` in production env (default in compose). |

### Verify non-root

```bash
docker compose --env-file .env.production exec -T api whoami
# expect: node
```

---

## 4. Docker image hygiene

| Practice | Status / action |
|----------|-----------------|
| Multi-stage build | Yes — deps/build/runner |
| Production deps prune | Yes — `pnpm prune --prod` (+ Prisma CLI retained for Alpha `db push`) |
| No secrets in image | `.dockerignore` excludes `.env*` (except example); never `COPY .env` |
| Non-root runtime | `USER node` |
| Slim base | `node:22-bookworm-slim` |
| Rebuild regularly | After security patches: `docker compose --env-file .env.production up -d --build` |
| Prune unused images | `docker image prune` (careful; keep `:previous` if you rely on WP-3 image rollback) |
| Do not bake dumps | `backups/` and `deploy-history/` must not be copied into the image |

---

## 5. Pre-public security checklist

Complete before inviting real recruiters / opening the Tunnel to broader traffic:

- [ ] `POSTGRES_PASSWORD` is strong and not the example placeholder  
- [ ] `.env.production` not in git; permissions restricted on disk  
- [ ] Postgres **not** published to host  
- [ ] `OPERATIONS_DASHBOARD_ENABLED=false`  
- [ ] `RATE_LIMIT_ENABLED=true`  
- [ ] `.\scripts\ops\monitor.ps1` (or `.sh`) run once — understand WARN vs CRITICAL  
- [ ] Fresh verified backup exists (`scripts/backup/*`)  
- [ ] You know rollback paths: image / git `founder-alpha-1` / WP-1 restore  
- [ ] Tunnel target is `http://localhost:3000`  
- [ ] `/health` returns `"status":"ok"` locally (and via public URL if used)  
- [ ] Runbook bookmarked: [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md)  

---

## 6. Monitor exit codes (WP-2 — explicit)

| Exit | Meaning | Typical response |
|------|---------|------------------|
| `0` | Healthy | No action |
| `1` | Warning (e.g. disk ≥ 80%, backup older than RPO, noisy logs) | P3 — same-day attention |
| `2` | Critical (API/container/`/health`/DB down) | P1/P2 — open runbook SOPs |

---

## Out of scope (WP-5)

WAF · IDS/IPS · HashiCorp Vault · Docker Swarm · Kubernetes · service mesh · enterprise SIEM/EDR suites
