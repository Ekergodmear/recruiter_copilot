# EPIC-002 Spec Review — Job Intelligence Foundation

| Field          | Value                                                |
| -------------- | ---------------------------------------------------- |
| Document       | `docs/epics/EPIC-002-Job-Intelligence-Foundation.md` |
| Review type    | Spec gate (PR-1 docs-only)                           |
| Baseline       | `founder-alpha-2` / `main` + EPIC-001 COMPLETED      |
| Recommendation | **APPROVE Spec** → unlock Implementation PR          |

---

## Why this EPIC now

EPIC-001 gave recruiters a Candidate Workspace. Without Job as a first-class intelligence object, the platform still only half-owns the recruitment knowledge graph. Job Intelligence Foundation is the correct next product EPIC: structured Job knowledge (not AI), enabling later Relationship → Workflow → Matching → Copilot.

Renaming from a thin “Job Workspace” to **Job Intelligence Foundation** aligns with vision without expanding MVP into a super-EPIC.

---

## Spec completeness check

| Section                                        | Present                   |
| ---------------------------------------------- | ------------------------- |
| Problem / Goal / User Story                    | Yes                       |
| MVP (List, Detail, Create, Edit, Save, Source) | Yes                       |
| Search + Sort                                  | Yes                       |
| AC-1…AC-11                                     | Yes                       |
| Out of Scope                                   | Yes                       |
| Business rules (independent of Candidate)      | Yes                       |
| Dependencies / Risks / Metrics                 | Yes                       |
| Definition of Done                             | Yes                       |
| Lifecycle PR-1 → PR-2 → PR-3                   | Yes                       |
| Foundation Freeze / no TECH                    | Explicit                  |
| Roadmap context (EPIC-003…007)                 | Documented — not in scope |

---

## Baseline honesty (gaps vs existing code)

Partial Job surfaces already exist (`JobsScreen`, create/detail/review, Job repository, Prisma `Job` model). Spec correctly frames EPIC-002 as **elevating Job to Intelligence Foundation**, not a greenfield rewrite:

| MVP need                                   | Likely gap for PR-2                                              |
| ------------------------------------------ | ---------------------------------------------------------------- |
| Job Source on every job                    | No first-class `source` today — add for AC-7 (`manual` required) |
| Job Notes section / edit                   | Job-level notes may be missing (submission notes ≠ job notes)    |
| List columns + search title/company + sort | Extend existing list API/UI to Spec                              |
| Detail as intelligence sections            | Evolve beyond review-only framing                                |
| Create manual + Edit allowed fields        | Close gaps; keep JD review paths unbroken                        |
| No Candidate↔Job relationship product      | Do not expand Matching/Pipeline in this EPIC                     |

Implementation must extend existing paths; must not regress Candidate Workspace (AC-8), Import Resume (AC-9), `/health` (AC-10), or CI (AC-11).

---

## Scope discipline

**In:** Job list / detail / create (manual) / edit / persist / search / sort / source.  
**Out:** AI, Matching, Pipeline product, Semantic search, Job import/sync, Relationship EPIC, TECH, architecture rewrite — correctly excluded.

MVP stays small; vision stays clear.

---

## Risks accepted for Alpha

- Large JD text stored as existing string fields
- Light validation only
- Non-`manual` sources documented only
- Concurrent edit: last-write-wins acceptable (same Alpha posture as EPIC-001)
- `source` immutable after create (TL note — added to Spec)

---

## Gate decision

| Gate                          | Result                     |
| ----------------------------- | -------------------------- |
| Product value clear           | PASS                       |
| AC testable                   | PASS                       |
| Out of Scope explicit         | PASS                       |
| No TECH dependency            | PASS                       |
| Definition of Done            | PASS                       |
| Source immutability clarified | PASS (added)               |
| Not a super-EPIC              | PASS                       |
| Ready for Implementation PR   | **YES** (after Spec merge) |

**TL decision (2026-07-19):** ✅ **APPROVED** — merge Spec, then open Implementation PR (scope locked to Spec).

---

## Next

1. Merge Spec
2. Implementation PR (list / detail / create / edit / search / sort / source / persist)
3. Validation Report PR with evidence for AC-1…AC-11
