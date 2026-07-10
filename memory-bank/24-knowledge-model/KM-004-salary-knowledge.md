# KM-004 — Salary Knowledge

---

# Metadata

| Field | Value |
|-------|-------|
| Object ID | KM-004 |
| Name | Salary Knowledge |
| Version | 1.0 |
| Phase | 1 (MVP) |
| Parent | KM-001 Candidate Knowledge |
| Status | Approved |

---

# Purpose

Track salary expectations and history as **evolving knowledge** — not a static `expected_salary` field.

---

# Wrong vs Correct

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `expected_salary: 40000000` | Salary Knowledge with history, trend, confidence |
| Single number | Expected + history + trend + currency |

---

# Value Schema (MVP)

```json
{
  "currency": "VND",
  "expected": 40000000,
  "current": 35000000,
  "history": [
    { "amount": 35000000, "type": "expected", "recorded_at": "2026-01-15" },
    { "amount": 38000000, "type": "expected", "recorded_at": "2026-03-20" },
    { "amount": 40000000, "type": "expected", "recorded_at": "2026-07-09" }
  ],
  "trend": "increasing | stable | decreasing | unknown",
  "period": "monthly | yearly"
}
```

MVP `history` is allowed as simple array — full evidence model in Phase 2.

---

# Full Object Example

```json
{
  "knowledge_id": "know_sal_001",
  "knowledge_type": "salary",
  "entity_type": "candidate",
  "entity_id": "candidate_xxx",
  "workspace_id": "ws_xxx",

  "value": {
    "currency": "VND",
    "expected": 40000000,
    "current": 35000000,
    "history": [
      { "amount": 35000000, "type": "expected", "recorded_at": "2026-01-15" },
      { "amount": 38000000, "type": "expected", "recorded_at": "2026-03-20" },
      { "amount": 40000000, "type": "expected", "recorded_at": "2026-07-09" }
    ],
    "trend": "increasing",
    "period": "monthly"
  },

  "confidence": 0.95,
  "sources": ["Recruiter", "Interview"],
  "verified": true,
  "verified_by": "Recruiter",

  "last_updated": "2026-07-09T10:30:00Z",
  "updated_by": "recruiter_xxx",
  "version": 4
}
```

---

# AI Presentation

```
Expected Salary: 40M VND/month
Trend: Increasing (35M → 38M → 40M)
Confidence: 95%
Verified by: Recruiter
```

---

# Common Mistakes

❌ Overwriting salary without history entry

❌ confidence 1.0 from resume stated expectation without recruiter confirm

❌ Missing currency

❌ Exposing salary to Client without permission rules

---

# Cursor Validation Checklist

- [ ] History append on change
- [ ] trend computed from history
- [ ] KM-000 compliance
- [ ] Common Mistakes reviewed
