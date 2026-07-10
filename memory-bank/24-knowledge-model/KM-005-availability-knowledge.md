# KM-005 — Availability Knowledge

---

# Metadata

| Field | Value |
|-------|-------|
| Object ID | KM-005 |
| Name | Availability Knowledge |
| Version | 1.0 |
| Phase | 1 (MVP) |
| Parent | KM-001 Candidate Knowledge |
| Status | Approved |

---

# Purpose

Track when a Candidate can start — as **evolving knowledge**, not a static enum field.

---

# Wrong vs Correct

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `availability: "30_days"` | Availability Knowledge with history |
| Static dropdown | Immediately → 30 Days → Negotiating (tracked) |

---

# Value Schema (MVP)

```json
{
  "status": "immediately | notice_period | negotiating | unavailable | unknown",
  "notice_days": 30,
  "available_from": "2026-08-09",
  "history": [
    { "status": "immediately", "recorded_at": "2026-05-01" },
    { "status": "notice_period", "notice_days": 30, "recorded_at": "2026-07-01" },
    { "status": "negotiating", "recorded_at": "2026-07-09" }
  ]
}
```

---

# Full Object Example

```json
{
  "knowledge_id": "know_avail_001",
  "knowledge_type": "availability",
  "entity_type": "candidate",
  "entity_id": "candidate_xxx",
  "workspace_id": "ws_xxx",

  "value": {
    "status": "negotiating",
    "notice_days": 30,
    "available_from": null,
    "history": [
      { "status": "immediately", "recorded_at": "2026-05-01T00:00:00Z" },
      { "status": "notice_period", "notice_days": 30, "recorded_at": "2026-07-01T00:00:00Z" },
      { "status": "negotiating", "recorded_at": "2026-07-09T10:30:00Z" }
    ]
  },

  "confidence": 0.90,
  "sources": ["Recruiter", "CallNote"],
  "verified": true,
  "verified_by": "Recruiter",

  "last_updated": "2026-07-09T10:30:00Z",
  "updated_by": "recruiter_xxx",
  "version": 3
}
```

---

# AI Presentation

```
Availability: Negotiating (was 30 days notice)
Confidence: 90%
Last changed: 2026-07-09
Source: Recruiter call
```

---

# Common Mistakes

❌ `availability` enum column without history

❌ Not updating when candidate situation changes

❌ Stale availability without low confidence flag

---

# Cursor Validation Checklist

- [ ] History on every status change
- [ ] KM-000 compliance
- [ ] Common Mistakes reviewed
