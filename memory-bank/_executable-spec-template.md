# Executable Specification Template

> **Workflows:** `06-core-workflows/WF-xxx-*.md` — template: `_workflow-spec-template.md`
> **Events:** `07-domain-events/EV-xxx-*.md` — template: `_domain-event-spec-template.md`
> **Modules:** `08+` — use sections below

---

## Module Template (08+)

For domain model, architecture, and engineering files — one module per file.

```markdown
# [Workflow / Module Name]

Version: 1.0

---

# Purpose

[Why this exists — one paragraph]

---

# Trigger

[What initiates this workflow]

---

# Preconditions

[What must be true before execution]

---

# Actors

[Personas involved — from 02-user-personas.md]

---

# Business Objects

[Entities touched — terms from 05-ubiquitous-language.md only]

---

# Input

[Data in — schema, source, validation]

---

# Output

[Data out — schema, destination]

---

# State Transition

[From state → To state — from 03-recruitment-lifecycle.md]

---

# Domain Events

[Events emitted — from 05-ubiquitous-language.md]

---

# Activities

[Activities created — append-only]

---

# Timeline Entries

[What appears on timeline]

---

# AI Pipeline

[If AI involved — all 6 elements: Trigger, Input, Pipeline, Output, Confirmation, Audit]
[If no AI — state "No AI involvement"]

---

# Permission Checks

[Who can execute — backend validation required]

---

# Validation Rules

[Business rules enforced — reference 04-business-rules.md]

---

# Error Cases

[Expected failures and handling]

---

# Notifications

[Who gets notified, when]

---

# Audit Logs

[What is recorded immutably]

---

# Knowledge Growth Impact

[Which knowledge objects are enriched — reference Knowledge Growth Loop]

---

# Future Extension

[Planned v1/v2 extensions — not MVP]

---

# Common Mistakes

❌ [Anti-patterns specific to this workflow]

---

# Cursor Validation Checklist

- [ ] Purpose clear
- [ ] All sections completed
- [ ] Ubiquitous Language terms only
- [ ] Business Rules compliant
- [ ] Lifecycle state transitions valid
- [ ] Domain Events defined
- [ ] AI Pipeline complete (if applicable)
- [ ] Permissions backend-validated
- [ ] Audit + Activity + Timeline covered
- [ ] Knowledge Growth Impact defined
- [ ] Common Mistakes reviewed
```

---

## Usage Rules

1. **Workflows** — one file per `WF-xxx` in `06-core-workflows/`. Never combine workflows in one file.
2. **Events** — one file per `EV-xxx` in `07-domain-events/`.
3. No undefined terms — `05-ubiquitous-language.md`.
4. No undefined states — `03-recruitment-lifecycle.md`.
5. **Public API** uses business language — Application Service publishes events internally.
6. Every workflow must include **Event Sourcing View**.
