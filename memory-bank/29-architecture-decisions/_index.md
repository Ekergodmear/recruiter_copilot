# Architecture Decision Records

Version: 1.0

---

# Overview

ADRs document **why** architectural decisions were made.

Memory Bank says **what**. ADRs say **why**.

When Cursor or a future engineer questions a decision, read the ADR first.

**Do not generate application code without reading relevant ADRs.**

Template: `../_adr-template.md`

---

# ADR Catalog

| ID | File | Decision | Status |
|----|------|----------|--------|
| ADR-000 | `ADR-000-product-success-metrics.md` | KPIs, telemetry, eval, quality gates — **read first** | ✅ Accepted |
| ADR-001 | `ADR-001-event-driven-architecture.md` | Event-driven internal, REST public API | ✅ Accepted |
| ADR-002 | `ADR-002-knowledge-model.md` | Knowledge Objects over flat columns | ✅ Accepted |
| ADR-003 | `ADR-003-truth-model.md` | Truth resolution layer | ✅ Accepted |
| ADR-004 | `ADR-004-workspace-isolation.md` | Single workspace per object | ✅ Accepted |
| ADR-005 | `ADR-005-append-only-history.md` | Immutable history, versioning | ✅ Accepted |
| ADR-006 | `ADR-006-knowledge-contracts.md` | KC as stable interface, LLM as plugin | ✅ Accepted |
| ADR-007 | `ADR-007-zero-prompt-rule.md` | Prompts are implementation detail | ✅ Accepted |
| ADR-008 | `ADR-008-inference-vs-knowledge-engine.md` | Factory vs warehouse split | ✅ Accepted |
| ADR-009 | `ADR-009-phased-intelligence.md` | MVP Phase 1, design Phase 2–3 | ✅ Accepted |
| ADR-010 | `ADR-010-no-code-without-contracts.md` | KC required before IE implementation | ✅ Accepted |
| ADR-011 | `ADR-011-bounded-context-strategy.md` | Modular monolith Sprint 1; full BC Phase 2 | ✅ Accepted |
| ADR-012 | `ADR-012-aggregate-design.md` | Aggregate roots in code; full domain model Phase 2 | ✅ Accepted |
| ADR-013 | `ADR-013-cqrs-adoption.md` | Commands in App Services; full CQRS Phase 2 | ✅ Accepted |
| ADR-014 | `ADR-014-read-models-projections.md` | Minimal projections Sprint 1 | ✅ Accepted |
| ADR-015 | `ADR-015-capability-map.md` | Lightweight map in ADR; full folder Phase 2 | ✅ Accepted |
| ADR-016 | `ADR-016-ai-provider-strategy.md` | AI-enhanced not AI-dependent; Gemini MVP; no OpenAI | ✅ Accepted |

---

# Phase 2 Deferred (Do Not Implement Pre-Sprint 1)

| ADR | Deferred Artifact |
|-----|-------------------|
| ADR-011 | `30-bounded-contexts/` folder |
| ADR-015 | `31-capability-map/` folder |
| ADR-012 | `08-domain-model.md` full spec |
| ADR-014 | Full projection catalog |

- Changing a fundamental architectural choice
- Adding a new layer to the stack
- Choosing between significant alternatives (SQL vs Event Store, etc.)
- Overriding a previous ADR (supersede with new ADR)

---

# Cursor Rules

1. Read ADRs before challenging architecture.
2. New architectural change → write ADR first, then update Memory Bank.
3. Code must align with Accepted ADRs.
4. **No application code until ADR-006, ADR-010 satisfied for intelligence features.**
