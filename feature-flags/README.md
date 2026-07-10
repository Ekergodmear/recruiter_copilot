# Feature Flags

Per **ADR-000** — feature flags from Sprint 1 for gradual AI rollout.

## Sprint 1 defaults

See `sprint-1.yaml`

| Flag | Default | Description |
|------|---------|-------------|
| `ai.parsing.enabled` | `true` | KC-001, KC-002 resume parsing |
| `ai.truth_engine.enabled` | `false` | Truth resolution runtime (Phase 2) |
| `ai.knowledge_graph.enabled` | `false` | Graph queries (Phase 3) |
| `ai.semantic_search.enabled` | `false` | Vector search (Sprint 2+) |
| `ai.duplicate_detection.enabled` | `false` | WF-003 (Sprint 2) |
| `ai.matching.enabled` | `false` | KC-007 (Sprint 3) |

## Usage

```typescript
if (flags.isEnabled('ai.parsing.enabled')) {
  await inferenceEngine.execute('KC-001', input);
}
```

## Rules

- OFF flags must not load AI provider or incur cost
- Flag changes do not require KC changes
- Document new flags in ADR-000 appendix when adding AI features
