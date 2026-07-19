# EPIC-009 Spec Review — Administration & Authorization

| Field          | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| Document       | `docs/epics/EPIC-009-Administration-Authorization.md`         |
| Review type    | Spec gate (PR-1 docs-only)                                    |
| Baseline       | `main @ ca129dc` + EPIC-001…008 COMPLETED                     |
| Recommendation | **APPROVE Spec** → unlock Implementation PR                   |

---

## Why this EPIC now

EPIC-008 made mutations attributable and confirmed, but authorization is still local (`actorId` present). Before Notifications / Integrations / Audit, the platform needs a **central Allow/Deny** policy — without building full IAM.

This is a **foundation-hardening** EPIC, not a feature dump.

---

## Naming & philosophy (critical)

| Choice                                                         | Verdict                                              |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| Multi-tenant / SSO / OAuth in MVP                              | **Reject** — Out of Scope                            |
| Custom roles / permission editor                               | **Reject** — Out of Scope                            |
| ABAC                                                           | **Reject** — RBAC fixed map only                     |
| Authorization owns Workflow/Matching rules                     | **Reject** — governs execution only                  |
| **Authorization governs execution; does not own business rules** | **Adopt** — locked                                 |
| Fixed Admin / Recruiter / Viewer + AuthorizationService        | **Adopt**                                            |
| Wire Automation + Copilot + Analytics + core R/W APIs          | **Adopt**                                            |

Aligns with three-layer architecture: Authorization is a **platform cross-cut**, not a fourth business capability.

---

## Spec completeness check

| Section                                                         | Present  |
| --------------------------------------------------------------- | -------- |
| Problem / Goal / User Story                                     | Yes      |
| Governing principle                                             | Explicit |
| Roles + Permissions + default mapping                           | Yes      |
| AuthorizationService API shape                                  | Yes      |
| Baseline honesty (no login; actor→role map)                     | Explicit |
| Wire-through Read + Execute                                     | Yes      |
| Confirmation retained for Automation                            | Explicit |
| AC-1…AC-15                                                      | Yes      |
| Out of Scope (IAM/SSO/tenant/TECH)                              | Yes      |
| DoD + lifecycle                                                 | Yes      |

---

## Baseline honesty

| Surface                 | Notes for PR-2                                              |
| ----------------------- | ----------------------------------------------------------- |
| `actorId` defaults      | Many routes hardcode `recruiter_alpha` — must resolve role  |
| Automation auth         | Keep `confirmed`; add AuthorizationService call             |
| No session/SSO          | Config/in-memory Actor Registry only                        |
| `/health`               | Remains public                                              |

---

## Scope discipline

**In:** Fixed RBAC, AuthorizationService, actor→role resolution, protect read/mutation/automation/copilot/analytics.  
**Out:** Multi-tenant, SSO/OIDC, custom roles, ABAC, audit platform, TECH.

```text
Source of Truth (001–005)
Read consumers (006–007)  ──┐
Automation (008)            ├─► AuthorizationService (009)
                            ┘
```

---

## Risks accepted for Alpha

- Unknown actors denied on mutations (may need documented seed actors in tests)  
- Not every obscure internal route gated in MVP — Spec lists minimum wire-through surfaces  
- No UI permission admin — config/code mapping only  

---

## Gate decision

| Gate                        | Result                     |
| --------------------------- | -------------------------- |
| Product/platform value clear| PASS                       |
| AC testable                 | PASS                       |
| Out of Scope explicit       | PASS                       |
| No TECH dependency          | PASS                       |
| Definition of Done          | PASS                       |
| Not a super-EPIC / IAM      | PASS                       |
| Ready for Implementation PR | **YES** (after Spec merge) |

**TL action:** Approve & merge Spec PR → open Implementation PR against this document only.
