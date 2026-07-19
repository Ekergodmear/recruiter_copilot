# EPIC-011 — Integrations

| Field             | Value                                                      |
| ----------------- | ---------------------------------------------------------- |
| Status            | **SPEC** (PR-1 docs-only)                                  |
| Baseline          | `main @ ee98e0d` + EPIC-001…010 COMPLETED + TECH-007       |
| Type              | Product EPIC (boundary / connectivity)                     |
| Foundation Freeze | Intact                                                     |
| TECH required     | None                                                       |

---

## Background

The platform now owns a complete internal loop:

| Layer                    | Capabilities                                              |
| ------------------------ | --------------------------------------------------------- |
| Source of Truth          | Candidate, Job, Relationship, Workflow, Matching          |
| Read-only Consumers      | Copilot, Analytics, Notifications                         |
| Controlled Execution     | Automation / Actions                                      |
| Platform Capability      | Administration & Authorization                            |
| Engineering              | TECH-007 CI & Formatting Hardening                        |

Recruiters can import resumes, manage jobs/relationships, match, draft, automate confirmed actions, authorize access, and receive in-app notifications. What they still lack is a **controlled boundary** to bring data in from — or push snapshots out to — external systems **without** making those systems the source of truth.

Today:

- Resume import is file-based (`CandidateImportService`) — not a general integration surface.  
- Job create goes through `JobService` — no export/import registry.  
- Automation’s `EmailSendAdapter` is a transport mock for outreach send — not an Integrations product.  
- There is **no** Integration Registry, webhook ingress, CSV pipeline, or ATS connector module.

This EPIC introduces **Integrations** as an **adapter orchestration layer**. It does **not** own Candidate/Job/Workflow business rules. It does **not** write around Application Services. It does **not** open OAuth, continuous sync, or a connector marketplace.

---

## Problem Statement

Without a first-class Integrations boundary:

- Bulk or partner data entry bypasses product APIs ad hoc (spreadsheets → manual UI).  
- Export for partners has no attributable, authorized path.  
- Future ATS / webhook / CSV work will invent divergent pipelines and risk writing directly to persistence.  

Without hard principles, Integrations tends to become a second write-path that **duplicates or overrides** Source of Truth rules (dedupe, validation, Workflow stages).

---

## Goal

Introduce **Integrations** focused on:

1. **Integration Registry** — configured integrations (id, provider, enabled/disabled)  
2. **Provider Interface** — pluggable `import` / `export` / `testConnection`  
3. **MVP Providers** — CSV Import/Export, Generic Webhook (receive or emit as documented), ATS Import (**mock** only)  
4. **Manual execution** — Import/Export with **Preview → Confirm → Execute** (no scheduler)  
5. **Authorization** — gate via `AuthorizationService` with fixed `integration.*` permissions  

---

## Governing principles (locked)

> **Integrations connect external systems; they do not own business rules.**

> **External systems are adapters, never the source of truth.**

| Concern                              | Owner                                              |
| ------------------------------------ | -------------------------------------------------- |
| What a Candidate/Job means           | Source of Truth (EPIC-001…005)                     |
| Whether actor may integrate          | Authorization (EPIC-009)                           |
| How external payload maps inward     | Integration Provider (this EPIC) — mapping only    |
| Persist / mutate domain state        | Existing Application Services only                 |

Consequences:

- Integrations **must not** write directly to the database / Prisma repositories.  
- Inbound execute paths call Application Services (e.g. Candidate import / Job create paths already owned by the platform).  
- Providers never invent Workflow stages, Matching scores, or Automation executes.  
- Disabled integrations reject execute/test (except optionally allowing registry read).  
- No background sync, cron, or queue workers in MVP.  

---

## Business Language (Ubiquitous Language)

| Term                      | Role in this EPIC                                              |
| ------------------------- | -------------------------------------------------------------- |
| **Integration**           | Configured connection record (id, provider, status)            |
| **Provider**              | Pluggable adapter implementing the IntegrationProvider port    |
| **Enabled / Disabled**    | Registry status controlling whether execute is allowed         |
| **Import / Export**       | Direction of data relative to the platform                     |
| **Preview**               | Dry-run projection of what Execute would apply (no persist)    |
| **Confirm / Execute**     | Explicit user confirmation before Application Service calls    |
| **Test Connection**       | Lightweight provider health/auth check (no domain mutation)    |
| **External System**       | Outside system — adapter only; never SoT                       |

Avoid framing this EPIC as “ATS product”, “sync engine”, or “iPaaS marketplace”.

---

## User Story

> As a recruiter or operator,  
> I want to configure a small set of integrations, test them, and manually import/export with preview and confirm,  
> so external data can enter or leave the platform through one authorized boundary without becoming a second source of truth.

---

## MVP Scope

### 1. Integration Registry

Minimal registry of configured integrations:

| Field           | Intent                                      |
| --------------- | ------------------------------------------- |
| `integrationId` | Stable id                                   |
| `provider`      | Provider key (e.g. `csv`, `webhook`, `ats_mock`) |
| `status`        | `Enabled` \| `Disabled`                     |
| `displayName`   | Optional human label                        |
| `config`        | Provider-specific non-secret config (MVP)   |

APIs (shape for PR-2 — exact paths may refine):

```text
GET    /api/v1/integrations
GET    /api/v1/integrations/:id
POST   /api/v1/integrations          (register / create)
PATCH  /api/v1/integrations/:id      (enable/disable, label/config)
```

No complex admin UI required — API + tests sufficient for Alpha.

### 2. Provider Interface

```text
IntegrationProvider
  - providerKey: string
  - testConnection(config) → { ok, message }
  - previewImport(input) → PreviewResult   // no persist
  - executeImport(input) → ExecuteResult   // via Application Services
  - previewExport(query) → PreviewResult   // no persist
  - executeExport(query) → ExportPayload   // read via Application Services / queries
```

- Plugin-style registration (same philosophy as LLM providers / email adapter).  
- Unknown provider key → clear error (deny execute).  

### 3. MVP Providers (exactly these three)

| Provider     | Intent in MVP                                                                 |
| ------------ | ----------------------------------------------------------------------------- |
| **CSV**      | Import/export tabular Candidate (and optionally Job) snapshots via CSV file/payload |
| **Webhook**  | Generic HTTP webhook — outbound emit of an export snapshot and/or inbound receive of a documented JSON envelope for preview/execute import |
| **ATS Mock** | Fake ATS import adapter returning deterministic sample payloads (no real LinkedIn/Gmail/Greenhouse) |

Real LinkedIn, Gmail, Greenhouse, TopCV live connectors are **Out of Scope**.

### 4. Manual execution flow (locked)

```text
Import / Export request
        ↓
Preview   (no SoT mutation)
        ↓
Confirm   (explicit flag / step — same spirit as Automation confirmed)
        ↓
Execute   (Application Services only)
```

- No scheduler.  
- No continuous sync.  
- No background workers / queues.  
- Failed execute must not leave Integrations inventing compensating domain rules (surface Application Service errors).  

### 5. Authorization

Extend EPIC-009 fixed map (no custom roles):

| Permission              | Intent                                      | Admin | Recruiter | Viewer |
| ----------------------- | ------------------------------------------- | :---: | :-------: | :----: |
| `integration.read`      | List/get registry; view previews            | ✅ | ✅ | ✅ |
| `integration.execute`   | Create/update registry*; test; confirm execute import/export | ✅ | ✅ | ❌ |

\*Registry write (create/enable/disable) requires `integration.execute` in MVP (no separate admin console). Viewer is read-only on integrations.

Deny-by-default remains for unknown permissions.

### 6. Baseline honesty (Implementation must respect)

| Surface                         | Reality today                                      | EPIC-011 approach                          |
| ------------------------------- | -------------------------------------------------- | ------------------------------------------ |
| Integration module              | **Greenfield**                                     | New module under platform/boundary         |
| Candidate / Job write paths     | `CandidateImportService` / `JobService` exist      | **Reuse** — do not bypass                  |
| CSV / Webhook / ATS APIs        | **Do not exist**                                   | Implement as providers                     |
| EmailSendAdapter                | Outreach transport mock only                       | **Do not** conflate with Integrations      |
| OAuth / API key vault product   | **Does not exist**                                 | Out of Scope (static MVP config only)      |

---

## Business Rules

1. External systems are **adapters**; platform SoT remains Candidate/Job/Relationship/Workflow/Matching.  
2. Integrations **do not own** Matching, Workflow, Automation, or Authorization business rules.  
3. Execute **must** go through existing Application Services (or thin Integration orchestration that only calls those services).  
4. Preview **must not** persist domain entities.  
5. Execute requires explicit confirm (mirrors EPIC-008 confirmation spirit).  
6. Disabled integration cannot test-as-success for execute; execute is rejected.  
7. No scheduler, queue, retry engine, or conflict-resolution product in MVP.  
8. Authorization gates all Integrations APIs via `AuthorizationService`.  

---

## Acceptance Criteria

| ID        | Criterion                                                                 |
| --------- | ------------------------------------------------------------------------- |
| **AC-1**  | Integration Registry exists (id, provider, status Enabled/Disabled).      |
| **AC-2**  | Provider Interface exists (`testConnection`, import/export preview+execute). |
| **AC-3**  | Enable / Disable integration controls whether execute is allowed.         |
| **AC-4**  | Manual Import supported for at least one MVP provider (CSV and/or ATS Mock). |
| **AC-5**  | Manual Export supported for at least one MVP provider (CSV and/or Webhook). |
| **AC-6**  | Test Connection returns a clear ok/fail without mutating SoT.             |
| **AC-7**  | Preview before Execute — Preview does not persist; Execute requires confirm. |
| **AC-8**  | Authorization via `integration.read` / `integration.execute` on AuthorizationService. |
| **AC-9**  | Integrations do not write directly to DB/repositories (Application Services only). |
| **AC-10** | No business rule ownership — Matching/Workflow/Automation semantics unchanged. |
| **AC-11** | EPIC-001…010 authorized happy-paths have no regression.                   |
| **AC-12** | Resume Import has no regression for authorized actors.                    |
| **AC-13** | `GET /health` returns `"status":"ok"` (still public).                     |
| **AC-14** | `pnpm run ci` PASS.                                                       |

---

## Out of Scope

- OAuth / OIDC / OAuth refresh / SSO for connectors  
- Continuous sync / polling / schedulers  
- Conflict resolution / merge UI product  
- Retry engine / job queue / workers  
- Connector marketplace  
- Real CRM / Email / LinkedIn / Greenhouse / TopCV live connectors  
- Secret vault / enterprise key management product  
- TECH / architecture redesign / Memory Bank changes  
- Making external ATS the Source of Truth  

---

## Dependencies

| Dependency                         | Status    |
| ---------------------------------- | --------- |
| `main @ ee98e0d`                   | Required  |
| EPIC-001…010                       | Completed |
| AuthorizationService               | Required  |
| CandidateImportService / JobService| Required (execute targets) |
| TECH-007 formatting                | Completed (CI hygiene) |

No new TECH ticket inside this EPIC.

---

## Risks

| Risk                                      | Mitigation                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| Integrations become a second write-path   | AC-9 — ban direct repository writes; Validation inspects call path         |
| Preview accidentally persists             | AC-7 — Preview dry-run tests                                               |
| Scope creep into real ATS OAuth           | Out of Scope locked; ATS Mock only                                         |
| Webhook security surface                  | MVP documents envelope + AuthZ; no public unauthenticated ingress without actor |

---

## Success Metrics

- Operator can register CSV / Webhook / ATS Mock integrations and enable/disable them.  
- Preview shows projected rows/entities without creating Candidates/Jobs.  
- Confirmed execute creates/updates domain state only via Application Services.  
- Viewer cannot execute integrations; Recruiter/Admin can.  
- Matching scores and Workflow stages unchanged except via existing APIs used by execute.  
- `main` remains deployable.

---

## Roadmap context

| EPIC           | Goal                                              |
| -------------- | ------------------------------------------------- |
| ✅ EPIC-001…010 | Product + Automation + AuthZ + Notifications      |
| ✅ TECH-007     | CI & Formatting Hardening                         |
| **EPIC-011**   | Integrations _(this)_                             |
| Later          | Audit & Governance (EPIC-012)                     |

---

## Definition of Done

EPIC-011 is done when:

- AC-1…AC-14 **PASS**  
- Regressions for authorized happy-paths on EPIC-001…010: **NONE**  
- Confirmed: Integrations did not own business rules; no direct DB writes from providers  
- Preview never persists; Execute requires confirm  
- `GET /health` **PASS** (still public)  
- `pnpm run ci` **PASS**  
- Validation Report completed (PR-3) with registry / preview / execute / AuthZ evidence  

---

## Deliverables (lifecycle)

| PR              | Content                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **PR-1 (this)** | Spec only — this document + `reports/epic-011-spec-review.md`           |
| **PR-2**        | Implementation — Registry + Provider port + CSV/Webhook/ATS Mock + AuthZ |
| **PR-3**        | Validation Report — AC checklist, evidence, PASS/FAIL                   |

---

## Implementation constraints (for PR-2)

- Branch from `main` after this Spec merges.  
- New Integrations module; register providers as plugins.  
- Execute import/export **only** through existing Application Services.  
- Implement Preview → Confirm → Execute; no scheduler.  
- Extend Authorization map with `integration.read` / `integration.execute`.  
- `/health` stays ungated.  
- Keep `main` deployable; CI green.  
- Do not implement OAuth or live ATS connectors.  
