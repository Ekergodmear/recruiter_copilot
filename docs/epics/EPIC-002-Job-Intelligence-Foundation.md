# EPIC-002 — Job Intelligence Foundation

| Field             | Value                                  |
| ----------------- | -------------------------------------- |
| Status            | **SPEC** (PR-1 docs-only)              |
| Baseline          | `founder-alpha-2` + EPIC-001 COMPLETED |
| Type              | Product EPIC (user value)              |
| Foundation Freeze | Intact                                 |
| TECH required     | None                                   |

---

## Background

Founder Alpha + EPIC-001 already provide:

- Resume Import & parse
- Candidate Workspace (list / detail / edit / search / sort)
- Candidate Knowledge
- Prisma persistence + production operations (`founder-alpha-2`)

Partial Job surfaces already exist on `main` (Jobs list/create/detail, JD parse/review). This EPIC **does not rewrite** them. It reframes and closes gaps so Job becomes a **first-class Knowledge Object** — the Job Intelligence foundation — parallel to Candidate Intelligence.

Job Intelligence is **not AI**. It is structured knowledge that future Matching, Workflow, Copilot, and Analytics will consume.

---

## Problem Statement

Recruiters still manage many jobs in Excel, Notion, or an external ATS.

Candidate data and Job data remain separated in practice: the platform owns imported resumes and candidate workspace, but Job is not yet a durable intelligence object with clear source, notes, and recruiter-grade list/detail/edit.

Without a Job Intelligence foundation:

- Matching / Copilot / Analytics cannot operate on structured job knowledge
- Recruiters cannot treat the platform as the system of record for both sides of recruitment

---

## Goal

Introduce **Job as a first-class business entity** so the product owns:

- Candidate Intelligence (EPIC-001)
- Job Intelligence (this EPIC)

The platform becomes a Recruiter Intelligence Platform foundation — data first, AI later.

---

## User Story

> As a recruiter,  
> I want to manage all jobs inside the platform,  
> regardless of whether they were created manually or imported,  
> so that candidates and jobs live in the same knowledge system.

---

## MVP Scope

### 1. Job List

Display:

| Field           | Notes                                                     |
| --------------- | --------------------------------------------------------- |
| Title           | Required                                                  |
| Company         | Required                                                  |
| Location        | May be empty                                              |
| Employment Type | e.g. full_time / contract / …                             |
| Status          | Draft / Open / Paused / Closed / Filled (or current enum) |
| Updated At      | Last job update                                           |

Search:

- title
- company

Sort:

- `updated` (default recommended)
- `created`

Empty / loading / error states required.

### 2. Job Detail

Structured sections (read):

- Basic
- Description
- Requirements
- Benefits
- Salary
- Notes
- Metadata (includes Source, created/updated, ids as needed)

### 3. Create Job

Manual creation only in this EPIC.

### 4. Edit Job

Recruiter may edit and save:

- title
- company
- location
- employmentType
- salaryRange
- status
- notes

### 5. Persist

Save via existing Job Repository + Prisma path. No architecture redesign. No new TECH.

### 6. Job Source

Every Job **must** have a `source`.

| Source              | This EPIC                              |
| ------------------- | -------------------------------------- |
| `manual`            | **Implement** (default for Create Job) |
| `client`            | Document only                          |
| `import`            | Document only                          |
| future integrations | Document only                          |

In EPIC-002, `Job.source` is assigned at creation time and is **not editable**.  
Future EPICs introducing imports or integrations may create Jobs with different sources; editing `source` remains out of scope.

---

## Business Rules

1. Job is a first-class entity.
2. Candidate and Job are **independent** in this EPIC.
3. This EPIC **does not** build Candidate ↔ Job relationship UX/product (that is EPIC-003).
4. Existing recruitment/submission paths on `main` must not be broken; this EPIC must not expand them into Matching / Pipeline product work.
5. **Source is immutable after creation in MVP** — set once at create; Edit Job must not change `source`.

---

## Acceptance Criteria

| ID        | Criterion                                                       |
| --------- | --------------------------------------------------------------- |
| **AC-1**  | Job List exists with MVP columns (or documented empty mapping). |
| **AC-2**  | Job Detail exists with MVP sections.                            |
| **AC-3**  | Create Job (manual) works.                                      |
| **AC-4**  | Edit + Save works for allowed fields; reload keeps values.      |
| **AC-5**  | Search by title and company works.                              |
| **AC-6**  | Sort by updated / created works.                                |
| **AC-7**  | Every Job has Source (`manual` for created jobs in this EPIC).  |
| **AC-8**  | Candidate Workspace has no regression.                          |
| **AC-9**  | Resume Import has no regression.                                |
| **AC-10** | `GET /health` returns `"status":"ok"`.                          |
| **AC-11** | `pnpm run ci` PASS.                                             |

---

## Out of Scope

- Matching
- AI / Copilot
- Pipeline / Kanban / Workflow stages as a product EPIC
- Semantic Search
- Duplicate Detection
- Permissions / Collaboration
- Timeline / Notifications / Analytics
- Job Import / Job Sync / External APIs
- Candidate ↔ Job relationship product (EPIC-003)
- TECH / architecture redesign / Memory Bank changes

---

## Dependencies

| Dependency                        | Status                            |
| --------------------------------- | --------------------------------- |
| Founder Alpha / `founder-alpha-2` | Required                          |
| EPIC-001 Candidate Workspace      | Completed                         |
| Existing Job Repository + Prisma  | Required — extend, do not rewrite |
| Web SPA (`web/`)                  | Required for UI                   |

No new TECH ticket.

---

## Risks

| Risk                           | Mitigation                                                      |
| ------------------------------ | --------------------------------------------------------------- |
| Large JD descriptions          | Persist as text; UI scroll/sections; no blob redesign           |
| Job validation                 | Light validation (required title/company; status enum)          |
| Future integrations / sources  | Source field + documented values; only `manual` implemented now |
| Partial Job UI already on main | Close gaps; prefer extend over rewrite                          |

---

## Success Metrics

- Recruiters can manage jobs without external spreadsheets for the MVP fields.
- Candidate and Job both exist as first-class entities in the same platform.
- Future Matching EPIC has structured Job data available.

---

## Roadmap context (vision — not in this EPIC)

| EPIC         | Goal                                         |
| ------------ | -------------------------------------------- |
| ✅ EPIC-001  | Candidate Workspace                          |
| **EPIC-002** | Job Intelligence Foundation _(this)_         |
| EPIC-003     | Candidate ↔ Job Relationship (no AI)         |
| EPIC-004     | Recruiter Workflow (pipeline, stage, status) |
| EPIC-005     | Matching Engine (rule-based first)           |
| EPIC-006     | AI Recruiter Copilot                         |
| EPIC-007     | Analytics & Insights                         |

Each EPIC delivers independent value; together they form the Recruiter Intelligence Platform. AI arrives only after data foundations are solid.

---

## Definition of Done

EPIC-002 is done when:

- AC-1…AC-11 **PASS**
- Candidate Workspace regression: **NONE**
- Resume Import regression: **NONE**
- `GET /health` **PASS**
- `pnpm run ci` **PASS**
- Validation Report completed (PR-3) with evidence and clear **PASS / FAIL**

---

## Deliverables (lifecycle)

| PR              | Content                                                                    |
| --------------- | -------------------------------------------------------------------------- |
| **PR-1 (this)** | Spec only — this document + `reports/epic-002-spec-review.md`              |
| **PR-2**        | Implementation — list, detail, create, edit, search, sort, source, persist |
| **PR-3**        | Validation Report — AC checklist, runtime evidence, PASS/FAIL              |

---

## Implementation constraints (for PR-2)

- Branch from `main` after this Spec merges.
- Prefer extending existing Job module / screens over new architecture.
- Additive fields only if required by AC (e.g. `source`, job `notes`) — persist via existing Prisma/repository patterns; avoid unnecessary schema churn; no TECH ticket.
- Do not implement Matching, Pipeline product, or Candidate↔Job relationship UX.
- Keep `main` deployable; CI green.
