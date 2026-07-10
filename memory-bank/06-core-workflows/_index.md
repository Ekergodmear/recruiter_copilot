# Core Workflows

Version: 1.0

---

# ⏸ Workflow Expansion Paused

New workflows are **frozen** until Knowledge Model (`24-knowledge-model/`) and Knowledge Engine (`23-knowledge-engine/`) are aligned.

Only maintain existing approved specs (WF-001). Do not add WF-002+ until unpause.

---

# Overview

Core Workflows are **Executable Specifications** — one file per workflow.

Each workflow has a fixed ID (`WF-xxx`) referenced by API, Database, AI, Audit, and Notifications.

**Do not read all workflows.** Read only the workflow relevant to your task.

Template: `../_workflow-spec-template.md`

---

# Workflow Catalog

| ID | File | Name | Domain | MVP | Status |
|----|------|------|--------|-----|--------|
| WF-001 | `WF-001-resume-upload.md` | Resume Upload | Candidate | ✅ | ✅ Approved |
| WF-002 | `WF-002-candidate-import.md` | Candidate Import | Candidate | ✅ | ⬜ Pending |
| WF-003 | `WF-003-duplicate-detection.md` | Duplicate Detection | Candidate | ✅ | ⬜ Pending |
| WF-004 | `WF-004-resume-parsing.md` | Resume Parsing | Candidate | ✅ | ⬜ Pending |
| WF-005 | `WF-005-candidate-enrichment.md` | Candidate Enrichment | Candidate | ✅ | ⬜ Pending |
| WF-006 | `WF-006-job-creation.md` | Job Creation | Job | ✅ | ⬜ Pending |
| WF-007 | `WF-007-job-parsing.md` | Job Parsing | Job | ✅ | ⬜ Pending |
| WF-008 | `WF-008-semantic-search.md` | Semantic Search | Search | ✅ | ⬜ Pending |
| WF-009 | `WF-009-candidate-matching.md` | Candidate Matching | Matching | ✅ | ⬜ Pending |
| WF-010 | `WF-010-candidate-submission.md` | Candidate Submission | Submission | ✅ | ⬜ Pending |
| WF-011 | `WF-011-interview.md` | Interview | Interview | v1 | ⬜ Pending |
| WF-012 | `WF-012-offer.md` | Offer | Placement | v1 | ⬜ Pending |
| WF-013 | `WF-013-placement.md` | Placement | Placement | v1 | ⬜ Pending |
| WF-014 | `WF-014-reminder.md` | Reminder | Task | ✅ | ⬜ Pending |
| WF-015 | `WF-015-call-summary.md` | Call Summary | Communication | v1 | ⬜ Pending |
| WF-016 | `WF-016-ai-recommendation.md` | AI Recommendation | AI | v1 | ⬜ Pending |
| WF-017 | `WF-017-timeline.md` | Timeline | Activity | ✅ | ⬜ Pending |
| WF-018 | `WF-018-knowledge-update.md` | Knowledge Update | Knowledge | ✅ | ⬜ Pending |
| WF-019 | `WF-019-candidate-merge.md` | Candidate Merge | Candidate | ✅ | ⬜ Pending |
| WF-020 | `WF-020-resume-versioning.md` | Resume Versioning | Candidate | ✅ | ⬜ Pending |

---

# Workflow Dependencies

```
WF-001 Resume Upload
    ↓
WF-004 Resume Parsing
    ↓
WF-002 Candidate Import (if new)
    ↓
WF-003 Duplicate Detection
    ↓
WF-005 Candidate Enrichment
    ↓
WF-018 Knowledge Update

WF-006 Job Creation
    ↓
WF-007 Job Parsing
    ↓
WF-009 Candidate Matching
    ↓
WF-010 Candidate Submission
```

---

# Cross-References

| System | References |
|--------|------------|
| Application Services | `../12-application-services/_index.md` |
| Domain Events | `../07-domain-events/_index.md` |
| Business Rules | `../04-business-rules.md` |
| Ubiquitous Language | `../05-ubiquitous-language.md` |
| Lifecycle | `../03-recruitment-lifecycle.md` |

---

# Cursor Rules

1. Read **only** the `WF-xxx` file for the task at hand.
2. Read linked `EV-xxx` events and `Application Service` spec.
3. **Public API** uses business language — `POST /candidates/import-resume`, not `POST /events/*`.
4. Application Service publishes internal events after success.
5. Every Audit Log must include `source_workflow: WF-xxx`.
6. Every Notification must include `generated_by: WF-xxx`.
