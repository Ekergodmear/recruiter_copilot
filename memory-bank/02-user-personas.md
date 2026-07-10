# Recruiter Copilot

Version: 1.0

---

# User Personas

This document defines every user type interacting with the Recruiter Copilot platform.

Every feature, API, permission, workflow, UI decision, and AI interaction must be designed around these personas.

The system is NOT built for generic users.

Every action must belong to a clearly defined persona.

If a new feature does not belong to any persona, it should not be implemented.

---

# Design Philosophy

People do not use software because they like software.

People use software to complete work.

Therefore, the product must be designed around work responsibilities instead of user demographics.

Each persona represents a real recruitment role with different responsibilities, permissions, goals, and daily workflows.

---

# Primary Personas

The system currently supports five primary personas.

1. Recruiter

2. Recruitment Team Leader

3. Recruitment Manager

4. Client

5. System Administrator

Future personas may be introduced, but they must not affect existing workflows.

---

# Persona 1 — Recruiter

The Recruiter is the primary user of the entire system.

Every module should optimize the Recruiter's daily workflow.

If there is a conflict between Recruiter usability and another persona, Recruiter experience takes priority.

---

## Responsibilities

Receive Job Orders.

Search candidates.

Import resumes.

Manage candidate pipelines.

Contact candidates.

Conduct screening.

Schedule interviews.

Prepare candidate submissions.

Update recruitment activities.

Communicate with clients.

Maintain candidate relationships.

---

## Daily Activities

Review dashboard.

Check reminders.

Receive new jobs.

Search existing candidate database.

Import new candidates.

Screen resumes.

Contact candidates.

Write summaries.

Submit candidates.

Follow up.

Update pipeline.

Prepare reports.

Repeat.

---

## Pain Points

Reading hundreds of resumes.

Searching through Excel spreadsheets.

Copying candidate information.

Formatting resumes repeatedly.

Forgetting candidate history.

Searching LinkedIn manually.

Losing recruitment knowledge.

Writing repetitive emails.

Writing repetitive summaries.

Updating CRM manually.

Managing duplicate candidates.

---

## Product Goals

Reduce repetitive work.

Centralize recruitment knowledge.

Accelerate candidate search.

Reduce manual data entry.

Improve submission quality.

Improve recruiter productivity.

---

## AI Assistance

AI should automatically assist recruiters by:

Parsing resumes.

Extracting structured information.

Generating candidate summaries.

Matching candidates to jobs.

Finding similar candidates.

Generating Boolean Search.

Suggesting interview questions.

Writing follow-up emails.

Summarizing interviews.

Summarizing phone calls.

Suggesting recruiter next actions.

Detecting duplicate candidates.

Recommending inactive candidates.

Finding forgotten candidates.

Identifying missing candidate information.

---

## AI Must Never

Automatically reject candidates.

Automatically submit candidates.

Automatically contact candidates.

Automatically modify candidate data.

Automatically delete information.

Recruiters always make final decisions.

---

## Success Metrics

Recruiter spends less time reading resumes.

Recruiter spends more time communicating with candidates.

Candidate search takes seconds instead of hours.

Recruiter never loses historical recruitment knowledge.

---

# Persona 2 — Recruitment Team Leader

The Team Leader supervises recruiters.

The Team Leader focuses on operational visibility rather than operational execution.

---

## Responsibilities

Monitor recruiter performance.

Review candidate pipelines.

Approve submissions.

Allocate jobs.

Review recruitment quality.

Coach recruiters.

Track KPIs.

Identify bottlenecks.

---

## AI Assistance

Daily team summary.

Recruiter workload analysis.

Pipeline health analysis.

Recruiter productivity insights.

Candidate bottleneck detection.

Risk prediction.

Suggested workload balancing.

---

## Success Metrics

Balanced recruiter workload.

Higher placement rate.

Faster recruitment cycle.

Higher recruiter productivity.

---

# Persona 3 — Recruitment Manager

The Manager focuses on business performance.

---

## Responsibilities

Company-wide recruitment performance.

Client relationship.

Revenue.

Placement.

Recruitment strategy.

Hiring trends.

Business growth.

---

## AI Assistance

Executive dashboards.

Forecast reports.

Revenue prediction.

Placement analytics.

Recruitment trends.

Skill demand trends.

Market insights.

Recruitment efficiency.

---

## Success Metrics

Business growth.

Placement growth.

Client retention.

Recruiter retention.

Revenue growth.

---

# Persona 4 — Client

Clients are external users.

Clients have extremely limited permissions.

Clients should never access internal recruitment knowledge.

---

## Responsibilities

View submitted candidates.

Review candidate profiles.

Schedule interviews.

Provide interview feedback.

Approve offers.

Reject candidates.

Request replacements.

Communicate with recruiters.

---

## Permissions

Read only.

Own jobs only.

Own candidates only.

No candidate search.

No internal notes.

No recruiter comments.

No AI prompts.

No recruitment history.

---

## AI Assistance

Candidate summary.

Candidate comparison.

Interview summary.

Submission explanation.

Document generation.

---

# Persona 5 — System Administrator

Administrators manage infrastructure.

Administrators are not recruiters.

Business workflows should never depend on administrators.

---

## Responsibilities

Manage users.

Manage permissions.

Manage workspaces.

Manage integrations.

Manage AI providers.

Manage system configuration.

Monitor logs.

Monitor health.

Manage backups.

Manage deployments.

---

## AI Assistance

System monitoring.

Security alerts.

Performance analysis.

Error explanation.

Log summarization.

Deployment analysis.

---

# Future Personas

Hiring Manager

Candidate

Finance

HRBP

University

External Partner

These personas are intentionally excluded from Version 1.

---

# Permission Philosophy

Permissions are Role Based.

Permissions are additive.

No business logic should depend on UI visibility.

Backend authorization is mandatory.

Every API validates permissions.

Every AI request validates permissions.

---

# AI Personalization

AI behavior should adapt based on persona.

Recruiters receive operational suggestions.

Managers receive analytical insights.

Clients receive simplified summaries.

Administrators receive technical diagnostics.

AI must never expose information outside user permissions.

---

# User Experience Principles

Recruiters prioritize speed.

Managers prioritize visibility.

Clients prioritize simplicity.

Administrators prioritize stability.

The interface should adapt to the user's responsibilities rather than exposing every feature equally.

---

# Persona Success Definition

Recruiter

Complete recruitment faster.

Leader

Manage recruiters more effectively.

Manager

Grow recruitment business.

Client

Hire better candidates.

Administrator

Operate the platform reliably.

If a feature does not improve at least one persona's success, it should be reconsidered.

---

# Cursor Rules

Before implementing any feature, Cursor must identify:

Who uses this feature?

Why do they need it?

What problem does it solve?

What permissions are required?

How does AI improve this workflow?

If any question cannot be answered, implementation should pause until requirements are clarified.
