# AWR Fixes — Production Deploy (Tech Lead review)

**Date:** 2026-07-19  
**Status:** Required fixes applied — ready for TL re-review / merge decision  
**Issue tracked:** https://github.com/Ekergodmear/recruiter_copilot/issues/1

## Fixes

| # | TL comment | Done |
|---|------------|------|
| 1 | Do not publish Postgres `5432` | `ports` removed; `expose: ["5432"]` only |
| 2 | `prisma db push` Alpha-only TODO | Comment in `scripts/docker-entrypoint.sh` |
| 3 | Fastify deprecation → issue | GitHub issue #1 |
| 4 | Weak password in example | `POSTGRES_PASSWORD=CHANGE_ME_BEFORE_PRODUCTION`; compose requires env |
| 5 | CI `format:check` | `pnpm run format` + full `pnpm run ci` **green** |

## Re-verify

```
aiheadhunter-api-1        Up (healthy)   0.0.0.0:3000->3000/tcp
aiheadhunter-postgres-1   Up (healthy)   5432/tcp   ← no host publish
GET /health → "status":"ok", persistence prisma, postgres connected
pnpm run ci → PASS
```

## Not started

TECH-006 Production Hardening — wait for merge, per TL.
