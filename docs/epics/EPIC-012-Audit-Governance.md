# EPIC-012 — Audit & Governance

| Field             | Value                                                      |
| ----------------- | ---------------------------------------------------------- |
| Status            | **SPEC** (PR-1 docs-only)                                  |
| Baseline          | `main @ 62cd792` + EPIC-001…011 COMPLETED + TECH-007       |
| Type              | Platform EPIC (governance / traceability)                  |
| Foundation Freeze | Intact                                                     |
| TECH required     | None                                                       |

---

## Background

The platform now spans a full operating stack:

| Layer                    | Capabilities                                              |
| ------------------------ | --------------------------------------------------------- |
| Source of Truth          | Candidate, Job, Relationship, Workflow, Matching          |
| Read-only Consumers      | Copilot, Analytics, Notifications                         |
| Controlled Execution     | Automation / Actions                                      |
| Platform                 | Administration & Authorization                            |
| Integration Layer        | Registry · Provider Port · CSV / Webhook / ATS Mock       |
| Engineering              | TECH-007 CI & Formatting Hardening                        |

State-changing work is already **attributable in fragments**:

- Automation **ActionResult** (`actorId`, action type, success/failure, target)  
- Recruitment **PipelineActivity** (job timeline + `actorId`)  
- Authorization **actor resolution** (`x-actor-id` → … → default)  
- Ops **AuditReplay** reconstructs a candidate timeline from existing records (read-model, not an immutable audit store)  
- AI **telemetry** tracks quality/cost — not compliance audit  

What is still missing is a **unified, immutable Audit Log** that records *what happened* across these surfaces without becoming a second execution path or owning business rules.

This EPIC introduces **Audit & Governance** as a **recording platform capability**. It does **not** execute Automation. It does **not** change Workflow/Matching outcomes. It does **not** replace Authorization decisions.

---

## Problem Statement

Without a central Audit Log:

- Attribution is scattered (ActionResult vs Activity vs reconstructed replay).  
- Operators cannot answer “who changed what, when?” across Automation, Integrations, and core mutations with one query.  
- Future compliance / dispute / support workflows invent ad hoc logs that drift.  

Without hard principles, Audit tends to grow “helpful” mutations (auto-revert, auto-fix) — which would violate Controlled Execution and Source of Truth ownership.

---

## Goal

Introduce **Audit & Governance** focused on:

1. **Immutable Audit Log** — append-only records of important state-changing outcomes  
2. **Central `AuditService.record(...)`** — single write entry point for producers  
3. **Wire-through** — Automation, Integrations execute, and core Workflow/Assignment (and documented MVP mutations) emit audit records **after** successful capability outcomes  
4. **Query surface** — authorized actors can list/filter audit records (read-only)  
5. **No business-rule ownership** — Audit never decides Allow/Deny, stage transitions, or import mapping  

---

## Governing principles (locked)

> **Audit records what happened; it never changes what happened.**

> **Every state-changing action must be attributable, traceable, and immutable.**

| Concern                              | Owner                                              |
| ------------------------------------ | -------------------------------------------------- |
| What a stage move means              | Workflow (EPIC-004)                                |
| Whether actor may execute            | Authorization (EPIC-009) (+ Automation confirm)    |
| Whether to record the outcome        | Audit (this EPIC) — after the fact                 |
| Whether to undo / compensate         | Existing capability APIs — **not** Audit           |

Consequences:

- Audit APIs are **read + append** only — no update/delete of audit records in MVP.  
- Audit producers call `AuditService.record` **after** Application Service / Automation / Integration outcomes (consume-only).  
- Failed executions may still be recorded as failed attempts when attributable (document exact MVP set in PR-2).  
- Audit never calls Automation execute, Workflow move, Integration execute, or Authorization to “fix” history.  

---

## Business Language (Ubiquitous Language)

| Term                 | Role in this EPIC                                              |
| -------------------- | -------------------------------------------------------------- |
| **Audit Record**     | Immutable entry describing a past action/outcome               |
| **Actor**            | Who performed the action (`actorId` from AuthZ resolution)     |
| **Action**           | Named verb (e.g. `automation.stage_move`, `integration.import`) |
| **Target**           | Optional entity refs (candidateId, jobId, relationshipId…)     |
| **Outcome**          | success \| failure (+ optional error code)                     |
| **Source**           | Capability that produced the event (automation, integration…)  |
| **Audit Log**        | Append-only store of Audit Records                             |
| **Audit Query**      | Read-only list/filter of records                               |

Avoid framing this EPIC as “SIEM product”, “legal hold platform”, or “auto-remediation engine”.

---

## User Story

> As an admin or senior recruiter,  
> I want an immutable audit trail of important state-changing actions with actor, time, action, target, and outcome,  
> so I can trace what happened without the audit system changing history or re-running business logic.

---

## MVP Scope

### 1. Audit Record model (immutable)

Minimum fields:

| Field         | Intent                                      |
| ------------- | ------------------------------------------- |
| `auditId`     | Stable id                                   |
| `occurredAt`  | Timestamp                                   |
| `actorId`     | Attributable actor                          |
| `action`      | Fixed action name                         |
| `source`      | Producing capability (automation, integration, workflow, relationship, candidate, job, …) |
| `outcome`     | `success` \| `failure`                      |
| `target`      | Optional ids (relationshipId, jobId, …)     |
| `summary`     | Short human-readable description            |
| `error`       | Optional `{ code, message }` on failure     |
| `correlation` | Optional link (e.g. ActionResult `actionId`) |

No in-place edit. No delete API in MVP.

### 2. AuditService

```text
record(input) → AuditRecord          // append-only
list(query) → { items, total }       // read-only filters
getById(auditId) → AuditRecord
```

- Deterministic for the same append sequence.  
- Deny-by-default AuthZ on query/write surfaces via permissions below.  

### 3. Producers (MVP wire-through)

At minimum, emit audit records **after** these outcomes:

| Source                         | Example actions                                      |
| ------------------------------ | ---------------------------------------------------- |
| Automation (EPIC-008)          | stage_move, send_outreach, assign (from ActionResult)|
| Integrations (EPIC-011)        | import.execute, export.execute                       |
| Workflow / Relationship        | stage change, assign (when mutated via existing APIs)|

PR-2 may add Candidate/Job write auditing if low-risk; must remain append-after-success and must not invent new domain rules.

**Baseline honesty:** Do **not** replace ActionResult, PipelineActivity, or AuditReplay — Audit Log **complements** them as the cross-cutting immutable trail. Implementation may fan-out from ActionResult persistence and Integration/Workflow success paths.

### 4. Query API

```text
GET /api/v1/audit
GET /api/v1/audit/:id
```

Filters (MVP): `actorId`, `action`, `source`, time range (optional). Newest-first ordering.

No “revert from audit” endpoint.

### 5. Authorization

Extend EPIC-009 fixed map:

| Permission     | Intent                         | Admin | Recruiter | Viewer |
| -------------- | ------------------------------ | :---: | :-------: | :----: |
| `audit.read`   | Query audit log                | ✅ | ✅ | ❌* |
| `audit.write`  | Reserved for system/producers recording (not a public free-form write API) | ✅ | ✅** | ❌ |

\*Viewer: **no** audit query in MVP (sensitive operational trail).  
\*\*Recruiter: producers record via internal service calls under authorized mutations; there is **no** public `POST /audit` for arbitrary client payloads in MVP. If a public append API exists, it must still go through AuthZ and reject free-form spoofing (prefer internal-only record from trusted services).

Deny-by-default remains.

### 6. Immutability & governance rules

1. Append-only store.  
2. No update/delete of audit records via API.  
3. Recording failure must not silently invent success domain state (domain outcome already decided by the capability).  
4. Audit does not auto-compensate failed imports/automation.  

---

## Business Rules

1. Audit **records**; it never **changes** past domain state.  
2. Audit does not own Workflow, Matching, Authorization, Automation, or Integration mapping rules.  
3. Every recorded entry must include `actorId` + `occurredAt` + `action` + `outcome`.  
4. Producers emit after capability outcomes (consume-only).  
5. Query is read-only and AuthZ-gated.  
6. **Audit completeness:** each MVP in-scope state-changing outcome produces **exactly one** Audit Record (no missing log, no duplicate for the same outcome).  
7. No SIEM export product, retention console, or legal-hold workflow in MVP.  

---

## Acceptance Criteria

| ID        | Criterion                                                                 |
| --------- | ------------------------------------------------------------------------- |
| **AC-1**  | Audit Record model exists with required attribution fields.               |
| **AC-2**  | `AuditService.record` appends immutable records.                          |
| **AC-3**  | Audit Query API lists/filters records (newest-first).                     |
| **AC-4**  | Automation outcomes produce audit records (linked to ActionResult when present). |
| **AC-5**  | Integration execute outcomes produce audit records.                       |
| **AC-6**  | Workflow stage change and/or Assignment produce audit records.            |
| **AC-6b** | Audit completeness — each MVP in-scope state-changing outcome produces exactly one Audit Record (no missing, no duplicate). |
| **AC-7**  | Audit records are immutable via API (no update/delete).                   |
| **AC-8**  | Authorization via `audit.read` (and producer write path) on AuthorizationService. |
| **AC-9**  | Audit never executes business actions (record-only).                      |
| **AC-10** | No business rules moved into Audit (Matching/Workflow semantics unchanged). |
| **AC-11** | EPIC-001…011 authorized happy-paths have no regression.                   |
| **AC-12** | Resume Import has no regression for authorized actors.                    |
| **AC-13** | `GET /health` returns `"status":"ok"` (still public).                     |
| **AC-14** | `pnpm run ci` PASS.                                                       |

---

## Out of Scope

- SIEM / log shipping product  
- Retention policies UI / legal hold / eDiscovery  
- Auto-revert / compensate from audit  
- Cryptographic WORM storage product  
- Full SOC2 evidence pack generation  
- Real-time streaming audit bus  
- Replacing ActionResult, PipelineActivity, or AuditReplay  
- TECH / architecture redesign / Memory Bank changes  
- Multi-tenant audit isolation productization beyond Alpha single workspace  

---

## Dependencies

| Dependency                         | Status    |
| ---------------------------------- | --------- |
| `main @ 62cd792`                   | Required  |
| EPIC-001…011                       | Completed |
| AuthorizationService + actor resolution | Required |
| Automation ActionResult            | Required (producer) |
| Integrations execute               | Required (producer) |
| Relationship/Workflow mutations    | Required (producer) |

No new TECH ticket inside this EPIC.

---

## Risks

| Risk                                      | Mitigation                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| Audit becomes an execution/remediation tool | Locked principles + AC-9; no revert APIs                                 |
| Double-logging noise                      | PR-2 documents producer set; Validation checks expected actions exist      |
| Spoofed public audit writes               | Prefer internal record-only; AuthZ deny free-form spoof                    |
| Confusing AuditReplay with Audit Log      | Spec honesty — replay remains ops read-model; Audit Log is append store    |

---

## Success Metrics

- After Automation stage_move / assign / send, an audit record exists with actor + outcome.  
- After Integration import/export execute, an audit record exists.  
- After Workflow stage change / assign, an audit record exists.  
- `GET /audit` returns newest-first; Viewer cannot read audit in MVP.  
- No update/delete endpoints mutate audit history.  
- Matching/Workflow semantics unchanged.  
- `main` remains deployable.

---

## Roadmap context

| EPIC           | Goal                                              |
| -------------- | ------------------------------------------------- |
| ✅ EPIC-001…011 | Product + Automation + AuthZ + Notifications + Integrations |
| ✅ TECH-007     | CI & Formatting Hardening                         |
| **EPIC-012**   | Audit & Governance _(this)_                       |

---

## Definition of Done

EPIC-012 is done when:

- AC-1…AC-14 **PASS**  
- Regressions for authorized happy-paths on EPIC-001…011: **NONE**  
- Confirmed: Audit records only; never executes or mutates past domain state via audit APIs  
- ActionResult / Activity / AuditReplay remain; Audit Log complements them  
- `GET /health` **PASS** (still public)  
- `pnpm run ci` **PASS**  
- Validation Report completed (PR-3) with record/query/immutability/producer evidence  

---

## Deliverables (lifecycle)

| PR              | Content                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **PR-1 (this)** | Spec only — this document + `reports/epic-012-spec-review.md`           |
| **PR-2**        | Implementation — AuditService + store + producer wire-through + query API |
| **PR-3**        | Validation Report — AC checklist, evidence, PASS/FAIL                   |

---

## Implementation constraints (for PR-2)

- Branch from `main` after this Spec merges.  
- Append-only Audit Log; no update/delete APIs.  
- Record via central `AuditService` after capability outcomes.  
- Wire Automation ActionResult, Integration execute, Workflow/Assignment at minimum.  
- Extend Authorization with `audit.read` (and internal write posture as documented).  
- Do not replace ActionResult / PipelineActivity / AuditReplay.  
- `/health` stays ungated.  
- Keep `main` deployable; CI green.  
