# Recruiter Copilot

Version: 1.0

---

# Ubiquitous Language

This document defines the official business vocabulary of Recruiter Copilot.

Every engineer, AI model, API, database schema, UI, documentation, workflow, and business discussion must use these terms consistently.

No synonym should be introduced unless explicitly defined here.

Consistency is more important than personal preference.

---

# Philosophy

A shared language reduces ambiguity.

If two developers use different words for the same business concept, the software will eventually behave inconsistently.

Recruiter Copilot therefore maintains one official business language.

---

# Candidate

Definition

A Candidate is a person known by the organization.

Candidate exists independently of resumes, jobs, submissions, or recruiters.

Candidate is the central business object.

Candidate survives every recruitment process.

Candidate belongs to the company knowledge base.

Candidate is never owned by individual recruiters.

Candidate can have:

Multiple resumes

Multiple submissions

Multiple interviews

Multiple activities

Multiple placements

Candidate history is permanent.

---

# Resume

Definition

A Resume is a document representing a candidate at a specific point in time.

Resume is not Candidate.

Resume is evidence.

Resume is immutable.

Resume always belongs to exactly one Candidate.

A Candidate may own multiple Resume versions.

Examples

PDF

DOCX

Scanned Image

Generated Resume

LinkedIn Export

---

# Candidate Profile

Definition

Candidate Profile is structured business knowledge generated from one or more resumes plus recruiter interactions.

Candidate Profile evolves over time.

Candidate Profile is editable.

Candidate Profile is the source of truth for recruiters.

Resume is only one input.

---

# Job

Definition

A Job represents one hiring request from one Client.

Job exists independently from Candidates.

Job owns recruitment pipeline.

Job defines business demand.

---

# Client

Definition

A Client is an organization requesting recruitment services.

Client owns Jobs.

Client never owns Candidates.

Client visibility is limited.

---

# Recruiter

Definition

Recruiter is a platform user responsible for executing recruitment activities.

Recruiter owns Activities.

Recruiter never owns Candidates.

Recruiter contributes knowledge.

---

# Submission

Definition

Submission represents presenting one Candidate to one Job.

Submission links:

Candidate

Job

Recruiter

Client

Submission is not employment.

Submission is not placement.

Submission is one recruitment attempt.

---

# Interview

Definition

Interview is an evaluation event belonging to one Submission.

Interview creates business knowledge.

Interview always generates feedback.

---

# Offer

Definition

Offer represents employment proposal.

Offer belongs to one Submission.

Offer records negotiation history.

---

# Placement

Definition

Placement represents successful recruitment.

Placement is the business outcome.

Placement generates revenue.

Placement is permanent.

---

# Activity

Definition

Activity records business actions.

Activity is append-only.

Activities represent operational history.

Examples

Resume Imported

Interview Scheduled

Candidate Updated

Call Completed

Offer Sent

---

# Timeline

Definition

Timeline is chronological presentation of Activities.

Timeline is visualization.

Activity is data.

Timeline is view.

Timeline never owns business data.

---

# Audit Log

Definition

Audit Log records system changes.

Activity records business events.

Audit Log records technical accountability.

Audit Log is immutable.

Audit Log supports compliance.

---

# Workspace

Definition

Workspace represents isolated business environment.

Workspace owns:

Candidates

Jobs

Clients

Activities

Knowledge

Embeddings

Users

No data crosses Workspace boundaries.

---

# Knowledge

Definition

Knowledge is structured organizational recruitment intelligence.

Knowledge is not documents.

Knowledge grows continuously.

Knowledge survives employee turnover.

Knowledge combines:

Resume

Recruiter edits

Interview feedback

Call notes

Client feedback

Placements

AI enrichments

---

# Embedding

Definition

Embedding is vector representation of business knowledge.

Embedding is not business data.

Embedding supports semantic search.

Embedding can be regenerated.

Embedding never replaces structured data.

---

# Vector Search

Definition

Semantic search using embeddings.

Vector Search complements relational search.

Vector Search never replaces filters.

---

# Match Score

Definition

AI-generated relevance estimation between Candidate and Job.

Match Score is advisory.

Match Score is explainable.

Recruiters make final decisions.

---

# Duplicate Candidate

Definition

Multiple candidate records representing the same real person.

Duplicate detection is probabilistic.

Merge requires recruiter confirmation.

History is preserved.

---

# Source

Definition

Source records where candidate knowledge originated.

Examples

LinkedIn

Referral

TopCV

Email

Manual

Import

Company Database

Source is permanent metadata.

---

# Tag

Definition

Tag is recruiter-defined classification.

Tags are organizational.

Tags are editable.

Tags are not AI truth.

---

# Skill

Definition

A Skill represents a normalized professional capability.

Examples

React

Node.js

Spring Boot

Docker

Leadership

English

The system maintains normalized skills.

Raw resume text is never used directly for filtering.

---

# Pipeline

Definition

Pipeline represents ordered recruitment stages for one Job.

Pipeline belongs to Job.

Candidate progresses through Pipeline via Submission.

---

# Reminder

Definition

Reminder is future work notification.

Reminder never modifies business data.

Reminder belongs to Recruiter.

---

# Task

Definition

Task represents actionable work.

Task has status.

Task has assignee.

Task may generate reminders.

---

# Notification

Definition

Notification informs users.

Notifications never execute business logic.

Notifications may originate from AI.

---

# AI Recommendation

Definition

AI Recommendation is advisory output.

Recommendation always includes:

Confidence

Reasoning

Source

Timestamp

Recommendations are editable.

Recommendations never execute automatically.

---

# Business Object

Definition

Persistent entity representing organizational knowledge.

Examples

Candidate

Job

Submission

Client

Interview

Placement

Business Objects own history.

---

# Domain Event

Definition

Significant business occurrence.

Examples

Candidate Imported

Interview Completed

Placement Created

Offer Accepted

Domain Events create Activities.

Domain Events update Knowledge.

---

# Common Mistakes

❌ Candidate = Resume

❌ Resume = Candidate Profile

❌ Timeline = Activity

❌ Activity = Audit Log

❌ Submission = Application

❌ Placement = Offer

❌ Match Score = Decision

❌ Embedding = Database

❌ AI Recommendation = Business Action

❌ Workspace = Company Branch

❌ Tag = Skill

❌ Source = Client

❌ Profile = Resume

❌ Recruiter owns Candidate

❌ Client owns Candidate

❌ Timeline stores business data

---

# Cursor Validation Checklist

Before marking any implementation task complete, verify:

- [ ] New terminology reviewed
- [ ] Existing definitions reused
- [ ] No synonym introduced
- [ ] Database naming aligned
- [ ] API naming aligned
- [ ] UI naming aligned
- [ ] AI prompt terminology aligned
- [ ] Documentation terminology aligned
- [ ] Domain Events identified
- [ ] Business Objects identified
- [ ] Common Mistakes reviewed
