# ADR-000 — Product Success Metrics

## Status
Accepted — **Highest priority.** Governs all sprints and AI feature merges.

## Date
2026-07-09

## Context
Architecture v3.0 defines business, knowledge, contracts, and inference — but never answers: **how do we know the project succeeded?**

Technical success (`200 OK`, `generated`, `found 200 candidates`) is not product success.

Without measurable KPIs, AI features ship without accountability. Model changes become guesswork. Recruiters cannot validate value.

## Decision

### 1. Every sprint has explicit KPIs

Success is measured in **recruiter outcomes and quality metrics**, not HTTP status codes.

### 2. Every AI feature requires before merge

- **Evaluation dataset** (golden inputs + expected outputs)
- **Telemetry** (latency, cost, confidence, accept/reject, manual edit rate)
- **Quality gate** (KPI thresholds in `quality-gates/`)

**No AI feature merges without all three.** Non-negotiable.

### 3. Sprint KPIs

#### Sprint 1 — Resume Import & Parse

| Metric | Target |
|--------|--------|
| Resume upload success rate | ≥ 95% |
| Upload failure rate | < 2% |
| Average parse latency (p95) | < 8s |
| Knowledge extraction accuracy vs golden set | ≥ 90% |
| Manual correction rate (recruiter edits AI output) | < 15% |
| End-to-end recruiter time (upload → profile visible) | < 20s |

#### Sprint 2 — Duplicate Detection & Enrichment

| Metric | Target |
|--------|--------|
| Duplicate detection precision | ≥ 95% |
| Duplicate detection recall | ≥ 90% |
| False merge rate | < 1% |

#### Sprint 3 — Matching & Search

| Metric | Target |
|--------|--------|
| Top-5 match relevance (recruiter-rated) | ≥ 85% |
| Semantic search top-10 relevance | ≥ 90% |
| AI summary edit rate | < 20% |

### 4. AI improvement loop

AI success is not `works` — it is **`works better over time`**.

Telemetry from production feeds evaluation regression. Model swaps (GPT → Gemini → Local) require benchmark pass on evaluation datasets.

### 5. Feature flags from Sprint 1

| Flag | Sprint 1 Default |
|------|------------------|
| `ai.parsing.enabled` | ON |
| `ai.truth_engine.enabled` | OFF |
| `ai.knowledge_graph.enabled` | OFF |
| `ai.semantic_search.enabled` | OFF |

Gradual rollout without architecture changes.

### 6. Evaluation datasets (golden sets)

| Dataset | Location | Size Target |
|---------|----------|-------------|
| Resumes + golden Knowledge output | `evaluation/resume/` | 100 |
| Job descriptions + golden requirements | `evaluation/jobs/` | 100 |
| Candidate-Job match pairs | `evaluation/matching/` | 500 |

Knowledge Contract + Evaluation Dataset = inseparable pair. KC defines interface; evaluation proves it works.

### 7. Telemetry (every AI operation)

Required fields per AI call:

```
latency_ms, tokens_in, tokens_out, cost_usd, model_id,
contract_id, trace_id, confidence_avg,
outcome: accepted | rejected | edited,
edit_delta_percent, workspace_id, timestamp
```

Stored for: cost control, quality monitoring, future training signals.

## Alternatives Considered

1. **Ship without metrics** — rejected: blind AI product
2. **Manual testing only** — rejected: cannot benchmark model swaps
3. **Metrics only in Memory Bank** — rejected: must be executable infrastructure at repo root

## Consequences

### Positive
- Objective sprint success criteria
- Safe LLM migration via regression benchmarks
- Product learns from recruiter accept/reject/edit signals
- Founder/CTO can answer "is this working?"

### Negative
- Upfront effort to build golden datasets
- CI must run evaluation (acceptable cost)

## Related

- `quality-gates/sprint-1.yaml`
- `telemetry/schema.json`
- `evaluation/`
- `feature-flags/sprint-1.yaml`
- ADR-006 (KC), ADR-007 (Zero Prompt)
- `01-project-scope.md` performance targets

## Product Positioning

Recruiter Copilot is a **Recruitment Intelligence Platform**:

- ATS = module
- CRM = module  
- AI = component
- LLM = plugin
- **Knowledge = asset**
- **Truth = advantage**
- **Evaluation = quality protection**
