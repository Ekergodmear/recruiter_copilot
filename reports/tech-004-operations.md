# TECH-004 — Structured Logging & Operations

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Status | **DONE** |
| Foundation Freeze | **Intact** |

---

## Logging strategy

| Concern | Approach |
|---------|----------|
| Abstraction | `Logger` interface in `src/shared/logging` |
| Implementation | `ConsoleLogger` (infra) — stdout/stderr |
| Dev format | Human-readable lines (`LOG_FORMAT=pretty` or non-production) |
| Prod format | One JSON object per line (`NODE_ENV=production` or `LOG_FORMAT=json`) |
| Context | `AsyncLocalStorage` request context (`requestId`, `correlationId`, `candidateId`) |
| Telemetry | **Unchanged** — product telemetry events stay in `telemetry/` |

Application / scripts depend on `Logger` + `withOperation`. Fastify built-in logger is disabled to avoid duplicate lines.

---

## Log schema

```json
{
  "timestamp": "2026-07-18T15:00:00.000Z",
  "level": "INFO",
  "service": "recruiter-copilot",
  "message": "resume_import completed",
  "operation": "resume_import",
  "candidateId": "candidate_…",
  "correlationId": "…",
  "requestId": "…",
  "durationMs": 142,
  "result": "SUCCESS"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| timestamp | yes | ISO-8601 |
| level | yes | TRACE/DEBUG/INFO/WARN/ERROR |
| service | yes | from package name / `SERVICE_NAME` |
| operation | when timed | e.g. `resume_import`, `verify:data`, `startup` |
| correlationId | on HTTP | from `x-correlation-id` or = requestId |
| requestId | on HTTP | from `x-request-id` or generated UUID |
| candidateId | if known | set after import / on candidate routes |
| durationMs | timed ops | milliseconds |
| result | timed/errors | SUCCESS / FAILURE / STARTED |
| stack | errors | unhandled / operation failures |

Env knobs: `LOG_LEVEL`, `LOG_FORMAT`, `APP_VERSION`, `BUILD_TIMESTAMP`, `SERVICE_NAME`.

---

## Timed operations

| Operation | Where |
|-----------|--------|
| `startup` | `startServer` |
| `shutdown` | SIGINT / SIGTERM handler |
| `resume_import` | candidate import route |
| `review_session` | GET candidate review |
| `verify:data` | `pnpm verify:data` |
| `benchmark` | `pnpm bench:all` |
| HTTP requests | `onResponse` (health → debug) |

---

## Shutdown sequence

1. Receive `SIGINT` or `SIGTERM`
2. Log `shutdown` STARTED
3. `app.close()` — stop accepting HTTP
4. `disconnectPrisma()`
5. `logger.flush()`
6. Log SUCCESS + `process.exit(0)`

---

## Health endpoint (`GET /health`)

Additive fields (business APIs unchanged):

| Field | Meaning |
|-------|---------|
| status | `ok` or `degraded` (prisma configured but ping failed) |
| persistence | `memory` \| `prisma` |
| database.configured / connected / dialect | connectivity probe |
| uptimeSeconds | process uptime |
| version | package / `APP_VERSION` |
| buildTimestamp | `BUILD_TIMESTAMP` or null |
| feature_flags | unchanged |
| foundation / epic / mode | unchanged |

Response headers: `x-request-id`, `x-correlation-id`.

---

## Deployment notes

```bash
# Dev (pretty logs)
pnpm run dev

# Prod-style JSON logs
set NODE_ENV=production
set LOG_FORMAT=json
set PERSISTENCE_DRIVER=prisma
set DATABASE_URL=file:./data/recruiter_copilot.db
set APP_VERSION=0.1.0
set BUILD_TIMESTAMP=2026-07-18T00:00:00.000Z
pnpm run build && pnpm run start
```

Graceful stop: send SIGTERM to the Node process (Docker/K8s default).

---

## Sample logs

See `reports/samples/tech-004-sample-logs.jsonl`.

---

## Non-goals (confirmed)

No ELK / Grafana / Prometheus / OpenTelemetry / cloud logging.
No Domain / Workflow / REST contract / telemetry event changes.
