# Sprint 1 — Resume Upload to Candidate Profile

## Status

| Phase | State |
|-------|-------|
| Engineering | ✅ **Complete** (CTO approved 2026-07-09) |
| Recruiter Review Experience | ✅ **Complete** (CTO approved 2026-07-10) |
| Release type | **Internal Alpha Ready** |
| Alpha Validation Readiness | ⬜ Next (`alpha-validation-readiness.md`) |
| Alpha Validation | ⬜ Pending (30–50 CVs, 3–5 days) |
| Sprint 1 Closed | ✅ **2026-07-10** |
| Sprint 2 | ⛔ Gated — data review after Alpha |

```
Sprint 1 ✅ → Alpha Instrumentation → Alpha Validation (30–50 CV) → Data Review → Sprint 2
```

**CTO verdict (2026-07-10):** Sprint 1 **CLOSED**

> AI chuẩn bị tri thức. Recruiter xác nhận tri thức.

Feature development **dừng**. Người dùng thật là kiến trúc sư Sprint 2.

---

## Milestone

> **Recruiter uploads a resume and receives a trustworthy Candidate Profile.**

## Epic

**EPIC-001** — Resume Import Pipeline

## Engineering Tasks (Complete)

| ID | Task | Status |
|----|------|--------|
| TASK-001 | Repository Skeleton | ✅ |
| TASK-002 | Candidate Aggregate | ✅ |
| TASK-003 | Resume Aggregate | ✅ |
| TASK-004 | CandidateImportService | ✅ |
| TASK-005 | StoragePort (Local) | ✅ |
| TASK-006 | KnowledgeExtractionPipeline | ✅ |
| TASK-007 | KC-001 | ✅ |
| TASK-008 | KC-002 | ✅ |
| TASK-009 | Candidate Repository | ✅ |
| TASK-010 | Resume Repository | ✅ |
| TASK-011 | Candidate Profile View | ✅ |
| TASK-012 | REST API | ✅ |
| TASK-013 | Contract Validation | ✅ |
| TASK-014 | Telemetry + Human Override Rate | ✅ |
| TASK-015 | 10 Golden Resumes | ✅ |
| TASK-016 | Tests | ✅ |
| TASK-017 | Docker | ✅ |

---

## Alpha Validation (Required for Sprint Done)

**Participant:** 1 real recruiter  
**Volume:** ~30 CVs over 3–5 days  
**Interview:** `docs/recruiter-interview-guide.md`

### System KPIs

| Metric | Target |
|--------|--------|
| Resume Imported | ≥ 30 |
| Upload Success Rate | > 95% |
| Average Parse Time | < 8s |
| Human Override Rate | < 20% |
| Parse Failure | < 5% |
| Recruiter Satisfaction | ≥ 4/5 |

### Behavioral KPIs

| Metric | Target |
|--------|--------|
| Daily Active Usage | ≥ 1 session/day |
| Time Saved vs old workflow | ≥ 30% |
| Excel escape (qualitative) | Recruiter stops parallel Excel for same task |

### North Star

**TTQC (Time To Qualified Candidate)** must decrease over the validation period.

**Sprint 2 blocked** until validation + interview complete + CTO review.

---

## CTO Review Notes (2026-07-09)

**Strengths**

- Scope discipline — single goal, no scope creep
- Business independent of AI (Gemini down → upload still works)
- Human Override Rate as primary product KPI

**Before Alpha:** `alpha-hardening.md` — **AH-000 Telemetry Dashboard first**, then AH-001→005

**North Star:** TTQC (Human Override Rate = supporting metric only)

---

## API (current)

```http
POST /api/v1/candidates/import-resume
```

```json
{
  "candidateId": "candidate_xxx",
  "name": "Jane Doe",
  "summary": "...",
  "skills": ["JavaScript", "React"],
  "resumeVersion": 1
}
```

## References

- ADR-016, WF-001, KC-001, KC-002
- `quality-gates/sprint-1.yaml`
- `sprints/sprint-2.md` — next sprint (workspace, gated)
