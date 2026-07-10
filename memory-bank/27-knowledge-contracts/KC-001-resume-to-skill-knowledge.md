---
contract_id: KC-001
version: 1.0
name: Resume to Skill Knowledge
status: Approved
phase: 1
producer: Inference Engine
consumer: Knowledge Engine
knowledge_model: KM-002
truth_model: N/A
trace_required: true
---

# KC-001 — Resume to Skill Knowledge

---

# Purpose

Define the **contract** for transforming a Resume document into zero or more Skill Knowledge objects.

Any AI Provider (GPT, Gemini, Local) implementing this contract must produce identical output structure regardless of underlying LLM.

Inference Engine **executes** this contract — it does not define ad-hoc parsing logic.

---

# Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| resume_id | string | yes | Immutable Resume reference |
| resume_blob_ref | string | yes | Storage URL — read-only |
| mime_type | string | yes | application/pdf, etc. |
| workspace_id | string | yes | Tenant isolation |
| candidate_id | string | no | If linking to existing Candidate |
| correlation_id | string | yes | Event chain trace |
| trace_id | string | yes | Contract execution trace |

**Input type:** `Resume` (Ubiquitous Language — evidence document, not Knowledge)

---

# Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| skills | SkillKnowledge[] | yes | Zero or more per KM-002 |
| contract_id | string | yes | Always `KC-001` |
| trace_id | string | yes | Matches input trace_id |
| extraction_method | string | yes | Provider identifier e.g. `openai-gpt4o`, `local-llama` |
| executed_at | datetime | yes | ISO-8601 UTC |

**Output type:** `SkillKnowledge[]` conforming to `KM-002`

---

# Requirements

Every SkillKnowledge in output MUST include:

| Requirement | Rule |
|-------------|------|
| confidence | Present, 0.0–1.0 (MVP: maps to Truth Confidence simplified) |
| sources | Must include `Resume` |
| normalization | `skill_id` from normalized taxonomy — not raw text |
| timestamp | `last_updated` set |
| version | Initial version = 1 |
| trace_id | Propagated from contract execution |
| evidence_ref | `resume_id` reference (MVP — full evidences Phase 2) |

---

# Must

- Emit `KnowledgeCreated` event per new SkillKnowledge (or batch with array)
- Include `contract_id: KC-001` in event payload
- Include `trace_id` in event payload
- Normalize all skills to taxonomy before output
- Validate output against KM-002 schema before handoff to Knowledge Engine
- Set `extraction_method` to identify AI Provider used
- Set initial `truthStatus` equivalent: CLAIMED (Phase 2) or implicit via low-medium confidence (MVP)

---

# Cannot

- Modify Candidate entity directly
- Modify Resume blob
- Return raw resume text as skill value
- Return skills without confidence
- Return skills without `skill_id` normalization
- Include LLM prompt, token count, or model internals in output
- Skip Knowledge Engine — output must go through persist pipeline
- Auto-set `verified: true` from AI extraction alone

---

# Output Schema (per item)

```json
{
  "knowledge_id": null,
  "knowledge_type": "skill",
  "entity_type": "candidate",
  "entity_id": "candidate_xxx",
  "workspace_id": "ws_xxx",
  "value": {
    "skill": "React",
    "skill_id": "skill_react",
    "normalized_name": "React",
    "category": "frontend",
    "proficiency": "advanced",
    "years_of_experience": 5,
    "last_used": "2026-01"
  },
  "confidence": 0.72,
  "sources": ["Resume"],
  "verified": false,
  "verified_by": null,
  "last_updated": "2026-07-09T12:00:00Z",
  "updated_by": "KC-001",
  "version": 1,
  "contract_meta": {
    "contract_id": "KC-001",
    "trace_id": "trace_xxx",
    "extraction_method": "openai-gpt4o",
    "evidence_ref": "resume_xxx"
  }
}
```

`contract_meta` is stripped before persist — stored in Audit only.

---

# Validation Rules

| Rule | On Failure |
|------|--------------|
| All items pass KM-002 validation | `KnowledgeContractFailed` |
| skill_id exists in taxonomy | Reject item, log warning |
| confidence in range | Reject contract |
| duplicate skill_id in batch | Merge or reject duplicate |
| workspace_id matches input | Reject contract |

---

# Events Emitted

| Event | Payload includes |
|-------|------------------|
| KnowledgeCreated | contract_id, trace_id, knowledge_type: skill, count |
| KnowledgeContractFailed | contract_id, trace_id, error_code, reason |

---

# Failure Modes

| Code | Cause | Action |
|------|-------|--------|
| KC001_PARSE_FAILED | Unreadable document | Fail, notify recruiter |
| KC001_NO_SKILLS | Empty extraction | Succeed with empty array + warning |
| KC001_VALIDATION_FAILED | KM-002 schema violation | Fail, audit log |
| KC001_TAXONOMY_MISS | Unknown skill, no mapping | Map to `unknown` category or skip with log |

---

# AI Provider Implementation

AI Provider implements KC-001 interface:

```
interface KC001Provider {
  execute(input: KC001Input): Promise<KC001Output>
}
```

Prompts live **inside** provider implementation — not in this contract.

Switching GPT → Gemini: new provider, same KC-001, zero business changes.

---

# Phase Notes

| Phase | Addition |
|-------|----------|
| 1 MVP | Single confidence, sources: [Resume] |
| 2 | truthStatus: CLAIMED, extraction confidence split |
| 3 | evidences[] per skill |

---

# Common Mistakes

❌ Documenting prompts in KC-001

❌ Inference Engine bypassing this contract for "quick parse"

❌ Different output shape per LLM provider

❌ Knowledge Engine calling LLM directly

❌ Missing trace_id

---

# Cursor Validation Checklist

- [ ] KC-001 Approved before any IE-001 code
- [ ] Output validates against KM-002
- [ ] Must/Cannot rules enforced in implementation
- [ ] No prompt text in this file
- [ ] trace_id propagated
- [ ] KnowledgeCreated event defined
- [ ] Common Mistakes reviewed
