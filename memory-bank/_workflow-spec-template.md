# Workflow Specification Template

> One workflow = one file in `06-core-workflows/`
> Filename: `WF-xxx-[slug].md`

```markdown
# WF-xxx — [Workflow Name]

---

# Metadata

| Field | Value |
|-------|-------|
| Workflow ID | WF-xxx |
| Version | 1.0 |
| Owner Domain | [Candidate / Job / Submission / ...] |
| Status | Draft / Approved |
| MVP | Yes / No (v1) |
| Application Service | [ServiceName] |
| Related Events | EV-xxx, EV-xxx |

---

# Purpose

[Why this workflow exists]

---

# Trigger

[What initiates execution]

---

# Preconditions

[Required state before execution]

---

# Actors

[Personas from 02-user-personas.md]

---

# Business Objects

[Entities from 05-ubiquitous-language.md — created/read/updated]

---

# Input

[Input schema]

---

# Output

[Output schema]

---

# State Transition

[Lifecycle states from 03-recruitment-lifecycle.md]

---

# Event Sourcing View

[Ordered chain of domain events emitted]

```
EventA (EV-xxx)
    ↓
EventB (EV-xxx)
    ↓
...
```

---

# Domain Events

| Event ID | Event Name | When Emitted |
|----------|------------|--------------|
| EV-xxx | EventName | [condition] |

---

# Activities

[Activities created — append-only]

---

# Timeline Entries

[What appears on Timeline]

---

# AI Pipeline

[Full 6 elements if AI involved, else "No AI involvement"]

---

# Permission Checks

[Backend authorization — persona + workspace]

---

# Validation Rules

[References to 04-business-rules.md]

---

# Error Cases

| Error | Cause | Response |
|-------|-------|----------|

---

# Application Service

| Field | Value |
|-------|-------|
| Service | [ServiceName] |
| Spec | `12-application-services/[ServiceName].md` |

---

# API Contracts

> **Public Language** — business-meaningful API. Events are internal only.

```http
POST /api/v1/[business-path]
```

Delegates to Application Service. See service spec for full contract.

**Never:** `POST /events/EventName`

---

# Database Impact

[Tables/projections affected — append-only where applicable]

---

# Knowledge Growth Impact

[Knowledge objects enriched]

---

# Future Extension

[v1/v2 — not MVP]

---

# Common Mistakes

❌ [Anti-patterns]

---

# Cursor Validation Checklist

- [ ] Metadata complete (WF-xxx ID)
- [ ] Event Sourcing View defined
- [ ] All EV-xxx events registered in 07-domain-events/
- [ ] Public API uses business language via Application Service
- [ ] Events published internally only
- [ ] Audit includes source_workflow: WF-xxx
- [ ] All template sections complete
```
