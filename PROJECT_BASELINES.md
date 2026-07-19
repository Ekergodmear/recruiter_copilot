# Project Baselines

Stable Git milestones for Recruiter Copilot (Founder Alpha).

| Tag | Commit (approx.) | Meaning |
|-----|------------------|---------|
| `founder-alpha-1` | `7f978e9` | Founder Alpha **runtime** baseline — product EPICs + Docker/Postgres/Prisma deploy |
| `founder-alpha-2` | `a6f9222` | Founder Alpha + **production operations** baseline — TECH-006 (backup, deploy/rollback, runbook, monitoring, hardening) |

## Rule

**All new work must branch from `main` at or after `founder-alpha-2`.**

```bash
git fetch origin --tags
git checkout main
git pull origin main
git checkout -b <epic-or-tech>/<short-name>
```

## Working agreements (from `founder-alpha-2`)

1. `main` stays deployable (CI green, Docker builds, `/health` ok).
2. Features and TECH land via PR — no direct feature dumps on `main`.
3. No force-push to `main`.
4. Spec → Acceptance Criteria → Out of Scope → then code.
5. Foundation Freeze remains intact unless Alpha evidence forces a Founder decision.

## Related

- Ops: [docs/PRODUCTION.md](./docs/PRODUCTION.md)
- TECH-006 closure: [reports/tech-006-production-hardening.md](./reports/tech-006-production-hardening.md)
- Playbook: [PLAYBOOK.md](./PLAYBOOK.md)
