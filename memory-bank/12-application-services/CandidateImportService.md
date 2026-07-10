# CandidateImportService

---

# Metadata

| Field | Value |
|-------|-------|
| Service Name | CandidateImportService |
| Version | 1.0 |
| Workflows | WF-001, WF-002 |
| Domain | Candidate |
| Status | Approved |
| MVP | Yes |

---

# Purpose

Orchestrate resume import into the Workspace.

This service is the entry point for Candidate Acquisition via file upload.

It validates the public API request, enforces domain rules, stores the Resume, and publishes internal domain events.

It does **not** parse resumes or create Candidates directly — those are downstream via event consumers.

---

# Public API

## Import Resume

```http
POST /api/v1/candidates/import-resume
Content-Type: multipart/form-data
Authorization: Bearer {token}
X-Workspace-Id: {workspace_id}
```

**Public Language:** "Import Resume"

**Request fields:**

| Field | Type | Required |
|-------|------|----------|
| file | binary | yes |
| filename | string | yes |
| source_type | enum | yes — manual_upload, email_import, bulk_import |
| candidate_id | string | no — link to existing Candidate |
| tags | string[] | no |
| notes | string | no |

**Response 202 Accepted:**

```json
{
  "request_id": "req_xxx",
  "resume_id": "resume_xxx",
  "status": "processing",
  "message": "Resume imported successfully. Parsing in progress."
}
```

**Response 400/403/413:** Standard error envelope — no internal event names exposed.

## Get Import Status

```http
GET /api/v1/candidates/import-resume/{resume_id}/status
```

```json
{
  "resume_id": "resume_xxx",
  "status": "processing | parsed | failed",
  "candidate_id": "candidate_xxx | null"
}
```

---

# Application Service Methods

```typescript
// Internal — not exposed to API clients
CandidateImportService.importResume(command: ImportResumeCommand): Promise<ImportResumeResult>
CandidateImportService.getImportStatus(resumeId: string): Promise<ImportStatus>
```

### ImportResumeCommand

| Field | Source |
|-------|--------|
| file | API upload |
| filename | API |
| mime_type | detected |
| file_size_bytes | detected |
| source_type | API |
| candidate_id | API (optional) |
| tags | API |
| notes | API |
| workspace_id | auth context |
| actor_id | auth context |
| correlation_id | generated internally |

---

# Orchestration Flow

```
1. Authenticate & authorize (Recruiter, resume:upload)
2. Validate file (size, format, workspace quota)
3. Generate correlation_id (internal)
4. Publish ResumeUploaded (EV-001)
5. Store file to blob storage (immutable)
6. Create Resume record + Resume Version
7. Create Source metadata
8. Publish ResumeStored (EV-002)
9. Publish ResumeParsingRequested (EV-003)
10. Return public response (resume_id, status: processing)
```

Steps 4–9 execute within transaction boundary where applicable.
Step 9 triggers async ResumeParsingService via Event Bus.

---

# Events Published

| Event ID | Event Name | Category | When |
|----------|------------|----------|------|
| EV-001 | ResumeUploaded | Business | Step 4 — intent recorded |
| EV-002 | ResumeStored | Business | Step 8 — file persisted |
| EV-003 | ResumeParsingRequested | Business | Step 9 — handoff to parsing |

**Publisher:** `CandidateImportService`

Events published to internal Event Bus only. Never returned in API response body.

---

# Events Consumed

| Event ID | Handler Action |
|----------|----------------|
| None | CandidateImportService is a publisher, not a consumer |

Downstream consumers of EV-001/002/003:

| Consumer | Action |
|----------|--------|
| ResumeStorage | Validates storage (internal) |
| Timeline | Entry on EV-002 |
| Audit | All events |
| Notification | EV-002 success → recruiter |
| ResumeParsingService | EV-003 → starts WF-004 |
| Knowledge Engine | Awaits EV-004+ |

---

# Domain Rules Enforced

From `04-business-rules.md`:

- Resume immutable after store
- Every upload creates new Resume Version
- Workspace isolation
- Recruiter permission required
- Client persona blocked
- Source metadata permanent
- Candidate not created in this service — deferred

---

# Dependencies

| Dependency | Purpose |
|------------|---------|
| Blob Storage | Immutable file store |
| Event Bus | Publish EV-001, EV-002, EV-003 |
| Permission Service | Authorization check |
| WF-001 | Workflow specification |

---

# Error Handling

| Public Error | Internal Cause | Events Published |
|--------------|----------------|------------------|
| `FILE_TOO_LARGE` | Validation | None |
| `UNSUPPORTED_FORMAT` | Validation | None |
| `STORAGE_QUOTA_EXCEEDED` | Quota check | None |
| `PERMISSION_DENIED` | AuthZ | None |
| `STORAGE_FAILURE` | Blob error | None — audit only |
| `INVALID_CANDIDATE_ID` | Validation | None |

Public errors never expose event IDs, correlation internals, or stack traces.

---

# Common Mistakes

❌ Exposing `POST /events/ResumeUploaded` to clients

❌ Returning `events: [{ event_id: EV-001 }]` in API response

❌ Parsing resume inside importResume() — belongs to ResumeParsingService

❌ Creating Candidate in this service — belongs to downstream handler

❌ API controller publishing events directly — must go through service

❌ Skipping Application Service layer

---

# Cursor Validation Checklist

- [ ] Public API: `POST /candidates/import-resume`
- [ ] Service publishes EV-001, EV-002, EV-003 internally
- [ ] Publisher documented as CandidateImportService
- [ ] No event names in public API response
- [ ] WF-001 workflow followed
- [ ] Domain rules enforced
- [ ] Common Mistakes reviewed
