# Knowledge Model

Version: 1.0

---

# Overview

**Knowledge Engine processes Knowledge Objects — but what are they?**

This layer defines the **structure of recruitment intelligence**.

```
Resume          ≠ Knowledge
Candidate       ≠ Knowledge (alone)
Candidate Profile → aggregate of Knowledge Objects = Knowledge
```

Knowledge is **synthesized** from multiple sources:

```
Resume + LinkedIn + Recruiter Notes + Interview Feedback
+ Client Feedback + Offer + Placement
        ↓
    Knowledge
```

Knowledge Engine **stores** Knowledge Objects defined here.

Inference Engine **creates** them. Truth Model **resolves** conflicts (Phase 2+).

Without Knowledge Model, intelligence has no schema.

---

# Position in Architecture

```
Business Foundation (00–06)     🔒 FROZEN
        ↓
Application Services (12)
        ↓
Domain Events (07)
        ↓
Knowledge Model (24)            ← WHAT intelligence looks like
        ↓
Knowledge Engine (23)           ← HOW intelligence is processed
        ↓
Infrastructure (13+)
```

**Workflow expansion paused.** Current focus: Knowledge Model + Knowledge Engine alignment.

---

# Core Philosophy

## Wrong Model

```
Candidate → Columns (skills, salary, english)
```

Fields are static. No confidence. No sources. No explainability.

## Correct Model

```
Candidate
    ↓
Knowledge Objects
    ↓
Facts
    ↓
Evidence (v2)
    ↓
Source
    ↓
Confidence
    ↓
Embedding (derived — never primary)
```

## What AI Says (Wrong)

> "Candidate biết React."

## What AI Says (Correct)

> "Candidate rất có khả năng biết React."
> Confidence: 97% | Evidence: Project ABC | Verified by interview | Used 5 years

This is **Explainable AI** — enabled by Knowledge Model, not prompts.

---

# Knowledge Domains

| ID | File | Domain | MVP | Phase |
|----|------|--------|-----|-------|
| KM-000 | `KM-000-knowledge-object-base.md` | Base schema for all objects | ✅ | 1 |
| KM-001 | `KM-001-candidate-knowledge.md` | Candidate Knowledge aggregate | ✅ | 1 |
| KM-002 | `KM-002-skill-knowledge.md` | Skill Knowledge | ✅ | 1 |
| KM-003 | `KM-003-english-knowledge.md` | English Knowledge | ✅ | 1 |
| KM-004 | `KM-004-salary-knowledge.md` | Salary Knowledge | ✅ | 1 |
| KM-005 | `KM-005-availability-knowledge.md` | Availability Knowledge | ✅ | 1 |
| KM-006 | `KM-006-job-knowledge.md` | Job Knowledge | ✅ | 1 |
| KM-007 | `KM-007-client-knowledge.md` | Client Knowledge | v1 | 1 |
| KM-008 | `KM-008-recruitment-knowledge.md` | Recruitment process knowledge | v1 | 2 |
| KM-009 | `KM-009-market-knowledge.md` | Market / industry knowledge | v2 | 2 |
| KM-010 | `KM-010-knowledge-graph.md` | Graph relationships | v2 | 2 |
| KM-011 | `KM-011-evidence-model.md` | Evidence & verification | v2 | 2 |

Template: `../_knowledge-model-spec-template.md`

---

# Phased Implementation

## Phase 1 — MVP

Implement now:

- Candidate Profile as **aggregate of Knowledge Objects**
- Knowledge Objects: Skill, English, Salary, Availability
- Each object has: `value`, `confidence`, `sources`, `lastUpdated`
- Optional MVP: `verified`, `verifiedBy` (simple boolean + source)
- **No full Knowledge Graph**
- Embeddings derived from Knowledge Objects, not raw resume text

## Phase 2 — v2

Implement later:

- Full `evidences[]` array with project/company references
- Knowledge Graph: Candidate ↔ Skill ↔ Project ↔ Company ↔ Industry
- Multi-source reasoning: Graph + Embedding + Business Rules + History
- Market Knowledge, advanced Recruitment Knowledge
- `KM-011` Evidence model with audit trail per fact

**Design for Phase 2 now. Implement Phase 1 only.**

---

# Data Flow

```
Domain Event (e.g. ResumeParsed)
        ↓
Knowledge Engine extracts facts
        ↓
Creates/updates Knowledge Objects (per KM schema)
        ↓
Candidate Profile aggregate refreshed
        ↓
Embedding regenerated from Knowledge Objects
        ↓
Search Index + (v2) Knowledge Graph updated
```

---

# Relationship to Ubiquitous Language

| Term (05) | Knowledge Model |
|-----------|-----------------|
| Candidate | Owns Knowledge Objects — not a flat record |
| Candidate Profile | Aggregate root for Candidate Knowledge |
| Resume | Source input — not Knowledge |
| Knowledge | Structured objects per KM-xxx specs |
| Embedding | Derived from Knowledge — never replaces it |
| Skill | Normalized entity — Skill Knowledge is the fact about a Candidate |
| Match Score | Computed from Knowledge Objects + Job Knowledge |

---

# Competitive Advantage

Not ChatGPT. Not Prompt. Not RAG alone.

```
Knowledge Model + Knowledge Engine + Knowledge Graph (v2)
```

After years of use: organizational recruitment intelligence that competitors cannot copy.

---

# Common Mistakes

❌ Storing `skills: ["React", "Node"]` as Candidate columns

❌ Treating Resume parsed text as Knowledge

❌ Embedding raw PDF without structured Knowledge Objects

❌ AI output without confidence and sources

❌ Implementing full Knowledge Graph in MVP

❌ Knowledge Engine defining its own schema (must use KM specs)

❌ Overwriting Knowledge without versioning / lastUpdated

❌ Confidence = 100% without verification source

---

# Cursor Validation Checklist

- [ ] Knowledge Object follows KM-000 base schema
- [ ] Phase 1 vs Phase 2 scope respected
- [ ] Sources documented for every fact
- [ ] Confidence score present and explainable
- [ ] Not storing Knowledge as flat Candidate columns
- [ ] Knowledge Engine reads KM spec, not inventing structure
- [ ] Common Mistakes reviewed
