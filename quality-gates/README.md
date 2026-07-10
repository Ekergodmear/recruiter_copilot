# Quality Gates

Per **ADR-000**: CI and release checks. **No AI feature merge without passing gates.**

## Sprint 1

See `sprint-1.yaml`

## Gate types

| Gate | Source | Blocks merge if |
|------|--------|-----------------|
| `eval_resume_accuracy` | evaluation/resume/ | F1 < 90% vs golden |
| `eval_resume_latency_p95` | evaluation/resume/ | p95 > 8s |
| `upload_success_rate` | integration tests | < 95% |
| `manual_correction_rate` | telemetry aggregate | > 15% (post-launch monitor) |
| `contract_schema_valid` | contracts/ | KC output fails JSON schema |

## AI feature merge checklist

- [ ] Evaluation dataset exists and has ≥ 10 samples (grow to 100)
- [ ] `npm run eval:*` passes quality gates
- [ ] Telemetry schema implemented for contract
- [ ] Feature flag defined in feature-flags/
- [ ] Quality gate thresholds in quality-gates/

## Non-AI features

Standard unit/integration tests sufficient. Quality gates primarily govern AI/KC paths.
