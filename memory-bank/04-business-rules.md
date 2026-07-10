# Recruiter Copilot

Version: 1.0

---

# Business Rules

This document defines the immutable business rules governing Recruiter Copilot.

Unlike workflows, which describe processes, Business Rules describe constraints.

A workflow explains how work progresses.

A business rule defines what is allowed.

No implementation may violate these rules.

If implementation conflicts with Business Rules, Business Rules always win.

---

# Rule Hierarchy

Business Rules override:

UI behavior

API implementation

Database implementation

AI recommendations

Automation

Integrations

Future features

---

# Candidate Rules

Candidate represents a real person.

Candidate identity is permanent.

Candidate history is permanent.

Candidate may own multiple resumes.

Candidate may apply to multiple jobs.

Candidate belongs to one Workspace.

Candidate can never belong to multiple Workspaces.

Candidate cannot be permanently deleted.

Archived candidates remain searchable.

Duplicate candidates must be merged.

Merge operations never lose history.

Merge operations must be auditable.

---

# Candidate Identity Rules

Candidate identity is determined using multiple signals.

Priority order

Government ID (future)

Email

Phone Number

LinkedIn URL

GitHub URL

Combination of:

Full Name

Current Company

Previous Companies

Experience

Education

Embedding Similarity

AI confidence

No single field guarantees identity.

Duplicate detection is probabilistic.

Recruiter always confirms merge decisions.

---

# Resume Rules

Resume is immutable.

Every uploaded resume creates a new Resume Version.

Resume parsing never modifies original files.

Parsed data is editable.

Original document is read-only.

Resume versions remain permanently available.

---

# Job Rules

Job belongs to exactly one Client.

Job owns one active Pipeline.

Closed Jobs become read-only.

Cancelled Jobs cannot receive new submissions.

Expired Jobs remain searchable.

Every Job has at least one assigned Recruiter.

---

# Client Rules

Clients own Jobs.

Clients never own Candidates.

Clients only see submitted Candidates.

Clients never see recruiter notes.

Clients never see internal AI reasoning.

Clients never see candidate history unrelated to their Jobs.

---

# Recruiter Rules

Recruiters own Activities.

Recruiters never own Candidates.

Candidates remain company assets.

Recruiters leaving the company never remove candidate ownership.

Recruiter actions are permanently recorded.

---

# Submission Rules

Submission links Candidate and Job.

A Candidate may have multiple Submissions.

Only one active Submission per Candidate per Job.

Duplicate Submission is prohibited.

Rejected Submission cannot be edited.

Withdrawn Submission remains visible.

Submission history is immutable.

---

# Interview Rules

Interview always belongs to one Submission.

Interview cannot exist without Submission.

Interview feedback creates Activity.

Interview feedback creates Timeline.

Interview feedback enriches Candidate Knowledge.

---

# Offer Rules

Offer belongs to one Submission.

Only Interview Passed candidates may receive Offers.

Offer versions are immutable.

Negotiation history is permanent.

Accepted Offer creates Placement.

Declined Offer records decline reason.

---

# Placement Rules

Placement is permanent.

Placement cannot be deleted.

Placement records business success.

Revenue references remain immutable.

Historical placement data never changes.

---

# Activity Rules

Every business action creates Activity.

Activities are append-only.

Activities are never edited.

Activities are never deleted.

Activities create Timeline entries.

Activities contribute to Knowledge Growth.

---

# Timeline Rules

Timeline is chronological.

Timeline cannot be reordered.

Timeline is append-only.

Timeline always references source entity.

Timeline never stores duplicated business data.

---

# AI Rules

AI recommendations are advisory only.

AI outputs are editable.

AI confidence must be displayed.

AI reasoning must be explainable.

AI actions require recruiter confirmation before affecting business data.

AI cannot bypass permissions.

AI cannot access data outside the user's workspace.

AI cannot expose confidential information.

AI recommendations are logged.

---

# Knowledge Rules

Knowledge continuously grows.

Knowledge is never overwritten.

Knowledge can be enriched.

Knowledge can be corrected.

Knowledge always keeps historical versions.

Knowledge belongs to the organization.

Knowledge survives employee turnover.

---

# Permission Rules

Every request validates authentication.

Every request validates authorization.

Backend validation is mandatory.

Frontend visibility never replaces backend authorization.

Every AI request validates permissions.

Every export validates permissions.

---

# Workspace Rules

Every business object belongs to one Workspace.

Cross-workspace access is prohibited.

Cross-workspace AI reasoning is prohibited.

Workspace isolation applies to:

Candidates

Jobs

Clients

Activities

Knowledge

Embeddings

Documents

---

# Audit Rules

Every important action creates Audit Log.

Audit Log is immutable.

Audit Log records:

Actor

Timestamp

Previous Value

New Value

Reason

Source

AI Participation

Audit Logs cannot be modified.

Audit Logs cannot be deleted.

---

# Notification Rules

Notifications never modify business data.

Notifications are informational.

Dismissed notifications remain historically available.

AI-generated notifications must indicate AI origin.

---

# Search Rules

Search never modifies data.

Search results respect permissions.

Semantic Search respects workspace isolation.

AI Search must explain ranking.

Recent activities influence ranking.

Recruiters may override AI ranking.

---

# Integration Rules

External integrations never bypass business rules.

Imported data is always validated.

Imported candidates follow duplicate detection.

Imported jobs follow Job validation.

Every integration is auditable.

---

# Data Retention Rules

Business history is permanent.

Audit history is permanent.

Resume versions are permanent.

Placement history is permanent.

Deleted users remain referenced historically.

Soft Delete is preferred.

Hard Delete requires explicit system policy.

---

# Common Mistakes

The following patterns are explicitly forbidden. Cursor must never implement them.

❌ Delete Candidate permanently

❌ Overwrite Resume

❌ AI auto send email

❌ AI auto merge candidates

❌ Client can see recruiter notes

❌ Recruiter owns candidate

❌ Timeline editable

❌ Activity editable or deletable

❌ Cross-workspace candidate access

❌ AI bypass permission checks

❌ Frontend-only authorization

❌ Overwrite knowledge without versioning

❌ Duplicate active Submission for same Candidate + Job

❌ Offer without passed Interview

❌ Hard delete Placement history

❌ Modify immutable Audit Log

❌ Cancelled Job receiving new Submissions

---

# Cursor Validation Checklist

Before marking any implementation task complete, verify:

- [ ] Rule conflicts reviewed
- [ ] Lifecycle consistency validated (`03-recruitment-lifecycle.md`)
- [ ] State transition validated
- [ ] Permission validated
- [ ] Audit requirement validated
- [ ] Timeline updated
- [ ] Activity created
- [ ] Workspace isolation respected
- [ ] AI confirmation required
- [ ] Knowledge Growth contribution defined
- [ ] Data retention considered
- [ ] Common Mistakes avoided
- [ ] API impact reviewed
- [ ] Database impact reviewed
- [ ] UI impact reviewed
