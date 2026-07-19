# EPIC-001 — Candidate Workspace

| Field             | Value                                           |
| ----------------- | ----------------------------------------------- |
| Status            | **PASS** (Spec #10 → Impl #11 → Validation #12) |
| Baseline          | `founder-alpha-2`                               |
| Type              | Product EPIC (user value)                       |
| Foundation Freeze | Intact                                          |
| TECH required     | None                                            |

---

## Background

Founder Alpha (`founder-alpha-2`) already provides:

- Resume import & parse
- Knowledge extraction / review flow
- Prisma persistence
- Production deploy + TECH-006 operations

Recruiter still lacks a clear **workplace** after import: a durable place to open a candidate, see structured fields, edit basics, search, and return later — without reopening the CV PDF.

Partial UI already exists on `main` (`/candidates`, `/candidates/:id`, list API). This EPIC **closes gaps** so Candidate Workspace becomes the recruiter center of gravity — not a greenfield rewrite.

---

## Problem Statement

After upload, the system behaves more like an **engine** than a **workspace**.

Missing or incomplete for daily use:

- List columns that match recruiter scan habits (title, company, experience, updated)
- Detail view as a structured profile (not only review/diff)
- Edit + save of basic contact/compensation/notes with Prisma persist
- Search by name **and** email; sort by updated/created
- Confidence that Import Resume remains unchanged

---

## Goal

Ship a **Candidate Workspace MVP** that is the hub for recruiter candidate operations and the foundation for later EPICs (Timeline, Matching, Copilot, Pipeline, Collaboration).

---

## User Story

> As a Recruiter,  
> I want to open a candidate profile,  
> so that I can view and edit their information  
> without returning to the raw CV file.

---

## MVP Scope

### Candidate List

Route: recruiter-facing list (evolve existing `/candidates` as needed).

Display columns / fields:

| Field         | Notes                                      |
| ------------- | ------------------------------------------ |
| Name          | Required                                   |
| Current Title | From structured profile / knowledge        |
| Company       | Current or latest                          |
| Experience    | Years or summary string already on profile |
| English       | Level / note                               |
| Updated At    | Last profile update time                   |

Empty / loading / error states required.

### Candidate Detail

Structured sections (read):

- Basic Info
- Skills
- Experience
- Education
- English
- Salary
- Notes

May reuse existing review/knowledge data where it already maps; **must** present as a workspace profile, not only “continue review”.

### Edit (allowed fields only)

Recruiter may edit and save:

- name
- phone
- email
- salary
- note

**Must not** edit raw resume file/content.

### Persist

Changes saved via existing Prisma persistence path (Candidate repository). Reload shows saved values.

### Search

Filter list by:

- name
- email

**Not** semantic search.

### Sort

- `updated` (default recommended)
- `created`

---

## Acceptance Criteria

| ID       | Criterion                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------- |
| **AC-1** | Candidate List is available and shows the MVP columns above (or documented mapping if a field is empty). |
| **AC-2** | Clicking a row opens Candidate Detail.                                                                   |
| **AC-3** | Recruiter can edit the allowed fields (name, phone, email, salary, note).                                |
| **AC-4** | After save + full page reload, edits remain (Prisma persist).                                            |
| **AC-5** | Search by name and email returns matching candidates.                                                    |
| **AC-6** | Import Resume flow unchanged (no regression in import → parse → review path).                            |
| **AC-7** | `GET /health` still returns `"status":"ok"` (no deployability regression).                               |

Concurrent edit: **last-write-wins** acceptable for Alpha (document in Implementation notes).

---

## Out of Scope

- AI features / Copilot
- Matching / Ranking
- Semantic search
- Duplicate detection UX changes (existing banners may remain as-is)
- Timeline / Kanban / Pipeline
- Comments / Attachments / Collaboration
- Permissions / RBAC
- Audit log
- Domain redesign / Memory Bank changes
- New TECH / infra

---

## Dependencies

| Dependency                        | Status                    |
| --------------------------------- | ------------------------- |
| Founder Alpha / `founder-alpha-2` | Required                  |
| Prisma + Candidate repository     | Required                  |
| Import Resume                     | Required — must not break |
| Web SPA (`web/`)                  | Required for UI           |

No new TECH ticket.

---

## Risks

| Risk                               | Mitigation                                                                             |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| UI state vs server truth           | Prefer server refetch after save; React Query invalidate                               |
| Concurrent edits                   | Last-write-wins; no locking in MVP                                                     |
| Input validation                   | Reuse / extend existing request validation; reject invalid email/phone formats lightly |
| Field mapping gaps (title/company) | Spec allows empty display; Implementation documents source fields                      |

---

## Success Metrics

- Recruiter can open a profile after import without opening the PDF for basic fields.
- Edit + save succeeds and survives reload.
- Time from “Import Resume” to “candidate usable in workspace” is shorter than PDF/Excel round-trips (qualitative Alpha metric).

---

## Deliverables (lifecycle)

| PR              | Content                                                       |
| --------------- | ------------------------------------------------------------- |
| **PR-1 (this)** | Spec only — this document + `reports/epic-001-spec-review.md` |
| **PR-2**        | Implementation — list, detail, edit, search, sort, persist    |
| **PR-3**        | Validation Report — AC checklist, runtime evidence, PASS/FAIL |

---

## Definition of Done

EPIC-001 is done when:

- AC-1…AC-7 **PASS**
- Existing resume import regression: **NONE**
- `GET /health` **PASS**
- `pnpm run ci` **PASS**
- Validation Report completed (PR-3) with evidence and clear **PASS / FAIL**

---

## Implementation constraints (for PR-2)

- Branch from `main` @ `founder-alpha-2` lineage.
- Prefer extending existing APIs/screens over new architecture.
- No Domain philosophy changes; additive DTO/API fields only if required by AC.
- Keep `main` deployable; CI green.
