# TECH-005 — Security Hardening

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Status | **DONE** |
| Foundation Freeze | **Intact** |

---

## What changed

| Area | Implementation |
|------|----------------|
| Upload validation | `validateResumeUpload` — MIME, extension, size, empty, PDF/DOCX magic |
| Filename sanitize | `sanitizeUploadFilename` + storage path containment |
| Temp cleanup | `cleanupMultipartTemp` in `finally` after multipart consume |
| Request limits | `MAX_FILE_SIZE_BYTES`, `MAX_JSON_BODY_BYTES`, `MAX_REQUEST_BODY_BYTES` |
| Security headers | nosniff, DENY frame, Referrer-Policy, CSP, Permissions-Policy; no X-Powered-By |
| Rate limit | In-memory per IP on POST/PUT/PATCH/DELETE; `/health` excluded |
| Input validation | Resource ID format; reject unexpected JSON fields on mutating DTOs |
| Error exposure | Generic 500 message; stack only in structured logs |

Domain / Application business rules / Workflow / Telemetry contracts / REST response shapes for success paths: **unchanged**.

---

## Configuration

| Env | Default | Notes |
|-----|---------|-------|
| `MAX_FILE_SIZE_BYTES` | 10485760 | Upload max |
| `MAX_JSON_BODY_BYTES` | 1048576 | Multipart field size |
| `MAX_REQUEST_BODY_BYTES` | ~file+64k | Fastify `bodyLimit` |
| `RATE_LIMIT_ENABLED` | prod=`true`, else `false` | Set explicitly for smoke |
| `RATE_LIMIT_WINDOW_MS` | 60000 | Window |
| `RATE_LIMIT_MAX` | 120 | Max mutating reqs / IP / window |

See `.env.example`.

---

## Error codes (additive / reused)

| Code | HTTP | When |
|------|------|------|
| `EMPTY_FILE` | 400 | Zero-byte upload |
| `FILE_TOO_LARGE` | 413 | Over max size |
| `UNSUPPORTED_FORMAT` | 400 | Bad MIME/extension |
| `CORRUPT_FILE` | 422 | Bad PDF/DOCX structure |
| `INVALID_ID` | 400 | Bad path param id |
| `UNEXPECTED_FIELD` | 400 | Extra JSON keys |
| `RATE_LIMITED` | 429 | Over rate |
| `INTERNAL_ERROR` | 500 | Generic — no stack to client |

---

## Commands

```bash
pnpm run ci                 # includes security:smoke
pnpm security:smoke
pnpm exec tsx scripts/smoke-e2e.ts "C:\Users\Admin\Downloads\Data4SmokeTest"
```

---

## Files

```
src/shared/security/*
src/app/security-plugin.ts
tests/security/security-hardening.test.ts
scripts/security-smoke.ts
reports/tech-005-security.md
```

Presentation routes wired for upload + DTO allow-lists: candidate, job, recruitment, UX telemetry.
