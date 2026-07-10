# Knowledge Model Specification Template

> One knowledge type = one file in `24-knowledge-model/`
> Filename: `KM-xxx-[slug].md`

```markdown
# KM-xxx — [Knowledge Type Name]

---

# Metadata

| Field | Value |
|-------|-------|
| Object ID | KM-xxx |
| Phase | 1 (MVP) / 2 (v2) |
| Parent | KM-001 or aggregate owner |
| Status | Draft / Approved |

---

# Purpose

[What organizational belief this object represents]

---

# Wrong vs Correct

| ❌ Wrong | ✅ Correct |

---

# Value Schema

[Type-specific value object JSON]

---

# Full Object Example (MVP)

[Complete example extending KM-000]

---

# AI Presentation (Explainable)

[How recruiters/AI display this fact]

---

# Creation & Update Triggers

[Events and sources that create/update]

---

# Phase 2 Extensions

[NOT MVP — design only]

---

# Common Mistakes

❌ [Anti-patterns]

---

# Cursor Validation Checklist

- [ ] Extends KM-000
- [ ] Phase scope respected
- [ ] confidence + sources
- [ ] Common Mistakes reviewed
```
