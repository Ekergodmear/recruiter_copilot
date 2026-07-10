# Recruiter Copilot — System Architecture

Version: 3.1 **LOCKED**

> **Memory Bank FROZEN.** Quality infrastructure at repo root.
> **ADR-000** governs success. **Sprint 1 approved.**

---

# Architecture v3.1 — Quality Layer (Root, Not Memory Bank)

```
memory-bank/          ← FROZEN — no new docs
evaluation/           ← golden datasets (ADR-000)
fixtures/             ← test fixtures
contracts/            ← KC output JSON schemas
telemetry/            ← AI operation logging schema
feature-flags/        ← gradual AI rollout
quality-gates/        ← CI KPI thresholds
```

**No AI feature merges without:** evaluation + telemetry + quality gate.

---

# Product: Recruitment Intelligence Platform

- ATS = module | CRM = module | AI = component | LLM = plugin
- **Knowledge = asset | Truth = advantage | Evaluation = quality protection**

---

# v3.0 Intelligence Stack (Unchanged, Frozen)

```
Knowledge Model → KC → Truth (design) → Inference → Knowledge Engine → AI Providers → LLM
```

---

# Sprint 1 (Build Now)

```
Modular monolith + quality infrastructure
End-to-end: Import Resume → Parse → Profile (<20s, >90% accuracy)
KC-001, KC-002 | Flags: parsing ON, rest OFF
```

KPIs: `quality-gates/sprint-1.yaml` | Metrics: `ADR-000`

---

# Memory Bank Status

**⛔ FROZEN** — ADR-000 was the last addition. No more Memory Bank files.

Read existing docs. Build code + quality infra.

---

# Document Map

| Type | Path |
|------|------|
| Success metrics | `ADR-000` |
| Architecture | `_architecture.md` |
| CTO review | `_architecture-review.md` |
| Memory Bank | `memory-bank/` (frozen) |
| Quality | `evaluation/`, `quality-gates/`, etc. |

