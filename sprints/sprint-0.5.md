# Sprint 0.5 — Engineering Infrastructure

## Sprint Goal

Establish repository, CI, quality tooling, and AI infrastructure **without business features**.

## Background

ADR-000 requires evaluation, telemetry, and quality gates before AI merges. Building business code first guarantees nobody returns to wire these.

## Tasks

- [x] Repository structure (modular monolith scaffold)
- [x] TypeScript + pnpm
- [x] ESLint + Prettier
- [x] Vitest
- [x] Docker + docker-compose
- [x] Local dev (`pnpm run dev`)
- [x] Feature flags loader
- [x] Telemetry module + schema validation
- [x] Contract validator (AJV)
- [x] Evaluation runner (resume manifest)
- [x] CI workflow (GitHub Actions)
- [x] Health endpoint only — no business API

## Acceptance Criteria

- [x] `pnpm run ci` passes locally
- [x] `docker compose up` starts app + postgres (ready — run to verify)
- [x] `GET /health` returns 200
- [x] `pnpm run test:contracts` validates fixture schemas
- [x] `pnpm run eval:resume` runs (passes with empty manifest)
- [x] Feature flags load from `feature-flags/sprint-1.yaml`

## Out of Scope

- Resume upload API
- Candidate entity
- AI parsing
- Database migrations for business tables

## Definition of Done

- [x] All acceptance criteria checked
- [x] CI green on push (workflow committed)
- [x] PLAYBOOK.md published
- [x] Ready for Sprint 1
