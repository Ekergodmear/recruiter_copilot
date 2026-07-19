# EPIC-009 — Administration & Authorization

| Field             | Value                                                      |
| ----------------- | ---------------------------------------------------------- |
| Status            | **SPEC** (PR-1 docs-only)                                  |
| Baseline          | `main @ ca129dc` + EPIC-001…008 COMPLETED                  |
| Type              | Platform EPIC (foundation hardening)                       |
| Foundation Freeze | Intact                                                     |
| TECH required     | None                                                       |

---

## Background

The platform already owns eight product capabilities across three architectural layers:

| Layer                    | Capabilities                                              |
| ------------------------ | --------------------------------------------------------- |
| Source of Truth          | Candidate, Job, Relationship, Workflow, Matching          |
| Read-only Consumers      | AI Recruiter Copilot, Analytics & Insights                |
| Controlled Execution     | Automation / Actions                                      |

EPIC-008 introduced attributable, confirmed mutations via `actorId` + `confirmed`. Authorization checks are still **local and shallow** (presence of actor / confirmation), not a **central policy**.

This EPIC consolidates authorization into a **platform capability**: fixed roles, fixed permissions, and an `AuthorizationService` that Allow/Deny before read and execute paths. It does **not** introduce IAM, SSO, multi-tenancy, or custom role builders.

---

## Problem Statement

Today:

- Routes often default `actorId = "recruiter_alpha"` without role/permission evaluation.  
- Automation enforces `actorId` + `confirmed` locally — correct for confirmation, incomplete for authorization.  
- Read APIs (Analytics, Copilot, Candidate/Job lists) are effectively open within the process.  

Without a central policy:

- Permission checks will duplicate and drift across modules.  
- Future Notifications / Integrations / Audit cannot share one authorization model.  
- “Viewer” cannot be expressed — every actor looks equally privileged.

---

## Goal

Introduce **Administration & Authorization** focused on:

1. **Minimal RBAC** — Admin / Recruiter / Viewer + fixed permission map  
2. **Central policy** — `AuthorizationService.authorize(actor, action, resource?)` → ALLOW / DENY  
3. **Wire-through** — Automation, Copilot, Analytics, and core read/mutation APIs consult the service  
4. **No business-rule ownership** — Authorization never decides Match Score, stage transitions, or drafts  

---

## Governing principle (locked)

> **Authorization governs execution; Authorization does not own business rules.**

| Concern                         | Owner                                              |
| ------------------------------- | -------------------------------------------------- |
| What a stage move means         | Workflow Intelligence (EPIC-004)                   |
| Whether actor may execute it    | Authorization (this EPIC)                          |
| What Match Score is             | Matching Intelligence (EPIC-005)                   |
| Whether actor may view Analytics| Authorization (this EPIC)                          |

Consequences:

- No `if (role === Admin) { computeScore() }` style logic.  
- Deny is an access decision — not a domain validation (e.g. invalid stage remains Workflow’s error).  
- Confirmation (`confirmed: true`) from EPIC-008 remains required for Automation; Authorization is **additional**, not a replacement.  

---

## Business Language (Ubiquitous Language)

| Term                    | Role in this EPIC                                              |
| ----------------------- | -------------------------------------------------------------- |
| **Actor**               | Identity performing a request (`actorId` + resolved Role)      |
| **Role**                | Admin \| Recruiter \| Viewer (fixed set)                       |
| **Permission**          | Named capability access (e.g. `workflow.execute`)              |
| **AuthorizationService**| Central Allow/Deny evaluator                                   |
| **Policy**              | Fixed Role → Permissions mapping (MVP, not user-editable)      |
| **Deny**                | Request rejected with clear authorization error                |

Avoid framing this EPIC as “IAM product”, “SSO”, or “tenant admin console”.

---

## User Story

> As a platform operator,  
> I want every read and mutation to be Allow/Deny’d by a central AuthorizationService using fixed roles,  
> so recruiters, viewers, and admins have predictable access without scattering role checks or inventing multi-tenant IAM.

---

## MVP Scope

### 1. Roles (fixed)

| Role         | Intent                                      |
| ------------ | ------------------------------------------- |
| **Admin**    | Full manage + execute                       |
| **Recruiter**| Day-to-day hiring work (read/write/execute) |
| **Viewer**   | Read-only (no mutations / no automation)    |

No custom roles. No role editor UI beyond a minimal way to **resolve** an actor’s role for Alpha (see baseline honesty).

### 2. Permissions (fixed)

| Permission             | Description                          |
| ---------------------- | ------------------------------------ |
| `candidate.read`       | View Candidate                       |
| `candidate.write`      | Create/edit Candidate                |
| `job.read`             | View Job                             |
| `job.write`            | Create/edit Job                      |
| `relationship.read`    | View Relationships                   |
| `relationship.write`   | Create Relationship / Assignment     |
| `workflow.execute`     | Stage Move (Workflow / Automation)   |
| `automation.execute`   | Automation Actions                   |
| `analytics.read`       | Analytics                            |
| `copilot.use`          | Copilot                              |
| `matching.read`        | On-demand Matching                   |
| `admin.manage`         | Administration surfaces (minimal)    |

Permission → Role mapping is **static code/config** in MVP (not a DB permission editor).

**Suggested default mapping (Implementation must document exactly):**

| Permission           | Admin | Recruiter | Viewer |
| -------------------- | :---: | :-------: | :----: |
| `*.read` / `matching.read` / `analytics.read` / `copilot.use` | ✅ | ✅ | ✅ |
| `candidate.write` / `job.write` / `relationship.write` | ✅ | ✅ | ❌ |
| `workflow.execute` / `automation.execute` | ✅ | ✅ | ❌ |
| `admin.manage`       | ✅ | ❌ | ❌ |

### 3. AuthorizationService

```text
authorize(actor, permission, resource?) → { allowed: true } | { allowed: false, code, message }
```

- Single entry point for policy evaluation.  
- Deterministic for the same actor + permission.  
- Resource parameter optional in MVP (RBAC only — no ABAC attributes).  

### 4. Actor resolution

**Baseline honesty:** Alpha still has no login/SSO. MVP must:

- Accept `actorId` (header and/or body, consistent with existing Automation pattern).  
- Resolve Role via a **simple Actor Registry** (in-memory/config map: `actorId → role`), with documented defaults (e.g. `recruiter_alpha` → Recruiter).  
- Unknown actor → DENY (or map to Viewer only if Implementation documents a safer Alpha default — prefer DENY for mutations).  

No password, session, or OAuth in this EPIC.

### 5. Wire-through (protect Read + Execute)

At minimum, AuthorizationService must gate:

| Surface        | Typical permissions                          |
| -------------- | -------------------------------------------- |
| Candidate/Job read & write APIs | `candidate.*` / `job.*`           |
| Relationship / Workflow APIs    | `relationship.*` / `workflow.execute` |
| Matching GET                    | `matching.read`                      |
| Copilot APIs                    | `copilot.use`                        |
| Analytics APIs                  | `analytics.read`                     |
| Automation APIs                 | `automation.execute` (+ existing `confirmed`) |

Automation **must not** implement its own role matrix; it calls AuthorizationService then proceeds.

### 6. Deny response

Denied requests return a clear error (e.g. `403` + `FORBIDDEN` / `UNAUTHORIZED`) without mutating domain state.

### 7. Minimal admin surface (optional thin)

If needed for Alpha: a tiny read of “current actor role/permissions” or config listing — **not** a permission editor. Full Administration console is out of scope.

---

## Business Rules

1. Authorization **governs** who may call capabilities; it does **not** redefine capability behavior.  
2. Roles and permissions are **fixed** in MVP.  
3. Policy evaluation is **centralized** in AuthorizationService.  
4. EPIC-008 confirmation remains mandatory for Automation executes.  
5. Viewer cannot mutate or run Automation.  
6. Deny leaves no partial domain side effects.  
7. No multi-tenant isolation in MVP — single workspace assumption remains.  

---

## Acceptance Criteria

| ID        | Criterion                                                                 |
| --------- | ------------------------------------------------------------------------- |
| **AC-1**  | Role model exists: Admin, Recruiter, Viewer.                              |
| **AC-2**  | Permission model exists with the fixed MVP permission set.                |
| **AC-3**  | `AuthorizationService` provides central `authorize(...)`.                 |
| **AC-4**  | Policy evaluation is deterministic for actor + permission.                |
| **AC-5**  | ALLOW path: permitted actor proceeds to capability.                       |
| **AC-6**  | DENY path: forbidden actor receives clear error; no domain mutation.      |
| **AC-7**  | Automation uses AuthorizationService (no local role matrix).              |
| **AC-8**  | Analytics and Copilot APIs are protected by AuthorizationService.         |
| **AC-9**  | Core Read APIs (Candidate/Job/Relationship/Matching) are protected.       |
| **AC-10** | Core Mutation APIs (Candidate/Job/Relationship/Workflow write paths) are protected. |
| **AC-11** | No business rules moved into Authorization (Matching/Workflow semantics unchanged). |
| **AC-12** | EPIC-001…008 product behaviors have no regression for authorized actors. |
| **AC-13** | Resume Import has no regression for authorized actors.                    |
| **AC-14** | `GET /health` returns `"status":"ok"` (health remains unauthenticated).   |
| **AC-15** | `pnpm run ci` PASS.                                                       |

---

## Out of Scope

- Multi-tenancy / Organization / Workspace isolation  
- Custom roles / permission editor UI  
- Dynamic policies / policy-as-code product  
- ABAC / attribute-based rules  
- SSO / OAuth / OIDC / LDAP / SAML  
- Full Audit Log platform (Action Result remains; Audit EPIC later)  
- User invitation / password management product  
- TECH / architecture redesign / Memory Bank changes  

---

## Dependencies

| Dependency                         | Status    |
| ---------------------------------- | --------- |
| `main @ ca129dc`                   | Required  |
| EPIC-001…008                       | Completed |
| Automation `actorId` + `confirmed` | Required  |

No new TECH ticket. Prefer in-process AuthorizationService + config actor→role map.

---

## Risks

| Risk                                      | Mitigation                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| Auth checks scatter again                 | AC-3/AC-7 — single service; Automation must call it                        |
| Breaking Alpha UX (all calls denied)      | Document default actors; tests use known Recruiter/Admin ids               |
| Authorization invents domain rules        | AC-11 — Matching/Workflow regression                                       |
| Scope creep into IAM                      | Out of Scope locked                                                        |

---

## Success Metrics

- Viewer is denied Automation and write APIs; allowed read APIs.  
- Recruiter can execute Automation when confirmed.  
- Admin retains manage permission.  
- No duplicate role matrices inside Copilot/Analytics/Automation.  
- `main` remains deployable.

---

## Roadmap context

| EPIC         | Goal                                           |
| ------------ | ---------------------------------------------- |
| ✅ EPIC-001…008 | Product + Automation foundation              |
| **EPIC-009** | Administration & Authorization _(this)_        |
| Later        | Notifications, Integrations, Audit & Governance |

---

## Definition of Done

EPIC-009 is done when:

- AC-1…AC-15 **PASS**  
- Regressions for authorized happy-paths on EPIC-001…008: **NONE**  
- `GET /health` **PASS** (still public)  
- `pnpm run ci` **PASS**  
- Validation Report completed (PR-3) with Allow/Deny evidence  
- Documented confirmation: Authorization did not own Matching/Workflow business rules  

---

## Deliverables (lifecycle)

| PR              | Content                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **PR-1 (this)** | Spec only — this document + `reports/epic-009-spec-review.md`           |
| **PR-2**        | Implementation — AuthorizationService + wire-through + actor→role map   |
| **PR-3**        | Validation Report — AC checklist, Allow/Deny evidence, PASS/FAIL        |

---

## Implementation constraints (for PR-2)

- Branch from `main` after this Spec merges.  
- Centralize policy in `AuthorizationService` (or equivalent module under platform/auth).  
- Wire Automation, Copilot, Analytics, and core Candidate/Job/Relationship/Matching routes.  
- Keep EPIC-008 `confirmed: true` for Automation.  
- `/health` stays ungated.  
- Fixed role/permission tables — no editor.  
- Keep `main` deployable; CI green.  
