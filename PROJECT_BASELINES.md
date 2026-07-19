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

## EPIC PR lifecycle (post–Founder Alpha)

Prefer three small PRs per EPIC (or TECH of similar size):

```text
EPIC-XXX
│
├── PR-1
│   Spec (docs only) — Background, Task, AC, Out of Scope, DoD
│
├── PR-2
│   Implementation — code/tests against the approved spec
│
└── PR-3
    Validation Report — evidence, metrics, recruiter/ops notes
        ↓
      Merge → done
```

This separates **design**, **execution**, and **verification**. TECH initiatives that are ops-only may stay as Spec → Implementation when a Validation Report would be redundant (evidence already in the implementation PR).

**Product first:** after TECH-006, prefer user-value EPICs over further infrastructure unless product work is blocked.

## Related

- Ops: [docs/PRODUCTION.md](./docs/PRODUCTION.md)
- TECH-006 closure: [reports/tech-006-production-hardening.md](./reports/tech-006-production-hardening.md)
- Playbook: [PLAYBOOK.md](./PLAYBOOK.md)
