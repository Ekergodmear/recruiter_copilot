---
contract_id: KC-004
version: 1.0
name: Client Feedback to Knowledge Update
status: Design
phase: 2
producer: Inference Engine + Truth Resolver
consumer: Knowledge Engine
knowledge_model: KM-001
truth_model: TM-003
---

# KC-004 — Client Feedback to Knowledge Update

---

# Purpose

Incorporate Client feedback into Candidate Knowledge with appropriate weight (5).

May trigger CONFLICTED status when contradicting Interview/Resume.

**Phase 2 — not MVP. Client never sees internal knowledge mechanics.**

---

# Input

| Field | Type | Required |
|-------|------|----------|
| client_id | string | yes |
| submission_id | string | yes |
| candidate_id | string | yes |
| feedback | string | yes |
| rating | enum | no |
| trace_id | string | yes |

---

# Output

KnowledgeUpdate[] per KC-003 pattern.

---

# Must

- Weight Client Feedback = 5 (TM-003)
- Never expose to Client that their feedback created CONFLICTED
- Recruiter mediates CONFLICTED resolution

---

# Cannot

- Client persona executes this contract
- Client sees truthStatus or confidence

---

# Cursor Validation Checklist

- [ ] Phase 2
- [ ] Client permission boundaries
- [ ] Evidence weight applied
