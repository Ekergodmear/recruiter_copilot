# EPIC-003 — Candidate ↔ Job Relationship Foundation

| Field             | Value                                             |
| ----------------- | ------------------------------------------------- |
| Status            | **SPEC** (PR-1 docs-only)                         |
| Baseline          | `founder-alpha-2` + EPIC-001 + EPIC-002 COMPLETED |
| Type              | Product EPIC (user value)                         |
| Foundation Freeze | Intact                                            |
| TECH required     | None                                              |

---

## Background

The platform already owns:

- **EPIC-001** — Candidate Intelligence / Workspace
- **EPIC-002** — Job Intelligence Foundation

Candidate and Job exist as independent first-class entities. Recruiters still cannot express a durable link: _this candidate belongs to this job_ (whether sourced, referred, or applied).

Partial linking already exists on `main` via **Submission** (candidateId + jobId + status). That path is oriented toward a later pipeline vocabulary (`Submitted`, `Interview Scheduled`, `Placed`, …). This EPIC **does not rewrite** Candidate or Job. It introduces **Relationship Intelligence** with a neutral domain name and a small status set — closing the gap without becoming Pipeline / Matching.

---

## Problem Statement

Candidate Intelligence and Job Intelligence are still isolated.

Recruiters cannot organize hiring work as:

> “This candidate is related to this job at this status.”

Future Pipeline, Matching, and Copilot require this relationship layer. Without it, those EPICs would have to invent linking ad hoc and risk locking the domain into “Job Application” thinking too early.

---

## Goal

Introduce a **first-class relationship entity** between Candidate and Job.

The relationship records **recruiter decisions / associations** only.

It does **not** evaluate candidate quality.  
It does **not** perform matching.

---

## Business Language (Ubiquitous Language)

**Do not** use `Application` as the core aggregate name.

| Term                         | Role in this EPIC                                                               |
| ---------------------------- | ------------------------------------------------------------------------------- |
| **CandidateJobRelationship** | Preferred aggregate name (neutral)                                              |
| Application                  | Reserved for a possible _source_ or subtype later — not the root                |
| Placement                    | Avoid as aggregate name (collides with outcome “Placed” / EPIC Placement later) |

### Why not “Application”?

A recruiter may relate a candidate to a job even when the candidate never applied:

- Sourced from LinkedIn → related to Job
- Import CV → related to Job
- Referral → related to Job
- Direct apply → also related to Job

All are **one relationship kind**; not all are applications.

---

## User Story

> As a recruiter,  
> I want to associate candidates with jobs,  
> so I can organize hiring work inside the platform.

---

## MVP Scope

### 1. Create Relationship

Link:

```text
Candidate ──► Job
```

Recruiter creates a relationship for an existing Candidate and an existing Job.

### 2. Relationship Status

Initial statuses only (simple status management — **no workflow engine**):

| Status      | Intent                                    |
| ----------- | ----------------------------------------- |
| `Sourced`   | Recruiter-initiated association           |
| `Applied`   | Candidate applied (or treated as applied) |
| `Screening` | Early review                              |

Allowed operations in MVP: create with an initial status; update status among this set.

### 3. Candidate View

List Jobs related to a Candidate (via relationships).

### 4. Job View

List Candidates related to a Job (via relationships).

### 5. Persist

Via existing Repository pattern + Prisma. Prefer extending / aligning with existing Submission persistence **only if** it can express Relationship Intelligence without importing Pipeline/Matching semantics. If rename/mapping is needed, keep it additive and document field mapping — no architecture redesign, no TECH ticket.

### Explicitly not in relationship payload

Do **not** add in this EPIC:

- `score`, `fit`, `recommendation`, `priority`, `matchReason`  
  → belong to Matching / later EPICs

Keep the Relationship layer **pure**.

---

## Business Rules

1. **N:N** — one Candidate may relate to many Jobs; one Job may relate to many Candidates.
2. Relationship is a first-class record of recruiter action; it does **not** imply suitability.
3. Candidate and Job remain independent aggregates; Relationship depends on both existing.
4. **Uniqueness (MVP):** a Candidate and a Job may have **at most one** `CandidateJobRelationship`. Creating a duplicate for the same `(candidateId, jobId)` pair must fail with a clear error (e.g. 409). Historical / repeated relationships (re-application history) are out of scope.
5. Deleting Candidate or Job follows **existing** business rules; this EPIC does not invent cascade product policy.
6. Existing Submission / pipeline UI paths must not regress; this EPIC must not expand them into Pipeline Kanban or Matching product work.

---

## Acceptance Criteria

| ID        | Criterion                                                                   |
| --------- | --------------------------------------------------------------------------- |
| **AC-1**  | Relationship can be created (Candidate + Job + initial status).             |
| **AC-2**  | Relationship appears under Candidate (list Jobs for Candidate).             |
| **AC-3**  | Relationship appears under Job (list Candidates for Job).                   |
| **AC-4**  | Status can be updated within the MVP status set.                            |
| **AC-5**  | N:N works (same Candidate → multiple Jobs; same Job → multiple Candidates). |
| **AC-6**  | Candidate Workspace has no regression.                                      |
| **AC-7**  | Job Workspace / Job Intelligence has no regression.                         |
| **AC-8**  | Resume Import has no regression.                                            |
| **AC-9**  | `GET /health` returns `"status":"ok"`.                                      |
| **AC-10** | `pnpm run ci` PASS.                                                         |

---

## Out of Scope

- AI / Copilot
- Matching / Ranking / Recommendation
- Pipeline / Kanban / workflow engine
- Email / Interview / Offer
- Analytics
- score / fit / priority / matchReason fields
- TECH / architecture redesign / Memory Bank changes

---

## Dependencies

| Dependency                           | Status    |
| ------------------------------------ | --------- |
| Founder Alpha / `founder-alpha-2`    | Required  |
| EPIC-001 Candidate Workspace         | Completed |
| EPIC-002 Job Intelligence Foundation | Completed |
| Repository + Prisma                  | Required  |

No new TECH ticket.

---

## Risks

| Risk                                          | Mitigation                                          |
| --------------------------------------------- | --------------------------------------------------- |
| Relationship lifecycle vs existing Submission | Baseline honesty; map or extend carefully; document |
| Duplicate relationships                       | Unique `(candidateId, jobId)` rule                  |
| Future workflow expansion                     | Small status set only; no engine                    |
| Naming lock-in (“Application”)                | Use CandidateJobRelationship                        |

---

## Success Metrics

- Recruiters can connect Candidates and Jobs inside the platform.
- Platform owns: Candidate Intelligence + Job Intelligence + **Relationship Intelligence**.
- Future Pipeline and Matching can build on this layer without rewriting EPIC-001/002.

---

## Roadmap context (vision — not in this EPIC)

| EPIC         | Goal                               |
| ------------ | ---------------------------------- |
| ✅ EPIC-001  | Candidate Intelligence             |
| ✅ EPIC-002  | Job Intelligence                   |
| **EPIC-003** | Relationship Intelligence _(this)_ |
| EPIC-004     | Recruiter Workflow / Pipeline      |
| EPIC-005     | Matching Engine                    |
| EPIC-006     | AI Recruiter Copilot               |
| EPIC-007     | Analytics & Insights               |

---

## Definition of Done

EPIC-003 is done when:

- AC-1…AC-10 **PASS**
- Candidate Workspace regression: **NONE**
- Job Workspace regression: **NONE**
- Resume Import regression: **NONE**
- `GET /health` **PASS**
- `pnpm run ci` **PASS**
- Validation Report completed (PR-3) with evidence and clear **PASS / FAIL**

---

## Deliverables (lifecycle)

| PR              | Content                                                                   |
| --------------- | ------------------------------------------------------------------------- |
| **PR-1 (this)** | Spec only — this document + `reports/epic-003-spec-review.md`             |
| **PR-2**        | Implementation — create, status update, Candidate view, Job view, persist |
| **PR-3**        | Validation Report — AC checklist, runtime evidence, PASS/FAIL             |

---

## Implementation constraints (for PR-2)

- Branch from `main` after this Spec merges.
- Prefer extending existing persistence over a parallel conflicting model.
- Ubiquitous language in APIs/UI: **relationship** (not “application” as root).
- No Matching fields; no Pipeline Kanban.
- Keep `main` deployable; CI green.
