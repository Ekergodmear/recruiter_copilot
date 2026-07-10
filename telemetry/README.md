# Telemetry

Per **ADR-000**: every AI operation logs structured telemetry.

## Schema

`schema.json` — validate all telemetry events.

## Required pipeline

```
AI Summary generated
    ↓
Telemetry: inference_completed (latency, tokens, cost, confidence)
    ↓
Recruiter edits / accepts / rejects
    ↓
Telemetry: knowledge_accepted | knowledge_rejected | knowledge_edited (edit_delta_percent)
    ↓
Stored for analytics + future training signals
```

## Sprint 1 implementation

- Log to structured JSON (stdout / file / observability backend)
- Minimum: `contract_id`, `trace_id`, `latency_ms`, `outcome`, `confidence_avg`
- Cost tracking when using paid APIs

## Dashboards (Phase 2)

- Parse latency p50/p95
- Manual correction rate trend
- Cost per resume
- Accept vs reject rate by contract

## Privacy

- No resume content in telemetry
- workspace_id + trace_id only for correlation
