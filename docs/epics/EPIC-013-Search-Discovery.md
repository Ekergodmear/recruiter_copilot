# EPIC-013 — Search & Discovery

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| Status            | **SPEC** (PR-1 docs-only)                                              |
| Baseline          | `main @ b8d16ef` + EPIC-001…012 COMPLETED + TECH-007                   |
| Type              | Read capability (discovery / query composition)                        |
| Foundation Freeze | Intact                                                                 |
| TECH required     | None                                                                   |

---

## Background

The platform now has a complete operating stack:

| Layer                    | Capabilities                                              |
| ------------------------ | --------------------------------------------------------- |
| Source of Truth          | Candidate, Job, Relationship, Workflow, Matching          |
| Read-only Consumers      | Copilot, Analytics, Notifications                         |
| Controlled Execution     | Automation / Actions                                      |
| Platform                 | Administration & Authorization · Audit & Governance       |
| Integration Layer        | Registry · Provider Port · CSV / Webhook / ATS Mock       |
| Engineering              | TECH-007 CI & Formatting Hardening                        |

Recruiters can create and mutate entities through authorized Application Services, but **discovery is still fragmented**: separate Candidate list, Job list, Relationship/Workflow views, and Matching calls. There is no single search surface that composes filters across these reads.

This EPIC introduces **Search & Discovery** as a **read capability**. It discovers and presents information derived from the Source of Truth. It does **not** become a second store of Candidate/Job truth. It does **not** change Workflow, Matching scores, or Automation outcomes.

---

## Problem Statement

Without a unified Search & Discovery layer:

- Recruiters bounce between capability-specific list APIs to answer “who matches this job in Screening with React?”  
- Filters for skills / English / experience / salary / stage / match score are not composed in one place.  
- Saved query patterns (if any) would be invented ad hoc in the UI and drift.  

Without hard principles, Search tends to grow “helpful” writes (auto-tagging, auto-stage moves, search-owned indexes that diverge from SoT) — which would violate Source of Truth ownership and Controlled Execution.

---

## Goal

Introduce **Search & Discovery** focused on:

1. **Global Search** — text query over Candidate and Job (MVP)  
2. **Structured Filters** — Candidate, Job, Workflow stage, Matching min score (read-only)  
3. **Unified Search API** — one normalized result model (`GET /api/v1/search`)  
4. **Saved Searches (MVP)** — save / list / delete for the current actor (not shared)  
5. **No business-rule ownership** — Search never decides stage transitions, match weights, or import mapping  

---

## Governing principles (locked)

> **Search discovers information; it does not change information.**

> **Search derives from the Source of Truth; it never becomes the Source of Truth.**

| Concern                              | Owner                                              |
| ------------------------------------ | -------------------------------------------------- |
| Candidate / Job field meaning        | Source of Truth (EPIC-001 / 002)                   |
| Stage semantics                      | Workflow (EPIC-004)                                |
| Match score meaning                  | Matching (EPIC-005)                                |
| Whether actor may search             | Authorization (EPIC-009)                           |
| How results are discovered / filtered| Search (this EPIC) — read composition only         |

Consequences:

- Search APIs **do not** create/update/delete Candidate, Job, Relationship, Workflow state, Matching scores, or Automation actions.  
- Search **reads** via existing Application Services / repositories / MatchingService — no parallel domain rules.  
- Matching filter **computes or reads scores at query time**; Search does **not** persist match scores.  
- MVP uses **in-process query over existing data** — no Elasticsearch / vector / semantic / ML ranking product.  
- Saved Searches store **query definitions** (personal), not result snapshots that claim to be SoT.  

---

## Business Language (Ubiquitous Language)

| Term                 | Role in this EPIC                                              |
| -------------------- | -------------------------------------------------------------- |
| **Search Query**     | Text (`q`) + structured filters + optional scope               |
| **Search Hit**       | One normalized discovery result (Candidate or Job in MVP)      |
| **Search Result**    | Ordered collection of Search Hits for a Query                  |
| **Filter**           | Structured constraint (skills, stage, min match score, …)      |
| **Saved Search**     | Named, actor-owned persisted Query definition                  |
| **SearchService**    | Application service that composes reads and returns Results    |

Avoid framing this EPIC as “search engine product”, “vector DB”, or “AI semantic retrieval platform”.

---

## User Story

> As a recruiter,  
> I want to search Candidates and Jobs with structured filters (including Workflow stage and Matching score) and save useful queries,  
> so I can discover people and roles quickly without Search changing any business data.

---

## MVP Scope

### 1. Global Search (Candidate + Job)

Text query `q` matches against MVP fields derived from SoT (exact field set locked in PR-2; intent):

| Entity    | Example match fields (MVP)                                      |
| --------- | --------------------------------------------------------------- |
| Candidate | Display name, skills, English level, summary (if present)       |
| Job       | Title, company, skills, location/status text                    |

- Scope: `type=candidate` \| `job` \| `all` (default `all`).  
- **Not in MVP Global Search:** Audit Log, Notifications, Automation ActionResults as first-class hit types.  

### 2. Structured Filters

| Domain     | Filters (MVP)                                                                 | Source |
| ---------- | ----------------------------------------------------------------------------- | ------ |
| Candidate  | Skills · English · Experience (years) · Salary                                | Candidate / Verified Knowledge |
| Job        | Status · Skills · Salary (min/max band as available on Job)                   | Job    |
| Workflow   | Current Stage                                                                 | Relationship `currentStage` (narrows Candidate/Job via relationships) |
| Matching   | Minimum Match Score (+ required `jobId` when filtering Candidates by score)   | MatchingService **read-only** — not persisted by Search |

Filter semantics for PR-2:

- Skills: case-insensitive containment / intersection (document exact rule).  
- English / Experience / Salary: compare against existing normalized fields where present; missing fields → exclude or non-match (document).  
- Workflow stage: keep hits that have at least one Relationship in that `currentStage` (for Candidate hits) or related Candidate relationships for Job hits as documented.  
- Matching: call MatchingService; keep Candidates with `overallMatchScore >= min` for the given `jobId`.  

### 3. Unified Search API

```text
GET /api/v1/search
```

Query parameters (shape for PR-2 — names may refine, intent locked):

| Param            | Intent                                      |
| ---------------- | ------------------------------------------- |
| `q`              | Free-text query (optional if filters alone) |
| `type`           | `candidate` \| `job` \| `all`               |
| `skills`         | Skill filter                                |
| `english`        | English filter                              |
| `experienceMin`  | Min years                                   |
| `salaryMin` / `salaryMax` | Salary band                        |
| `jobStatus`      | Job status                                  |
| `stage`          | Workflow current stage                      |
| `jobId`          | Anchor job for Matching filter              |
| `minMatchScore`  | Matching threshold (0..1 or 0..100 — lock in PR-2 to Matching scale) |
| `limit`          | Page size (MVP cap; default documented in PR-2) |
| `offset`         | Skip count for pagination (default `0`)     |

Response: `{ items: SearchHit[]; total: number }` with normalized hits:

| Field        | Intent                                              |
| ------------ | --------------------------------------------------- |
| `type`       | `candidate` \| `job`                                |
| `id`         | Entity id                                           |
| `title`      | Display title (name / job title)                    |
| `subtitle`   | Secondary line (company / skills snippet)           |
| `score`      | Optional match score when Matching filter applied   |
| `meta`       | Small safe projection (stage, status, …) — not a second SoT |

No GraphQL in MVP.

### 4. Saved Searches (MVP)

Actor-owned query definitions:

```text
GET    /api/v1/search/saved
POST   /api/v1/search/saved
DELETE /api/v1/search/saved/:id
```

| Field         | Intent                         |
| ------------- | ------------------------------ |
| `savedSearchId` | Stable id                    |
| `actorId`     | Owner (no cross-user share)    |
| `name`        | Human label                    |
| `query`       | Serialized Search Query        |
| `createdAt`   | Timestamp                      |

- Save / List / Delete only.  
- No share, no org library, no scheduled re-run.  
- Persist definition only — executing a saved search re-runs live Search against current SoT.  

### 5. SearchService (architecture)

```text
Search API
      │
      ▼
SearchService
      │
      ├────────► Candidate (read)
      ├────────► Job (read)
      ├────────► Relationship / Workflow (read)
      └────────► MatchingService (read-only)
```

SearchService **aggregates and filters**. It does **not**:

- write Candidate / Job / Relationship  
- change Workflow stage  
- execute Automation  
- persist Matching scores  
- call Integrations execute  

### 6. Authorization

Extend EPIC-009 fixed map (no custom roles):

| Permission     | Intent                                              | Admin | Recruiter | Viewer |
| -------------- | --------------------------------------------------- | :---: | :-------: | :----: |
| `search.read`  | Run Search; list/save/delete **own** Saved Searches | ✅ | ✅ | ✅ |

- All Search routes go through `AuthorizationService`.  
- Saved Search mutations are **actor-scoped** (owner only); they do not grant write access to SoT entities.  
- Deny-by-default remains.  
- No public free-form write to Candidate/Job via Search.  

### 7. Determinism (locked)

Default ordering for Search Results (MVP):

1. `type` ascending (`candidate` before `job` when mixed), then  
2. `id` ascending  

When Matching filter applies, secondary sort may use `score` descending then `id` ascending — **must be documented and stable** in PR-2.

> **AC-10b:** With the same underlying data and the same query, Search returns the same result set in the same default order.

> **AC-10c — Search Pagination Stability:** With the same query and unchanged data, page boundaries (`limit`/`offset`) are stable — the same record must not appear twice across pages or be skipped between pages.

Pagination applies **after** deterministic sort (AC-10b). Implementation must sort the full filtered set, then slice.

### 8. Baseline honesty (Implementation must respect)

| Surface                    | Reality today                         | EPIC-013 approach                          |
| -------------------------- | ------------------------------------- | ------------------------------------------ |
| Search module / API        | **Greenfield**                        | New read module + routes                   |
| Candidate / Job stores     | Exist                                 | **Read only** via existing services/repos  |
| MatchingService            | Exists                                | **Reuse** for min score filter             |
| Relationship / stage       | Exists                                | **Reuse** for stage filter                 |
| Elasticsearch / OpenSearch | **Do not exist**                      | Out of Scope                               |
| Vector / semantic search   | Feature flags OFF / Out of Scope      | Out of Scope                               |
| Saved Searches store       | **Greenfield**                        | Personal query definitions only            |

---

## Business Rules

1. Search **discovers**; it never **changes** SoT state.  
2. Search does not own Matching weights, Workflow transitions, or Authorization decisions.  
3. Matching scores used in filters are **ephemeral reads** — not Search-owned persisted truth.  
4. Saved Searches are personal query definitions; executing them always re-queries live data.  
5. Default result order is deterministic (AC-10b).  
6. Pagination boundaries are stable for unchanged data (AC-10c).  
7. No search-engine product, vector index, or AI ranking in MVP.  

---

## Acceptance Criteria

| ID         | Criterion                                                                 |
| ---------- | ------------------------------------------------------------------------- |
| **AC-1**   | `SearchService` exists and composes reads from Candidate / Job / Workflow / Matching. |
| **AC-2**   | Global Search returns Candidate and/or Job hits for `q` (+ `type` scope). |
| **AC-3**   | Candidate filters (skills, English, experience, salary) narrow results correctly. |
| **AC-4**   | Job filters (status, skills, salary) narrow results correctly.            |
| **AC-5**   | Workflow filter (`stage` / current stage) narrows results via Relationship. |
| **AC-6**   | Matching filter (`minMatchScore` + `jobId`) uses MatchingService read-only; Search does not persist scores. |
| **AC-7**   | Unified result model (`type`, `id`, `title`, …) for all hits.             |
| **AC-8**   | Saved Searches: save, list, delete (actor-owned; not shared).             |
| **AC-9**   | Authorization via `search.read` on AuthorizationService.                  |
| **AC-10**  | Search is read-only w.r.t. SoT (no Candidate/Job/Workflow/Matching/Automation mutations via Search). |
| **AC-10b** | Search Determinism — same data + same query → same result set and default order. |
| **AC-10c** | Search Pagination Stability — with same query and unchanged data, `limit`/`offset` pages do not duplicate or skip records. |
| **AC-11**  | Source of Truth preserved — Search is not a second Candidate/Job store.   |
| **AC-12**  | EPIC-001…012 authorized happy-paths have no regression.                   |
| **AC-13**  | `GET /health` returns `"status":"ok"` (still public).                     |
| **AC-14**  | `pnpm run ci` PASS.                                                       |

---

## Out of Scope

- Elasticsearch / OpenSearch / external search cluster  
- Vector search / embeddings / semantic search / AI search  
- Ranking ML / learning-to-rank  
- Advanced fuzzy / typo-tolerant engine product  
- Search indexing pipeline / CDC / eventual-consistency index  
- Scheduler / alerts on saved search  
- Cross-user shared saved searches / org search library  
- Searching Audit or Notifications as first-class hit types  
- GraphQL  
- TECH / architecture redesign / Memory Bank changes  
- Multi-tenant search isolation productization beyond Alpha single workspace  

---

## Dependencies

| Dependency                                      | Status    |
| ----------------------------------------------- | --------- |
| `main @ b8d16ef`                                | Required  |
| EPIC-001…012                                    | Completed |
| AuthorizationService + actor resolution         | Required  |
| Candidate / Job / Relationship reads           | Required  |
| MatchingService                                 | Required (filter) |

No new TECH ticket inside this EPIC.

---

## Risks

| Risk                                         | Mitigation                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| Search becomes a second SoT / cache of truth | Locked principles + AC-11; no persistent entity copies                  |
| Non-deterministic ordering confuses UI       | AC-10b + documented default sort                                        |
| Unstable pagination across pages             | AC-10c — sort full set then slice                                       |
| Matching filter treated as stored score      | AC-6 — ephemeral MatchingService read only                              |
| Scope creep into vector / ES                 | Explicit Out of Scope                                                   |
| Saved Search sharing / ACL complexity        | MVP actor-owned only                                                    |

---

## Success Metrics

- Recruiter can run `GET /search` with text + filters and get Candidate/Job hits.  
- Stage + min match score filters compose without writing Relationship/Matching.  
- Saved Search can be saved, listed, deleted by owner; re-run reflects current SoT.  
- Same query twice → same ordered results (AC-10b).  
- Viewer/Recruiter/Admin gated by `search.read`; `/health` still public.  
- `main` remains deployable.

---

## Roadmap context

| EPIC           | Goal                                              |
| -------------- | ------------------------------------------------- |
| ✅ EPIC-001…012 | Product + Automation + AuthZ + Integrations + Audit |
| ✅ TECH-007     | CI & Formatting Hardening                         |
| **EPIC-013**   | Search & Discovery _(this)_                       |
| Later          | Reporting & Export · Org / Multi-workspace (if needed) |

---

## Definition of Done

EPIC-013 is done when:

- AC-1…AC-14 (+ **AC-10b**, **AC-10c**) **PASS**  
- Regressions for authorized happy-paths on EPIC-001…012: **NONE**  
- Confirmed: Search discovers only; never mutates SoT via Search APIs  
- Confirmed: Search is not a second Source of Truth  
- Matching filter remains read-only (no Search-persisted scores)  
- `GET /health` **PASS** (still public)  
- `pnpm run ci` **PASS**  
- Validation Report completed (PR-3) with search/filter/saved/determinism evidence  

---

## Deliverables (lifecycle)

| PR              | Content                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **PR-1 (this)** | Spec only — this document + `reports/epic-013-spec-review.md`           |
| **PR-2**        | Implementation — SearchService + filters + unified API + Saved Searches + AuthZ |
| **PR-3**        | Validation Report — AC checklist, evidence, PASS/FAIL                   |

---

## Implementation constraints (for PR-2)

- Branch from `main` after this Spec merges.  
- In-process query over existing data — no external search engine.  
- Compose via Application Services / repositories / MatchingService only.  
- Document exact text-match fields, filter null-handling, and default sort.  
- Extend Authorization with `search.read`.  
- Saved Searches: actor-owned definitions; no sharing.  
- `/health` stays ungated.  
- Do not add TECH, Memory Bank changes, or architecture redesign.  
