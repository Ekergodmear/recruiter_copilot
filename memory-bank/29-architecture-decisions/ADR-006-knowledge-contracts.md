# ADR-006 — Knowledge Contracts as Stable Interface

## Status
Accepted

## Date
2026-07-09

## Context
Inference Engine was being designed before interfaces were defined — risk of embedding LLM logic into business. LLM providers change frequently (GPT → Gemini → Local).

## Decision
- Define **Knowledge Contracts (KC-xxx)** as stable interfaces between engines
- Inference Engine **executes contracts**, does not ad-hoc parse
- AI Providers implement contracts; LLMs are plugins
- Output must conform to KM-xxx regardless of provider

## Alternatives Considered
1. **Prompt files in Memory Bank** — rejected: prompts are volatile
2. **Inference specs without contracts** — rejected: no swap-ability
3. **LLM-as-architecture** — rejected: vendor lock-in

## Consequences

### Positive
- Swap LLM without business changes
- Hexagonal Architecture for AI
- Testable with mock providers

### Negative
- Upfront contract design effort
- Cannot "just prompt" a feature

## Related
- `27-knowledge-contracts/`
- `28-ai-providers/`
- ADR-007, ADR-010
