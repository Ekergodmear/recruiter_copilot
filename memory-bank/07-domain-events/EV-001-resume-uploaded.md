# EV-001 — ResumeUploaded

---

# Metadata

| Field | Value |
|-------|-------|
| Event ID | EV-001 |
| Event Name | ResumeUploaded |
| Version | 1.0 |
| Category | **Business Event** |
| Source Workflow | WF-001 |
| Publisher | `CandidateImportService` |
| Status | Approved |

---

# Event Categories

| Category | Examples | Visibility |
|----------|----------|------------|
| **Business Events** | ResumeUploaded, CandidateCreated, PlacementCreated | Internal only |
| **AI Events** | ResumeParsed, EmbeddingGenerated | Internal only |
| **Infrastructure Events** | DocumentStored, SearchIndexed | Internal only |
| **Integration Events** | LinkedInImported, WebhookReceived | Internal only |

EV-001 is a **Business Event**.

Never exposed via public API.

---

# Business Meaning

A Recruiter has submitted a Resume document for ingestion into the Workspace.

This event marks the **intent** to import candidate evidence.

No persistent Resume record exists yet — storage happens in EV-002.

This is the first event in the Candidate Acquisition chain.

---

# Payload Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| event_id | string | yes | Always `EV-001` |
| event_name | string | yes | Always `ResumeUploaded` |
| event_category | string | yes | `business` |
| workflow_id | string | yes | Always `WF-001` |
| publisher | string | yes | `CandidateImportService` |
| correlation_id | string | yes | Links entire upload-parse-create chain |
| workspace_id | string | yes | Workspace isolation |
| actor_id | string | yes | Recruiter who uploaded |
| filename | string | yes | Original filename |
| mime_type | string | yes | application/pdf, etc. |
| file_size_bytes | integer | yes | File size |
| source_type | enum | yes | manual_upload, email_import, bulk_import |
| candidate_id | string | no | If linking to existing Candidate |
| tags | string[] | no | Recruiter tags |
| notes | string | no | Recruiter notes |
| timestamp | datetime | yes | ISO-8601 UTC |

---

# Publisher

| Service | Method | Trigger |
|---------|--------|---------|
| `CandidateImportService` | `importResume()` | After validation, before storage |

**Not published by:** API controller, client, or external system directly.

Public API `POST /candidates/import-resume` → Service → EV-001.

---

# Consumers (Handlers)

| Consumer | Action |
|----------|--------|
| **CandidateImportService** (continued) | Proceeds to storage → EV-002 |
| **Audit** | Log `resume.upload.initiated`, source_workflow WF-001 |
| **Timeline** | No entry yet — awaits EV-002 |
| **Notification** | No — notification on EV-002 |
| **Knowledge Engine** | No — awaits parsed content |
| **Search Index** | No |

---

# Knowledge Growth Impact

Minimal at EV-001 — intent recorded only.

Knowledge enrichment begins at AEV-001 (ResumeParsed) via Knowledge Engine.

EV-001 contributes Source metadata and correlation_id for chain tracing.

---

# Idempotency Key

```
{workspace_id}:{actor_id}:{checksum_sha256}:{timestamp_bucket_1min}
```

Duplicate upload within 1 minute → reject with `DUPLICATE_UPLOAD`.

---

# Common Mistakes

❌ Exposing EV-001 via `POST /events/ResumeUploaded` public API

❌ Client publishing this event directly

❌ API controller publishing without Application Service

❌ Treating EV-001 as "Resume already stored"

❌ Missing publisher field — must be CandidateImportService

❌ Missing event_category

---

# Cursor Validation Checklist

- [ ] Category: Business Event
- [ ] Publisher: CandidateImportService
- [ ] Not exposed via public API
- [ ] All consumers documented
- [ ] Payload schema complete
- [ ] Linked to WF-001
- [ ] Common Mistakes reviewed
