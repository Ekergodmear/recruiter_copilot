---
contract_id: KC-002
version: 1.0
name: Resume to English Knowledge
status: Approved
phase: 1
producer: Inference Engine
consumer: Knowledge Engine
knowledge_model: KM-003
truth_model: N/A
---

# KC-002 — Resume to English Knowledge

---

# Purpose

Transform Resume into one English Knowledge object (singleton per Candidate).

---

# Input

Same as KC-001 input fields (`Resume` reference + trace_id + workspace_id + candidate_id).

---

# Output

| Field | Type | Required |
|-------|------|----------|
| english | EnglishKnowledge | yes — singleton, KM-003 |
| contract_id | KC-002 | yes |
| trace_id | string | yes |
| extraction_method | string | yes |

---

# Requirements

- confidence required
- sources must include `Resume`
- value.level from enum: A1–C2 or unknown
- normalization of self-reported levels
- Cannot set verified: true from AI alone

---

# Must

- Emit KnowledgeCreated
- Include trace_id, contract_id
- Validate against KM-003

---

# Cannot

- Create multiple English Knowledge per execution
- Modify Candidate directly

---

# Common Mistakes

❌ Multiple English KO per resume parse
❌ Treating resume self-assessment as verified

---

# Cursor Validation Checklist

- [ ] Singleton output
- [ ] KM-003 compliant
- [ ] KC-002 Approved before implementation
