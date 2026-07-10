# Domain Events

Version: 1.0

---

# Overview

Domain Events are **internal system language**.

Published by Application Services (or Knowledge Engine for AI Events) after successful operations.

**Never exposed via public API.**

```
REST API (Public Language)
        ↓
Application Service
        ↓
Publish Domain Event (Internal Language)
        ↓
Event Bus
        ↓
Consumers
```

Template: `../_domain-event-spec-template.md`

---

# Event Categories

| Category | Purpose | Examples | Publisher |
|----------|---------|----------|-----------|
| **Business Events** | Domain facts | CandidateCreated, PlacementCreated, OfferAccepted | Application Services |
| **AI Events** | Knowledge Engine output | ResumeParsed, EmbeddingGenerated, RecommendationGenerated | Knowledge Engine |
| **Infrastructure Events** | System operations | DocumentStored, SearchIndexed, NotificationDelivered | Infrastructure handlers |
| **Integration Events** | External systems | LinkedInImported, TopCVImported, WebhookReceived | Integration adapters |

Categories support: Monitoring, Analytics, Retry, Dead Letter Queue.

---

# Event Catalog

| ID | File | Event Name | Category | Publisher | MVP | Status |
|----|------|------------|----------|-----------|-----|--------|
| EV-001 | `EV-001-resume-uploaded.md` | ResumeUploaded | Business | CandidateImportService | ✅ | ✅ Approved |
| EV-002 | `EV-002-resume-stored.md` | ResumeStored | Business | CandidateImportService | ✅ | ⬜ Pending |
| EV-003 | `EV-003-resume-parsing-requested.md` | ResumeParsingRequested | Business | CandidateImportService | ✅ | ⬜ Pending |
| EV-004 | `EV-004-resume-parsed.md` | ResumeParsed | AI | Knowledge Engine | ✅ | ⬜ Pending |
| EV-005 | `EV-005-candidate-created.md` | CandidateCreated | Business | CandidateImportService | ✅ | ⬜ Pending |
| EV-006 | `EV-006-candidate-imported.md` | CandidateImported | Business | CandidateImportService | ✅ | ⬜ Pending |
| EV-007 | `EV-007-duplicate-candidate-detected.md` | DuplicateCandidateDetected | Business | DuplicateDetectionService | ✅ | ⬜ Pending |
| EV-008 | `EV-008-candidate-merged.md` | CandidateMerged | Business | CandidateMergeService | ✅ | ⬜ Pending |
| EV-009 | `EV-009-candidate-enriched.md` | CandidateEnriched | Business | CandidateEnrichmentService | ✅ | ⬜ Pending |
| EV-010 | `EV-010-embedding-generated.md` | EmbeddingGenerated | AI | Knowledge Engine | ✅ | ⬜ Pending |
| EV-011 | `EV-011-knowledge-updated.md` | KnowledgeUpdated | Business | KnowledgeUpdateService | ✅ | ⬜ Pending |
| EV-012 | `EV-012-job-created.md` | JobCreated | Business | JobManagementService | ✅ | ⬜ Pending |
| EV-013 | `EV-013-job-parsed.md` | JobParsed | AI | Knowledge Engine | ✅ | ⬜ Pending |
| EV-014 | `EV-014-semantic-search-executed.md` | SemanticSearchExecuted | Business | SemanticSearchService | ✅ | ⬜ Pending |
| EV-015 | `EV-015-candidate-matched.md` | CandidateMatched | AI | Knowledge Engine | ✅ | ⬜ Pending |
| EV-016 | `EV-016-submission-created.md` | SubmissionCreated | Business | SubmissionService | ✅ | ⬜ Pending |
| EV-017 | `EV-017-interview-scheduled.md` | InterviewScheduled | Business | InterviewService | v1 | ⬜ Pending |
| EV-018 | `EV-018-interview-completed.md` | InterviewCompleted | Business | InterviewService | v1 | ⬜ Pending |
| EV-019 | `EV-019-offer-sent.md` | OfferSent | Business | OfferService | v1 | ⬜ Pending |
| EV-020 | `EV-020-offer-accepted.md` | OfferAccepted | Business | OfferService | v1 | ⬜ Pending |
| EV-021 | `EV-021-placement-created.md` | PlacementCreated | Business | PlacementService | v1 | ⬜ Pending |
| EV-022 | `EV-022-reminder-created.md` | ReminderCreated | Business | ReminderService | ✅ | ⬜ Pending |
| EV-023 | `EV-023-call-summarized.md` | CallSummarized | AI | Knowledge Engine | v1 | ⬜ Pending |
| EV-024 | `EV-024-recommendation-generated.md` | RecommendationGenerated | AI | Knowledge Engine | v1 | ⬜ Pending |
| EV-025 | `EV-025-timeline-entry-created.md` | TimelineEntryCreated | Infrastructure | TimelineService | ✅ | ⬜ Pending |
| EV-026 | `EV-026-resume-version-created.md` | ResumeVersionCreated | Business | CandidateImportService | ✅ | ⬜ Pending |

---

# WF-001 Event Chain (Reference)

```
POST /candidates/import-resume          Public API
        ↓
CandidateImportService
        ↓
ResumeUploaded              EV-001  Business
        ↓
ResumeStored                EV-002  Business
        ↓
ResumeParsingRequested      EV-003  Business
        ↓
ResumeParsingService → Knowledge Engine
        ↓
ResumeParsed                EV-004  AI
        ↓
CandidateCreated            EV-005  Business
        ↓
EmbeddingGenerated          EV-010  AI
        ↓
KnowledgeUpdated            EV-011  Business
        ↓
TimelineEntryCreated        EV-025  Infrastructure
```

---

# Event Handler Matrix

| Handler | Listens To |
|---------|------------|
| Knowledge Engine | ResumeParsingRequested, ResumeParsed, CandidateEnriched |
| Timeline | All Business Events |
| Notification | ResumeStored, DuplicateCandidateDetected, SubmissionCreated |
| Audit | All events |
| Search Index | EmbeddingGenerated, KnowledgeUpdated |
| ResumeParsingService | ResumeParsingRequested |

---

# Cursor Rules

1. Events are **internal** — never `POST /events/*` public API.
2. Every event has **Publisher** and **Category**.
3. Read only relevant `EV-xxx` file.
4. Cross-reference `12-application-services/` for publisher.

---

# Common Mistakes

❌ Public API exposing event names
❌ Missing Publisher or Category
❌ Client publishing domain events directly

---

# Cursor Validation Checklist

- [ ] Category assigned
- [ ] Publisher documented
- [ ] Not exposed via public API
- [ ] Consumers listed
