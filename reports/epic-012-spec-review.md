# EPIC-012 Spec Review — Audit & Governance

| Field          | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| Document       | `docs/epics/EPIC-012-Audit-Governance.md`                     |
| Review type    | Spec gate (PR-1 docs-only)                                    |
| Baseline       | `main @ 62cd792` + EPIC-001…011 COMPLETED + TECH-007          |
| Recommendation | **APPROVE Spec** → unlock Implementation PR                   |

---

## Why this EPIC now

After Integrations, the platform can change state through many authorized paths. Attribution fragments exist (ActionResult, Activity, actor headers, reconstructed AuditReplay), but there is no **unified immutable Audit Log**. This EPIC closes that governance gap without inventing remediation or SIEM.

---

## Naming & philosophy (critical)

| Choice                                                         | Verdict                                              |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| Audit auto-revert / compensate                                 | **Reject**                                           |
| Replace ActionResult / Activity / AuditReplay                  | **Reject** — complement only                         |
| SIEM / legal hold / WORM product                               | **Reject** — Out of Scope                            |
| **Audit records what happened; never changes what happened**   | **Adopt** — locked                                   |
| **Attributable, traceable, immutable**                         | **Adopt** — locked                                   |
| Central AuditService + query API                               | **Adopt**                                            |
| Producers: Automation, Integrations, Workflow/Assignment       | **Adopt**                                            |
| AuthZ `audit.read` (+ internal record path)                    | **Adopt**                                            |
| **AC-6b Audit Completeness** (exactly one record per outcome)  | **Adopt** — no missing / no duplicate logs           |

Architecture fit:

```text
Capability outcome (Automation / Integration / Workflow / …)
        │
        ▼
AuditService.record (append-only)
        │
        ▼
Audit Log (immutable)
        │
        ▼
GET /api/v1/audit (read-only, AuthZ)
```

---

## Spec completeness check

| Section                                                         | Present  |
| --------------------------------------------------------------- | -------- |
| Problem / Goal / User Story                                     | Yes      |
| Two governing principles                                        | Explicit |
| Audit model + AuditService                                      | Yes      |
| Producer wire-through set                                       | Yes      |
| Query API + immutability                                        | Yes      |
| Authorization table                                             | Yes      |
| Baseline honesty (fragments vs greenfield log)                  | Explicit |
| AC-1…AC-14                                                      | Yes      |
| Out of Scope                                                    | Yes      |
| DoD + lifecycle                                                 | Yes      |

---

## Baseline honesty

| Surface              | Notes for PR-2                                              |
| -------------------- | ----------------------------------------------------------- |
| Audit Log store/API  | **Greenfield**                                              |
| ActionResult         | Reuse as Automation producer signal                         |
| PipelineActivity     | Remains business activity — not replaced                    |
| AuditReplayService   | Remains ops reconstruction — not the Audit Log              |
| Actor resolution     | Reuse EPIC-009                                              |

---

## Scope discipline

**In:** Immutable Audit Log, AuditService, producers, query API, AuthZ.  
**Out:** SIEM, retention console, auto-revert, WORM product, TECH, architecture redesign.

---

## Cadence

```text
PR #44  Spec (this)
     ↓
PR #45  Implementation
     ↓
PR #46  Validation
```

---

## Recommendation

**APPROVE** EPIC-012 Spec. Safe to open Implementation after merge. No TECH required inside this EPIC.
