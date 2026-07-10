# KM-002 — Skill Knowledge

---

# Metadata

| Field | Value |
|-------|-------|
| Object ID | KM-002 |
| Name | Skill Knowledge |
| Version | 1.0 |
| Phase | 1 (MVP) |
| Parent | KM-001 Candidate Knowledge |
| Status | Approved |

---

# Purpose

A Skill Knowledge object represents **what the organization believes about a Candidate's capability** in a normalized skill — not a raw string from a resume.

---

# Wrong vs Correct

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `skills: ["React"]` | Skill Knowledge object per skill |
| "Candidate biết React" | "97% confidence, evidence: ABC Project, verified: Interview" |
| Raw resume text for filtering | Normalized skill + confidence for matching |

---

# Value Schema

```json
{
  "skill": "React",
  "skill_id": "skill_react",
  "normalized_name": "React",
  "category": "frontend",
  "proficiency": "expert | advanced | intermediate | beginner | unknown",
  "years_of_experience": 5,
  "last_used": "2026-01"
}
```

`skill_id` references normalized Skill taxonomy (Ubiquitous Language: Skill).

Raw resume text `"React.js"` → normalized to `React`.

---

# Full Object Example (MVP)

```json
{
  "knowledge_id": "know_skill_001",
  "knowledge_type": "skill",
  "entity_type": "candidate",
  "entity_id": "candidate_xxx",
  "workspace_id": "ws_xxx",

  "value": {
    "skill": "React",
    "skill_id": "skill_react",
    "normalized_name": "React",
    "category": "frontend",
    "proficiency": "expert",
    "years_of_experience": 5,
    "last_used": "2026-01"
  },

  "confidence": 0.97,
  "sources": ["Resume", "LinkedIn"],
  "verified": true,
  "verified_by": "Interview",

  "last_updated": "2026-07-09T10:30:00Z",
  "updated_by": "EV-018",
  "version": 3
}
```

---

# Phase 2 Example (with Evidence)

```json
{
  "evidences": [
    { "text": "ABC Project", "source": "Resume", "source_ref": "resume_xxx" },
    { "text": "XYZ Project", "source": "Interview", "source_ref": "interview_xxx" }
  ]
}
```

**Not MVP** — design reserved in KM-011.

---

# AI Presentation (Explainable)

When recruiter or AI references this skill:

```
Skill: React
Confidence: 97%
Proficiency: Expert (5 years)
Sources: Resume, LinkedIn
Verified: Interview
Last used: 2026-01
```

Match Score contribution includes skill confidence weighting.

---

# Creation & Update Triggers

| Trigger | Initial Confidence | Sources |
|---------|-------------------|---------|
| ResumeParsed | 0.65–0.85 | Resume |
| Recruiter edit | 0.90+ | +Recruiter, verified possible |
| Interview feedback | boost + verified | +Interview |
| Duplicate merge | merge highest confidence sources | combined |

Multiple Skill Knowledge objects per Candidate — one per normalized skill.

---

# Matching Usage

Job Knowledge requires Skill X.

Candidate Skill Knowledge for X with confidence ≥ threshold → Match Score component.

Low confidence skill → flagged "needs verification" in UI.

---

# Common Mistakes

❌ Storing skill as string array on Candidate

❌ Using raw resume text for job matching filters

❌ Single confidence for all skills from one parse

❌ proficiency without confidence

❌ verified: true from AI parse alone

❌ Duplicate skill objects for same normalized skill_id

---

# Cursor Validation Checklist

- [ ] Extends KM-000 base schema
- [ ] Normalized skill_id used
- [ ] confidence + sources present
- [ ] Explainable presentation documented
- [ ] Phase 1 only (no evidences array in MVP)
- [ ] Common Mistakes reviewed
