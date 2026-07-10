# KM-003 — English Knowledge

---

# Metadata

| Field | Value |
|-------|-------|
| Object ID | KM-003 |
| Name | English Knowledge |
| Version | 1.0 |
| Phase | 1 (MVP) |
| Parent | KM-001 Candidate Knowledge |
| Status | Approved |

---

# Purpose

Represent organizational belief about a Candidate's English capability — not a simple `B2` field.

---

# Wrong vs Correct

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `english: "B2"` | English Knowledge with confidence + sources |
| AI: "English B2" | AI: "English likely B2+, confidence 65%, sources: Resume, Interview" |

---

# Value Schema (MVP)

```json
{
  "level": "A1 | A2 | B1 | B2 | C1 | C2 | unknown",
  "level_numeric": 4,
  "speaking": "fluent | good | fair | poor | unknown",
  "writing": "fluent | good | fair | poor | unknown",
  "certifications": ["IELTS 7.0"]
}
```

One English Knowledge object per Candidate (singleton aggregate child).

---

# Full Object Example

```json
{
  "knowledge_id": "know_eng_001",
  "knowledge_type": "english",
  "entity_type": "candidate",
  "entity_id": "candidate_xxx",
  "workspace_id": "ws_xxx",

  "value": {
    "level": "B2",
    "level_numeric": 4,
    "speaking": "good",
    "writing": "fair",
    "certifications": []
  },

  "confidence": 0.65,
  "sources": ["Resume", "Recruiter"],
  "verified": false,
  "verified_by": null,

  "last_updated": "2026-07-09T10:30:00Z",
  "updated_by": "recruiter_xxx",
  "version": 2
}
```

After interview:

```json
{
  "confidence": 0.88,
  "sources": ["Resume", "Recruiter", "Interview"],
  "verified": true,
  "verified_by": "Interview",
  "value": { "level": "B2", "speaking": "fluent" }
}
```

---

# AI Presentation

```
English: B2 (upper intermediate)
Confidence: 65%
Speaking: Good | Writing: Fair
Sources: Resume, Recruiter
Not yet verified by interview
```

---

# Common Mistakes

❌ `english_level` column on candidates table

❌ High confidence from resume self-assessment alone

❌ Multiple English Knowledge objects per candidate

❌ Client sees confidence internals

---

# Cursor Validation Checklist

- [ ] Singleton per candidate
- [ ] KM-000 base fields
- [ ] Multi-source confidence model
- [ ] Common Mistakes reviewed
