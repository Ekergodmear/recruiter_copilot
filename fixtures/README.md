# Fixtures

Test fixtures for unit and integration tests — **not** golden evaluation sets.

| Folder | Purpose |
|--------|---------|
| `api/` | Sample API request/response bodies |
| `events/` | Domain event payloads (EV-001, etc.) |
| `knowledge/` | Sample Knowledge Objects per KM-xxx |
| `workspaces/` | Test workspace + user contexts |

## vs evaluation/

- **fixtures/** — fast, synthetic, for unit tests
- **evaluation/** — golden sets for AI regression and quality gates

## Sprint 1

```
fixtures/
  api/import-resume-request.json
  api/import-resume-response-202.json
  events/resume-uploaded.json
  events/resume-stored.json
  knowledge/skill-react-km002.json
  workspaces/recruiter-workspace.json
```

Fixtures must conform to Memory Bank schemas (KC, KM, EV).
