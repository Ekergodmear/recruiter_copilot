# Recruiter Copilot

> **Memory Bank FROZEN** · **ADR-000** · **Sprint 1 GO**

## ⛔ No more Memory Bank

Foundation complete (9.8/10). **Do not add files to `memory-bank/`.**

## ▶️ Build

| Root folder | Purpose |
|-------------|---------|
| `evaluation/` | Golden datasets |
| `fixtures/` | Test fixtures |
| `contracts/` | KC JSON schemas |
| `telemetry/` | AI logging schema |
| `feature-flags/` | Rollout toggles |
| `quality-gates/` | CI KPIs |

## AI merge rule (ADR-000)

No AI feature without: **evaluation + telemetry + quality gate**

## Read first

1. `ADR-000-product-success-metrics.md`
2. `quality-gates/sprint-1.yaml`
3. `_architecture.md` v3.1

## Sprint 1 KPIs

- Upload success ≥ 95%
- Parse p95 < 8s
- Knowledge accuracy ≥ 90%
- Manual correction < 15%
- E2E recruiter < 20s
