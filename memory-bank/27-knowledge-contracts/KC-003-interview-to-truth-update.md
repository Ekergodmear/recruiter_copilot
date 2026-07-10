---
contract_id: KC-003
version: 1.0
name: Interview to Truth Update
status: Design
phase: 2
producer: Inference Engine + Truth Resolver
consumer: Knowledge Engine
knowledge_model: KM-001, KM-002, KM-003
truth_model: TM-001, TM-003
---

# KC-003 — Interview to Truth Update

---

# Purpose

Update existing Knowledge Objects based on Interview feedback.

Applies Truth Model rules — may change truthStatus to VERIFIED or CONFLICTED.

**Phase 2 — not MVP.**

---

# Input

| Field | Type | Required |
|-------|------|----------|
| interview_id | string | yes |
| submission_id | string | yes |
| candidate_id | string | yes |
| feedback_text | string | yes |
| structured_feedback | object | no |
| interviewer_id | string | yes |
| trace_id | string | yes |

---

# Output

| Field | Type | Required |
|-------|------|----------|
| updates | KnowledgeUpdate[] | yes |
| contract_id | KC-003 | yes |
| trace_id | string | yes |

Each `KnowledgeUpdate` contains: knowledge_id, previous_version, new_value, truthStatus, confidence delta, sources added.

---

# Must

- Apply Evidence Weight: Interview = 10
- Emit KnowledgeUpdated (not KnowledgeCreated for existing KO)
- Run Truth Resolution per TM-003
- Flag CONFLICTED when sources disagree

---

# Cannot

- Silently override without version increment
- Auto-resolve CONFLICTED without recruiter (unless Interview is sole high-weight source confirming)

---

# Cursor Validation Checklist

- [ ] Phase 2 only
- [ ] Truth Model rules referenced
- [ ] KnowledgeUpdated event
