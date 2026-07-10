# Knowledge Engine

Version: 2.0

---

# Overview

**Knowledge Engine is the warehouse — not the factory.**

Renamed responsibility (v2.0 architecture):

| Engine | Role | Analogy |
|--------|------|---------|
| **Inference Engine (26)** | Creates knowledge | Factory |
| **Knowledge Engine (23)** | Stores & serves knowledge | Warehouse |

Knowledge Engine does **not** parse resumes or resolve truth conflicts.

It persists, versions, indexes, and retrieves Knowledge Objects.

---

# Responsibilities

| Responsibility | Owner |
|----------------|-------|
| Parse resume | Inference Engine |
| Resolve truth conflicts | Inference Engine (Phase 2+) |
| **Persist Knowledge Objects** | **Knowledge Engine** |
| **Version knowledge** | **Knowledge Engine** |
| **Generate embeddings from KO** | **Knowledge Engine** |
| **Serve knowledge to API/UI** | **Knowledge Engine** |
| **Maintain search index** | **Knowledge Engine** |
| Knowledge Graph storage | Knowledge Engine (Phase 3) |

---

# Position in Architecture

See `_architecture.md` for full stack.

```
Inference Engine → creates Knowledge Objects
        ↓
Knowledge Engine → persist · index · serve
        ↓
Embedding Layer
        ↓
Knowledge Graph (Phase 3)
```

---

# Components (Revised)

| ID | Component | Role |
|----|-----------|------|
| KE-001 | Knowledge Store | CRUD on knowledge_objects (append-version) |
| KE-002 | Embedding Service | Regenerate vectors from KO |
| KE-003 | Search Index | Hybrid search on knowledge |
| KE-004 | Knowledge Graph Store | Phase 3 |
| KE-005 | Knowledge API (internal) | Serve KO to App Services |

**Removed from Knowledge Engine:** LLM parsing, truth resolution → moved to Inference Engine.

---

# Input / Output

**Input:** Knowledge Objects from Inference Engine

**Output:** Stored, indexed, retrievable knowledge for:
- Candidate Profile (read model)
- Semantic Search
- Match Score computation
- Recommendation Engine (Phase 3)

---

# Common Mistakes

❌ Putting LLM parsing in Knowledge Engine

❌ Truth resolution in Knowledge Engine

❌ Embedding from raw PDF instead of Knowledge Objects

❌ Confusing Knowledge Engine with Inference Engine

---

# Cursor Validation Checklist

- [ ] Store/serve only — no inference logic
- [ ] Receives KO from Inference Engine
- [ ] Embeddings derived from stored KO
- [ ] Common Mistakes reviewed
