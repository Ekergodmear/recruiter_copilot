# EPIC-004 — Recruiter Workflow Foundation

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| Status            | **SPEC** (PR-1 docs-only)                                              |
| Baseline          | `founder-alpha-2` + EPIC-001 + EPIC-002 + EPIC-003 COMPLETED           |
| Type              | Product EPIC (user value)                                              |
| Foundation Freeze | Intact                                                                 |
| TECH required     | None                                                                   |

---

## Background

The platform already owns:

- **EPIC-001** — Candidate Intelligence / Workspace
- **EPIC-002** — Job Intelligence Foundation
- **EPIC-003** — Candidate ↔ Job Relationship Foundation (`CandidateJobRelationship`)

Recruiters can associate a Candidate with a Job and track a small association status. They still cannot manage **hiring progress** over time: move a relationship through stages, keep an audit trail, or list work by stage for a Job.

This EPIC introduces **Recruiter Workflow** on top of existing relationships. It does **not** rewrite Candidate, Job, or `CandidateJobRelationship`.

---

## Problem Statement

The platform already owns Candidate Intelligence, Job Intelligence, and Relationship Intelligence.

However, recruiters cannot manage hiring progress.

A relationship exists, but there is no workflow:

> “This candidate is related to this job — but where are we in the hiring process, and what happened before?”

Future Pipeline Board, Matching, Analytics, and Copilot need a durable workflow layer. Without it, those EPICs would invent progress tracking ad hoc.

---

## Goal

Introduce **recruiter workflow**.

Workflow records the hiring progress of a `CandidateJobRelationship`.

Workflow represents **recruiter actions**.

Workflow does **not** evaluate candidate quality.  
Workflow does **not** perform matching.

---

## Business Language (Ubiquitous Language)

| Term              | Role in this EPIC                                                                 |
| ----------------- | --------------------------------------------------------------------------------- |
| **Workflow**      | Hiring-progress behavior owned by a `CandidateJobRelationship`                    |
| **Stage**         | Named step in the default stage set                                               |
| **Current Stage** | The single active stage on a relationship                                         |
| **Stage History** | Append-only record of stage changes                                               |
| Pipeline          | **Not** a business aggregate — a possible later visualization of Workflow only    |

Avoid introducing **Pipeline** as a domain aggregate root. A Pipeline board (Kanban) is out of MVP scope and is only one possible UI over Workflow.

---

## User Story

> As a recruiter,  
> I want to move candidates through hiring stages,  
> so I can track recruitment progress.

---

## MVP Scope

### 1. Current Stage

Each `CandidateJobRelationship` owns **one** current stage.

### 2. Workflow Stages (default set)

| Stage                       | Intent                                      |
| --------------------------- | ------------------------------------------- |
| `Sourced`                   | Recruiter-initiated association             |
| `Applied`                   | Treated as applied                          |
| `Screening`                 | Early review                                |
| `Technical Interview`       | Technical interview                         |
| `Hiring Manager Interview`  | Hiring-manager interview                    |
| `Offer`                     | Offer extended / in offer process           |
| `Hired`                     | Hired                                       |
| `Rejected`                  | Rejected                                    |
| `Withdrawn`                 | Withdrawn                                   |

### 3. Move Stage

Recruiter can update the current stage to **any stage in the default set**.

**MVP transition policy:** do **not** hardcode allowed from→to edges (e.g. only `Screening → Technical Interview`). Any valid default stage may be selected. Stricter transition graphs / customization belong to a later EPIC if product evidence requires them.

### 4. Stage History

Every stage change is recorded (append-only). Store at least:

- previous stage
- new stage
- timestamp

History entries **cannot** be edited or deleted in MVP.

### 5. Relationship View

Display for a relationship:

- Current Stage
- Stage History

### 6. Job View

List relationships for a Job **grouped or filtered by current stage**.

**No Kanban board** in MVP.

---

## Baseline honesty (EPIC-003 status vs Workflow stage)

EPIC-003 already persists a small association status set on `CandidateJobRelationship` (`Sourced` / `Applied` / `Screening`).

EPIC-004 extends hiring progress into a fuller **stage** model with history. Implementation (PR-2) must:

- Keep Relationship Foundation APIs/behavior non-regressing (AC-8)
- Align current stage with the relationship’s progress surface without inventing a second conflicting progress model
- Prefer additive extension over rewrite

This is **not** a rewrite of EPIC-003.

---

## Business Rules

1. Workflow belongs to `CandidateJobRelationship`.
2. Stage history is append-only and cannot be edited.
3. Current Stage always reflects the **latest** history entry.
4. Workflow records recruiter actions; it does **not** imply candidate suitability.
5. MVP allows moving to any stage in the default set (no hardcoded transition matrix).
6. Candidate, Job, and Relationship Foundation remain independent of Matching / AI semantics.

---

## Acceptance Criteria

| ID        | Criterion                                                                 |
| --------- | ------------------------------------------------------------------------- |
| **AC-1**  | Every `CandidateJobRelationship` has a current stage.                     |
| **AC-2**  | Recruiter can update current stage (to any valid default stage).          |
| **AC-3**  | Every stage change creates a history record.                              |
| **AC-4**  | Current stage always matches the latest history entry.                    |
| **AC-5**  | Relationships can be listed by stage (Job view group/filter).             |
| **AC-6**  | Candidate Workspace has no regression.                                    |
| **AC-7**  | Job Workspace / Job Intelligence has no regression.                       |
| **AC-8**  | Relationship Foundation has no regression.                                |
| **AC-9**  | Resume Import has no regression.                                          |
| **AC-10** | `GET /health` returns `"status":"ok"`.                                    |
| **AC-11** | `pnpm run ci` PASS.                                                       |

---

## Out of Scope

- Matching / Ranking / Recommendation / Semantic Search
- AI / Copilot
- Email / Interview Scheduling / Offer Management (product workflows beyond stage label)
- Analytics
- Kanban Board / Pipeline Board UI
- Workflow Customization / Workflow Builder
- Hardcoded stage transition graphs (deferred)
- TECH / architecture redesign / Memory Bank changes

---

## Dependencies

| Dependency                        | Status    |
| --------------------------------- | --------- |
| Founder Alpha / `founder-alpha-2` | Required  |
| EPIC-001 Candidate Workspace      | Completed |
| EPIC-002 Job Intelligence         | Completed |
| EPIC-003 Relationship Foundation  | Completed |
| Repository + Prisma               | Required  |

No new TECH ticket.

---

## Risks

| Risk                         | Mitigation                                                                 |
| ---------------------------- | -------------------------------------------------------------------------- |
| Workflow evolution           | Small default stage set; append-only history; no engine                    |
| Stage transitions            | MVP: any valid stage; defer rigid graphs                                   |
| Future customization         | Out of scope; do not invent builder UI                                     |
| Overlap with EPIC-003 status | Baseline honesty; additive align; AC-8 regression guard                    |
| Naming lock-in (“Pipeline”)  | Use Workflow / Stage / Stage History; Pipeline = visualization later only |

---

## Success Metrics

- Recruiters can manage hiring progress inside the platform.
- Every relationship owns workflow state (current stage + history).
- Future Pipeline Board, Matching, Analytics, and AI Copilot can build on this workflow layer without rewriting EPIC-001…003.

---

## Roadmap context (vision — not in this EPIC)

| EPIC         | Goal                               |
| ------------ | ---------------------------------- |
| ✅ EPIC-001  | Candidate Intelligence             |
| ✅ EPIC-002  | Job Intelligence                   |
| ✅ EPIC-003  | Relationship Intelligence          |
| **EPIC-004** | Recruiter Workflow _(this)_        |
| EPIC-005     | Matching Engine                    |
| EPIC-006     | AI Recruiter Copilot               |
| EPIC-007     | Analytics & Insights               |

---

## Definition of Done

EPIC-004 is done when:

- AC-1…AC-11 **PASS**
- Candidate Workspace regression: **NONE**
- Job Workspace regression: **NONE**
- Relationship Foundation regression: **NONE**
- Resume Import regression: **NONE**
- `GET /health` **PASS**
- `pnpm run ci` **PASS**
- Validation Report completed (PR-3) with evidence and clear **PASS / FAIL**

---

## Deliverables (lifecycle)

| PR              | Content                                                                          |
| --------------- | -------------------------------------------------------------------------------- |
| **PR-1 (this)** | Spec only — this document + `reports/epic-004-spec-review.md`                    |
| **PR-2**        | Implementation — current stage, move stage, history, Relationship view, Job view |
| **PR-3**        | Validation Report — AC checklist, runtime evidence, PASS/FAIL                    |

---

## Implementation constraints (for PR-2)

- Branch from `main` after this Spec merges.
- Build on `CandidateJobRelationship` — do not invent a parallel Application/Pipeline aggregate.
- Ubiquitous language: **Workflow / Stage / Stage History / Current Stage** (not Pipeline as root).
- No transition matrix enforcement in MVP.
- No Matching fields; no Kanban board; no Workflow Builder.
- Keep `main` deployable; CI green.
