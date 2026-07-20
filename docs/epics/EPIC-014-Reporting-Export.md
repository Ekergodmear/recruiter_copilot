# EPIC-014 — Reporting & Export

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| Status            | **SPEC** (PR-1 docs-only)                                              |
| Baseline          | `main @ 2ab9e4c` + EPIC-001…013 COMPLETED + TECH-007                   |
| Type              | Read capability (reporting / export composition)                       |
| Foundation Freeze | Intact                                                                 |
| TECH required     | None                                                                   |

---

## Background

The platform now has Source of Truth, Controlled Execution, Integrations, Audit, Search, Analytics, and Authorization. Recruiters can discover and analyze data, but **durable export of operational summaries** is still fragmented (Integration Job CSV export is adapter-scoped; Analytics is JSON-only; Audit is query-only).

This EPIC introduces **Reporting & Export** as a **read capability**: compose Analytics and Audit (and SoT lists where needed) into report views and CSV downloads. It does **not** invent a second warehouse. It does **not** change Workflow, Matching, or Automation.

---

## Problem Statement

Without Reporting & Export:

- Operators cannot download a stable CSV of overview metrics or audit trails for offline review.  
- Analytics and Audit remain API-only surfaces without a recruiter-facing export boundary.  
- Ad hoc scripts risk bypassing Authorization and inventing divergent schemas.  

Without hard principles, Reporting tends to grow scheduled jobs, warehouses, or PDF products that own data — violating SoT and Controlled Execution.

---

## Goal

1. **ReportService** — central composition of read sources for reports  
2. **Overview report** — JSON view derived from Analytics  
3. **CSV export** — overview metrics, audit records, candidates, jobs  
4. **Authorization** — `report.read` via AuthorizationService  
5. **Deterministic export** — same data → same CSV bytes/order  

---

## Governing principles (locked)

> **Reports present information; they do not change information.**

> **Reports derive from Analytics, Audit, and the Source of Truth; they never become the Source of Truth.**

| Concern                | Owner                          |
| ---------------------- | ------------------------------ |
| Metric meaning         | Analytics (EPIC-007)           |
| Audit record meaning   | Audit (EPIC-012)               |
| Entity field meaning   | SoT (EPIC-001…005)             |
| Whether actor may export | Authorization (EPIC-009)     |
| How rows are projected | Reporting (this EPIC) — read only |

Consequences:

- Report APIs never create/update/delete Candidate, Job, Relationship, Workflow, Matching, Automation, or Audit records.  
- CSV is generated **on demand** from live reads — no report warehouse.  
- Integration export remains the adapter path for ATS/CSV providers; Reporting is the **operator report** path (do not replace Integrations).  
- No PDF engine in MVP (no PDF stack on baseline — see Out of Scope).  

---

## Business Language

| Term            | Role                                              |
| --------------- | ------------------------------------------------- |
| **Report**      | Structured read view for operators                |
| **Export**      | Downloadable serialization (CSV in MVP)           |
| **Report Kind** | `overview` \| `audit` \| `candidates` \| `jobs`   |
| **ReportService** | Application service composing reads             |

---

## User Story

> As a recruiter or admin,  
> I want overview reports and CSV exports of analytics, audit, candidates, and jobs,  
> so I can share operational evidence offline without the report system changing any business data.

---

## MVP Scope

### 1. ReportService

```text
Report API
      │
      ▼
ReportService
      │
      ├─► AnalyticsService (read)
      ├─► AuditService (read)
      ├─► CandidateRepository / list (read)
      └─► JobRepository / list (read)
```

### 2. Overview report (JSON)

```text
GET /api/v1/reports/overview
```

Returns a stable projection of Analytics overview (counts, stage distribution summary, generatedAt). Does not persist.

### 3. CSV export

```text
GET /api/v1/reports/export?kind=overview|audit|candidates|jobs
```

| Kind         | Content (MVP)                                                                 |
| ------------ | ----------------------------------------------------------------------------- |
| `overview`   | Key metric rows from Analytics overview (name,value)                          |
| `audit`      | Audit records (newest-first): auditId, occurredAt, actorId, action, outcome…  |
| `candidates` | Candidate projections: id, name, skills, english, experience, ready           |
| `jobs`       | Job projections: id, title, company, status, skills, salaryMin, salaryMax     |

- `Content-Type: text/csv`  
- Deterministic column order and row order (document in PR-2)  
- Optional query filters for audit: `from`, `to`, `actorId`, `action`, `source` (pass-through to AuditService)  

### 4. Authorization

| Permission    | Intent                         | Admin | Recruiter | Viewer |
| ------------- | ------------------------------ | :---: | :-------: | :----: |
| `report.read` | Overview JSON + CSV export     | ✅ | ✅ | ✅ |

All report routes via AuthorizationService. Deny-by-default remains.

### 5. Determinism (locked)

> **AC-10b:** With the same underlying data and the same export query, CSV content (headers + rows in order) is identical across runs.

### 6. Baseline honesty

| Surface              | Reality today                | EPIC-014 approach                    |
| -------------------- | ---------------------------- | ------------------------------------ |
| Report module        | **Greenfield**               | New read module                      |
| Analytics / Audit    | Exist                        | **Reuse** reads                      |
| Integration CSV      | Job adapter export exists    | **Do not replace**; separate path    |
| PDF generation       | **Does not exist**           | Out of Scope                         |
| Report warehouse     | **Does not exist**           | Out of Scope                         |

---

## Acceptance Criteria

| ID         | Criterion                                                                 |
| ---------- | ------------------------------------------------------------------------- |
| **AC-1**   | `ReportService` composes Analytics / Audit / Candidate / Job reads.       |
| **AC-2**   | `GET /api/v1/reports/overview` returns Analytics-derived JSON.            |
| **AC-3**   | CSV export `kind=overview` returns deterministic metric rows.             |
| **AC-4**   | CSV export `kind=audit` returns Audit records (AuthZ `report.read`).      |
| **AC-5**   | CSV export `kind=candidates` and `kind=jobs` return SoT projections.      |
| **AC-6**   | Authorization via `report.read`.                                          |
| **AC-7**   | Reporting is read-only w.r.t. SoT / Audit / Analytics stores.             |
| **AC-8**   | Reports do not become a second Source of Truth (no warehouse).            |
| **AC-9**   | Determinism — same data + query → same CSV.                               |
| **AC-10**  | EPIC-001…013 authorized happy-paths have no regression.                   |
| **AC-11**  | `GET /health` returns `"status":"ok"` (still public).                     |
| **AC-12**  | `pnpm run ci` PASS.                                                       |

---

## Out of Scope

- PDF / DOCX / XLSX product export  
- Scheduled reports / email delivery  
- BI warehouse / OLAP / materialized report store  
- Replacing Integration CSV/JSON adapter export  
- Custom report builder UI  
- Chart image generation  
- Multi-tenant report isolation productization  
- TECH / architecture redesign / Memory Bank changes  

---

## Future Improvements (do not implement in this EPIC)

- PDF export (requires deliberate dependency / TECH decision)  
- XLSX export  
- Scheduled report delivery  
- Saved report definitions (compose with Saved Searches)  
- Org-scoped report libraries  

---

## Dependencies

| Dependency                         | Status    |
| ---------------------------------- | --------- |
| `main @ 2ab9e4c`                   | Required  |
| EPIC-001…013                       | Completed |
| AnalyticsService                   | Required  |
| AuditService                       | Required  |
| AuthorizationService               | Required  |

No TECH ticket inside this EPIC.

---

## Definition of Done

- AC-1…AC-12 **PASS**  
- Confirmed: Reports read only; never mutate SoT/Audit via report APIs  
- Confirmed: No report warehouse  
- `GET /health` **PASS**  
- `pnpm run ci` **PASS**  
- Validation Report (PR-3) completed  

---

## Deliverables

| PR     | Content                                              |
| ------ | ---------------------------------------------------- |
| **PR-1** | Spec + `reports/epic-014-spec-review.md`           |
| **PR-2** | ReportService + routes + AuthZ + tests               |
| **PR-3** | Validation Report + `validate-epic-014.ts`           |

---

## Implementation constraints (PR-2)

- In-process CSV generation; no external reporting engine.  
- Reuse AnalyticsService / AuditService / repositories — do not duplicate business rules.  
- Document CSV column order and sort keys.  
- Extend Authorization with `report.read`.  
- `/health` stays ungated.  
