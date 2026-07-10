# Contract Validation Schemas

JSON schemas for validating **Knowledge Contract outputs** in CI and evaluation.

These are the executable counterpart to `memory-bank/27-knowledge-contracts/`.

## Files

| Schema | Contract | Knowledge Model |
|--------|----------|-----------------|
| `KC-001-output.schema.json` | KC-001 | KM-002 (array items) |
| `KC-002-output.schema.json` | KC-002 | KM-003 |

## Usage

```bash
# Sprint 1 — implement:
# validate KC output against schema before Knowledge Engine persist
# validate evaluation golden files against same schema
```

## Rule

KC Memory Bank spec is source of truth. Update schema when KC version bumps.

## Test command (Sprint 1)

```
npm run test:contracts
```

Validates:
- All fixtures/knowledge/*.json
- All evaluation/resume/samples/*/expected/*.json
