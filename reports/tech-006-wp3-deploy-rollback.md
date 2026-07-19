# TECH-006 WP-3 — Deployment / Rollback

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Status | **VERIFY PASS** |
| Baseline | `founder-alpha-1` |
| Spec | `sprints/tech-006-production-hardening.md` |
| Foundation Freeze | Intact |

---

## Deliverables

| Path | Role |
|------|------|
| `docs/DEPLOY_ROLLBACK.md` | Update + rollback SOPs (image / git / compose / DB) |
| `scripts/deploy/update.ps1` / `update.sh` | Safe update + history + health wait |
| `scripts/deploy/rollback.ps1` / `rollback.sh` | Image or git rollback + health wait |
| Checklist / Production pointers | Updated |

**Not changed:** Domain, API, Prisma schema, Docker architecture, business logic.  
**Not included:** CI/CD, Kubernetes, Helm, ArgoCD, blue/green, canary.

---

## Verification (executed 2026-07-19)

### 1) Update path

```powershell
.\scripts\deploy\update.ps1 -SkipBackup
```

| Check | Result |
|-------|--------|
| Tag `aiheadhunter-api:previous` | Created from prior `latest` (`8070b0760aa7`) |
| `compose up -d --build` | OK |
| `/health` after update | `"status":"ok"`, DB connected |
| `compose ps` | api + postgres **healthy** |
| History | `deploy-history/pre-*.txt` + `post-*.txt` written |

### 2) Image rollback path

```powershell
.\scripts\deploy\rollback.ps1 -Mode image
```

| Check | Result |
|-------|--------|
| Retag `previous` → `latest` | OK |
| `compose up -d --no-build api` | OK |
| `/health` after rollback | `"status":"ok"`, DB connected |
| Services | both **healthy** |

### 3) Git rollback readiness (dry)

| Check | Result |
|-------|--------|
| Tag `founder-alpha-1` resolvable | Yes (`git rev-parse founder-alpha-1^{commit}`) |
| Documented | `rollback.ps1 -Mode git -Target founder-alpha-1` |

Git checkout of baseline was **not** executed on this machine (would move working tree off `main`); procedure is documented for incidents.

### 4) Database rollback

Documented as WP-1 restore path in `DEPLOY_ROLLBACK.md` (already drill-proven in WP-1).

---

## Operator summary

| Goal | Command |
|------|---------|
| Update | `.\scripts\deploy\update.ps1` |
| Fast image rollback | `.\scripts\deploy\rollback.ps1 -Mode image` |
| Baseline code rollback | `.\scripts\deploy\rollback.ps1 -Mode git -Target founder-alpha-1` |
| Bad data | WP-1 `restore.ps1` |

Always finish with `compose ps` + `GET /health`.
