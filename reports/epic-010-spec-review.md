# EPIC-010 Spec Review — Notifications & Collaboration

| Field          | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| Document       | `docs/epics/EPIC-010-Notifications-Collaboration.md`          |
| Review type    | Spec gate (PR-1 docs-only)                                    |
| Baseline       | `main @ 840bdfe` + EPIC-001…009 COMPLETED                     |
| Recommendation | **APPROVE Spec** → unlock Implementation PR                   |

---

## Why this EPIC now

EPIC-008/009 made actions attributable and centrally authorized. Recruiters still lack an **in-app inbox** and a **minimal mention** surface. Doing Notifications next maximizes product value before Integrations / Audit, while TECH-007 (CI formatting) stays a separate pipeline EPIC afterward.

This is a **product consumer EPIC**, not a delivery-channel product and not a rules engine.

---

## Naming & philosophy (critical)

| Choice                                                         | Verdict                                              |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| Email / Push / Slack / Teams / SMS / Webhook                   | **Reject** — Out of Scope                            |
| Notification Rules / Digest / Scheduler / AI summary           | **Reject** — Out of Scope                            |
| Notifications execute stage move / assign / outreach           | **Reject** — inform only                             |
| Notifications invent business events                           | **Reject** — consume capability outcomes only        |
| **Notifications consume capabilities; do not own rules/execute** | **Adopt** — locked                                |
| **Notifications inform users; users decide**                   | **Adopt** — locked                                   |
| In-app feed + read/unread + thin `@actorId` mentions           | **Adopt**                                            |
| Authorization via EPIC-009 (`notification.read` / `.write`)    | **Adopt**                                            |

Architecture fit:

```text
Source of Truth / Automation / thin mention write
        │
        ▼
NotificationService (fan-out, inform only)
        │
        ▼
In-app Feed (read / unread)
```

---

## Spec completeness check

| Section                                                         | Present  |
| --------------------------------------------------------------- | -------- |
| Problem / Goal / User Story                                     | Yes      |
| Two governing principles                                        | Explicit |
| Notification model + fixed types                                | Yes      |
| Feed + mark read / mark all read                                | Yes      |
| Sources (Assignment / Workflow / Automation / Mention)          | Yes      |
| Thin collaboration + baseline honesty (not Job/Candidate bags)  | Explicit |
| Authorization table + Viewer posture                            | Yes      |
| AC-1…AC-14                                                      | Yes      |
| Out of Scope (channels / rules / TECH)                          | Yes      |
| DoD + lifecycle + TECH-007 deferred                             | Yes      |

---

## Baseline honesty

| Surface                      | Notes for PR-2                                              |
| ---------------------------- | ----------------------------------------------------------- |
| Comment / mention APIs       | **Greenfield** — no thread model today                      |
| Candidate `note` / Job `notes` | Free-text bags — **do not** treat as collaboration threads |
| Assignment / stage / Action Result | Exist — primary emit hooks                               |
| Actor Registry               | Known `@actorId` tokens only (Alpha)                        |
| `/health`                    | Remains public                                              |

---

## Scope discipline

**In:** In-app notifications, feed, read/unread, source fan-out, thin mention notes, AuthZ permissions.  
**Out:** External channels, rules engine, digest, scheduler, AI, chat product, TECH-007, architecture redesign.

---

## Risks accepted for Alpha

| Risk                         | Accepted mitigation                                      |
| ---------------------------- | -------------------------------------------------------- |
| Duplicate emit paths         | Document single fan-out strategy in Implementation       |
| Viewer mark-read vs write    | Spec allows read inbox; forbids Viewer mention-create    |
| Inbox noise                  | Fixed types only                                         |

---

## Cadence

```text
PR #37  Spec (this)
     ↓
PR #38  Implementation
     ↓
PR #39  Validation
     ↓
PR #40  TECH-007 (separate — CI / formatting)
```

---

## Recommendation

**APPROVE** EPIC-010 Spec. Safe to open Implementation after merge. No TECH required inside this EPIC.
