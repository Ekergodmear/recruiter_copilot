# EPIC-010 — Notifications & Collaboration

| Field             | Value                                                      |
| ----------------- | ---------------------------------------------------------- |
| Status            | **PASS** (Validation PR-3)                                 |
| Baseline          | `main @ 2c3a027` + EPIC-001…009 COMPLETED                  |
| Type              | Product EPIC (user value)                                  |
| Foundation Freeze | Intact                                                     |
| TECH required     | None                                                       |

---

## Background

The platform now has four architectural layers:

| Layer                    | Capabilities                                              |
| ------------------------ | --------------------------------------------------------- |
| Source of Truth          | Candidate, Job, Relationship, Workflow, Matching          |
| Read-only Consumers      | AI Recruiter Copilot, Analytics & Insights                |
| Controlled Execution     | Automation / Actions                                      |
| Platform Capability      | Administration & Authorization                            |

Recruiters can observe, draft, measure, execute confirmed actions, and are Allow/Deny’d by a central policy. What they still lack is a **lightweight in-app signal** when something relevant happens to them — assignment, stage change, automation completion, or a mention in a note/comment.

Today those events leave an attributable trail (`ActionResult`, stage history) but **no inbox**. Collaboration (comments + `@mentions`) is also absent: Candidate/Job `note`/`notes` fields are free-text bags, not comment threads.

This EPIC introduces **Notifications & Collaboration** as a **consumer + thin collaboration surface**. It does **not** execute Automation. It does **not** own Workflow/Matching rules. It does **not** open email/Slack/push channels.

---

## Problem Statement

Without in-app notifications:

- Assignees discover work only by polling Relationship / Job views.  
- Stage moves and automation completions are attributable but silent to other recruiters.  
- Mentions cannot exist because there is no comment surface that creates a directed signal.

Without a hard consumer boundary, teams tend to “helpfully” let notifications trigger stage moves or auto-assign — which would break the Controlled Execution model (EPIC-008) and Authorization model (EPIC-009).

---

## Goal

Introduce **Notifications & Collaboration** focused on:

1. **In-app Notification model** — typed events with read/unread state  
2. **Notification Feed** — list unread + read for the current actor  
3. **Minimal collaboration** — thin note/comment with `@actorId` mentions that create notifications  
4. **Source consumption** — notifications are created from existing capability outcomes (Assignment, Workflow stage change, Automation result), not invented business rules  

---

## Governing principles (locked)

> **Notifications consume capabilities; they do not own business rules or execute actions.**

> **Notifications inform users; users decide.**

| Concern                              | Owner                                              |
| ------------------------------------ | -------------------------------------------------- |
| What a stage move means              | Workflow Intelligence (EPIC-004)                   |
| Whether actor may execute it         | Authorization (EPIC-009) + Automation (EPIC-008)   |
| Whether to notify assignee           | Notifications (this EPIC) — after the fact         |
| Whether assignee then acts           | User decision → Automation / Workflow APIs         |

Consequences:

- Notification creation **never** calls Automation execute, Workflow move, or Assign.  
- Notification handlers must not contain Matching / Workflow business rules.  
- Deny/Allow of notification APIs goes through `AuthorizationService` (new fixed permissions).  
- Delivery channels beyond in-app are Out of Scope.  

---

## Business Language (Ubiquitous Language)

| Term                 | Role in this EPIC                                              |
| -------------------- | -------------------------------------------------------------- |
| **Notification**     | In-app informational record for one recipient actor            |
| **Recipient**        | `actorId` who should see the notification                      |
| **Read / Unread**    | Delivery state on the notification (inbox hygiene only)        |
| **Notification Feed**| Ordered list of notifications for the current actor            |
| **Mention**          | `@actorId` reference inside a note/comment body                |
| **Note / Comment**   | Thin collaboration write that may contain mentions (MVP)       |
| **Source Event**     | Outcome already produced by Assignment / Workflow / Automation |

Avoid framing this EPIC as “notification rules engine”, “email product”, or “chat”.

---

## User Story

> As a recruiter,  
> I want an in-app inbox that tells me when I am assigned, when a relevant stage changes, when automation I care about completes, or when someone mentions me,  
> so I can decide what to do next — without the system acting on my behalf.

---

## MVP Scope

### 1. Notification model (in-app only)

Each notification has at least:

| Field            | Intent                                      |
| ---------------- | ------------------------------------------- |
| `id`             | Stable identifier                           |
| `recipientId`    | Actor who receives it                       |
| `type`           | Fixed enum (see sources below)              |
| `title` / `body` | Short human-readable summary                |
| `createdAt`      | Timestamp                                   |
| `readAt`         | Null when unread; set when marked read      |
| `source`         | Capability + optional ids (relationship…)   |

**Fixed types (MVP):**

| Type                      | When created                                              |
| ------------------------- | --------------------------------------------------------- |
| `assignment`              | Relationship assigned to an actor                         |
| `workflow.stage_changed`  | Workflow stage changed on a relationship                  |
| `automation.completed`    | Automation action succeeded (incl. outreach sent)         |
| `mention`                 | Note/comment body mentions `@actorId`                     |

Implementation may refine exact string tokens; Spec locks the **set of intents**, not a product rules UI.

### 2. Notification Feed

```text
GET /api/v1/notifications
```

- Returns notifications for the **current actor** only (from actor resolution).  
- Supports distinguishing **unread** vs **read** (filter and/or fields).  
- Newest-first is the expected default ordering.

### 3. Read / Unread actions

Minimal mutations (inbox hygiene only — not domain mutations):

```text
POST /api/v1/notifications/:id/read
POST /api/v1/notifications/read-all
```

- Mark one / mark all for the current actor.  
- No archive, snooze, mute, or preference center in MVP.

### 4. Collaboration Mentions (thin)

MVP adds a **minimal note/comment write** that can include `@actorId` tokens (e.g. `@recruiter_beta`).

- Target surface: Implementation chooses one primary attach point documented in PR-2 (preferred: **Relationship** or **Candidate** collaboration note — not reusing Job free-text `notes` as a thread).  
- Parsing `@actorId` is deterministic string match against known Actor Registry ids (Alpha honesty — no fuzzy people search).  
- Each distinct mentioned actor receives a `mention` notification.  
- No rich editor, reactions, threads UI, or real-time sync.

**Baseline honesty:** Existing Candidate `note` / Job `notes` string fields are **not** comment threads. MVP may introduce a thin dedicated comment/note resource rather than overloading those bags.

### 5. Notification sources (consume only)

```text
Assignment / Workflow / Automation  →  NotificationService (fan-out)
Mention write                        →  NotificationService (fan-out)
```

| Source                         | Emit after                                              | Typical recipient(s)        |
| ------------------------------ | ------------------------------------------------------- | --------------------------- |
| Assignment                     | Successful assign (Automation assign / equivalent)      | `assigneeId`                |
| Workflow stage change          | Successful stage move (Workflow and/or Automation path) | Assignee and/or prior actor (Implementation documents exact fan-out; must not invent new stage rules) |
| Automation completed           | Successful Action Result                                | Actor and/or assignee as documented |
| Mention                        | Note/comment create containing `@actorId`               | Mentioned actor(s)          |

Notifications **must not** invent business events that capabilities did not produce. Failed Automation does not require a success notification; Implementation may omit or add a separate failure type only if documented — MVP default is **notify on successful completion types listed above**.

### 6. Authorization

Gate notification APIs via `AuthorizationService` with **fixed** permissions (extend EPIC-009 map — no custom roles):

| Permission             | Intent                         | Admin | Recruiter | Viewer |
| ---------------------- | ------------------------------ | :---: | :-------: | :----: |
| `notification.read`    | Read own feed                  | ✅ | ✅ | ✅ |
| `notification.write`   | Mark read / mark all read; create mention note (if write path is under this permission) | ✅ | ✅ | ❌* |

\*Viewer: **read own notifications** only. Viewer must **not** create collaboration notes/mentions in MVP (keeps Viewer read-only posture). Mark-read may be allowed for Viewer so they can clear their inbox — Implementation documents choice; preferred: Viewer may `notification.write` **only** for mark-read endpoints, or use a narrower split if needed. Spec requires Viewer cannot create mentions that trigger fan-out writes into other actors’ inboxes via collaboration create.

Deny-by-default remains: unknown permission → DENY.

### 7. Actor resolution

Reuse EPIC-009 actor resolution (`x-actor-id` → body → query → default `recruiter_alpha`). Feed is always scoped to resolved actor.

---

## Business Rules

1. Notifications **inform**; they never execute Automation, Workflow, Matching, or Assign.  
2. Notifications are created **only** from declared source outcomes or mention writes.  
3. A recipient sees **only** their own notifications.  
4. Mark read / mark all read change inbox state only — not Candidate/Job/Relationship domain fields.  
5. **Notification immutability:** after create, only read state (`readAt`) may change; type, title/body, source, recipient, and `createdAt` are immutable.  
6. Mention parsing is deterministic against known actors; unknown `@token` does not create a notification.  
7. Authorization gates all notification (and mention-create) APIs.  
8. No email / push / Slack / Teams / SMS / webhook delivery in MVP.  
9. No notification rules engine, digest, or scheduler.  

---

## Acceptance Criteria

| ID        | Criterion                                                                 |
| --------- | ------------------------------------------------------------------------- |
| **AC-1**  | Notification model exists (id, recipient, type, read state, source, timestamps). |
| **AC-2**  | Notification Feed — `GET /api/v1/notifications` returns current actor’s items (unread + read distinguishable). |
| **AC-3**  | Mark one notification as read.                                            |
| **AC-3b** | Notification immutability — mark read / unread changes only read state; content, source, recipient, and `createdAt` must not be modified. |
| **AC-4**  | Mark all notifications as read for current actor.                         |
| **AC-5**  | Assignment notification created for assignee after successful assign.     |
| **AC-6**  | Workflow stage-change notification created after successful stage move.   |
| **AC-7**  | Automation completion notification created after successful Automation action. |
| **AC-8**  | Mention notification created when a note/comment includes `@actorId`.     |
| **AC-9**  | Notifications only consume source outcomes — do not invent business events or execute actions. |
| **AC-10** | No business rules moved into Notifications (Matching/Workflow semantics unchanged). |
| **AC-11** | EPIC-001…009 authorized happy-paths have no regression.                   |
| **AC-12** | Resume Import has no regression for authorized actors.                    |
| **AC-13** | `GET /health` returns `"status":"ok"` (still public).                     |
| **AC-14** | `pnpm run ci` PASS.                                                       |

---

## Out of Scope

- Email / Push / Slack / Teams / SMS / Webhook delivery  
- Notification Rules engine / preference matrix product  
- Digests / schedulers / snooze / mute / archive  
- AI summary of notifications  
- Rich text editor / reactions / real-time websockets  
- Full chat product  
- Multi-tenant inbox isolation productization beyond current single-workspace Alpha  
- Audit Log platform (EPIC-012 later — may consume Action Result + notifications as signals)  
- TECH / architecture redesign / Memory Bank changes  
- Integrations product (EPIC-011)  

---

## Dependencies

| Dependency                         | Status    |
| ---------------------------------- | --------- |
| `main @ 840bdfe`                   | Required  |
| EPIC-001…009                       | Completed |
| AuthorizationService               | Required  |
| Automation Action Result           | Required (automation source) |
| Relationship assignee + stage      | Required  |
| Actor Registry (known `@actorId`)  | Required  |

No new TECH ticket for this EPIC. **TECH-007** (CI/formatting) remains a **separate** follow-up after Validation.

---

## Risks

| Risk                                      | Mitigation                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| Notifications start executing actions     | Locked principles + AC-9; Validation forbids execute side effects          |
| Duplicate emits (PATCH + Automation)      | PR-2 documents single fan-out strategy; Validation checks one notify/intent |
| Overloading Job/Candidate note bags       | Thin dedicated comment/note resource preferred                             |
| Inbox noise                               | Fixed types only; no rules engine in MVP                                   |
| Viewer creates mentions                   | Viewer cannot create collaboration notes in MVP                            |

---

## Success Metrics

- Assignee receives an unread `assignment` notification after assign.  
- Stage move produces a `workflow.stage_changed` notification without changing Matching scores.  
- Successful Automation produces `automation.completed` without Notifications calling Automation again.  
- `@recruiter_beta` in a note/comment creates a `mention` for that actor only.  
- Mark read / mark all read clear unread state for current actor only.  
- `main` remains deployable.

---

## Roadmap context

| EPIC           | Goal                                              |
| -------------- | ------------------------------------------------- |
| ✅ EPIC-001…009 | Product + Automation + Authorization              |
| **EPIC-010**   | Notifications & Collaboration _(this)_            |
| TECH-007       | CI & Formatting Hardening _(after 010 Validation)_|
| Later          | Integrations (011), Audit & Governance (012)      |

---

## Definition of Done

EPIC-010 is done when:

- AC-1…AC-14 (+ AC-3b immutability) **PASS**  
- Regressions for authorized happy-paths on EPIC-001…009: **NONE**  
- Confirmed: Notifications did not execute actions or own Workflow/Matching rules; read/unread does not mutate notification content  
- `GET /health` **PASS** (still public)  
- `pnpm run ci` **PASS**  
- Validation Report completed (PR-3) with feed / read / source / mention evidence  

---

## Deliverables (lifecycle)

| PR              | Content                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **PR-1 (this)** | Spec only — this document + `reports/epic-010-spec-review.md`           |
| **PR-2**        | Implementation — Notification model/API + source fan-out + thin mention |
| **PR-3**        | Validation Report — AC checklist, evidence, PASS/FAIL                   |

---

## Implementation constraints (for PR-2)

- Branch from `main` after this Spec merges.  
- Place Notifications as a **consumer module** (informational); collaboration note create is a thin write that only fans out notifications + stores comment text.  
- Wire fan-out after successful Assignment / Workflow stage change / Automation success — do not invent events.  
- Extend Authorization permission map (`notification.read` / `notification.write`) with deny-by-default intact.  
- `/health` stays ungated.  
- No email/Slack/push adapters.  
- Keep `main` deployable; CI green.  
- Do not open TECH-007 inside this EPIC.  
