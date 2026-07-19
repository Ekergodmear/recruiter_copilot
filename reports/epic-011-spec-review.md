# EPIC-011 Spec Review — Integrations

| Field          | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| Document       | `docs/epics/EPIC-011-Integrations.md`                         |
| Review type    | Spec gate (PR-1 docs-only)                                    |
| Baseline       | `main @ ee98e0d` + EPIC-001…010 COMPLETED + TECH-007          |
| Recommendation | **APPROVE Spec** → unlock Implementation PR                   |

---

## Why this EPIC now

EPIC-001…010 closed the internal product loop (SoT → consumers → automation → authz → notifications). TECH-007 hardened formatting. The next product gap is a **controlled external boundary** — without inventing a second Source of Truth or an iPaaS.

---

## Naming & philosophy (critical)

| Choice                                                         | Verdict                                              |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| External system as Source of Truth                             | **Reject**                                           |
| Direct DB writes from providers                                | **Reject** — Application Services only               |
| OAuth / continuous sync / queues / marketplace                 | **Reject** — Out of Scope                            |
| Real LinkedIn / Gmail / Greenhouse connectors                  | **Reject** — ATS Mock only                           |
| **Integrations connect; do not own business rules**            | **Adopt** — locked                                   |
| **External systems are adapters, never SoT**                   | **Adopt** — locked                                   |
| Registry + Provider port + CSV / Webhook / ATS Mock            | **Adopt**                                            |
| Manual Preview → Confirm → Execute                             | **Adopt**                                            |
| AuthZ `integration.read` / `integration.execute`               | **Adopt**                                            |
| **AC-7b Import atomicity** (no partial import on failure)      | **Adopt** — aligned with EPIC-008 atomicity spirit   |

Architecture fit:

```text
External System
      │
      ▼
Integration Provider (adapter)
      │
      ▼
Integration Service (orchestrate + AuthZ)
      │
      ▼
Application Services (Candidate / Job / …)
      │
      ▼
Source of Truth
```

---

## Spec completeness check

| Section                                                         | Present  |
| --------------------------------------------------------------- | -------- |
| Problem / Goal / User Story                                     | Yes      |
| Two governing principles                                        | Explicit |
| Registry + Provider Interface                                   | Yes      |
| Three MVP providers (CSV / Webhook / ATS Mock)                  | Yes      |
| Preview → Confirm → Execute                                     | Explicit |
| Authorization table                                             | Yes      |
| Baseline honesty (greenfield vs reuse)                          | Explicit |
| AC-1…AC-14                                                      | Yes      |
| Out of Scope (OAuth/sync/marketplace/TECH)                      | Yes      |
| DoD + lifecycle                                                 | Yes      |

---

## Baseline honesty

| Surface                    | Notes for PR-2                                              |
| -------------------------- | ----------------------------------------------------------- |
| Integrations module        | **Greenfield**                                              |
| Candidate/Job writes       | Reuse `CandidateImportService` / `JobService`               |
| EmailSendAdapter           | Outreach only — do not conflate                             |
| Secrets / OAuth            | Out of Scope — static MVP config                            |
| `/health`                  | Remains public                                              |

---

## Scope discipline

**In:** Registry, provider port, CSV/Webhook/ATS Mock, manual preview/confirm/execute, AuthZ.  
**Out:** OAuth, sync, queues, conflict product, marketplace, live ATS, TECH, architecture redesign.

---

## Risks accepted for Alpha

| Risk                         | Accepted mitigation                                      |
| ---------------------------- | -------------------------------------------------------- |
| Webhook abuse                | AuthZ + documented envelope; no anonymous SoT writes     |
| CSV schema drift             | Document MVP columns in Implementation; Preview first    |
| Provider bypasses services   | AC-9 Validation evidence                                 |

---

## Cadence

```text
PR #41  Spec (this)
     ↓
PR #42  Implementation
     ↓
PR #43  Validation
```

---

## Recommendation

**APPROVE** EPIC-011 Spec. Safe to open Implementation after merge. No TECH required inside this EPIC.
