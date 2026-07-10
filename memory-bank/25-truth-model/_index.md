# Truth Model

Version: 1.0

---

# Overview

Knowledge Model defines **what knowledge looks like**.

Truth Model defines **which beliefs are true when sources conflict**.

Without Truth Model, AI arbitrarily picks the loudest source.

---

# The Problem

Four sources. Four answers. No rules.

| Source | English Level |
|--------|---------------|
| Resume | B2 |
| Recruiter | C1 |
| Client | Poor |
| Interview | B1 |

**AI sẽ tin cái nào?** — Chưa có quy tắc = broken product.

---

# Position in Pipeline

```
Raw Facts
    ↓
Evidence (attributed claims per source)
    ↓
Truth Resolution          ← Truth Model (this layer)
    ↓
Knowledge Object          ← Knowledge Model
    ↓
Embedding
```

Truth Model sits **between Evidence and Knowledge Object**.

Inference Engine **executes** Truth Resolution rules defined here.

---

# Truth Status

| Status | Meaning | Example |
|--------|---------|---------|
| **VERIFIED** | Confirmed by high-weight source | Interview confirms Docker skill |
| **LIKELY** | Multiple consistent sources | Resume + GitHub both show React |
| **CLAIMED** | Single source, unverified | Resume lists AWS, no project evidence |
| **CONFLICTED** | Sources disagree — needs recruiter | Resume B2 vs Client "Poor" |
| **OUTDATED** | Was true, no longer current | AWS skill, unused 5 years |

### AI Presentation by Status

| Status | What AI says |
|--------|--------------|
| VERIFIED | "Confirmed: Candidate has React experience" |
| LIKELY | "Strong indication of React experience" |
| CLAIMED | "Candidate **claims** Docker experience" |
| CONFLICTED | "Conflicting information about English level — review needed" |
| OUTDATED | "Previously used AWS — may be outdated (5 years)" |

---

# Three Confidence Types

Single `confidence` in MVP. Three types in Phase 2+:

| Type | Question | Example |
|------|----------|---------|
| **Extraction Confidence** | Did AI read the source correctly? | OCR "React" read correctly: 99% |
| **Truth Confidence** | Is the information actually true? | Interview didn't confirm: 55% |
| **Business Confidence** | Is this relevant to the current Job? | Job doesn't need React: 5% |

Same fact. Three different confidences. **Never collapse into one without context.**

### MVP Simplification

Phase 1 uses single `confidence` ≈ Truth Confidence (simplified).

Design schema to accept three fields in Phase 2 without migration pain.

---

# Evidence Weight

When sources conflict, weight determines influence:

| Source | Weight | Rationale |
|--------|--------|-----------|
| Reference Check | 10 | External verification |
| Interview | 10 | Direct assessment |
| GitHub | 8 | Observable artifacts |
| Resume | 6 | Self-reported |
| LinkedIn | 4 | Self-curated |
| Recruiter Note | 7 | Professional judgment |
| Client Feedback | 5 | Biased by hiring outcome |
| AI Inference | 3 | Lowest — always needs confirmation |

Truth Engine formula (Phase 2):

```
resolved_value = weighted_merge(sources, weights)
truth_status = derive_status(sources, agreement, recency)
```

---

# Knowledge Object with Truth (Phase 2)

```json
{
  "value": "React",
  "confidence": 0.98,
  "truthStatus": "VERIFIED",
  "derivedFrom": ["Resume", "Interview", "GitHub"],
  "confidences": {
    "extraction": 0.99,
    "truth": 0.98,
    "business": 0.85
  }
}
```

MVP uses subset — see KM-000 Phase 1 schema.

---

# Spec Catalog

| ID | File | Topic | Phase |
|----|------|-------|-------|
| TM-000 | `TM-000-truth-resolution-overview.md` | Pipeline & principles | Design |
| TM-001 | `TM-001-truth-status.md` | Status enum & transitions | 2 |
| TM-002 | `TM-002-confidence-types.md` | Three confidence types | 2 |
| TM-003 | `TM-003-evidence-weight.md` | Source weights & merge rules | 2 |
| TM-004 | `TM-004-conflict-resolution.md` | Multi-source conflict rules | 2 |
| TM-005 | `TM-005-outdated-detection.md` | Recency & staleness rules | 3 |

---

# Implementation Phases

## Phase 1 (MVP) — Design Only

- Truth Model documented, **not runtime**
- Single `confidence` on Knowledge Objects
- No automatic conflict resolution
- Recruiter manually resolves conflicts via edit → sets `verified: true`

## Phase 2

- Truth Status on Knowledge Objects
- Evidence Weight merge rules
- Three confidence types
- Auto-detect CONFLICTED status → flag for recruiter

## Phase 3

- Full Truth Engine in Inference Engine
- OUTDATED detection from usage history
- Business Confidence per Job context
- Automated reasoning with recruiter override

---

# Common Mistakes

❌ Picking highest confidence source silently when sources conflict

❌ Single confidence for extraction + truth + business relevance

❌ Implementing full Truth Engine in MVP

❌ AI stating CLAIMED facts as VERIFIED

❌ Ignoring Client feedback weight bias

❌ No CONFLICTED flag — hiding disagreement from recruiter

---

# Cursor Validation Checklist

- [ ] Phase scope respected (MVP = design only)
- [ ] Truth Status used in AI presentation when Phase 2+
- [ ] Three confidence types not collapsed incorrectly
- [ ] Evidence Weight documented for new sources
- [ ] CONFLICTED surfaces to recruiter UI
- [ ] Common Mistakes reviewed
