# EPIC-008 — Automation / Actions

| Field             | Value                                                      |
| ----------------- | ---------------------------------------------------------- |
| Status            | **PASS** (Validation PR-3)                                 |
| Baseline          | `main @ 8850319` + EPIC-001…007 COMPLETED                  |
| Type              | Product EPIC (user value)                                  |
| Foundation Freeze | Intact                                                     |
| TECH required     | None                                                       |

---

## Background

The platform already owns seven capabilities:

| EPIC     | Capability                | Role                                         |
| -------- | ------------------------- | -------------------------------------------- |
| EPIC-001 | Candidate Intelligence    | Candidate profile / workspace                |
| EPIC-002 | Job Intelligence          | Job requirements                             |
| EPIC-003 | Relationship Intelligence | Candidate ↔ Job link                         |
| EPIC-004 | Workflow Intelligence     | Hiring stage + append-only history           |
| EPIC-005 | Matching Intelligence     | Deterministic evidence → score (on-demand)   |
| EPIC-006 | AI Recruiter Copilot      | Read-only interpretation / drafts            |
| EPIC-007 | Analytics & Insights      | Read-only aggregates                         |

Recruiters can observe, explain, draft, and measure. They still cannot run a **small set of explicitly authorized mutations** through a single Automation surface — today stage moves and similar actions are scattered, outreach drafts cannot be sent, and relationships have no first-class assignee.

This EPIC introduces **Automation / Actions** as a **controlled execution** layer on top of existing capabilities. It does **not** rewrite EPIC-001…007. It does **not** invent rule engines or AI agents.

---

## Problem Statement

The platform is strong at observation and decision support.

However, recruiters still lack a narrow, trustworthy way to:

- Confirm and execute a Workflow stage move through an Automation action  
- Confirm and send an outreach message that Copilot already drafted  
- Assign a `CandidateJobRelationship` to a recruiter  

Without a controlled Automation layer, teams either click ad hoc APIs with no attribution, or invent shadow processes (spreadsheets, personal email) that break auditability.

---

## Goal

Introduce **Automation / Actions** focused on:

1. **Controlled execution** — three explicit actions only (Stage Move, Send Outreach, Assignment)  
2. **Attribution & auditability** — every execution records who/when/what/result  
3. **Capability reuse** — mutations go through existing Workflow / Relationship surfaces (and a minimal send adapter for outreach)

Automation **never** invents business rules (no score→stage auto-move). Automation **never** writes email copy (Copilot drafts; Automation sends).

---

## Governing principles (locked)

> **Automation consumes capabilities; Automation executes explicitly authorized actions.**

> **Every automation execution must be attributable and auditable.**

| Layer                         | Owns / May do                                              |
| ----------------------------- | ---------------------------------------------------------- |
| EPIC-001…005                  | Business rules, Matching score, Workflow stages            |
| EPIC-006 Copilot              | Read-only interpretation & **draft** content               |
| EPIC-007 Analytics            | Read-only aggregates                                       |
| EPIC-008 Automation           | Explicit, confirmed mutations + execution records          |

Consequences:

- No implicit / background / scheduled execution in MVP.  
- No “if score > 80 then move” rules.  
- Stage Move uses Workflow Intelligence — does not redefine stages.  
- Send Outreach requires a **pre-existing draft** (from Copilot or equivalent draft payload); Automation does not generate body text.  
- Every execution yields an **Action Result** with attribution fields (actor, timestamp, action type, success/failure).  
- Full enterprise Audit Log product may come later; MVP still **must** persist or return attributable execution records for these three actions.

---

## Business Language (Ubiquitous Language)

| Term                   | Role in this EPIC                                              |
| ---------------------- | -------------------------------------------------------------- |
| **Action**             | Named, Spec-authorized mutation (Stage Move / Send / Assign)   |
| **Confirmation**       | Explicit recruiter approval before execution                   |
| **Action Result**      | Success/failure payload returned (and recorded) after execute  |
| **Attribution**        | Who triggered, when, which action, outcome                     |
| **Assignee**           | Recruiter identity assigned to a Relationship                  |
| **Outreach Draft**     | Text produced by Copilot (or supplied as draft) — not by Automation |

Avoid framing Automation as “AI Agent”, “Workflow Builder”, or “Trigger Engine”.

---

## User Story

> As a recruiter,  
> I want to confirm and run a small set of hiring actions (move stage, send drafted outreach, assign owner) with a clear result,  
> so I can execute work inside the platform without losing attribution or inventing shadow processes.

---

## MVP Scope

All actions are **on-demand** and require **explicit confirmation** (UI confirm and/or API flag `confirmed: true`). No implicit execution.

### 1. Stage Move (confirmed)

```text
User selects target stage → Confirm → Automation → Workflow move
```

- Input: `relationshipId`, `targetStage`, `confirmed: true`, `actorId`  
- Behavior: call existing Workflow / Relationship stage update capability  
- Must not auto-choose stage  
- Must not invent transition matrix beyond what EPIC-004 already allows  

### 2. Send Outreach (from draft)

```text
Copilot Draft → User Confirm → Automation Send
```

- Input: `candidateId`, `jobId` (and/or `relationshipId`), **draft body** (from Copilot or prior draft), recipient, `confirmed: true`, `actorId`  
- Automation **does not** write or rewrite the email  
- Transport: pluggable send adapter (mock/deterministic in CI; real provider optional via env — same plugin spirit as LLM providers). **No TECH ticket; no architecture redesign.**  
- MVP honesty: if live SMTP/provider is absent, mock adapter records a successful **send attempt** with payload fingerprint for CI — not a second email product.  

### 3. Assignment

```text
Assign CandidateJobRelationship → Recruiter identity
```

- Input: `relationshipId`, `assigneeId`, `confirmed: true`, `actorId`  
- **Baseline honesty:** EPIC-003 relationships today have `createdBy` but **no assignee field**. Implementation adds an additive `assigneeId` (or equivalent) on `CandidateJobRelationship` — not a full RBAC/user directory product.  
- Clearing / reassignment allowed as explicit actions; no auto-assign from Matching.  

### 4. Action Result + attribution (MVP auditability)

Every execute returns (and records) at least:

| Field        | Meaning                          |
| ------------ | -------------------------------- |
| `actionId`   | Unique execution id              |
| `actionType` | `stage_move` / `send_outreach` / `assign` |
| `actorId`    | Who triggered                    |
| `executedAt` | When                             |
| `success`    | boolean                          |
| `error`      | present on failure               |
| `target`     | ids touched (relationship, etc.) |

Storage may be lightweight (append-only action log table/file) — **not** the full Administration Audit Log EPIC.

### 5. Minimal UI

Confirm dialogs / action controls for the three actions (e.g. on Job Relationship or Candidate surfaces). No automation builder UI.

---

## Business Rules

1. Automation **consumes** capabilities; it does **not** own Matching / Workflow rules.  
2. No action runs without **explicit confirmation**.  
3. Stage Move **reads** current relationship/workflow state before mutate; uses existing move API/service.  
4. Send Outreach **never** generates draft text; missing draft → fail clearly.  
5. Assignment mutates only the assignee field on the relationship (plus Action Result record).  
6. Failures return Action Result with `success: false` and do not leave undocumented partial state when avoidable (recoverable: retry after fix).  
7. Authorization: MVP enforces that `actorId` is present and actions are only the three Spec types (deeper RBAC deferred to Administration EPIC).  
8. Copilot and Analytics remain read-only; Automation is the mutation path for these actions.  
9. **Idempotency (MVP):** Assign same assignee → success no-op (no duplicate side effects). Stage Move to current stage → success no-op (no new history — already Workflow behavior). Send Outreach: reject repeat send of the same draft fingerprint for the same relationship with a clear error (`ALREADY_SENT`) unless an explicit new send is confirmed with a different draft.

---

## Acceptance Criteria

| ID        | Criterion                                                                 |
| --------- | ------------------------------------------------------------------------- |
| **AC-1**  | Execute Stage Move with explicit confirmation; uses Workflow capability.  |
| **AC-2**  | Execute Send Outreach from an existing draft (no draft generation by Automation). |
| **AC-3**  | Execute Assignment of a Relationship to an assignee.                       |
| **AC-4**  | Authorization enforced — missing/invalid actor or unconfirmed request is rejected. |
| **AC-5**  | Action reads source-of-truth capability state before mutation.            |
| **AC-6**  | No implicit execution (no auto-stage, no schedule, no score-triggered move). |
| **AC-7**  | Action Result returned (success/failure + attribution fields).            |
| **AC-8**  | Failure is recoverable (clear error; safe retry after correction).        |
| **AC-9**  | Every execution is attributable and auditable (actor, time, action, result recorded). |
| **AC-9b** | Idempotent / repeat-safe behavior for suitable actions: assign same assignee twice is a no-op success; move to current stage does not append Stage History; repeat Send of the same draft is rejected or clearly marked already-sent (MVP must document which). |
| **AC-10** | Candidate Workspace has no regression.                                    |
| **AC-11** | Job Workspace has no regression.                                          |
| **AC-12** | Relationship / Workflow Foundations have no regression.                   |
| **AC-13** | Matching Foundation has no regression.                                    |
| **AC-14** | Copilot remains draft-only for outreach content (no send inside Copilot). |
| **AC-15** | Analytics has no regression.                                              |
| **AC-16** | Resume Import has no regression.                                          |
| **AC-17** | `GET /health` returns `"status":"ok"`.                                    |
| **AC-18** | `pnpm run ci` PASS.                                                       |

---

## Out of Scope

- Rule engine / If–Then–Else trigger engine  
- Workflow builder / multi-step orchestration  
- Auto stage transition from Match Score or any heuristic  
- Auto hiring / auto-reject decisions  
- AI Agent / unbounded tool-using loops  
- Scheduler / cron  
- Calendar / Slack / LinkedIn / ATS integrations product  
- Full RBAC / tenant admin / enterprise Audit Log product  
- Recommendation / forecasting  
- TECH / architecture redesign / Memory Bank changes  

---

## Dependencies

| Dependency                         | Status    |
| ---------------------------------- | --------- |
| `main @ 2217f54`                   | Required  |
| EPIC-001…007                       | Completed |
| Workflow Stage Move                | Required  |
| Copilot Draft Outreach             | Required for Send path |
| Email send adapter                 | MVP plugin/mock — no TECH |

---

## Risks

| Risk                                      | Mitigation                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| Automation becomes a second Workflow API  | Stage Move must delegate to existing Workflow/Relationship service         |
| Send invents email copy                   | AC-2 — draft required; Copilot owns draft                                  |
| Assignment expands into user directory    | Additive `assigneeId` only; no RBAC product                                |
| Silent background mutations               | AC-6 — confirmation required; no scheduler                                 |
| Weak audit trail                          | AC-7 + AC-9 — Action Result + recorded attribution                         |

---

## Success Metrics

- Recruiters can confirm Stage Move, Send Outreach, and Assignment inside the platform.  
- Every execution has an attributable Action Result.  
- Matching / Copilot / Analytics ownership boundaries unchanged.  
- `main` remains deployable.

---

## Roadmap context

| EPIC         | Goal                              |
| ------------ | --------------------------------- |
| ✅ EPIC-001…007 | Foundation + Copilot + Analytics |
| **EPIC-008** | Automation / Actions _(this)_     |
| Later        | Notifications, Integrations, Admin & Governance, Platform Hardening |

---

## Definition of Done

EPIC-008 is done when:

- AC-1…AC-18 (+ AC-9b Idempotency) **PASS**  
- Regressions on EPIC-001…007 + Resume Import: **NONE**  
- `GET /health` **PASS**  
- `pnpm run ci` **PASS**  
- Validation Report completed (PR-3) with evidence and clear **PASS / FAIL**  
- Documented confirmation: no rule engine / auto-stage; Send does not author drafts; executions attributable; repeat-safe behavior documented  

---

## Deliverables (lifecycle)

| PR              | Content                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **PR-1 (this)** | Spec only — this document + `reports/epic-008-spec-review.md`           |
| **PR-2**        | Implementation — three confirmed actions + Action Result attribution    |
| **PR-3**        | Validation Report — AC checklist, runtime evidence, PASS/FAIL           |

---

## Implementation constraints (for PR-2)

- Branch from `main` after this Spec merges.  
- Stage Move: delegate to existing Workflow/Relationship stage update — do not fork stage rules.  
- Send: accept draft body; use send adapter (mock in CI); do not call Copilot to invent text inside Automation.  
- Assignment: additive field on relationship; keep list/get/create non-regressing.  
- Persist or append Action Results for attribution (lightweight).  
- Require `confirmed: true` (or equivalent) on execute endpoints.  
- Keep `main` deployable; CI green.  
