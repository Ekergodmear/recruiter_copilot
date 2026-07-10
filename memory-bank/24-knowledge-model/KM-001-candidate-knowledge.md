# KM-001 — Candidate Knowledge

---

# Metadata

| Field | Value |
|-------|-------|
| Object ID | KM-001 |
| Name | Candidate Knowledge |
| Version | 1.0 |
| Phase | 1 (MVP) |
| Status | Approved |

---

# Purpose

Define **Candidate Knowledge** as an aggregate of Knowledge Objects.

Candidate is the entity. Candidate Knowledge is what the organization **knows** about them.

Resume is evidence. Candidate Profile is the living aggregate.

---

# What Candidate Is NOT

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| Candidate = Resume data | Candidate owns Knowledge Objects |
| Candidate.skills column | Candidate → Skill Knowledge objects |
| Parsed JSON blob | Structured, sourced, confident facts |

---

# Candidate Knowledge Aggregate

```
Candidate (entity)
    │
    ├── Skill Knowledge[]        KM-002
    ├── English Knowledge        KM-003
    ├── Salary Knowledge         KM-004
    ├── Availability Knowledge   KM-005
    │
    └── (v2) Experience Knowledge, Industry Knowledge, etc.
```

**Candidate Profile** (Ubiquitous Language) = read model of this aggregate for recruiters.

---

# Aggregate Structure (MVP)

```json
{
  "candidate_id": "candidate_xxx",
  "workspace_id": "ws_xxx",
  "profile_version": 12,
  "last_enriched_at": "ISO-8601",

  "knowledge": {
    "skills": ["know_skill_001", "know_skill_002"],
    "english": "know_eng_001",
    "salary": "know_sal_001",
    "availability": "know_avail_001"
  },

  "summary": "AI-generated narrative — draft until recruiter saves",
  "summary_confidence": 0.82,
  "summary_sources": ["Resume", "Recruiter"]
}
```

`summary` is presentation layer — underlying facts live in Knowledge Objects.

---

# Knowledge Growth Loop

```
Resume Uploaded → Parsed
        ↓
Skill Knowledge created (confidence 0.75, source: Resume)
        ↓
Recruiter edits → confidence 0.90, source: +Recruiter, verified: true
        ↓
Interview → English Knowledge verified_by: Interview
        ↓
Client Feedback → Salary Knowledge updated
        ↓
Future AI recommendations use enriched Knowledge Objects
```

---

# Events That Update Candidate Knowledge

| Event | Knowledge Objects Affected |
|-------|---------------------------|
| ResumeParsed (EV-004) | Skills, English, Salary (initial) |
| CandidateEnriched (EV-009) | All applicable |
| KnowledgeUpdated (EV-011) | Aggregate refresh |
| InterviewCompleted (EV-018) | Skills verified, English verified |
| Recruiter edit (via service) | Any — verified_by: Recruiter |

---

# Public API vs Knowledge

Recruiters see **Candidate Profile** — friendly presentation.

API returns Knowledge with confidence when requested (recruiter view).

Clients see **subset only** — no internal confidence, no sources, no recruiter notes.

---

# Phase 2 Extensions

- Experience Knowledge (companies, roles, durations with evidence)
- Industry Knowledge
- Certification Knowledge
- Knowledge Graph edges from Candidate to Skill, Project, Company
- Full `evidences[]` per object (KM-011)

---

# Common Mistakes

❌ Candidate table with skill columns

❌ Exposing raw Knowledge Objects to Client persona

❌ Summary as source of truth (facts must live in Knowledge Objects)

❌ Creating Candidate Knowledge without linking to Candidate entity

❌ Skipping aggregate version on enrichment

---

# Cursor Validation Checklist

- [ ] Aggregate references KM-002–005 objects
- [ ] Profile is read model, not primary store
- [ ] Knowledge Growth Loop documented
- [ ] Client visibility rules respected
- [ ] Phase 1 scope
- [ ] Common Mistakes reviewed
