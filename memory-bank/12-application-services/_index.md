# Application Services

Version: 1.0

---

# Overview

Application Services are the **orchestration layer** between public API and internal Domain Events.

```
REST API (Public Language)
        ↓
Application Service
        ↓
Domain Logic
        ↓
Publish Domain Events (Internal Language)
        ↓
Event Bus
        ↓
Consumers (Handlers)
```

**Events are internal system language. API is external communication.**

Clients never call `POST /events/ResumeUploaded`.

---

# Two Languages

## Public Language (API / UI)

What recruiters and clients understand:

| Action | API |
|--------|-----|
| Import Resume | `POST /candidates/import-resume` |
| Create Job | `POST /jobs` |
| Submit Candidate | `POST /submissions` |
| Schedule Interview | `POST /interviews` |
| Send Offer | `POST /offers` |

## Internal Language (Domain Events)

What the system publishes internally:

```
ResumeUploaded
ResumeStored
ResumeParsingRequested
CandidateCreated
KnowledgeUpdated
```

Clients never see event names.

---

# Service Catalog

| Service | Workflow | Domain | MVP | Status |
|---------|----------|--------|-----|--------|
| `CandidateImportService` | WF-001, WF-002 | Candidate | ✅ | ✅ Approved |
| `ResumeParsingService` | WF-004 | Candidate | ✅ | ⬜ Pending |
| `DuplicateDetectionService` | WF-003 | Candidate | ✅ | ⬜ Pending |
| `CandidateEnrichmentService` | WF-005 | Candidate | ✅ | ⬜ Pending |
| `JobManagementService` | WF-006 | Job | ✅ | ⬜ Pending |
| `JobParsingService` | WF-007 | Job | ✅ | ⬜ Pending |
| `SemanticSearchService` | WF-008 | Search | ✅ | ⬜ Pending |
| `CandidateMatchingService` | WF-009 | Matching | ✅ | ⬜ Pending |
| `SubmissionService` | WF-010 | Submission | ✅ | ⬜ Pending |
| `InterviewService` | WF-011 | Interview | v1 | ⬜ Pending |
| `OfferService` | WF-012 | Offer | v1 | ⬜ Pending |
| `PlacementService` | WF-013 | Placement | v1 | ⬜ Pending |
| `ReminderService` | WF-014 | Task | ✅ | ⬜ Pending |
| `TimelineService` | WF-017 | Activity | ✅ | ⬜ Pending |
| `KnowledgeUpdateService` | WF-018 | Knowledge | ✅ | ⬜ Pending |
| `CandidateMergeService` | WF-019 | Candidate | ✅ | ⬜ Pending |

Template: `../_application-service-spec-template.md`

---

# Layer Responsibilities

| Layer | Responsibility | Knows About Events? |
|-------|----------------|---------------------|
| **API** | HTTP, auth, validation, public DTOs | No |
| **Application Service** | Orchestrate workflow, publish events | Yes — publishes |
| **Domain** | Business rules, invariants | Yes — emits |
| **Event Bus** | Deliver events to handlers | Yes |
| **Consumers** | Timeline, Audit, Notification, Search, Knowledge Engine | Yes — subscribes |

---

# Execution Flow (Reference)

```
WF-001 Resume Upload
        ↓
CandidateImportService.importResume()
        ↓
ResumeUploaded          EV-001
        ↓
ResumeStored            EV-002
        ↓
ResumeParsingRequested  EV-003
        ↓
[ResumeParsingService handles EV-003]
        ↓
CandidateCreated        EV-005
        ↓
KnowledgeUpdated        EV-011
```

---

# Cursor Rules

1. API endpoints use **Public Language** — business-meaningful paths.
2. Application Service publishes events — API does not publish directly.
3. Never expose event names or event store to clients.
4. Every service maps to one or more `WF-xxx` workflows.
5. Read only the service file relevant to your task.

---

# Common Mistakes

❌ `POST /events/ResumeUploaded` as public API

❌ Client publishing domain events directly

❌ API layer containing business orchestration logic

❌ Skipping Application Service — API writes to database directly

❌ Exposing `correlation_id` event chain details in public API response (use opaque `request_id`)

❌ Application Service bypassing domain rules from `04-business-rules.md`

---

# Cursor Validation Checklist

- [ ] Public API uses business language
- [ ] Service publishes events internally only
- [ ] Linked to WF-xxx workflow(s)
- [ ] Domain rules enforced in service layer
- [ ] Event consumers documented per published event
- [ ] Common Mistakes reviewed
