# EPIC-005 — Matching Foundation

| Field             | Value                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| Status            | **SPEC** (PR-1 docs-only)                                             |
| Baseline          | `founder-alpha-2` + EPIC-001…004 COMPLETED                            |
| Type              | Product EPIC (user value)                                             |
| Foundation Freeze | Intact                                                                |
| TECH required     | None                                                                  |

---

## Background

The platform already owns:

- **EPIC-001** — Candidate Intelligence / Workspace
- **EPIC-002** — Job Intelligence Foundation
- **EPIC-003** — Candidate ↔ Job Relationship Foundation
- **EPIC-004** — Recruiter Workflow Foundation

Recruiters can manage Candidates, Jobs, Relationships, and hiring Stages. They still cannot see an **explainable** comparison of how well a Candidate fits a Job.

This EPIC introduces **deterministic Matching**. It is **not** AI. It does **not** rewrite Candidate, Job, Relationship, or Workflow.

---

## Problem Statement

Recruiters can manage candidates and workflow.

However, the platform cannot explain how well a Candidate matches a Job:

> “Is this person a fit for this role — and **why**?”

A bare score without evidence would be opinion. Future AI Copilot must also explain matching from evidence, not invent a black-box number.

---

## Goal

Introduce **deterministic matching**.

Matching evaluates Candidate and Job.  
Matching provides **evidence**.  
Matching never makes hiring decisions.

---

## Principles

| Principle            | Meaning                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| **Evidence first**   | Matched / missing skills, experience, English, salary are computed first |
| **Score second**     | Overall Match Score is derived only from that evidence                   |
| **Explainable**      | Every score must be traceable to evidence                                |
| **No black box**     | Same input → same output; rules are deterministic                        |
| **Matching Stability** | Score may use only documented evidence; no hidden factors or undocumented heuristics |

This aligns with the product philosophy: **Evidence over Opinion**.

---

## Business Language (Ubiquitous Language)

| Term                     | Role in this EPIC                                              |
| ------------------------ | -------------------------------------------------------------- |
| **Matching Result**      | Read-only result of comparing one Candidate to one Job         |
| **Matched Skills**       | Skills present in both Candidate and Job                       |
| **Missing Skills**       | Required Job skills absent from Candidate                      |
| **Experience Match**     | Comparison of candidate experience vs job requirement          |
| **English Match**        | Comparison of candidate English vs job requirement             |
| **Salary Match**         | Comparison of expected salary vs job budget                    |
| **Overall Match Score**  | Deterministic score derived from evidence (never primary truth)|

Do **not** treat “Score” as the root concept. Score is a summary of evidence.

---

## User Story

> As a recruiter,  
> I want to understand why a candidate matches a job,  
> so I can make better hiring decisions.

---

## MVP Scope

### 1. Generate Matching Result (on demand)

```text
Candidate + Job  →  Matching Result
```

Triggered by recruiter request (e.g. API / UI action). **Not** a background job. **Not** persisted in MVP (see Persistence policy).

### 2. Matched Skills

Skills found in both Candidate and Job.

### 3. Missing Skills

Required skills missing from Candidate.

### 4. Experience Match

Compare candidate experience with job requirement (rule-based).

### 5. English Match

Compare candidate English level with job requirement (rule-based).

### 6. Salary Match

Compare expected salary with job budget (rule-based).

### 7. Overall Match Score

Generate a deterministic score **after** evidence is computed.  
Score is derived only from evidence — never the other way around.

---

## Persistence policy (MVP)

**Matching Result is computed on demand and is not stored in the database in MVP.**

Rationale:

- Result depends on current Candidate and Job data.
- Persisting would require sync/invalidation when CV or JD changes.
- On-demand keeps results fresh and MVP simple.

Cache or historical snapshots (if needed for performance / audit later) belong to a **future EPIC** — not this one. That must not change the Matching Result shape or Evidence-first rules.

---

## Business Rules

1. Matching is **deterministic**: same Candidate + Job inputs → same Matching Result.
2. Matching **never** changes Candidate, Job, Relationship, or Workflow.
3. Matching produces **read-only** results.
4. Evidence fields are computed **before** Overall Match Score.
5. Overall Match Score must be explainable from the evidence in the same result.
6. **Matching Stability:** The overall match score must be derived solely from the documented evidence. No hidden factors or undocumented heuristics may influence the score. Weight changes must update documented business rules — not invent silent inputs.
7. Matching does **not** auto-rank lists, auto-advance Workflow, or make hire/reject decisions.

---

## Acceptance Criteria

| ID        | Criterion                                                                 |
| --------- | ------------------------------------------------------------------------- |
| **AC-1**  | Matching Result can be generated for a Candidate + Job.                   |
| **AC-2**  | Matched Skills are correct for the inputs.                                |
| **AC-3**  | Missing Skills are correct for the inputs.                                |
| **AC-4**  | Experience comparison is correct.                                         |
| **AC-5**  | English comparison is correct.                                            |
| **AC-6**  | Salary comparison is correct.                                             |
| **AC-7**  | Overall Match Score is deterministic (same inputs → same score).          |
| **AC-8**  | Candidate Workspace has no regression.                                    |
| **AC-9**  | Job Workspace / Job Intelligence has no regression.                       |
| **AC-10** | Relationship Foundation has no regression.                                |
| **AC-11** | Workflow Foundation has no regression.                                    |
| **AC-12** | Resume Import has no regression.                                          |
| **AC-13** | `GET /health` returns `"status":"ok"`.                                    |
| **AC-14** | `pnpm run ci` PASS.                                                       |

---

## Out of Scope

- AI / LLM / Copilot
- Recommendation / Auto Ranking / Automatic Hiring
- Semantic Search / Learning Models / Feedback Loop
- Analytics
- Persisting Matching Result / match history tables (MVP)
- TECH / architecture redesign / Memory Bank changes

---

## Dependencies

| Dependency                        | Status    |
| --------------------------------- | --------- |
| Founder Alpha / `founder-alpha-2` | Required  |
| EPIC-001 Candidate Workspace      | Completed |
| EPIC-002 Job Intelligence         | Completed |
| EPIC-003 Relationship Foundation  | Completed |
| EPIC-004 Workflow Foundation      | Completed |
| Repository pattern (read Candidate / Job) | Required |

No new TECH ticket. No new persistence aggregate required for MVP.

---

## Risks

| Risk                              | Mitigation                                                                 |
| --------------------------------- | -------------------------------------------------------------------------- |
| Rule evolution                    | Keep rules explicit and versionable in code; deterministic fixtures in eval |
| Weight calibration                | Document simple MVP weights; avoid pretending precision                    |
| Business expectation differences  | Evidence-first UI; score secondary                                         |
| Temptation to persist early       | Explicit on-demand policy; defer cache/snapshot                            |

---

## Success Metrics

- Recruiters receive **explainable** matching results.
- Every score can be traced back to evidence.
- Future AI Copilot can explain matching **without** inventing a parallel scoring model — it narrates the same evidence layer.

---

## Roadmap context (vision — not in this EPIC)

| EPIC         | Goal                          |
| ------------ | ----------------------------- |
| ✅ EPIC-001  | Candidate Intelligence        |
| ✅ EPIC-002  | Job Intelligence              |
| ✅ EPIC-003  | Relationship Intelligence     |
| ✅ EPIC-004  | Workflow Intelligence         |
| **EPIC-005** | Matching Foundation _(this)_  |
| EPIC-006     | AI Recruiter Copilot          |
| EPIC-007     | Analytics & Insights          |

---

## Definition of Done

EPIC-005 is done when:

- AC-1…AC-14 **PASS**
- Candidate Workspace regression: **NONE**
- Job Workspace regression: **NONE**
- Relationship Foundation regression: **NONE**
- Workflow Foundation regression: **NONE**
- Resume Import regression: **NONE**
- `GET /health` **PASS**
- `pnpm run ci` **PASS**
- Validation Report completed (PR-3) with evidence and clear **PASS / FAIL**

---

## Deliverables (lifecycle)

| PR              | Content                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------ |
| **PR-1 (this)** | Spec only — this document + `reports/epic-005-spec-review.md`                                    |
| **PR-2**        | Implementation — on-demand Matching Result (evidence then score); no DB persist; no AI           |
| **PR-3**        | Validation Report — AC checklist, runtime evidence, PASS/FAIL                                    |

---

## Implementation constraints (for PR-2)

- Branch from `main` after this Spec merges.
- Pure function / application service over existing Candidate + Job reads.
- Evidence computed before score; expose both in Matching Result.
- **Do not** add Prisma models or migrations for Matching Result in MVP.
- Do not mutate Relationship or Workflow.
- No LLM calls; no recommendation lists; no auto-ranking of Job candidates.
- Keep `main` deployable; CI green.
