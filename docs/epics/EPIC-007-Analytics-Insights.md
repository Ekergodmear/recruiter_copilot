# EPIC-007 — Analytics & Insights

| Field             | Value                                                      |
| ----------------- | ---------------------------------------------------------- |
| Status            | **PASS** (Validation PR-3)                                 |
| Baseline          | `main @ 2e363d0` + EPIC-001…006 COMPLETED                  |
| Type              | Product EPIC (user value)                                  |
| Foundation Freeze | Intact                                                     |
| TECH required     | None                                                       |

---

## Background

The platform already owns six capabilities:

| EPIC     | Capability                | Role                                         |
| -------- | ------------------------- | -------------------------------------------- |
| EPIC-001 | Candidate Intelligence    | Candidate profile / workspace                |
| EPIC-002 | Job Intelligence          | Job requirements                             |
| EPIC-003 | Relationship Intelligence | Candidate ↔ Job link                         |
| EPIC-004 | Workflow Intelligence     | Hiring stage + append-only history           |
| EPIC-005 | Matching Intelligence     | Deterministic evidence → score (on-demand)   |
| EPIC-006 | AI Recruiter Copilot      | Read-only interpretation / drafts            |

Recruiters can manage hiring data, see explainable matches, and use Copilot. They still lack a **read model** that answers operational questions: pipeline shape, stage conversion, and match distributions — without inventing a second source of truth.

This EPIC introduces **Analytics & Insights** as a **read-only aggregation layer** on top of existing capabilities. It does **not** rewrite EPIC-001…006.

---

## Problem Statement

Recruiters have structured intelligence (Candidate, Job, Relationship, Workflow, Matching, Copilot).

However, they still cannot quickly answer:

- How many candidates are in each workflow stage?
- What is the stage conversion rate?
- How many candidates are linked to each job (and how do they score)?
- What does the Match Score distribution look like?
- How long do candidates stay before moving stage (when history timestamps exist)?
- What is the pipeline snapshot for a given Job?

Without Analytics, teams export to spreadsheets or guess — creating a shadow source of truth that drifts from the platform.

---

## Goal

Introduce **Analytics & Insights** focused on:

1. **Operational visibility** — stage counts, funnel, job pipeline snapshot  
2. **Match awareness** — counts and score distribution derived from Matching Intelligence at query time  

Analytics **never** becomes the owner of hiring rules, scores, or workflow decisions.

---

## Governing principle (locked)

> **Analytics consumes capabilities; Analytics does not own business rules.**

| Layer                              | Owns                                              |
| ---------------------------------- | ------------------------------------------------- |
| EPIC-001…005 (capabilities)        | Business rules, Matching score, Workflow stages   |
| EPIC-006 (Copilot)                 | Natural-language interpretation & draft content   |
| EPIC-007 (Analytics)               | Read-only aggregates / distributions for recruiters |

Consequences:

- Aggregations are derived from capability data — **not** independently authored metrics that redefine stages or scores.
- Analytics **reads** Candidate, Job, Relationship, Workflow, Matching Result.
- Analytics **must not** mutate Workflow, Relationship, Candidate, Job, or Matching.
- Match Score in Analytics comes from **EPIC-005 Matching Intelligence** (on-demand at query time). Analytics does not invent or persist a parallel score store in MVP.
- When Workflow / Matching data and an Analytics chart conflict, **capability data wins**.

### Analytics Transparency

Every Analytics response must make clear that figures are **derived snapshots**:

1. **Source capabilities** used (e.g. Workflow stages, Matching results)  
2. **Computed aggregates** (counts, rates, distributions)  

Recruiters must not confuse Analytics with a warehouse, forecast, or decision engine.

### Analytics Traceability

Every Analytics metric must be **traceable** to the underlying capability data that produced it.

Examples:

- Stage distribution → relationship IDs counted in each stage  
- Funnel / conversion → relationship IDs and Stage History entries used  
- Match Score distribution → Matching Results computed at query time (candidateId, jobId, score)

Analytics is an aggregation layer, not a black box.

---

## Business Language (Ubiquitous Language)

| Term                        | Role in this EPIC                                              |
| --------------------------- | -------------------------------------------------------------- |
| **Analytics**               | Read-only aggregation over existing capabilities               |
| **Pipeline Snapshot**       | Stage distribution for relationships (optionally scoped by Job)|
| **Stage Distribution**      | Counts of relationships by `currentStage`                      |
| **Stage Conversion**        | Ratio of moves between stages from Stage History               |
| **Match Score Distribution**| Buckets of Overall Match Score computed via EPIC-005 on demand |
| **Job-level Summary**       | Per-job relationship / stage / match overview                  |
| **Time-to-stage**           | Duration between consecutive Stage History timestamps          |

Avoid framing Analytics as “AI Insights”, “BI platform”, or “recommendation”.

---

## User Story

> As a recruiter,  
> I want a read-only dashboard of pipeline and match aggregates from platform data,  
> so I can brief stakeholders and spot bottlenecks without leaving the system or inventing spreadsheet truth.

---

## MVP Scope

All Analytics queries are **on-demand** (recruiter-triggered or screen load). Outputs are **snapshots** — not live streaming, not scheduled reports.

### 1. Stage Distribution

Count of `CandidateJobRelationship` by `currentStage` (global and/or filtered by Job).

Answers: *How many candidates are in each workflow stage?*

### 2. Workflow Funnel / Stage Conversion

From append-only `stageHistory`, compute conversion between stages for a scope (global or Job).

MVP definition (locked for Implementation):

- Count transitions `previousStage → newStage` observed in history.  
- Report conversion rate for a documented path or adjacent pair (e.g. Screening → Technical Interview) as  
  `transitions(A→B) / relationships_that_reached_A` (or equivalent documented formula in Implementation).  
- Do **not** invent a marketing funnel that ignores actual history.

### 3. Candidate / Relationship Counts

- Total candidates  
- Total relationships  
- Relationships per Job  

### 4. Match Score Distribution (query-time)

For a scope (typically Job, or a listed set of relationships):

- Call Matching Intelligence **on demand** for each Candidate–Job pair in scope  
- Bucket Overall Match Score (e.g. 0–39 / 40–59 / 60–79 / 80–100 — exact buckets documented in Implementation)  
- Optionally report count of relationships with a computed match  

**Honesty note:** Matching Result is **not persisted** (EPIC-005). Analytics must not create a durable Matching warehouse in MVP; it consumes Matching at query time.

### 5. Time-to-stage (when timestamps exist)

From `stageHistory[].changedAt`, compute time between consecutive entries (e.g. median / average days in a stage) for relationships in scope.

If history is too short to compute, return empty / null with a clear explanation — do not fabricate durations.

### 6. Job Pipeline Snapshot

For one Job: stage distribution + relationship count + match score distribution (query-time) for that Job’s relationships.

### 7. Analytics API (read-only)

Expose query endpoints under a clear prefix (e.g. `GET /api/v1/analytics/...`). Exact routes in Implementation; Spec requires:

- Read-only  
- Deterministic for the same underlying capability data at query time  
- No side effects on domain aggregates  

### 8. Minimal recruiter UI

A simple Analytics / Insights view (or Job-scoped panel) showing MVP metrics. No dashboard builder.

---

## Business Rules

1. Analytics **consumes** capabilities; it does **not** own business rules.
2. Analytics **never** changes Candidate, Job, Relationship, Workflow, or Matching as a side effect of a query.
3. Match Scores shown in Analytics **must** come from EPIC-005 Matching Intelligence — not a parallel scoring formula.
4. Stage labels and order come from Workflow Intelligence (EPIC-004) — Analytics does not redefine stages.
5. Aggregates are **non-authoritative summaries** — recruiters remain decision makers; Copilot remains the narrative layer.
6. Missing or sparse data yields empty metrics or explicit gaps — not invented numbers.
7. No scheduled jobs, email digests, or warehouse sync in MVP.

---

## Acceptance Criteria

| ID        | Criterion                                                                 |
| --------- | ------------------------------------------------------------------------- |
| **AC-1**  | Stage Distribution returns counts by `currentStage` (global and/or by Job). |
| **AC-1b** | Analytics Traceability — each metric includes (or links to) the underlying capability records that produced it (e.g. relationship IDs per stage; Matching Results used for score buckets). |
| **AC-2**  | Workflow Funnel / Stage Conversion is derived from Stage History.         |
| **AC-3**  | Candidate / Relationship counts are available (incl. per Job).            |
| **AC-4**  | Match Score Distribution uses EPIC-005 Matching at query time (no parallel score engine). |
| **AC-5**  | Job Pipeline Snapshot returns stage + match overview for one Job.         |
| **AC-6**  | Time-to-stage uses Stage History timestamps when present; otherwise empty/null without fabrication. |
| **AC-7**  | Analytics endpoints are read-only (no domain mutation).                   |
| **AC-8**  | Candidate Workspace has no regression.                                    |
| **AC-9**  | Job Workspace has no regression.                                          |
| **AC-10** | Relationship Foundation has no regression.                                |
| **AC-11** | Workflow Foundation has no regression.                                    |
| **AC-12** | Matching Foundation has no regression.                                    |
| **AC-13** | AI Recruiter Copilot has no regression.                                   |
| **AC-14** | Resume Import has no regression.                                          |
| **AC-15** | `GET /health` returns `"status":"ok"`.                                    |
| **AC-16** | `pnpm run ci` PASS.                                                       |

---

## Out of Scope

- BI platform / dashboard builder / drag-drop widgets  
- Scheduled reports / email reports  
- AI-generated insights (belongs to Copilot or a later EPIC — not this MVP)  
- Forecasting / predictive attrition / hiring velocity models  
- Recommendation / ranking engines  
- Export PDF / Excel / CSV warehouse dumps  
- Data warehouse / ETL / OLAP cubes  
- Persisting Matching Results solely for Analytics (unless a future Spec reopens EPIC-005 persistence)  
- Mutating Workflow / Relationship / Match Score  
- TECH / architecture redesign / Memory Bank changes  
- Pipeline Kanban board (product board EPIC, not Analytics)

---

## Dependencies

| Dependency                         | Status    |
| ---------------------------------- | --------- |
| `main @ 9897595`                   | Required  |
| EPIC-001…006                       | Completed |
| Workflow Stage History             | Required  |
| Matching on-demand engine          | Required  |

No new TECH ticket. Prefer in-process aggregation over new infrastructure.

---

## Risks

| Risk                                      | Mitigation                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| Parallel “Analytics Match Score” formula  | AC-4 — must call EPIC-005                                                  |
| Query-time matching cost on large jobs    | Scope by Job; document limits; no warehouse in MVP                         |
| Funnel formula ambiguity                  | Lock formula in Implementation; Validation asserts against fixture history |
| Recruiter over-trusts charts              | Analytics Transparency; no auto-hire / auto-stage                          |

---

## Success Metrics

- Recruiters can see stage distribution and a Job pipeline snapshot without spreadsheets.  
- Match Score distribution reflects Matching Intelligence, not a second engine.  
- EPIC-001…006 remain unchanged in ownership of rules.  
- Foundation stays deployable; Analytics remains a consumer layer.

---

## Roadmap context

| EPIC         | Goal                              |
| ------------ | --------------------------------- |
| ✅ EPIC-001  | Candidate Intelligence            |
| ✅ EPIC-002  | Job Intelligence                  |
| ✅ EPIC-003  | Relationship Intelligence         |
| ✅ EPIC-004  | Workflow Intelligence             |
| ✅ EPIC-005  | Matching Intelligence             |
| ✅ EPIC-006  | AI Recruiter Copilot              |
| **EPIC-007** | Analytics & Insights _(this)_     |

---

## Definition of Done

EPIC-007 is done when:

- AC-1…AC-16 (+ AC-1b Traceability) **PASS**  
- Regressions on EPIC-001…006 + Resume Import: **NONE**  
- `GET /health` **PASS**  
- `pnpm run ci` **PASS**  
- Validation Report completed (PR-3) with evidence and clear **PASS / FAIL**  
- Documented confirmation: Analytics did not own/recalculate Matching business rules; queries were read-only; metrics were traceable to capability data  

---

## Deliverables (lifecycle)

| PR              | Content                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **PR-1 (this)** | Spec only — this document + `reports/epic-007-spec-review.md`           |
| **PR-2**        | Implementation — Analytics API + minimal UI aggregates                  |
| **PR-3**        | Validation Report — AC checklist, runtime evidence, PASS/FAIL           |

---

## Implementation constraints (for PR-2)

- Branch from `main` after this Spec merges.  
- Aggregate from existing repositories / services — do not fork Scoring or Workflow rules into Analytics.  
- Match metrics: call MatchingService (or equivalent EPIC-005 path) per pair in scope at query time.  
- No mutations from Analytics endpoints.  
- No email / schedule / warehouse.  
- Keep `main` deployable; CI green.  
