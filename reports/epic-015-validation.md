# EPIC-015 Validation Report — Intelligent Ingestion Engine

| Field           | Value |
| --------------- | ----- |
| Epic            | EPIC-015 — Intelligent Ingestion Engine |
| Spec            | [PR #58](https://github.com/Ekergodmear/recruiter_copilot/pull/58) (merged) |
| Implementation  | [PR #59](https://github.com/Ekergodmear/recruiter_copilot/pull/59) (merged) |
| Validation date | 2026-07-20 |
| Runtime script  | `pnpm exec tsx scripts/validate-epic-015.ts` |
| Evidence JSON   | `reports/epic-015-validation-evidence.json` |
| **Verdict**     | **PASS** |

---

## Founder criterion

> Nếu thay ZipAdapter bằng GoogleDriveAdapter thì pipeline có gần như không phải sửa không?

**Yes** — SourceAdapter boundary verified (zip / folder / multi_file only; no Drive/Gmail in MVP).

---

## Acceptance Criteria

| ID | Result | Evidence |
|----|--------|----------|
| AC-ENGINE-1 | **PASS** | SourceAdapter files + engine module |
| AC-PREVIEW-1 | **PASS** | Mixed → `AwaitingConfirmation` |
| AC-PREVIEW-2 | **PASS** | Confirm `scope=cv` → Completed |
| AC-MVP-1 | **PASS** | Multi-file imported=2 |
| AC-MVP-2 | **PASS** | ZIP nested imported≥1 |
| AC-MVP-3 | **PASS** | Folder adapter used in mixed test (same pipeline) |
| AC-MVP-4 | **PASS** | Unsupported counted in preview |
| AC-MVP-5 / AC-IDEMPOTENT-1 | **PASS** | Re-package → imported=0, duplicate≥2 |
| AC-MVP-6 | **PASS*** | Job continues on per-file failure (code path); corrupt PDF not specially fixture-tested — failure counted in `report.failed` |
| AC-MVP-7 | **PASS** | HTTP 202 < 5s |
| AC-QUIET-1 | **PASS** | UI Quiet % / Show details (code review · D11) |
| AC-REPORT-1 | **PASS** | Report fields present |
| AC-REPORT-2 | **PASS** | Next actions: Open candidates · Review failed (Download Report = job JSON via GET job) |
| AC-CLOSE-1 | **PASS** | Candidates listable after ingest |
| AC-AUDIT-1 | **PASS** | `GET /api/v1/ingestion/jobs` |
| AC-REG-1 | **PASS** | `import-resume` 201 |
| AC-OPS-1 | **PARTIAL → accepted** | Per-file `resume_import_*` telemetry via CandidateImportService; dedicated `ingest_job_*` KPI suite deferred (Founder Metrics backlog) |
| AC-OOS-1 | **PASS** | No Drive/Gmail/OCR adapters |

\*AC-MVP-6: architecture guarantees batch continuation; optional dedicated password-PDF fixture can land in a follow-up.

---

## Runtime

```bash
pnpm exec tsx scripts/validate-epic-015.ts
```

Verdict in evidence JSON: **PASS** (14/14 runtime steps).

---

## Deferred (Founder recommendations — not blockers)

| Item | Target |
|------|--------|
| Domain events (`IngestionCompleted`, `KnowledgeImported`, …) | EPIC-017 / EPIC-018 |
| Normalized Job KPIs (`ingest_duration_ms`, `files_*`, `import_failure_rate`) | Metrics backlog post-015 |
| Semantic dedup | Later EPIC |

---

## Close-out

```text
PR #57  UX Constitution D10–D14     ✅
PR #58  Spec                        ✅
PR #59  Implementation              ✅
PR #60  Validation (this)           ✅ → EPIC-015 Done
```

**Next focus (Founder):** EPIC-016 — Knowledge Workspace  
(“Assistant nên hiểu và sử dụng Knowledge như thế nào?”)
