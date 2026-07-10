# ADR-015 — Capability Map (Deferred)

## Status
Accepted — **Lightweight map below for Sprint planning**. Full `31-capability-map/` Phase 2.

## Date
2026-07-09

## Context
Product needs capability view for sprint planning. Full 15–20 file capability map expands Foundation without runnable product.

## Decision
**Sprint 1 capability map (this ADR serves as planning source):**

### Candidate Management
| Capability | Sprint | WF | KC |
|------------|--------|----|----|
| Import Resume | 1 | WF-001 | KC-001, KC-002 |
| View Candidate Profile | 1 | — | KM-001 |
| List Resumes | 1 | WF-001 | — |
| Duplicate Detection | 2 | WF-003 | — |
| Merge | 2 | WF-019 | — |
| Semantic Search | 2 | WF-008 | — |
| Archive | 2 | — | — |

### Job Management
| Capability | Sprint |
|------------|--------|
| Create Job | 1 |
| View Job | 1 |
| Assign Recruiter | 2 |
| Parse JD | 2 |
| Close Job | 2 |

### Recruitment
| Capability | Sprint |
|------------|--------|
| Create Submission | 2 |
| Pipeline View | 2 |
| Interview | 3 (v1) |
| Placement | 3 (v1) |

### Knowledge / AI
| Capability | Sprint | KC |
|------------|--------|-----|
| Parse Resume → Skills | 1 | KC-001 |
| Parse Resume → English | 1 | KC-002 |
| Parse Salary | 2 | KC-005 |
| Match Score | 2 | KC-007 |
| Truth Resolution | 3 | KC-003 |

### Platform
| Capability | Sprint |
|------------|--------|
| Auth + Workspace | 1 |
| Permissions (basic) | 1 |
| Notifications (basic) | 2 |
| Audit Log | 1 |

**Phase 2:** Expand to full `31-capability-map/` with 15–20 files for enterprise planning.

## Alternatives Considered
1. **Full capability map folder now** — rejected
2. **No capability map** — rejected: sprint planning blind
3. **Workflows as capabilities** — rejected: different abstraction level

## Consequences
### Positive: Sprint 1 scope crystal clear
### Negative: Full PO-facing map comes later

## Related
- `01-project-scope.md` MVP list
- `_architecture-review.md`
