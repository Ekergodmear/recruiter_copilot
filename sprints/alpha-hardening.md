# Recruiter Review Experience

_Formerly: Alpha Hardening — Pre-Recruiter UX_

**Status:** ✅ Complete — Sprint 1 closed 2026-07-10  
**Next:** `alpha-validation-readiness.md` (AH-005 cancelled)

**Mode:** Product Validation — no new architecture, no new AI modules  

**Gate:** Between Sprint 1 Engineering Complete and Alpha Validation



---



## North Star



**Time To Qualified Candidate (TTQC)** — time from resume upload to candidate ready for shortlist.



```

Upload → AI parse → Recruiter review/edit → Mark Ready → Qualified

```



Supporting metrics explain TTQC:



- **AI Acceptance Rate** — fields accepted without override

- **Human Override Rate** — fields changed from original AI

- **Verification Rate** — fields human-verified (including confirm-without-edit)



---



## Product Validation Principle



Every new feature must answer **yes** to at least one:



1. Does it help recruiter decide faster (lower TTQC)?

2. Does it create high-quality data to improve the system later?



If **no** to both → not in Alpha.



**Out of scope for Alpha:** Duplicate Detection, Semantic Search.



---



## Priority order (CTO)



| Order | ID | Task |

|-------|-----|------|

| 1 | **AH-000** | Telemetry Dashboard (Internal) |

| 2 | **AH-001** | Resume Preview ✅ |
| 3 | AH-002 | Manual Edit ✅ |
| 4 | AH-003 | Knowledge Provenance ✅ |

| 5 | **AH-004** | Knowledge Review ✅ |

| 6 | ~~AH-005~~ | ~~Import History~~ → **Alpha Validation Readiness** |



---



## AH-000 — Operations Dashboard (Internal) ✅



### Acceptance Criteria



- [x] Four metric groups + override reasons

- [x] Today / Yesterday / Δ trends

- [x] AI Acceptance Rate + Verification Rate

- [x] Aggregation tests



---



## AH-001 — Resume Preview ✅

### Task

- `ResumeDocument` abstraction + `ResumeDocumentViewer` (PDF | DOCX | Plain Text | OCR Phase 2)
- `GET /api/v1/candidates/:id/resume` — metadata
- `GET /api/v1/candidates/:id/resume/content` — rendered preview
- Review UI: side-by-side resume + knowledge; click field → provenance panel

### Acceptance Criteria

- [x] View original resume in browser (PDF, DOCX, plain text)
- [x] Shown parallel to profile
- [x] Provenance on field click



---



## AH-002 — Manual Edit ✅



Human-verified knowledge with append-only revision history.



### Data model



```text

Original AI Value → Current Value → Revision History (append-only)

```



Each revision: `{ value, actorId, recordedAt, reason?, action: edit|verify }`



### Acceptance Criteria



- [x] Recruiter edits and saves fields (original AI preserved)

- [x] Revision history append-only (multi-recruiter supported)

- [x] Override + acceptance + verification rates in dashboard

- [x] TTQC ends on Mark Ready (not import)



---



## AH-003 — Knowledge Provenance ✅



### Background



Recruiter must answer: **"Why does the system show this value?"**



Provenance = where knowledge came from. Standard term in data engineering / AI.



### Task



Per editable field display:



| Field | Value | Source | Confidence |

|-------|-------|--------|------------|

| React | React | Resume | 97% |

| English | C1 | Recruiter Review | Human Verified |

| Summary | ... | Gemini | 82% |



Per Knowledge Object metadata:



- `lastVerifiedBy`

- `lastVerifiedAt`

- `verificationMethod` — `AI` | `Human` | `Interview` | `Assessment` | `Client Feedback`



Future sources: Resume, LinkedIn, Recruiter, Interview, Client Feedback, Assessment, GitHub.



### API / UI



- Review JSON includes `provenance`, `lastVerifiedBy`, `verificationMethod` per field

- Review UI table: Original AI | Current | Source | Confidence | Verified

- `POST /api/v1/candidates/:id/knowledge/verify` — explicit field verify

- Mark Ready auto-verifies remaining CLAIMED fields



### Acceptance Criteria



- [x] Data model supports provenance + verification metadata

- [x] Review API/UI shows source + confidence per field

- [x] Verification Rate metric in Operations Dashboard

- [ ] Resume Preview integration (AH-001)



### Out of Scope



- PDF highlight, Truth Model Phase 2



---



## AH-004 — Knowledge Review ✅

Four recruiter actions per Knowledge Object (not candidate-level feedback):

| Action | Meaning |
|--------|---------|
| 👍 Accept | AI value accepted |
| ✏ Edit | Human revision |
| 👎 Reject | AI value rejected |
| ✅ Verify | Human verified without change |

### Also in AH-004 scope

- **Review Priority** (rule-based, no LLM): CRITICAL / HIGH / MEDIUM / LOW
- **Review Queue** in UI: "Review these fields first"
- Telemetry: `knowledge_reviewed` with `review_action`
- **Review Completion Rate** = Reviewed Fields / Editable Fields

### API

- `POST /api/v1/candidates/:id/knowledge/review` — `{ field, action, humanValue?, reason? }`

### Acceptance Criteria

- [x] Four review actions per knowledge object
- [x] Review priority rules + queue in review UI
- [x] `knowledge_reviewed` telemetry
- [x] Review Completion Rate on Operations Dashboard



---



## AH-005 — Import History



### Task



- Last 10 imports with status, timestamp, provider, parse time, candidate name

- `GET /api/v1/imports` or equivalent



### Acceptance Criteria



- [ ] 10 recent imports listed



---



## Alpha Gate (CTO sign-off for Sprint 2)



After **30–50 real CVs** in Alpha Validation:



| Metric | Target |

|--------|--------|

| TTQC | < 2 min |

| AI Acceptance Rate | > 85% |

| Human Override Rate | < 15% |

| Verification Rate | > 95% |

| Import Success Rate | > 98% |

| Parse Failure Rate | < 2% |

| Daily Active Recruiters | ≥ 1/day |



---



## Definition of Done



- [ ] AH-000 through AH-005 complete (in priority order)

- [ ] Alpha Gate metrics met on real CVs

- [ ] CI green

- [ ] Ready for Sprint 2 (Candidate Workspace)



## Alpha Validation reference



See `sprints/sprint-1.md` and `docs/recruiter-interview-guide.md`

