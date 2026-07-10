# Domain Event Specification Template

> One event = one file in `07-domain-events/`
> Events are **internal only** — never public API.

```markdown
# EV-xxx — [EventName]

---

# Metadata

| Field | Value |
|-------|-------|
| Event ID | EV-xxx |
| Event Name | EventName |
| Version | 1.0 |
| Category | Business / AI / Infrastructure / Integration |
| Source Workflow | WF-xxx |
| Publisher | [ApplicationService or Knowledge Engine component] |
| Status | Draft / Approved |

---

# Business Meaning

[What happened — internal perspective]

---

# Payload Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|

Required fields: event_id, event_name, event_category, publisher, workflow_id, correlation_id, workspace_id, timestamp

---

# Publisher

| Service | Method | Trigger |
|---------|--------|---------|

**Never published by:** API controller directly, external client.

---

# Consumers (Handlers)

| Consumer | Action |
|----------|--------|

---

# Knowledge Growth Impact

[How this event enriches knowledge]

---

# Idempotency Key

[Duplicate detection]

---

# Common Mistakes

❌ Exposing via POST /events/* public API
❌ Missing Publisher or Category
❌ Client publishing directly

---

# Cursor Validation Checklist

- [ ] Category assigned
- [ ] Publisher documented
- [ ] Not public API
- [ ] Consumers listed
- [ ] Common Mistakes reviewed
```
