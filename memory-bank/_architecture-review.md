# Architecture Review — CTO Perspective

Version: 1.0  
Date: 2026-07-09  
Status: **v3.0 LOCKED**

---

# Executive Summary

Recruiter Copilot has an **exceptionally strong architectural foundation** (9.8/10 on design quality).

Risk identified: **over-engineering before first line of runnable code**.

**Decision:** Lock architecture at **v3.1**. Memory Bank **FROZEN**. Quality infra at repo root. **Sprint 1 GO.**

> A good foundation matters. A running MVP that recruiters can try matters more.
> **Measure success with ADR-000 — not HTTP status codes.**

---

# Architecture v3.1 — Quality (Final Addition)

Not more modules. Not more workflows. **Quality infrastructure:**

```
evaluation/  fixtures/  contracts/  telemetry/  feature-flags/  quality-gates/
```

ADR-000 Product Success Metrics — **highest priority ADR.**

**No AI feature merges without evaluation + telemetry + quality gate.**

---

# Strengths (Keep — Do Not Change)

## 1. Business First (10/10)

Most AI SaaS: `LLM → Prompt → Code`

We built: `Business → Ontology → Contracts → Inference → LLM`

**Correct direction.** This is why the product won't drift into "another chatbot."

## 2. LLM Independence (10/10)

Knowledge Contracts decouple business from OpenAI/Gemini/Claude/Local/Qwen.

**Enterprise-grade.** Vendor failure ≠ product failure.

## 3. Explainable AI (10/10)

USP: confidence, sources, truth status — not "GPT said so."

**Sellable differentiation** vs ATS+ChatGPT wrappers.

## 4. Knowledge Growth (10/10)

Product sells **Company Knowledge**, not AI features.

Competitive moat compounds over years.

---

# Gaps Identified (Valid — Deferred)

| # | Gap | Risk if Ignored Forever | Sprint 1 Mitigation |
|---|-----|-------------------------|---------------------|
| 1 | Bounded Context | Module bleed, microservice pain | Modular monolith folders |
| 2 | Aggregate Roots | Wrong transactions | Document in ADR-012, enforce in code review |
| 3 | Command Model | Incomplete CQRS | Commands in Application Services |
| 4 | Read Models / Projections | UI reads aggregates | Candidate Profile as projection |
| 5 | Capability Map | Sprint planning harder | Lightweight map in ADR-015 |

**None of these require new Memory Bank folders before Sprint 1.**

Captured as **ADR-011 through ADR-015** (Accepted, implement Phase 2).

---

# Over-Engineering Check

| Layer | MVP Need | Foundation Status | Verdict |
|-------|----------|-------------------|---------|
| Business Ontology 00–05 | Required | ✅ Complete | Keep |
| Workflows WF-001 | Required | ✅ 1 approved | Enough for Sprint 1 |
| App Services | Required | ✅ 1 example | Build in Sprint 1 |
| Domain Events | Required | ✅ Catalog | Build handlers in Sprint 1 |
| Knowledge Model | Required | ✅ MVP specs | Keep |
| Truth Model | Phase 2 | Design only | ✅ Correct deferral |
| Knowledge Contracts | Required | KC-001, 002 | **Enough to start** |
| Inference Engine docs | Required | Concept only | Code in Sprint 1 |
| ADRs | Required | 15 total | ✅ Stop adding |
| Bounded Context folder | Phase 2 | ADR only | ⛔ Do not create `30/` |
| Capability Map folder | Phase 2 | ADR only | ⛔ Do not create `31/` |
| KC-005, 006, 007 | Sprint 2+ | Pending | ⛔ Not blocking Sprint 1 |

---

# v3.0 LOCK — What Is Frozen

### Frozen (no new docs without ADR)

- Business Foundation 00–06
- Architecture layer stack v3.0
- Zero Prompt Rule
- Knowledge Contract pattern
- LLM as plugin principle

### Sprint 1 Build Target (modular monolith)

```
src/
  modules/
    candidate/      ← Candidate Context (bounded)
    job/            ← Job Context
    recruitment/    ← Submission, Interview, Pipeline
    knowledge/      ← KC execution, KE storage
    identity/       ← Auth, workspace, permissions
    notification/   ← Notifications, reminders
  shared/
    events/
    contracts/
```

Modules communicate via **Domain Events** — not direct DB access across modules.

### Sprint 1 MVP Capabilities (minimum shippable)

| Capability | Workflow | Contract |
|------------|----------|----------|
| Import Resume | WF-001 | KC-001, KC-002 |
| View Candidate Profile | — | KM-001 read model |
| Create Job | — | Sprint 1 scope |
| Basic Search | — | SQL + embedding later |

**Not in Sprint 1:** Truth resolution runtime, Knowledge Graph, full WF catalog, KC-003+.

---

# Future Architecture (Phase 2 — ADR Reference Only)

```
Business Foundation
        ↓
Bounded Context          ← ADR-011
        ↓
Commands                 ← ADR-013
        ↓
Application Service
        ↓
Aggregate                ← ADR-012
        ↓
Domain Events
        ↓
Projection               ← ADR-014
        ↓
Knowledge Contract
        ↓
...
        ↓
Read Models              ← ADR-014
        ↓
Copilot
```

Implement when: real users, real data, clear scaling pain.

---

# Recommendation (Final)

1. ✅ **Memory Bank FROZEN** — ADR-000 was last doc
2. ✅ **Quality infra at repo root** — evaluation, telemetry, gates
3. ▶️ **Sprint 1 GO** — modular monolith + WF-001 end-to-end
4. 📊 **Measure with ADR-000 KPIs** — not `200 OK`
5. 📊 **Validate in 3–6 months** with real recruiters

---

# Cursor Rules (Final)

- **⛔ No new Memory Bank files**
- **⛔ No AI merge without eval + telemetry + quality gate**
- **▶️ Build Sprint 1**
- Read ADR-011–015 only when scaling post-MVP
