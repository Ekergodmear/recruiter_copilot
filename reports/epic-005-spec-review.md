# EPIC-005 Spec Review — Matching Foundation

| Field          | Value                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Document       | `docs/epics/EPIC-005-Matching-Foundation.md`                          |
| Review type    | Spec gate (PR-1 docs-only)                                            |
| Baseline       | `founder-alpha-2` / `main` + EPIC-001…004 COMPLETED                   |
| Recommendation | **APPROVE Spec** → unlock Implementation PR                           |

---

## Why this EPIC now

With Candidate, Job, Relationship, and Workflow complete, recruiters still lack an **explainable** Candidate↔Job comparison. Matching Foundation closes that gap with a deterministic rule engine — **before** AI Copilot — so future AI narrates evidence instead of inventing scores.

---

## Naming & philosophy (critical)

| Choice                         | Verdict                                                                 |
| ------------------------------ | ----------------------------------------------------------------------- |
| Score-first Matching           | **Reject** — score without evidence is opinion                          |
| **Evidence first, Score second** | **Adopt** — skills / experience / English / salary → then Overall Score |
| AI / LLM matching in this EPIC | **Reject** — out of scope; deterministic only                           |
| Persist Matching Result (MVP)  | **Defer** — on-demand only; avoid sync/invalidation complexity          |

Aligns with product rule: **Evidence over Opinion**.

---

## Spec completeness check

| Section                                                              | Present  |
| -------------------------------------------------------------------- | -------- |
| Problem / Goal / User Story                                          | Yes      |
| Principles (Evidence first, Score second, explainable, no black box) | Yes      |
| UL (Matching Result, evidence fields, Overall Match Score)           | Yes      |
| MVP evidence dimensions + score                                      | Yes      |
| On-demand / no DB persist (MVP)                                      | Explicit |
| AC-1…AC-14                                                           | Yes      |
| Out of Scope (AI, ranking, persist, TECH)                            | Yes      |
| DoD                                                                  | Yes      |
| Lifecycle PR-1 → PR-2 → PR-3                                         | Yes      |
| No TECH / Foundation Freeze                                          | Explicit |

---

## Baseline honesty

| Surface                    | Notes for PR-2                                                          |
| -------------------------- | ----------------------------------------------------------------------- |
| Candidate Workspace        | Exists — must not regress (AC-8)                                        |
| Job Intelligence           | Exists — must not regress (AC-9)                                        |
| Relationship Foundation    | Exists — must not regress (AC-10); Matching must not mutate it          |
| Workflow Foundation        | Exists — must not regress (AC-11); Matching must not advance stages     |
| Resume Import              | Exists — must not regress (AC-12)                                       |

Spec correctly frames: **not AI**, **not a rewrite**.

---

## Scope discipline

**In:** on-demand Matching Result; matched/missing skills; experience / English / salary comparisons; deterministic Overall Match Score from evidence.  
**Out:** AI/LLM, recommendation, auto-ranking, semantic search, analytics, DB persistence of results, TECH.

MVP stays a clean fifth foundation layer:

```text
EPIC-001 Candidate Intelligence
EPIC-002 Job Intelligence
EPIC-003 Relationship Intelligence
EPIC-004 Workflow Intelligence
EPIC-005 Matching Foundation (Evidence → Score)
```

### On-demand persistence (TL note)

MVP computes Matching Result on request and **does not store** it. Avoids stale matches when Candidate/Job change. Cache or snapshot history can be a later EPIC without changing the Matching Result / Evidence-first model.

### Matching Stability (TL note)

Overall Match Score may use **only documented evidence**. No hidden factors or undocumented heuristics. Future weight calibration updates explicit rules — philosophy stays Evidence-first.

---

## Risks accepted for Alpha

- Simple rule/weight choices — document; prefer explainability over precision theatre
- Incomplete Candidate/Job fields — rules must degrade gracefully with explicit evidence
- Recruiter may overweight score — UI/API should surface evidence first

---

## Gate decision

| Gate                                         | Result                     |
| -------------------------------------------- | -------------------------- |
| Product value clear                          | PASS                       |
| Evidence-first / Score-second locked         | PASS                       |
| Deterministic / no AI                        | PASS                       |
| On-demand (no MVP persist)                   | PASS (explicit)            |
| AC testable                                  | PASS                       |
| Out of Scope explicit                        | PASS                       |
| No TECH dependency                           | PASS                       |
| Definition of Done                           | PASS                       |
| Ready for Implementation PR                  | **YES** (after Spec merge) |

**Recommendation:** ✅ **APPROVE Spec** — merge docs-only PR, then open Implementation PR locked to this Spec.

---

## Next

1. Merge Spec (this PR)
2. Implementation PR (on-demand Matching Result; evidence then score; no DB; no AI)
3. Validation Report PR with evidence for AC-1…AC-14
