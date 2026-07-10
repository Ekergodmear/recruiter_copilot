# KM-010 — Knowledge Graph (Phase 2)

---

# Metadata

| Field | Value |
|-------|-------|
| Object ID | KM-010 |
| Name | Knowledge Graph |
| Version | 1.0 |
| Phase | **2 — NOT MVP** |
| Status | Design Only |

---

# Purpose

Define how entities connect for multi-hop reasoning.

**Do not implement in MVP.** Design now so infrastructure does not block later.

---

# Vision

```
Candidate
    │
    ├── React ─── ABC Project ─── Fintech Industry
    ├── Node.js
    ├── Banking
    ├── AWS
    └── English
```

Query: "Ai giống ứng viên này?"

Answer combines:

```
Knowledge Graph traversal
+ Vector Search (embeddings from Knowledge Objects)
+ Business Rules (04)
+ Recruitment History
```

Not vector search alone.

---

# Node Types (Phase 2)

| Node | Description |
|------|-------------|
| Candidate | Person |
| Skill | Normalized capability |
| Project | Work evidence |
| Company | Employer |
| Industry | Sector |
| Technology | Tool/framework |
| Certification | Credential |
| Language | Language skill |
| Job | Hiring demand |
| Client | Organization |

---

# Edge Types (Phase 2)

| Edge | Example |
|------|---------|
| HAS_SKILL | Candidate → React |
| USED_IN | React → ABC Project |
| WORKED_AT | Candidate → Company |
| IN_INDUSTRY | Company → Fintech |
| REQUIRES_SKILL | Job → React |
| SIMILAR_TO | Candidate → Candidate (computed) |

---

# MVP Substitute

Phase 1 uses:

- Skill Knowledge objects with confidence
- Embedding similarity search
- Normalized skill matching for Job ↔ Candidate

No graph database required in MVP.

---

# Common Mistakes

❌ Building Neo4j in MVP

❌ Graph without structured Knowledge Objects underneath

❌ Replacing Knowledge Objects with graph-only storage

---

# Cursor Validation Checklist

- [ ] Marked Phase 2 — not MVP implementation
- [ ] MVP substitute documented
- [ ] Common Mistakes reviewed
