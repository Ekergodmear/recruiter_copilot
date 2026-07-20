# EPIC-013 Spec Review — Search & Discovery

| Field          | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| Document       | `docs/epics/EPIC-013-Search-Discovery.md`                     |
| Review type    | Spec gate (PR-1 docs-only)                                    |
| Baseline       | `main @ b8d16ef` + EPIC-001…012 COMPLETED + TECH-007          |
| Recommendation | **APPROVE Spec** → unlock Implementation PR                   |

---

## Why this EPIC now

After Audit & Governance, the platform has full SoT + AuthZ + Integrations + Audit. Discovery is still split across capability list APIs. Search & Discovery is the highest-value **read** capability for day-to-day recruiter use, composing existing Candidate / Job / Workflow / Matching data without new business rules.

---

## Naming & philosophy (critical)

| Choice                                                                    | Verdict                    |
| ------------------------------------------------------------------------- | -------------------------- |
| Search writes / auto-tags / auto-stage moves                              | **Reject**                 |
| Search-owned Candidate/Job index as second SoT                            | **Reject**                 |
| Elasticsearch / vector / semantic / AI ranking in MVP                     | **Reject** — Out of Scope  |
| GraphQL                                                                   | **Reject** — Out of Scope  |
| **Search discovers information; it does not change information**          | **Adopt** — locked         |
| **Search derives from SoT; it never becomes the SoT**                     | **Adopt** — locked         |
| Unified `GET /api/v1/search` + Saved Searches (actor-owned)               | **Adopt**                  |
| Matching filter via MatchingService read-only                             | **Adopt**                  |
| AuthZ `search.read`                                                       | **Adopt**                  |
| **AC-10b Search Determinism**                                             | **Adopt**                  |
| **AC-10c Search Pagination Stability**                                    | **Adopt**                  |

Architecture fit:

```text
GET /api/v1/search  (+ Saved Searches)
        │
        ▼
SearchService  (compose / filter / order)
        │
        ├─► Candidate (read)
        ├─► Job (read)
        ├─► Relationship / Workflow (read)
        └─► MatchingService (read-only scores)
```

---

## Spec completeness check

| Section                                                         | Present  |
| --------------------------------------------------------------- | -------- |
| Problem / Goal / User Story                                     | Yes      |
| Two governing principles                                        | Explicit |
| Global Search + structured filters                              | Yes      |
| Unified API + result model                                      | Yes      |
| Saved Searches (save/list/delete, not shared)                   | Yes      |
| Authorization table                                             | Yes      |
| Baseline honesty (greenfield Search, reuse SoT/Matching)        | Explicit |
| AC-1…AC-14 + AC-10b + AC-10c                                    | Yes      |
| Out of Scope                                                    | Yes      |
| DoD + lifecycle                                                 | Yes      |

---

## Baseline honesty

| Surface              | Notes for PR-2                                              |
| -------------------- | ----------------------------------------------------------- |
| Search module/API    | **Greenfield**                                              |
| Candidate / Job      | Reuse reads — never write via Search                        |
| MatchingService      | Reuse for `minMatchScore` — do not persist scores in Search |
| Workflow stage       | Reuse Relationship `currentStage`                           |
| External search eng. | Out of Scope                                                |

---

## Scope discipline

**In:** SearchService, Global Search, filters, unified API, Saved Searches, AuthZ, determinism.  
**Out:** ES/OpenSearch, vector/semantic/AI search, ML ranking, indexing pipeline, shared saved searches, TECH.

---

## Cadence

```text
PR #47  Spec (this)
     ↓
PR #48  Implementation
     ↓
PR #49  Validation
```

---

## Recommendation

**APPROVE** EPIC-013 Spec. Safe to open Implementation after merge. No TECH required inside this EPIC.
