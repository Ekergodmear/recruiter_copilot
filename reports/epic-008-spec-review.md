# EPIC-008 Spec Review — Automation / Actions

| Field          | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Document       | `docs/epics/EPIC-008-Automation-Actions.md`              |
| Review type    | Spec gate (PR-1 docs-only)                               |
| Baseline       | `main @ 2217f54` + EPIC-001…007 COMPLETED                |
| Recommendation | **APPROVE Spec** → unlock Implementation PR              |

---

## Why this EPIC now

Seven capabilities cover observation and decision support. The natural next step is **controlled execution** — not agents, not rule engines. MVP stays to three confirmed actions.

---

## Naming & philosophy (critical)

| Choice                                                         | Verdict                                              |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| Auto stage from Match Score                                    | **Reject** — invents business rules                  |
| Trigger / If–Then engine                                       | **Reject** — Out of Scope                            |
| AI Agent                                                       | **Reject** — Automation ≠ Agent                      |
| Automation writes outreach text                                | **Reject** — Copilot drafts; Automation sends        |
| **Automation consumes capabilities; executes authorized actions** | **Adopt** — locked                               |
| **Every execution attributable and auditable**                 | **Adopt** — locked (MVP Action Result, not full Audit EPIC) |
| Stage Move / Send Outreach / Assignment only                   | **Adopt** — small mutation surface                   |

Aligns with: Observation → Controlled Execution without breaking source-of-truth boundaries.

---

## Spec completeness check

| Section                                                         | Present  |
| --------------------------------------------------------------- | -------- |
| Problem / Goal / User Story                                     | Yes      |
| Dual governing principles                                       | Explicit |
| Three MVP actions + confirmation                                | Yes      |
| Baseline honesty (no assignee field; no SMTP product)           | Explicit |
| Action Result attribution                                       | Yes      |
| AC-1…AC-18                                                      | Yes      |
| Out of Scope (rules, schedule, agent, TECH)                     | Yes      |
| DoD + lifecycle PR-1 → PR-2 → PR-3                              | Yes      |
| Foundation Freeze / no TECH                                     | Explicit |

---

## Baseline honesty

| Surface              | Notes for PR-2                                              |
| -------------------- | ----------------------------------------------------------- |
| Workflow Stage Move  | Exists — Automation must delegate                           |
| Copilot Draft        | Exists — Send requires draft; Copilot stays no-send         |
| Email transport      | Absent — mock/plugin adapter for CI; no TECH                |
| Assignee             | Absent — additive `assigneeId` on relationship              |
| Full Audit Log       | Deferred — MVP Action Result attribution still required     |

---

## Scope discipline

**In:** Confirmed Stage Move, Send from draft, Assignment, Action Result attribution, minimal UI.  
**Out:** Rule engine, auto-stage, scheduler, multi-step, agent, calendar/Slack, full RBAC, TECH.

```text
EPIC-001…005  = business capabilities (rules)
EPIC-006      = Copilot (read + draft)
EPIC-007      = Analytics (read aggregates)
EPIC-008      = Automation (authorized mutations only)
```

---

## Risks accepted for Alpha

- Send without live SMTP — mock adapter records attempt in CI  
- Assignee is string id, not full user directory  
- Authorization = actor present + confirmed flag (RBAC later)  

---

## Gate decision

| Gate                        | Result                     |
| --------------------------- | -------------------------- |
| Product value clear         | PASS                       |
| AC testable                 | PASS                       |
| Out of Scope explicit       | PASS                       |
| No TECH dependency          | PASS                       |
| Definition of Done          | PASS                       |
| Not a super-EPIC            | PASS                       |
| Ready for Implementation PR | **YES** (after Spec merge) |

**TL action:** Approve & merge Spec PR → open Implementation PR against this document only.
