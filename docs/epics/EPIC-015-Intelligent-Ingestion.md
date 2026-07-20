# EPIC-015 — Intelligent Ingestion Engine

| Field             | Value                                                    |
| ----------------- | -------------------------------------------------------- |
| Status            | **SPEC** — awaiting Founder sign                         |
| Type              | Product EPIC (capability)                                |
| Vision            | AI Recruiting Workspace — Assistant-first                |
| UX law            | D10–D14 ([UX-PRINCIPLES-CORE](../product-discovery/UX-PRINCIPLES-CORE.md)) |
| Depends on        | EPIC-001 · single-file import · D12                      |
| Next              | EPIC-016 Knowledge Workspace                             |
| Foundation Freeze | Intact — **Ingestion Engine**, not a new ATS screen      |

---

## Founder review criterion (single)

> **EPIC-015 có đang xây “Ingestion Engine” hay chỉ đang xây “Bulk Upload”?**

**Required answer:** Ingestion Engine.  
ZIP / folder / multi-file = **MVP SourceAdapters only**.

---

## What this EPIC is / is not

| Is | Is not |
|----|--------|
| **Ingestion Engine** — source-agnostic pipeline into Knowledge | “Bulk Upload” feature / ZIP form |
| Adapter pattern: Source → Engine → Knowledge Objects | One-off upload endpoint forever |
| Ends when Assistant can **use** ingested knowledge immediately | Ends at “files uploaded” |
| Quiet + Artifact-first + Progressive disclosure (D11–D14) | AI pipeline theatre |

---

## North star

```
Any Source
      ↓
Intelligent Ingestion Engine
      ↓
Classifier → Dedup → Extraction
      ↓
Candidate / Job / Documents  (Knowledge Objects)
      ↓
Knowledge Workspace + Assistant can Ask immediately
```

> Recruiters express intent. RecruiterSup orchestrates the work.  
> Don't make recruiters manage software. Let them recruit.

**Success example:** After ingest completes, recruiter chats *“Có bao nhiêu Java Senior?”* and Assistant answers from freshly ingested Knowledge — without opening an Import screen again.

---

## Principles (LOCKED for this EPIC)

| Principle | Meaning |
|-----------|---------|
| **Source-agnostic** | Engine never assumes ZIP. Adapters feed a common job model. |
| **Bulk-first** | Default path is many documents, not one file. |
| **Idempotent** | Re-running same package does not create duplicate Knowledge Objects (dedupe rules). |
| **Async by default** | Large N → Ingestion Job; HTTP accepts + returns job id; chat stays usable. |
| **Quiet by default** | Progress = count + % (D11/D14). Internals behind Details. |
| **Confirm before mutation when ambiguous** | Import Preview when package mixes types / scope unclear (Act: Preview → Confirm). |

---

## Architecture shape (product, not tech fashion)

```
Google Drive · Dropbox · OneDrive · Gmail · Outlook
Folder · ZIP · PDF · DOCX · CSV · ATS Export · Webhook
                    ↓
            SourceAdapter (pluggable)
                    ↓
         Intelligent Ingestion Engine
                    ↓
         Classifier → Deduplication → Knowledge Extraction
                    ↓
         Candidate / Job / Documents
                    ↓
         Knowledge Workspace ← Assistant tools
```

**MVP adapters:** Multi-file · Folder · ZIP.  
All later sources reuse the **same** engine stages.

---

## MVP Scope

### Sources (adapters)

- Multi-file (PDF / DOC / DOCX)
- Folder (recursive)
- ZIP (extract + recursive nested folders)

### Pipeline

1. Recursive scan  
2. Extract (archive → files)  
3. Classify (CV / JD / salary / other / unsupported)  
4. **Import Preview** → human Confirm scope (if mixed or ambiguous)  
5. Skip unsupported (per confirmed scope)  
6. Deduplicate  
7. Queue import (async job)  
8. Progress (Quiet %)  
9. **Import Report** artifact  
10. Knowledge Objects ready for Assistant Ask/Analyze/Act  

### Out of Scope (MVP) — do not expand

- Google Drive · Gmail · Outlook · Dropbox · OneDrive  
- OCR  
- Virus scan  
- Distributed queue (product does not require a specific broker in Spec)  
- Semantic dedup  
- Auto-merge of duplicate profiles  

---

## Import Preview (required)

Upload `ABC.zip` → **do not mutate Knowledge immediately**.

Assistant (Quiet + Artifact-first):

```
Đã phát hiện:

183 CV
1 JD
2 Salary Sheet
7 File khác

Bạn muốn:
○ Chỉ import CV
○ Import CV + JD
○ Import tất cả

[Import]
```

- Write path: Preview → Confirm → Execute (Sprint 0).  
- Progressive disclosure (D14): summary counts first; file-level list behind Details.  
- Rationale: client dumps mix CV + Offer + Contract + Salary + JD.

---

## Import Report (required)

Not merely `Done`.

```
Import completed.

Imported     179
Duplicate      6
Skipped        3
Unsupported    2
Duration   1m 42s
```

Next actions:

- Open Imported Candidates  
- Review Failed Files  
- Download Report  

Details (D14): per-file errors, duplicate keys, skipped reasons, source adapter, timing.

---

## Interaction (Assistant)

| Stage | Mode | Pattern | Default UI |
|-------|------|---------|------------|
| Drop source | — | — | Source chip |
| Preview | Act | `P-MIX-PACKAGE` / `P-ACT-INGEST-PREVIEW` | Counts + scope radios + Confirm |
| Running | Act | `P-ACT-INGEST` | `243 CV · 43%` (Quiet) |
| Done | Ask-facing | report artifact | Import Report + next actions |
| Status ask | Ask | `P-ASK-INGEST-STATUS` | Short answer + link to report |

Intent (D10): `INGEST` + slots `source`, `scope=cv|cv_jd|all`.

---

## User Stories

> As a Recruiter, I drop a client package and Confirm scope so only the right Knowledge Objects are created.

> As a Recruiter, I see an Import Report with actionable next steps, not a vague “Done”.

> As a Recruiter, immediately after ingest I can Ask about candidates (e.g. Java Senior count) without re-importing.

> As a Recruiter (later), I connect Drive/email and the **same** engine fills Knowledge.

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-ENGINE-1 | Spec + design treat ZIP/folder/multi-file as **SourceAdapters**; engine stages are shared and named (scan → classify → dedupe → extract → Knowledge) |
| AC-PREVIEW-1 | Mixed package → Import Preview with counts by class; **no** Knowledge write until Confirm |
| AC-PREVIEW-2 | Scope options at least: CV only · CV+JD · All (product may refine labels) |
| AC-MVP-1 | Multi-file → one Ingestion Job → report counts match |
| AC-MVP-2 | ZIP nested folders → recursive classify + import per confirmed scope |
| AC-MVP-3 | Folder select → same walk semantics as ZIP |
| AC-MVP-4 | Unsupported (out of scope) → Unsupported/Skipped counts; no Candidate |
| AC-MVP-5 | Duplicates → Duplicate count; idempotent default (no second Candidate) |
| AC-MVP-6 | Corrupt / password PDF → Failed/unreadable in report; job does not abort entire batch |
| AC-MVP-7 | N ≥ threshold → async; user can keep chatting |
| AC-QUIET-1 | Default progress = count + % (D11/D14); multi-step tool list only in Details |
| AC-REPORT-1 | Completion shows Imported · Duplicate · Skipped · Unsupported · Duration |
| AC-REPORT-2 | Next actions include Open Imported Candidates · Review Failed Files · Download Report |
| AC-CLOSE-1 | After successful ingest, Assistant Ask over new Knowledge works without leaving the conversation (e.g. skill/title query returns updated set) |
| AC-REG-1 | Single-file import path does not regress |
| AC-OPS-1 | Telemetry: job created / progress / completed / skipped / duplicate; CI green |
| AC-OOS-1 | MVP does **not** ship Drive/Gmail/OCR/semantic dedup/auto-merge/virus scan |

---

## Technical direction (constraints for Impl PR)

```
SourceAdapter → IngestionJob
  → classify → (Preview/Confirm if needed)
  → dedupe → extract
  → existing CandidateImportService / Job services
  → Knowledge Objects
  → Assistant artifacts (Preview, Progress, Report)
```

- Do **not** parse an entire ZIP inside one blocking HTTP request for large N.  
- ZIP-slip protection + size limits.  
- Worker/queue **implementation** choice belongs in Impl PR (in-proc job table OK for MVP; not “distributed queue” as a product requirement).  
- Additive events / `bulk_import` (or `ingest`) source_type — Memory Bank FROZEN, no Domain rewrite.

---

## Telemetry & quality (ADR-000)

| Event | When |
|-------|------|
| `ingest_job.created` | Accept source |
| `ingest_job.preview_ready` | Classification summary |
| `ingest_job.confirmed` | User Confirm scope |
| `ingest_job.progress` | % |
| `ingest_job.completed` | Final counts |
| `ingest_job.file_skipped` / `file_duplicate` / `file_failed` | Per file |

Evaluation: fixture ZIP with known class counts + expected report. Gate: preview counts and final report match fixture within tolerance.

---

## Deliverables (governance)

| PR | Content |
|----|---------|
| **A** Discovery D10–D14 | ✅ Merged (#57) |
| **B** This Spec | Founder SIGN → status SPEC SIGNED |
| **C** Implementation | Engine + MVP adapters + Preview + Report + Quiet UI |
| **D** Validation | AC evidence PASS/FAIL |

---

## Definition of Done

- All AC_\* **PASS**  
- Founder criterion met: **Ingestion Engine**, not Bulk Upload  
- Close-the-loop: Assistant can Ask on new Knowledge in-session  
- D11–D14 respected · single-file OK · `pnpm run ci` PASS · Validation report  

---

## Differentiator

ATS: upload files into a grid.  
RecruiterSup: **ingest client knowledge** → Objects → Assistant works immediately.
