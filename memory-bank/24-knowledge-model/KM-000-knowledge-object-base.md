# KM-000 — Knowledge Object Base Schema

---

# Metadata

| Field | Value |
|-------|-------|
| Object ID | KM-000 |
| Name | Knowledge Object Base |
| Version | 1.0 |
| Phase | 1 (MVP) |
| Status | Approved |

---

# Purpose

Define the **base structure** every Knowledge Object must follow.

All KM-001 through KM-009 objects extend this schema.

---

# Philosophy

A Knowledge Object is not a database column.

It is a **fact about the world** with provenance and uncertainty.

Every fact the system believes must be:

- Traceable (sources)
- Uncertain (confidence < 1.0 unless verified)
- Temporal (lastUpdated)
- Ownable (belongs to a Candidate, Job, or Client context)

---

# Base Schema (Phase 1 — MVP)

```json
{
  "knowledge_id": "know_xxx",
  "knowledge_type": "skill | english | salary | availability | ...",
  "entity_type": "candidate | job | client",
  "entity_id": "candidate_xxx",
  "workspace_id": "ws_xxx",

  "value": {},

  "confidence": 0.0,

  "sources": [],

  "verified": false,
  "verified_by": null,

  "last_updated": "ISO-8601",
  "updated_by": "system | recruiter_id | event_id",

  "version": 1
}
```

---

# Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| knowledge_id | string | yes | Unique identifier |
| knowledge_type | enum | yes | Object type discriminator |
| entity_type | enum | yes | Owner entity type |
| entity_id | string | yes | Owner entity ID |
| workspace_id | string | yes | Tenant isolation |
| value | object | yes | Type-specific payload (see KM-002+) |
| confidence | float | yes | 0.0–1.0 — never assume 1.0 without verification |
| sources | string[] | yes | Origin: Resume, LinkedIn, Interview, Recruiter, Client |
| verified | boolean | MVP optional | Human or process confirmed truth |
| verified_by | string | MVP optional | Interview, Recruiter, Client |
| last_updated | datetime | yes | ISO-8601 UTC |
| updated_by | string | yes | Actor or triggering event |
| version | integer | yes | Increment on correction — never overwrite silently |

---

# Phase 2 Extensions (Truth Model — NOT MVP)

```json
{
  "truthStatus": "VERIFIED | LIKELY | CLAIMED | CONFLICTED | OUTDATED",
  "derivedFrom": ["Resume", "Interview", "GitHub"],
  "confidences": {
    "extraction": 0.99,
    "truth": 0.98,
    "business": null
  },
  "evidences": [
    {
      "text": "ABC Project",
      "source": "Resume",
      "source_ref": "resume_xxx",
      "extracted_at": "ISO-8601"
    }
  ],
  "history": [
    {
      "value": {},
      "confidence": 0.85,
      "truthStatus": "CLAIMED",
      "updated_at": "ISO-8601",
      "reason": "Recruiter correction"
    }
  ],
  "graph_edges": []
}
```

See `25-truth-model/` for Truth Status, confidence types, Evidence Weight.

Do not implement Phase 2 fields in MVP unless explicitly approved.

---

# Confidence Rules

| Range | Meaning |
|-------|---------|
| 0.0–0.5 | Low — weak signal, needs verification |
| 0.5–0.8 | Medium — multiple sources or single strong source |
| 0.8–0.95 | High — consistent sources, recruiter review |
| 0.95–1.0 | Very high — only with `verified: true` |

AI must never present confidence 1.0 without `verified: true`.

Default AI extraction confidence: 0.6–0.85 depending on source clarity.

Recruiter save → can set `verified: true`, `verified_by: Recruiter`.

Interview confirmation → `verified_by: Interview`.

---

# Source Enum

| Source | Description |
|--------|-------------|
| Resume | Parsed from uploaded resume |
| LinkedIn | LinkedIn import (v1) |
| Recruiter | Recruiter manual edit |
| Interview | Interview feedback |
| Client | Client feedback |
| CallNote | Phone call summary (v1) |
| Placement | Post-placement data |
| AI | AI inference — always lower base confidence |

---

# Update Rules

From `04-business-rules.md`:

- Knowledge is never overwritten — version increments
- Knowledge can be enriched — merge sources, adjust confidence
- Knowledge can be corrected — new version with reason
- Corrections create Activity + Audit

---

# Storage Philosophy

```
candidate_profiles          ← aggregate reference
knowledge_objects           ← polymorphic or typed tables
knowledge_object_versions   ← append-only history (Phase 2 full, MVP lightweight)
```

**Not:**

```
candidates.skills TEXT[]
candidates.expected_salary INT
```

---

# Common Mistakes

❌ Flat columns instead of Knowledge Objects

❌ Missing confidence on any knowledge fact

❌ Empty sources array

❌ Overwriting without version increment

❌ confidence: 1.0 from AI extraction alone

❌ Implementing Phase 2 evidences in MVP

---

# Cursor Validation Checklist

- [ ] Extends KM-000 base fields
- [ ] confidence present
- [ ] sources non-empty
- [ ] last_updated set
- [ ] Phase 1 scope only for MVP
- [ ] Common Mistakes reviewed
