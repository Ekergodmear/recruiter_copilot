# EPIC-007 Spec Review — Analytics & Insights

| Field          | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Document       | `docs/epics/EPIC-007-Analytics-Insights.md`              |
| Review type    | Spec gate (PR-1 docs-only)                               |
| Baseline       | `main @ 9897595` + EPIC-001…006 COMPLETED                |
| Recommendation | **APPROVE Spec** → unlock Implementation PR              |

---

## Why this EPIC now

Six capabilities exist. The remaining operational gap is a **read model**: pipeline shape, stage conversion, and match distributions — without inventing spreadsheet truth or a second scoring engine.

---

## Naming & philosophy (critical)

| Choice                                                         | Verdict                                              |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| Analytics owns / recalculates Match Score                      | **Reject** — Matching Intelligence (EPIC-005) owns score |
| Analytics mutates Workflow / Relationship                      | **Reject** — out of scope; read-only                 |
| BI / warehouse / scheduled reports in MVP                      | **Reject** — Out of Scope                            |
| AI Insights as Analytics MVP                                   | **Reject** — Copilot owns narrative; Analytics owns aggregates |
| **Analytics consumes capabilities; does not own business rules** | **Adopt** — locked governing principle            |
| Query-time Matching for score distribution                     | **Adopt** — honest with EPIC-005 non-persistence     |
| **Analytics Traceability** (AC-1b)                             | **Adopt** — metrics trace to relationships / Matching Results |

Aligns with: Evidence over Opinion; consumer layers (Copilot, Analytics) never own business rules.

---

## Spec completeness check

| Section                                                         | Present  |
| --------------------------------------------------------------- | -------- |
| Problem / Goal / User Story                                     | Yes      |
| Governing principle (Analytics consumes, does not own rules)    | Explicit |
| MVP metrics (stage, funnel, counts, match dist, time-to-stage, job snapshot) | Yes |
| Matching non-persistence honesty                                | Explicit |
| AC-1…AC-16                                                      | Yes      |
| Out of Scope (BI, email, AI insights, warehouse, TECH)          | Yes      |
| DoD                                                             | Yes      |
| Lifecycle PR-1 → PR-2 → PR-3                                    | Yes      |
| No TECH / Foundation Freeze                                     | Explicit |

---

## Baseline honesty

| Surface                 | Notes for PR-2                                              |
| ----------------------- | ----------------------------------------------------------- |
| Matching Result         | Not persisted — Analytics must call EPIC-005 at query time  |
| Stage History           | `changedAt` available — Time-to-stage only when computable  |
| Copilot                 | Regression AC-13; Analytics is not a second Copilot         |
| Candidate / Job / Rel / Workflow | Must not mutate (AC-7 + regression ACs)              |

---

## Scope discipline

**In:** Stage distribution, funnel/conversion from history, counts, query-time match distribution, time-to-stage, Job pipeline snapshot, read-only API, minimal UI.  
**Out:** BI builder, schedules, email, AI insights, forecast, recommendation, export warehouse, TECH.

```text
EPIC-001…005  = business capabilities (rules)
EPIC-006      = Copilot (interpretation + drafts)
EPIC-007      = Analytics (read aggregates)
```

---

## Risks accepted for Alpha

- Query-time matching cost — mitigate via Job scope + documented limits  
- Funnel formula ambiguity — lock formula in Implementation; Validation asserts fixtures  
- Chart over-trust — Analytics Transparency; no auto-actions  

---

## Gate decision

| Gate                        | Result                     |
| --------------------------- | -------------------------- |
| Product value clear         | PASS                       |
| AC testable                 | PASS                       |
| Out of Scope explicit       | PASS                       |
| No TECH dependency          | PASS                       |
| Definition of Done          | PASS                       |
| Not a super-EPIC            | PASS                       |
| Ready for Implementation PR | **YES** (after Spec merge) |

**TL action:** Approve & merge Spec PR → open Implementation PR against this document only.
