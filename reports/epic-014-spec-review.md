# EPIC-014 Spec Review — Reporting & Export

| Field          | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| Document       | `docs/epics/EPIC-014-Reporting-Export.md`                     |
| Review type    | Spec gate (PR-1 docs-only) — internal architect self-review   |
| Baseline       | `main @ 2ab9e4c` + EPIC-001…013 COMPLETED + TECH-007          |
| Recommendation | **APPROVE Spec** → unlock Implementation                      |

---

## Self-review verdict

| Principle / scope                                              | Verdict  |
| -------------------------------------------------------------- | -------- |
| Reports present; do not change information                     | Locked   |
| Derive from Analytics / Audit / SoT; never become SoT          | Locked   |
| CSV + overview JSON MVP; PDF out (no stack)                    | Honest   |
| Does not replace Integration adapter export                    | Explicit |
| `report.read` via AuthorizationService                         | Adopt    |
| Determinism AC-9                                               | Adopt    |
| No TECH / warehouse / scheduler                                | Pass     |

Architecture fit:

```text
GET /reports/overview | /reports/export?kind=…
        │
        ▼
ReportService (compose / project / CSV)
        │
        ├─► AnalyticsService
        ├─► AuditService
        ├─► Candidate (read)
        └─► Job (read)
```

**APPROVE** — proceed to Implementation.
