# EPIC-015 — Intelligent Ingestion

| Field             | Value                                                         |
| ----------------- | ------------------------------------------------------------- |
| Status            | **DRAFT SPEC** — Founder sign = separate PR before implement  |
| Type              | Product EPIC (user value)                                     |
| Vision alignment  | AI Recruiting Workspace — Assistant-first                     |
| Depends on        | EPIC-001 · single-file import · D10 · D11 · **D12**           |
| Next EPICs        | 016 Knowledge · 017 Orchestration · 018 Automation            |
| Foundation Freeze | Intact — extend ingestion capability, no ATS rewrite          |

> **Không gọi đây là “Bulk Upload”.**  
> Đây là **Intelligent Ingestion**: AI tiếp nhận tri thức tuyển dụng từ bất kỳ nguồn nào.

---

## North star

> Ném cả đống tài liệu vào (hoặc nối một nguồn), đi uống cà phê, quay lại Knowledge đã sẵn.

Upload ZIP chỉ là **MVP source**. Cùng một pipeline phục vụ mọi nguồn sau này.

---

## Universal pipeline

```
Source
  ↓
Ingestion
  ↓
Classification
  ↓
Deduplication
  ↓
Extraction
  ↓
Knowledge Objects
  ↓
Assistant (Quiet outcome + next actions)
```

### Sources (horizon)

| Phase | Sources |
|-------|---------|
| **MVP** | Multi-file · Folder · ZIP |
| **Next** | Gmail / Outlook attachments · Drive / Dropbox / OneDrive folders |
| **Later** | LinkedIn export · CSV · ATS export · Webhook |

Mỗi source adapter chỉ biết **đưa bytes + metadata vào Ingestion**. Không fork logic parse theo kênh.

---

## Background

Hôm nay: một PDF/DOCX / request.  
Thực tế agency VN: ZIP 50–300 CV, folder lồng skill, dump Drive, email đính kèm.

---

## Problem Statement

| Today | Needed |
|-------|--------|
| “Upload CV” một file | Intelligent Ingestion — mọi nguồn |
| HTTP sync | Import / Ingestion Job + progress |
| Không phân loại gói | CV · JD · salary · offer · skip |
| Không báo cáo | imported · duplicate · error · skipped |
| AI demo steps | Quiet % (D11) |

---

## Goal

Một pipeline ingest tạo **Knowledge Objects** hàng loạt; Assistant chỉ báo outcome + next actions.

---

## User Stories

> As a Recruiter, I drop a client ZIP/folder so candidates land in Knowledge without one-by-one upload.

> As a Recruiter, I get an ingestion report (imported / duplicate / error / skipped) so I know what to fix.

> As a Recruiter, when a package mixes JD + CVs + salary, the Assistant asks what to ingest before writing.

> As a Recruiter (later), I connect Drive/email and the **same** pipeline fills Knowledge.

---

## MVP Scope (upload sources only)

| # | Capability |
|---|------------|
| 1 | Multi-file PDF / DOC / DOCX |
| 2 | Folder select — recursive |
| 3 | ZIP — extract + nested walk |
| 4 | Skip non-CV (unless classified JD/other under Confirm) |
| 5 | Duplicate — default Skip (or Resume Version by flag) |
| 6 | Async Ingestion Job when N ≥ threshold |
| 7 | Quiet progress % (D11); details on demand |
| 8 | Result report + next actions |
| 9 | Assistant entry (`INGEST_BULK` / package Confirm) |
| 10 | Mixed-package detect → Confirm scope |

### Error cases (MVP)

Password PDF · corrupt · unsupported mime · soft/hard N limits — job continues; counts in report.

---

## Out of Scope (MVP)

- Live Drive/Dropbox/Gmail OAuth (adapters = later slices of **same** EPIC or follow-ons)
- OCR image CV
- Auto-create Job without Confirm
- Per-file toast spam

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-1 | Multi-file → one job → report counts match |
| AC-2 | ZIP nested → recursive CV import |
| AC-3 | Folder select → same as ZIP walk |
| AC-4 | Non-CV → skipped |
| AC-5 | Duplicates → duplicate count; default no second Candidate |
| AC-6 | Bad PDF → unreadable row; job does not abort all |
| AC-7 | Large N → async; chat remains usable |
| AC-8 | Default UI Quiet % (D11) |
| AC-9 | Assistant summary + Review / Open / Report actions |
| AC-10 | Mixed package → Confirm scope before Act write |
| AC-11 | Single-file import no regression |
| AC-12 | CI + telemetry job lifecycle |
| AC-13 | Spec documents source-agnostic pipeline (adapters pluggable) |

---

## Pattern IDs

| Pattern | Mode | Flow |
|---------|------|------|
| `P-ACT-INGEST` | Act / Mixed | Source → Job → Quiet progress → Report |
| `P-ASK-INGEST-STATUS` | Ask | “Job lúc nãy xong chưa?” |
| `P-MIX-PACKAGE` | Mixed | Detect → Confirm scope → Execute |

Intent (D10): `INGEST` (+ `source`, `scope=cv\|jd\|all`).

---

## Technical direction (constraints)

```
Source adapter → IngestionJob → classify → dedupe → extract
  → CandidateImportService / Job services → Knowledge → Assistant artifact
```

- Reuse per-file import services; do not parse whole ZIP in one HTTP request.
- ZIP-slip + size limits server-side.
- Worker tech chosen in **Implementation PR**, not here.
- `bulk_import` source_type already anticipated on EV-001 — additive only.

---

## Telemetry & quality (ADR-000)

Events: `ingest_job.created` · `progress` · `completed` · `file_skipped` · `file_duplicate`  
Fixtures: ZIP with known counts. Gate: report matches fixture.

---

## Deliverables (governance)

| PR | Content |
|----|---------|
| Discovery (D10–D12) | Principles locked — **done in UX triad PR** |
| **Spec PR** | This document Founder-SIGNED |
| **Impl PR** | Job API + ZIP/folder + Quiet artifact |
| **Validation PR** | AC evidence PASS/FAIL |

---

## Definition of Done

AC-1…AC-13 PASS · single-file OK · D11 respected · CI green · validation report.

---

## Differentiator

Không phải form “Bulk Upload”.  
Là **AI tiếp nhận tri thức tuyển dụng** — upload hôm nay, Drive/email/ATS ngày mai, cùng một não ingestion.
