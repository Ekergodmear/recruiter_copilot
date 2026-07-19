# EPIC-004 Spec Review — Recruiter Workflow Foundation

| Field          | Value                                                                   |
| -------------- | ----------------------------------------------------------------------- |
| Document       | `docs/epics/EPIC-004-Recruiter-Workflow-Foundation.md`                  |
| Review type    | Spec gate (PR-1 docs-only)                                              |
| Baseline       | `founder-alpha-2` / `main` + EPIC-001 + EPIC-002 + EPIC-003 COMPLETED   |
| Recommendation | **APPROVE Spec** → unlock Implementation PR                             |

---

## Why this EPIC now

With Candidate, Job, and Relationship Intelligence complete, the remaining operational gap is **hiring progress**. Workflow Foundation lets recruiters move a relationship through stages and retain history — unlocking Pipeline Board / Matching / Analytics later without inventing progress tracking ad hoc.

---

## Naming decision (critical)

| Choice                         | Verdict                                                                 |
| ------------------------------ | ----------------------------------------------------------------------- |
| `Pipeline` as root aggregate   | **Reject for MVP** — board is a visualization, not the domain root      |
| `Application` as workflow root | **Reject** — already rejected in EPIC-003                               |
| **Workflow / Stage / History** | **Adopt** — records recruiter actions on `CandidateJobRelationship`     |

---

## Spec completeness check

| Section                                                              | Present  |
| -------------------------------------------------------------------- | -------- |
| Problem / Goal / User Story                                          | Yes      |
| UL (Workflow, Stage, Current Stage, Stage History; avoid Pipeline)   | Yes      |
| MVP (current stage, default stages, move, history, views)            | Yes      |
| No hardcoded transition matrix (MVP)                                 | Explicit |
| AC-1…AC-11                                                           | Yes      |
| Out of Scope (Kanban, Matching, AI, Builder, TECH)                   | Yes      |
| DoD                                                                  | Yes      |
| Lifecycle PR-1 → PR-2 → PR-3                                         | Yes      |
| No TECH / Foundation Freeze                                          | Explicit |
| Baseline honesty vs EPIC-003 status                                  | Yes      |

---

## Baseline honesty

| Surface                         | Notes for PR-2                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Candidate Workspace             | Exists — must not regress (AC-6)                                                                        |
| Job Intelligence                | Exists — must not regress (AC-7)                                                                        |
| `CandidateJobRelationship`      | Exists — Workflow belongs here; must not regress Relationship Foundation (AC-8)                         |
| EPIC-003 status set             | Small association statuses already present — align/extend to Workflow stages; **not a rewrite**         |

Spec correctly frames: Workflow on top of existing relationships.

---

## Scope discipline

**In:** current stage, default stage set, move to any valid stage, append-only history, Relationship view, Job list by stage.  
**Out:** Kanban, Matching, AI, email/interview/offer product flows, workflow builder, TECH, rigid transition graphs.

MVP stays a clean fourth foundation layer:

```text
EPIC-001 Candidate Intelligence
EPIC-002 Job Intelligence
EPIC-003 Relationship Intelligence
EPIC-004 Recruiter Workflow
```

### Transition policy (TL note)

MVP **does not** hardcode from→to stage rules. Recruiters differ by company; enforcing a matrix early would slow foundation delivery and risk lock-in. Transition graphs / customization deferred until product evidence requires them.

---

## Risks accepted for Alpha

- Free stage moves within the default set (no graph) — intentional for MVP
- Alignment of EPIC-003 status with Workflow current stage — document in Implementation; guard with AC-8
- Concurrent stage updates — last-write-wins acceptable
- History never edited — append-only only

---

## Gate decision

| Gate                                      | Result                     |
| ----------------------------------------- | -------------------------- |
| Product value clear                       | PASS                       |
| UL avoids Pipeline-as-aggregate lock-in   | PASS                       |
| AC testable                               | PASS                       |
| Out of Scope explicit                     | PASS                       |
| No Matching / AI fields                   | PASS                       |
| No hardcoded transition matrix (MVP)      | PASS (explicit)            |
| No TECH dependency                        | PASS                       |
| Definition of Done                        | PASS                       |
| Ready for Implementation PR               | **YES** (after Spec merge) |

**Recommendation:** ✅ **APPROVE Spec** — merge docs-only PR, then open Implementation PR locked to this Spec.

---

## Next

1. Merge Spec (this PR)
2. Implementation PR (current stage / move / history / Relationship view / Job list by stage)
3. Validation Report PR with evidence for AC-1…AC-11
