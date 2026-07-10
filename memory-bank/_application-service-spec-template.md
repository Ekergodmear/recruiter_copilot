# Application Service Specification Template

> One service = one file in `12-application-services/`
> Filename: `[ServiceName].md`

```markdown
# [ServiceName]

---

# Metadata

| Field | Value |
|-------|-------|
| Service Name | [Name] |
| Version | 1.0 |
| Workflows | WF-xxx |
| Domain | [Candidate / Job / ...] |
| Status | Draft / Approved |

---

# Purpose

[What this service orchestrates]

---

# Public API

[Business-meaningful HTTP endpoints — Public Language only]

---

# Application Service Methods

[Internal method signatures]

---

# Orchestration Flow

[Step-by-step: validate → domain → publish events]

---

# Events Published

| Event ID | Event Name | Category | When |
|----------|------------|----------|------|

---

# Events Consumed

| Event ID | Handler Action |
|----------|----------------|

---

# Domain Rules Enforced

[References to 04-business-rules.md]

---

# Dependencies

[Other services, Knowledge Engine components]

---

# Error Handling

[Public error responses — no internal event details]

---

# Common Mistakes

❌ [Anti-patterns]

---

# Cursor Validation Checklist

- [ ] Public API documented
- [ ] Events internal only
- [ ] Publisher = this service
- [ ] All sections complete
```
