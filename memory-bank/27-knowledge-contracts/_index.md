# Knowledge Contracts

Version: 1.0

---

# Overview

**Knowledge Contracts define the interface between engines.**

Not code. Not prompts. **Contracts.**

> Inference Engine is **allowed** to create Knowledge Objects only through defined contracts.

This is **Hexagonal Architecture for AI**:

```
Inference Engine  →  implements KC-xxx  →  produces SkillKnowledge[]
Knowledge Engine  →  accepts SkillKnowledge[]  →  knows nothing about GPT
AI Copilot        →  reads CandidateKnowledge  →  knows nothing about Resume
LLM               →  plugin behind KC  →  replaceable
```

---

# Core Principle

```
LLM           = replaceable implementation detail
Knowledge Contract = stable dependency
```

Resume Parser using GPT today, Gemini tomorrow, Local Llama in 1 year — **if KC-001 unchanged, system unchanged**.

---

# Contract Catalog

| ID | File | Input | Output | Phase | Status |
|----|------|-------|--------|-------|--------|
| KC-001 | `KC-001-resume-to-skill-knowledge.md` | Resume | SkillKnowledge[] | 1 | ✅ Approved |
| KC-002 | `KC-002-resume-to-english-knowledge.md` | Resume | EnglishKnowledge | 1 | ✅ Approved |
| KC-003 | `KC-003-interview-to-truth-update.md` | Interview Feedback | Knowledge Update | 2 | Design |
| KC-004 | `KC-004-client-feedback-to-knowledge-update.md` | Client Feedback | Knowledge Update | 2 | Design |
| KC-005 | `KC-005-resume-to-salary-knowledge.md` | Resume | SalaryKnowledge | 1 | ⬜ Pending |
| KC-006 | `KC-006-job-to-skill-requirements.md` | Job Description | Job Skill Requirements | 1 | ⬜ Pending |
| KC-007 | `KC-007-candidate-job-match-score.md` | CandidateKnowledge + JobKnowledge | MatchScore | 1 | ⬜ Pending |

Template: `../_knowledge-contract-spec-template.md`

---

# Contract Structure (Every KC)

```yaml
contract_id: KC-xxx
version: 1.0
producer: Inference Engine | Truth Engine
consumer: Knowledge Engine

input:
  type: ...
  schema: ...

output:
  type: ...
  schema: ...          # Must conform to KM-xxx

requirements:
  - confidence required
  - source required
  - extraction_method required
  - normalization required
  - timestamp required
  - version required
  - trace_id required

must:
  - emit KnowledgeCreated event
  - keep raw evidence reference
  - conform to Knowledge Model schema

cannot:
  - modify Candidate entity directly
  - bypass Truth Rules (Phase 2)
  - expose LLM-specific fields in output
```

---

# Engine Responsibilities (Revised)

| Engine | Knows About | Does NOT Know About |
|--------|-------------|---------------------|
| Inference Engine | KC-xxx contracts | GPT, Gemini, prompts |
| Knowledge Engine | KM-xxx schemas, KC output types | Resume PDF, LLM |
| AI Provider | KC input/output, LLM API | Business rules, workflows |
| AI Copilot | CandidateKnowledge | Resume, parsers |
| Application Service | Public API, events | Knowledge Contracts internals |

---

# Inference Engine Executes Contracts

Inference Engine does **not** "parse Resume".

Inference Engine **executes KC-001**.

```
KC-001 invoked
    ↓
AI Provider (pluggable) performs extraction
    ↓
Output validated against KC-001 + KM-002
    ↓
Knowledge Engine.persist()
```

---

# Events

Every contract fulfillment must emit:

| Event | When |
|-------|------|
| KnowledgeCreated | New Knowledge Object(s) |
| KnowledgeUpdated | Existing KO modified (KC-003, KC-004) |
| KnowledgeContractFailed | Validation failure |

Payload includes `contract_id: KC-xxx`, `trace_id`.

---

# Zero Prompt Rule

Prompts are **not** documented in Memory Bank as business assets.

Prompts live in AI Provider implementation only.

Business behavior = Business Rules + Knowledge Contracts + Truth Rules + KM schema.

**Changing LLM or prompt must never require changing KC or business logic.**

---

# Phase Gate

**No Inference Engine implementation (IE-xxx) without approved KC-xxx.**

**No AI Provider implementation without KC it implements.**

---

# Common Mistakes

❌ Inference Engine with embedded prompts in Memory Bank

❌ Knowledge Engine parsing resumes

❌ Copilot reading raw Resume

❌ Changing KC when switching LLM

❌ Skipping trace_id on contract output

❌ Direct Candidate table mutation from inference

---

# Cursor Validation Checklist

- [ ] KC-xxx exists and Approved before IE implementation
- [ ] Output conforms to KM-xxx
- [ ] Must/Cannot rules documented
- [ ] trace_id required
- [ ] No prompt text in contract spec
- [ ] Common Mistakes reviewed
