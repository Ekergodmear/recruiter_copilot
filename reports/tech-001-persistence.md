# TECH-001 — Persistence Layer (Deliverables)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Status | **DONE** |
| CI | **105/105 PASS** |
| Smoke (Prisma) | **41/41 PASS** |
| verify:data | **PASS** |

---

## 1. File tree (new)

```text
prisma/
  schema.prisma
  seed.ts
  migrations/
    20260718091615_init_tech001/
      migration.sql

src/infrastructure/persistence/
  create-repositories.ts          # DI factory
  prisma/
    prisma-client.ts
    prisma.service.ts
    prisma.module.ts
    prisma-candidate-repository.ts
    prisma-resume-repository.ts
    prisma-job-repository.ts
    prisma-submission-repository.ts
    prisma-interview-repository.ts
    prisma-offer-repository.ts
    prisma-activity-repository.ts
    prisma-knowledge-repository.ts
    mappers/
      candidate-mapper.ts

tests/infrastructure/prisma-persistence.test.ts
```

---

## 2. Modified files

| File | Change |
|------|--------|
| `package.json` | prisma deps + `db:*` scripts; CI runs `db:generate` |
| `.env.example` | `PERSISTENCE_DRIVER`, SQLite `DATABASE_URL` |
| `src/shared/config/app-config.ts` | `persistenceDriver`, `databaseUrl` |
| `src/app/server.ts` | `createRepositories()` DI wiring; health exposes `persistence` |
| `scripts/smoke-e2e.ts` | Forces Prisma + temp SQLite + `db push` |
| Domain restore seams only: `Candidate.restore`, `CandidateStatus.from`, `VerifiedKnowledge.restore`, `KnowledgeObject.fromSnapshot` | Persistence rehydrate — no business rule change |

InMemory repositories **unchanged** and still used by unit tests.

---

## 3. Prisma schema

SQLite provider (`DATABASE_URL=file:./data/recruiter_copilot.db`).

Tables: `CandidateRecord`, `Resume`, `Job`, `Submission`, `Interview`, `Offer`, `PipelineActivity`, `KnowledgeSet`.

Nested domain structures (`VerifiedKnowledge`, profile, identity, knowledge objects) stored as JSON strings — no denormalized business redesign.

---

## 4. Migration

`prisma/migrations/20260718091615_init_tech001/migration.sql` — repeatable via:

```bash
pnpm db:deploy
# or
pnpm db:push
```

---

## 5. Seed

```bash
pnpm db:seed
```

Writes a health marker activity row (smoke creates its own domain data).

---

## 6. DI registration

`createRepositories(config)`:

| Driver | When |
|--------|------|
| `memory` | default (dev/tests); `PERSISTENCE_DRIVER=memory` |
| `prisma` | `PERSISTENCE_DRIVER=prisma` **or** (`NODE_ENV=production` **and** `DATABASE_URL` set) |

Application services still depend only on repository **interfaces**.

---

## 7. Commands

```bash
pnpm db:generate
pnpm db:migrate          # local migrate
pnpm db:deploy           # apply migrations
pnpm db:seed
pnpm run ci
pnpm exec tsx scripts/smoke-e2e.ts "C:\Users\Admin\Downloads\Data4SmokeTest"
```

Production Alpha:

```bash
set PERSISTENCE_DRIVER=prisma
set DATABASE_URL=file:./data/recruiter_copilot.db
pnpm db:deploy
pnpm db:seed
pnpm run start
```

---

## 8. Architectural impact

| Layer | Impact |
|-------|--------|
| Domain | Minimal restore factories only (no rule changes) |
| Application | **Unchanged** |
| Repository interfaces | **Unchanged** |
| REST API | **Unchanged** |
| Telemetry | **Unchanged** |
| Workflow | **Unchanged** |
| Foundation Freeze | **Intact** |
| New | Infrastructure Prisma adapters + DI switch |

---

## 9. AC checklist

- [x] `pnpm run ci` PASS (105 tests)
- [x] `verify:data` PASS
- [x] Smoke PASS with Prisma
- [x] Repository interfaces unchanged
- [x] Application layer unchanged (wiring only)
- [x] REST / telemetry / workflow unchanged
