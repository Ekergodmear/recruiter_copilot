# EPIC-006 — AI Recruiter Copilot

| Field             | Value                                                      |
| ----------------- | ---------------------------------------------------------- |
| Status            | **SPEC** (PR-1 docs-only)                                  |
| Baseline          | `main @ 78faa38` + EPIC-001…005 COMPLETED                  |
| Type              | Product EPIC (user value)                                  |
| Foundation Freeze | Intact                                                     |
| TECH required     | None                                                       |

---

## Background

The platform already owns five foundation capabilities:

| EPIC     | Capability                | Role                                      |
| -------- | ------------------------- | ----------------------------------------- |
| EPIC-001 | Candidate Intelligence    | Candidate profile / workspace             |
| EPIC-002 | Job Intelligence          | Job requirements                          |
| EPIC-003 | Relationship Intelligence | Candidate ↔ Job link                      |
| EPIC-004 | Workflow Intelligence     | Hiring stage + history                    |
| EPIC-005 | Matching Intelligence     | Deterministic evidence → score            |

Recruiters can manage hiring data and see explainable match evidence. They still lack an **assistant layer** that turns those capabilities into recruiter-facing language: explanations, summaries, and draft outreach — without inventing new business rules.

This EPIC introduces **AI Recruiter Copilot** as an **interpretation and productivity** layer on top of existing capabilities. It does **not** rewrite EPIC-001…005.

---

## Problem Statement

Recruiters have structured intelligence (Candidate, Job, Relationship, Workflow, Matching).

However, they still spend time manually:

- Explaining a Match Score to a hiring manager
- Summarizing a CV or JD for a quick brief
- Drafting first-touch outreach emails
- Inventing interview questions from missing skills

Without a Copilot that **reads** existing capabilities, teams either skip explanation or invent narratives that diverge from Matching Evidence.

---

## Goal

Introduce **AI Recruiter Copilot** focused on:

1. **Explainability** — narrate Matching Evidence and related context in recruiter language  
2. **Productivity** — draft summaries and outreach grounded in platform data  

AI **never** becomes the owner of hiring rules or decisions.

---

## Governing principle (locked)

> **AI consumes capabilities; AI does not own business rules.**

| Layer                         | Owns                                              |
| ----------------------------- | ------------------------------------------------- |
| EPIC-001…005 (capabilities)   | Business rules, Matching score, Workflow stages   |
| EPIC-006 (Copilot)            | Natural-language interpretation & draft content   |

Consequences:

- Business rules stay in EPIC-001…005 code — **not** in prompts as a second rule engine.
- Copilot **reads** Candidate, Job, Relationship, Workflow, Matching Result.
- Copilot **must not** recalculate Match Score, invent missing evidence, or mutate Workflow/Relationship.
- When Matching Evidence and narrative conflict, **Matching Evidence wins** (recruiter trusts the deterministic layer).

---

## Business Language (Ubiquitous Language)

| Term                     | Role in this EPIC                                              |
| ------------------------ | -------------------------------------------------------------- |
| **Copilot**              | AI assistant that interprets existing capabilities             |
| **Explanation**          | Natural-language narration of Matching Evidence / context      |
| **Summary**              | Short recruiter-facing brief of Candidate or Job               |
| **Outreach Draft**       | Suggested first-touch message grounded in platform data        |
| **Interview Prompts**    | Suggested questions grounded in Missing Skills / gaps          |
| Matching Result          | Owned by EPIC-005 — Copilot consumes, does not redefine        |

Avoid framing Copilot as “AI Matching” or “AI Pipeline”.

---

## User Story

> As a recruiter,  
> I want the Copilot to explain match evidence and draft useful text from platform data,  
> so I can brief stakeholders and act faster without losing trust in business rules.

---

## MVP Scope

All Copilot actions are **on-demand** (recruiter-triggered). Outputs are **suggestions** — recruiter may copy/edit; Copilot does not auto-apply.

### 1. Explain Match

Input: Candidate + Job (via on-demand Matching Result from EPIC-005).

Output: Natural-language explanation of why the Overall Match Score is what it is, grounded in:

- Matched Skills  
- Missing Skills  
- Experience / English / Salary evidence  

Must not invent a different score or omit that score comes from Matching Intelligence.

### 2. Summarize Candidate

Input: Candidate Intelligence (profile / knowledge).

Output: Short CV/profile summary for recruiter briefing.

### 3. Summarize Job

Input: Job Intelligence.

Output: Short JD/role summary for recruiter briefing.

### 4. Draft Outreach Email

Input: Candidate + Job (+ optional Relationship / stage context if present).

Output: Suggested first-touch email draft. Recruiter reviews before send. **No email sending** in this EPIC.

### 5. Suggest Interview Questions

Input: Matching Evidence (especially Missing Skills) + Job requirements.

Output: Suggested interview questions tied to documented gaps. Not a full interview kit product.

### 6. LLM as plugin

Use existing provider / plugin pattern (`ProviderRegistry` / summary & reasoning providers).  
No architecture redesign. No new TECH ticket for MVP.

---

## Business Rules

1. Copilot **consumes** capabilities; it does **not** own business rules.
2. Copilot **never** recalculates or overrides Overall Match Score.
3. Copilot **never** changes Candidate, Job, Relationship, or Workflow as a side effect of generation.
4. Copilot outputs are **non-authoritative suggestions** — recruiter remains decision maker.
5. Explanations must cite / reflect Matching Evidence when explaining scores.
6. **Copilot Transparency:** responses separate platform facts from LLM-generated suggestions (structured sections and/or explicit labels).
7. When required inputs are missing, Copilot fails clearly or states gaps — it does not fabricate facts.
8. Feature flag / provider availability may gate live LLM calls; deterministic fixtures used for CI where needed.

---

## Acceptance Criteria

| ID        | Criterion                                                                 |
| --------- | ------------------------------------------------------------------------- |
| **AC-1**  | Explain Match returns an explanation grounded in Matching Evidence.       |
| **AC-2**  | Explain Match does not change Overall Match Score vs EPIC-005 result.     |
| **AC-1b** | Copilot responses distinguish platform facts from AI suggestions (Transparency). |
| **AC-3**  | Summarize Candidate returns a summary from Candidate Intelligence.        |
| **AC-4**  | Summarize Job returns a summary from Job Intelligence.                    |
| **AC-5**  | Draft Outreach returns a reviewable email draft (no send).                |
| **AC-6**  | Suggest Interview Questions references Missing Skills / job gaps.         |
| **AC-7**  | Copilot actions do not mutate Candidate, Job, Relationship, or Workflow.  |
| **AC-8**  | Candidate Workspace has no regression.                                    |
| **AC-9**  | Job Workspace has no regression.                                          |
| **AC-10** | Relationship Foundation has no regression.                                |
| **AC-11** | Workflow Foundation has no regression.                                    |
| **AC-12** | Matching Foundation has no regression.                                    |
| **AC-13** | Resume Import has no regression.                                          |
| **AC-14** | `GET /health` returns `"status":"ok"`.                                    |
| **AC-15** | `pnpm run ci` PASS.                                                       |

---

## Out of Scope

- AI recalculating Match Score or replacing Matching Engine  
- Auto-ranking / recommendation lists  
- Auto Workflow stage transitions / auto-hire decisions  
- Sending email / calendar / interview scheduling product  
- Chatbot with unbounded tool use that mutates domain  
- Fine-tuning / learning loops / feedback-trained models  
- Semantic search product EPIC  
- Analytics dashboards  
- TECH / architecture redesign / Memory Bank changes  
- Pipeline Kanban board  

---

## Dependencies

| Dependency                         | Status    |
| ---------------------------------- | --------- |
| `main @ 78faa38` / Founder Alpha   | Required  |
| EPIC-001…005                       | Completed |
| Matching Result (on-demand)        | Required  |
| LLM plugin (`ProviderRegistry`)    | Required  |

No new TECH ticket. Prefer mock/deterministic providers in CI when live keys are absent.

---

## Risks

| Risk                                      | Mitigation                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| Business rules leak into prompts          | Governing principle; prompts only narrate capability payloads              |
| Hallucinated skills / scores              | Ground Explain Match on Matching Evidence; AC-2 score invariance           |
| Recruiter over-trusts drafts              | Label outputs as suggestions; no auto-send / auto-stage                    |
| Provider flakiness in CI                  | Mock provider path; contract tests for response shape                      |

---

## Success Metrics

- Recruiters can get an evidence-grounded match explanation without leaving the platform.  
- Copilot drafts reduce blank-page time for outreach / briefing.  
- Matching Engine remains the sole owner of Match Score.  
- Future Analytics can treat Copilot usage as optional telemetry without owning hiring rules.

---

## Roadmap context

| EPIC         | Goal                              |
| ------------ | --------------------------------- |
| ✅ EPIC-001  | Candidate Intelligence            |
| ✅ EPIC-002  | Job Intelligence                  |
| ✅ EPIC-003  | Relationship Intelligence         |
| ✅ EPIC-004  | Workflow Intelligence             |
| ✅ EPIC-005  | Matching Intelligence             |
| **EPIC-006** | AI Recruiter Copilot _(this)_     |
| EPIC-007     | Analytics & Insights              |

---

## Definition of Done

EPIC-006 is done when:

- AC-1…AC-15 **PASS**  
- Regressions on EPIC-001…005 + Resume Import: **NONE**  
- `GET /health` **PASS**  
- `pnpm run ci` **PASS**  
- Validation Report completed (PR-3) with evidence and clear **PASS / FAIL**  
- Documented confirmation: Copilot did not own/recalculate Matching business rules  

---

## Deliverables (lifecycle)

| PR              | Content                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **PR-1 (this)** | Spec only — this document + `reports/epic-006-spec-review.md`           |
| **PR-2**        | Implementation — Copilot actions (explain / summarize / draft / questions) via LLM plugin |
| **PR-3**        | Validation Report — AC checklist, runtime evidence, PASS/FAIL           |

---

## Implementation constraints (for PR-2)

- Branch from `main` after this Spec merges.  
- Consume Matching Result via existing on-demand Matching API/engine — do not fork scoring logic into prompts.  
- Use existing LLM plugin pattern; fail gracefully without keys.  
- No mutations to Candidate / Job / Relationship / Workflow from Copilot endpoints.  
- No email send; no auto stage move.  
- Keep `main` deployable; CI green.  
