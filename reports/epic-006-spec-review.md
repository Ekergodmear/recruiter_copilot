# EPIC-006 Spec Review — AI Recruiter Copilot

| Field          | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Document       | `docs/epics/EPIC-006-AI-Recruiter-Copilot.md`            |
| Review type    | Spec gate (PR-1 docs-only)                               |
| Baseline       | `main @ 78faa38` + EPIC-001…005 COMPLETED                |
| Recommendation | **APPROVE Spec** → unlock Implementation PR              |

---

## Why this EPIC now

Five foundation capabilities exist. The remaining gap is **recruiter-facing language**: explain Matching Evidence, summarize Candidate/Job, draft outreach, suggest interview questions — without moving business rules into the model.

---

## Naming & philosophy (critical)

| Choice                                      | Verdict                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| AI owns / recalculates Match Score          | **Reject** — Matching Intelligence (EPIC-005) owns score                |
| AI auto-advances Workflow / auto-hire       | **Reject** — out of scope; recruiter decides                            |
| **AI consumes capabilities; does not own business rules** | **Adopt** — locked governing principle                    |
| Explainability + Productivity MVP           | **Adopt** — explain, summarize, draft, interview prompts                |

Aligns with: Evidence over Opinion; AI as support layer, not decision maker.

---

## Spec completeness check

| Section                                                         | Present  |
| --------------------------------------------------------------- | -------- |
| Problem / Goal / User Story                                     | Yes      |
| Governing principle (AI consumes, does not own rules)           | Explicit |
| MVP actions (explain / summarize / draft / questions)           | Yes      |
| LLM as existing plugin                                          | Yes      |
| AC-1…AC-15                                                      | Yes      |
| Out of Scope (re-score, auto-stage, send email, TECH)           | Yes      |
| DoD                                                             | Yes      |
| Lifecycle PR-1 → PR-2 → PR-3                                    | Yes      |
| No TECH / Foundation Freeze                                     | Explicit |

---

## Baseline honesty

| Surface                 | Notes for PR-2                                              |
| ----------------------- | ----------------------------------------------------------- |
| Matching Result         | On-demand EPIC-005 — Copilot narrates, does not recompute   |
| ProviderRegistry        | summary / reasoning providers exist — reuse, no redesign    |
| Candidate / Job / Rel / Workflow | Must not mutate (AC-7 + regression ACs)              |

---

## Scope discipline

**In:** Explain Match, Summarize Candidate/Job, Draft Outreach (no send), Suggest Interview Questions, LLM plugin.  
**Out:** AI Matching replacement, ranking, auto Workflow, email send, chat mutation tools, TECH.

```text
EPIC-001…005  = business capabilities (rules)
EPIC-006      = Copilot (interpretation + drafts)
```

---

## Risks accepted for Alpha

- Hallucination risk — mitigate via Evidence grounding + AC-2 score invariance  
- CI without API keys — mock provider path  
- Recruiter over-trust — label suggestions; no auto-apply  

---

## Gate decision

| Gate                                      | Result                     |
| ----------------------------------------- | -------------------------- |
| Product value clear                       | PASS                       |
| AI does not own business rules            | PASS (explicit)            |
| AC testable                               | PASS                       |
| Out of Scope explicit                     | PASS                       |
| No TECH dependency                        | PASS                       |
| Definition of Done                        | PASS                       |
| Ready for Implementation PR               | **YES** (after Spec merge) |

**Recommendation:** ✅ **APPROVE Spec** — merge docs-only PR, then open Implementation PR locked to this Spec.

---

## Next

1. Merge Spec (this PR)  
2. Implementation PR (Copilot endpoints + UI; consume Matching Result; LLM plugin)  
3. Validation Report PR with evidence for AC-1…AC-15  
