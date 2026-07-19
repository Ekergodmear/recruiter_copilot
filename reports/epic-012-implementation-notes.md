# EPIC-012 Implementation Notes

| Field    | Value            |
| -------- | ---------------- |
| Spec     | PR #44 (+ AC-6b) |
| Baseline | `main @ 05b7e0c` |

## Completeness strategy (exactly one record)

| Outcome path                         | Who records                         | Suppress elsewhere        |
| ------------------------------------ | ----------------------------------- | ------------------------- |
| Automation assign / stage_move / send | `AutomationService` via ActionResult | `suppressAudit` on Relationship |
| Direct PATCH stage / assign          | `RelationshipService`               | n/a                       |
| Integration import/export execute    | `IntegrationService` (one per call) | n/a                       |

## Immutability

- Query: `GET /api/v1/audit`, `GET /api/v1/audit/:id` only  
- No public POST/PATCH/DELETE audit routes  

## AuthZ

- `audit.read` — Admin + Recruiter  
- Viewer denied  
- Producers call `AuditService.record` internally (no free-form client write)
