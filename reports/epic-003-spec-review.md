# EPIC-003 Spec Review — Candidate ↔ Job Relationship Foundation

| Field          | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Document       | `docs/epics/EPIC-003-Candidate-Job-Relationship.md`        |
| Review type    | Spec gate (PR-1 docs-only)                                 |
| Baseline       | `founder-alpha-2` / `main` + EPIC-001 + EPIC-002 COMPLETED |
| Recommendation | **APPROVE Spec** → unlock Implementation PR                |

---

## Why this EPIC now

With Candidate Intelligence and Job Intelligence complete, the remaining structural gap is the **link**. Relationship Intelligence enables Pipeline and Matching later without forcing “Application-only” thinking into the domain root.

---

## Naming decision (critical)

| Choice                          | Verdict                                                  |
| ------------------------------- | -------------------------------------------------------- |
| `Application` as root aggregate | **Reject** — implies candidate-initiated apply only      |
| `Placement` as root aggregate   | **Avoid** — collides with outcome “Placed”               |
| **`CandidateJobRelationship`**  | **Adopt** — neutral; covers sourced / referred / applied |

“Application” may later be a **source** or subtype, not the aggregate root. This is naming discipline, not architecture redesign.

---

## Spec completeness check

| Section                                                 | Present  |
| ------------------------------------------------------- | -------- |
| Problem / Goal / User Story                             | Yes      |
| Neutral UL + rationale                                  | Yes      |
| MVP (create, status, Candidate view, Job view, persist) | Yes      |
| Pure relationship (no score/fit/match fields)           | Explicit |
| AC-1…AC-10                                              | Yes      |
| Out of Scope                                            | Yes      |
| DoD                                                     | Yes      |
| Lifecycle PR-1 → PR-2 → PR-3                            | Yes      |
| No TECH / Foundation Freeze                             | Explicit |

---

## Baseline honesty

| Surface                | Notes for PR-2                                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Candidate Workspace    | Exists — must not regress (AC-6)                                                                                                                                  |
| Job Intelligence       | Exists — must not regress (AC-7)                                                                                                                                  |
| `Submission` on `main` | Already links candidateId↔jobId with pipeline-heavy statuses — **close gap / align** toward Relationship Intelligence; do not turn this EPIC into Pipeline Kanban |

Spec correctly frames: **not a rewrite** of Candidate or Job.

---

## Scope discipline

**In:** create link, small status set (`Sourced` / `Applied` / `Screening`), list by Candidate, list by Job, persist.  
**Out:** AI, Matching, Ranking, Pipeline Kanban, score/fit fields, Interview/Offer, TECH — correctly excluded.

MVP stays a clean third foundation layer:

```text
EPIC-001 Candidate Intelligence
EPIC-002 Job Intelligence
EPIC-003 Relationship Intelligence
```

---

## Risks accepted for Alpha

- Duplicate `(candidateId, jobId)` → reject or clear no-op
- Mapping vs existing Submission statuses — document; keep MVP set small
- Concurrent edits — last-write-wins acceptable

---

## Gate decision

| Gate                                   | Result                     |
| -------------------------------------- | -------------------------- |
| Product value clear                    | PASS                       |
| UL avoids Application lock-in          | PASS                       |
| AC testable                            | PASS                       |
| Out of Scope explicit                  | PASS                       |
| Pure relationship (no Matching fields) | PASS                       |
| No TECH dependency                     | PASS                       |
| Definition of Done                     | PASS                       |
| Ready for Implementation PR            | **YES** (after Spec merge) |

**TL action:** Approve & merge this Spec PR, then open Implementation PR against merged Spec.

---

## Next

1. Merge Spec
2. Implementation PR (create / status / Candidate view / Job view / persist)
3. Validation Report PR with evidence for AC-1…AC-10
