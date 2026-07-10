# Recruiter Copilot

Version: 1.0

---

# Recruitment Lifecycle

This document defines the complete recruitment lifecycle supported by Recruiter Copilot.

Every business object, workflow, state machine, API, AI capability, notification, activity log, and permission must follow this lifecycle.

This document is the foundation of the business domain.

No module may introduce states that contradict this lifecycle.

---

# Philosophy

Recruitment is not a collection of isolated actions.

Recruitment is a continuous business process.

Every action performed by recruiters contributes to the lifecycle of a Candidate, a Job, or a Client.

The platform must always understand:

- Current State
- Previous State
- Next Possible States
- Who performed the action
- When it happened
- Why it happened

Nothing should happen without history.

---

# Recruitment Overview

The lifecycle consists of six primary business stages.

1. Client Acquisition
2. Job Management
3. Candidate Acquisition
4. Recruitment Execution
5. Placement
6. Knowledge Retention

Every recruitment activity belongs to one of these stages.

---

# Stage 1 — Client Acquisition

Purpose

Create or maintain relationships with companies that have hiring demand.

Business Objects

Client

Company

Contact Person

Contract

Recruitment Agreement

Activities

Create client.

Update company information.

Create contact person.

Record communication.

Create recruitment agreement.

Assign account manager.

Store hiring history.

AI Assistance

Summarize client information.

Generate company profile.

Generate meeting summary.

Suggest existing candidates.

Predict hiring difficulty.

Output

A Client becomes active and can own Jobs.

---

# Stage 2 — Job Management

Purpose

Transform hiring requests into structured recruitment jobs.

Input

Job Description

Email

Document

Meeting Notes

Business Objects

Job

Job Version

Requirement

Skill

Location

Salary Range

Pipeline

Activities

Create Job.

Parse Job Description.

Extract Skills.

Estimate Seniority.

Estimate Salary.

Generate Boolean Search.

Assign Recruiter.

Open Pipeline.

AI Assistance

JD Parsing.

Skill Extraction.

Seniority Prediction.

Skill Normalization.

Salary Estimation.

Boolean Search Builder.

Candidate Recommendation.

Output

The Job becomes searchable.

Candidates can now be matched.

---

# Stage 3 — Candidate Acquisition

Purpose

Collect candidate knowledge.

Input Sources

Resume Upload

LinkedIn Import

Referral

Email

Job Board

Manual Entry

Internal Database

Future Integrations

Business Objects

Candidate

Resume

Attachment

Source

Tag

Embedding

Activities

Create Candidate.

Import Resume.

Import LinkedIn.

Detect Duplicate.

Extract Candidate Knowledge.

Generate Summary.

Generate Embedding.

Tag Candidate.

Store Resume.

AI Assistance

Resume Parsing.

Skill Extraction.

Experience Analysis.

English Estimation.

Salary Estimation.

Summary Generation.

Duplicate Detection.

Skill Normalization.

Output

Candidate Knowledge becomes searchable.

---

# Stage 4 — Recruitment Execution

Purpose

Match Candidates with Jobs.

Business Objects

Submission

Interview

Call Note

Activity

Reminder

Task

Email

Pipeline Stage

Activities

Search Candidate.

Semantic Search.

Boolean Search.

Contact Candidate.

Phone Screening.

Interview.

Client Submission.

Feedback.

Pipeline Update.

Reminder.

AI Assistance

Candidate Matching.

Candidate Ranking.

Interview Summary.

Call Summary.

Email Draft.

Follow-up Suggestion.

Risk Detection.

Missing Information Detection.

Similarity Search.

Output

The recruitment process progresses.

Knowledge grows continuously.

---

# Stage 5 — Placement

Purpose

Complete successful recruitment.

Business Objects

Offer

Placement

Contract

Invoice Reference

Activities

Offer.

Negotiation.

Acceptance.

Decline.

Placement.

Placement Confirmation.

Record Revenue.

Record Placement Date.

AI Assistance

Offer Summary.

Negotiation Summary.

Placement Analytics.

Placement Prediction.

Output

Recruitment completed successfully.

---

# Stage 6 — Knowledge Retention

Purpose

Retain organizational knowledge.

Business Objects

Activity

Timeline

Embedding

Knowledge Graph

Relationship Graph

History

Audit Log

Activities

Store every activity.

Generate embeddings.

Update relationships.

Update search index.

Update candidate profile.

Record business history.

AI Assistance

Knowledge Search.

Relationship Discovery.

Candidate Similarity.

Forgotten Candidate Detection.

Client History Summary.

Recruiter Insights.

Output

Company knowledge becomes smarter over time.

---

# Knowledge Growth Loop

This is the core competitive philosophy of Recruiter Copilot.

Every recruiter action does not merely complete a task — it enriches company recruitment knowledge.

The loop is continuous and compounds over time.

```
Candidate Imported
        │
        ▼
    AI Parse
        │
        ▼
 Recruiter Edit
        │
        ▼
 Client Feedback
        │
        ▼
 Interview Notes
        │
        ▼
      Offer
        │
        ▼
   Placement
        │
        ▼
Knowledge Enriched
        │
        └──────────────┐
                       ▼
Future AI Recommendations Become Better
```

## Principles

Every lifecycle stage must contribute to knowledge growth.

Recruiter edits improve AI accuracy.

Client feedback enriches candidate profiles.

Interview notes add behavioral knowledge.

Placement outcomes train matching models.

Rejected candidates retain learning value.

No knowledge is discarded — only archived.

## Competitive Advantage

After 3–5 years of usage, a company does not merely own thousands of CVs.

They own a **recruitment knowledge asset**:

- Interaction history
- Success and failure reasons
- Client feedback patterns
- Skill demand trends
- Recruiter expertise patterns

This asset cannot be easily replicated by competitors.

It is the foundation for increasingly accurate AI over time.

## Implementation Requirement

Every feature must answer:

Does this action enrich company knowledge?

If yes, which knowledge objects are updated?

If no, the feature must be justified as operational-only.

---

# Candidate Lifecycle

Every candidate progresses through states.

New

↓

Imported

↓

Parsed

↓

Enriched

↓

Qualified

↓

Contacted

↓

Screened

↓

Submitted

↓

Interviewing

↓

Offered

↓

Placed

OR

Rejected

OR

Archived

The system never deletes lifecycle history.

---

# Job Lifecycle

Draft

↓

Open

↓

Assigned

↓

Searching

↓

Interviewing

↓

Offering

↓

Filled

OR

Cancelled

OR

Expired

---

# Submission Lifecycle

Draft

↓

Submitted

↓

Client Reviewing

↓

Interview Requested

↓

Rejected

↓

Offer

↓

Placed

---

# Interview Lifecycle

Scheduled

↓

Confirmed

↓

Completed

↓

Feedback Pending

↓

Passed

OR

Failed

---

# Offer Lifecycle

Draft

↓

Sent

↓

Negotiation

↓

Accepted

OR

Declined

---

# Activity Philosophy

Every important business action creates an Activity.

Examples

Resume Imported

Candidate Updated

Candidate Contacted

Interview Scheduled

Interview Completed

Offer Sent

Placement Created

Email Sent

AI Recommendation Accepted

AI Recommendation Rejected

Activities are immutable.

---

# Business History

Every entity owns its own history.

Candidate History

Job History

Submission History

Interview History

Client History

Recruiter History

History is append-only.

Nothing is overwritten.

---

# AI Lifecycle Integration

AI must never operate independently.

Every AI execution belongs to a business workflow.

Example

Resume Uploaded

↓

Resume Parsing

↓

Candidate Created

↓

Embedding Generated

↓

Search Index Updated

↓

Timeline Created

↓

Audit Created

↓

Recruiter Reviews

↓

Recruiter Saves

Every AI workflow follows this pattern.

---

# State Transition Rules

State transitions are explicit.

No hidden transitions.

Every transition requires:

Trigger

Actor

Timestamp

Reason

Previous State

New State

Audit Entry

Optional AI Recommendation

---

# Cursor Rules

Before implementing any feature, Cursor must answer:

Which lifecycle stage owns this feature?

Which business object changes?

Which state changes?

What activity is recorded?

What history is created?

What audit record is required?

If these questions cannot be answered, implementation must stop until the lifecycle impact is clearly defined.

---

# Cursor Validation Checklist

Before marking any implementation task complete, verify:

- [ ] Lifecycle Stage identified
- [ ] Business Objects identified
- [ ] State Machine updated
- [ ] Activity created
- [ ] Timeline updated
- [ ] Audit Log created
- [ ] AI Workflow linked
- [ ] Permission validated
- [ ] API affected
- [ ] Database impact reviewed
- [ ] Knowledge Growth Loop contribution defined
