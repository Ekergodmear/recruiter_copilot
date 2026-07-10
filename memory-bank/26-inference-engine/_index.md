# Inference Engine

Version: 1.0

---

# Overview

Inference Engine **executes Knowledge Contracts** — it does not ad-hoc parse.

```
KC-001 invoked
    ↓
AI Provider (pluggable)
    ↓
Output validated against KC + KM
    ↓
Knowledge Engine.persist()
```

**No IE-xxx spec without approved KC-xxx.** (ADR-010)

See `27-knowledge-contracts/`.

---

# What Inference Engine Does

| Capability | Phase |
|------------|-------|
| Parse resumes → Raw Facts | 1 |
| Normalize skills, entities | 1 |
| Create Knowledge Objects (KM schema) | 1 |
| Multi-source ingestion | 2 |
| Truth Resolution (TM rules) | 2 |
| Conflict detection → CONFLICTED | 2 |
| Outdated detection | 3 |
| Business Confidence per Job | 3 |
| Graph reasoning | 3 |

Inference Engine **does not** own storage, vector DB, or public API.

---

# Pipeline

```
Domain Event (ResumeParsed)
        ↓
Inference Engine
    ├── Extract Raw Facts
    ├── Normalize (Skill taxonomy)
    ├── Truth Resolution (Phase 2+)
    └── Build Knowledge Object (KM-xxx schema)
        ↓
Knowledge Engine.persist(knowledgeObject)
        ↓
Knowledge Engine.regenerateEmbedding()
        ↓
Search Index updated
```

---

# Components

| ID | Component | Phase | Status |
|----|-----------|-------|--------|
| IE-001 | Resume Inference | 1 | ⛔ Blocked — requires KC-001, KC-002 Approved |
| IE-002 | Job Inference | 1 | ⬜ |
| IE-003 | Skill Normalization | 1 | ⬜ |
| IE-004 | Truth Resolver | 2 | Design |
| IE-005 | Conflict Detector | 2 | Design |
| IE-006 | Outdated Analyzer | 3 | Design |
| IE-007 | Business Relevance Scorer | 3 | Design |

Uses LLM as **tool** inside Inference Engine — not as the architecture.

---

# Relationship to Truth Model

Inference Engine **executes** rules from `25-truth-model/`.

Truth Model defines WHAT the rules are.
Inference Engine applies them at runtime (Phase 2+).

---

# Relationship to Knowledge Model

All Inference Engine output **must conform** to `24-knowledge-model/KM-xxx`.

Inference Engine never invents schema.

---

# Events

Inference Engine consumes Business Events, produces Knowledge Objects, may publish AI Events:

| Publishes | Category |
|-----------|----------|
| ResumeParsed | AI |
| EmbeddingGenerated | AI |
| ConflictDetected | AI (Phase 2) |

---

# Phase 1 (MVP) — IE-001 Resume Inference

```
ResumeParsed event
    ↓
LLM extract structured facts
    ↓
Normalize skills
    ↓
Create KM-002 Skill Knowledge (confidence: simplified)
Create KM-003 English Knowledge
Create KM-004 Salary Knowledge (if present)
    ↓
Hand off to Knowledge Engine for persist
```

No Truth Resolution runtime. Single confidence.

---

# Common Mistakes

❌ Inference Engine writing directly to database (bypass Knowledge Engine)

❌ Inference Engine defining own Knowledge schema

❌ Calling Inference Engine "AI module"

❌ Full Truth Resolution in MVP

❌ Merging Inference Engine and Knowledge Engine into one service

---

# Cursor Validation Checklist

- [ ] Creates knowledge, does not store
- [ ] Output matches KM-xxx schema
- [ ] Phase scope respected
- [ ] Truth rules from TM-xxx when Phase 2+
- [ ] Common Mistakes reviewed
