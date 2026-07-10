# ADR-007 — Zero Prompt Rule

## Status
Accepted

## Date
2026-07-09

## Context
AI projects often document `prompt.md` as architecture. Prompts change with every model update. Business logic becomes entangled with wording.

## Decision
- **Prompts are implementation details** — live in AI Provider code only
- **Business behavior** defined by: Business Rules, Knowledge Contracts, Truth Rules, KM schema
- Memory Bank must **never** depend on prompt wording
- Changing prompts must never require changing business logic or KC

## Alternatives Considered
1. **Prompt registry in Memory Bank** — rejected: becomes stale, treated as contract
2. **Inline prompts in workflow specs** — rejected: same problem

## Consequences

### Positive
- Clear separation of stable vs volatile
- Model migration is provider swap
- Cursor implements from contracts, not prose prompts

### Negative
- Prompt engineering happens in codebase, not docs
- Less visibility of exact prompts in Memory Bank (intentional)

## Related
- `28-ai-providers/`
- ADR-006
- `.cursor/rules/memory-bank.mdc`
