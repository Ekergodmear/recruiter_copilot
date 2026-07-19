# EPIC-001 Spec Review — Candidate Workspace

| Field | Value |
|-------|-------|
| Document | `docs/epics/EPIC-001-Candidate-Workspace.md` |
| Review type | Spec gate (PR-1 docs-only) |
| Baseline | `founder-alpha-2` / `main` |
| Recommendation | **APPROVE Spec** → unlock Implementation PR |

---

## Why this EPIC now

After TECH-006 and Foundation Freeze, further TECH has diminishing ROI. Recruiter still lacks a workplace after Import Resume. Candidate Workspace is the highest-ROI product EPIC: it turns the CV engine into a usable hub and unblocks later EPICs (Matching, Copilot, Pipeline) without new infra.

---

## Spec completeness check

| Section | Present |
|---------|---------|
| Problem / Goal / User Story | Yes |
| MVP Scope (List, Detail, Edit, Save, Search, Sort) | Yes |
| Acceptance Criteria AC-1…AC-7 | Yes |
| Out of Scope | Yes |
| Dependencies / Risks / Metrics | Yes |
| Lifecycle PR-1 → PR-2 → PR-3 | Yes |
| Foundation Freeze / no TECH | Explicit |

---

## Baseline honesty (gaps vs existing code)

Partial surfaces already exist (`CandidatesScreen`, `CandidateDetailScreen`, `GET /api/v1/candidates`). Spec correctly frames EPIC-001 as **closing gaps**, not a rewrite:

| MVP need | Current gap (for PR-2) |
|----------|-------------------------|
| List: title, company, experience, updatedAt | List today leans on name + skills preview |
| Detail as workspace profile | Detail leans on review/knowledge tabs |
| Edit name/phone/email/salary/note + Prisma | Need explicit edit/save path |
| Search name + email | Search may not cover email as specified |
| Sort updated / created | Need explicit sort params |

Implementation must extend existing paths; must not break Import Resume (AC-6) or `/health` (AC-7).

---

## Scope discipline

**In:** recruiter list → detail → edit allowed fields → persist → search → sort.  
**Out:** AI, matching, semantic search, timeline, pipeline, collaboration, permissions, audit — correctly excluded.

---

## Risks accepted for Alpha

- Last-write-wins concurrent edit  
- Empty display when title/company not on profile  
- Light validation only  

---

## Gate decision

| Gate | Result |
|------|--------|
| Product value clear | PASS |
| AC testable | PASS |
| Out of Scope explicit | PASS |
| No TECH dependency | PASS |
| Ready for Implementation PR | **YES** (after Spec merge) |

**TL action:** Approve & merge this Spec PR, then open Implementation PR against merged Spec.

---

## Next

1. Merge Spec  
2. Implementation PR (list / detail / edit / search / sort / persist)  
3. Validation Report PR with evidence  
