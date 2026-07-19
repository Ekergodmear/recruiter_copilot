# Recruiter Copilot

Recruitment Intelligence Platform — **Foundation v3.1 frozen**.

## Start here

- [PROJECT_BASELINES.md](./PROJECT_BASELINES.md) — tags `founder-alpha-1` / `founder-alpha-2`; branch from here
- [docs/MANIFESTO.md](./docs/MANIFESTO.md) — founding principles (read before code)
- [docs/FOUNDATION-FROZEN.md](./docs/FOUNDATION-FROZEN.md) — v1.0 frozen; Alpha evidence only
- [docs/founder-questions.md](./docs/founder-questions.md) — 10 questions before each Sprint
- [PLAYBOOK.md](./PLAYBOOK.md) — how the team works
- [memory-bank/](./memory-bank/) — product spec (read-only)

## Quick start

```bash
pnpm install
pnpm run dev          # http://localhost:3000/health
pnpm run test
pnpm run ci
```

## Docker (production)

See **[docs/PRODUCTION.md](./docs/PRODUCTION.md)** and **[docs/DEPLOYMENT_CHECKLIST.md](./docs/DEPLOYMENT_CHECKLIST.md)**.

```bash
cp .env.production.example .env.production
docker compose --env-file .env.production up -d --build
# health: http://localhost:3000/health
```

## Milestone 1

Recruiter uploads a resume and receives a trustworthy Candidate Profile.
