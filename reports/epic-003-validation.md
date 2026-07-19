# EPIC-003 Validation Report — Candidate ↔ Job Relationship Foundation

| Field           | Value                                                                       |
| --------------- | --------------------------------------------------------------------------- |
| Epic            | EPIC-003 — Candidate ↔ Job Relationship Foundation                          |
| Spec            | [PR #16](https://github.com/Ekergodmear/recruiter_copilot/pull/16) (merged) |
| Implementation  | [PR #17](https://github.com/Ekergodmear/recruiter_copilot/pull/17) (merged) |
| Validation date | 2026-07-19                                                                  |
| Baseline        | `founder-alpha-2` / `main` + EPIC-001 + EPIC-002 COMPLETED                  |
| Runtime script  | `pnpm exec tsx scripts/validate-epic-003.ts`                                |
| Evidence JSON   | `reports/epic-003-validation-evidence.json`                                 |
| **Verdict**     | **PASS**                                                                    |

---

## Definition of Done (from Spec)

| DoD item                             | Result                    |
| ------------------------------------ | ------------------------- |
| AC-1…AC-10 PASS                      | **PASS**                  |
| Candidate Workspace regression: NONE | **PASS**                  |
| Job Workspace regression: NONE       | **PASS**                  |
| Resume Import regression: NONE       | **PASS**                  |
| `GET /health` PASS                   | **PASS** (`status: "ok"`) |
| `pnpm run ci` PASS                   | **PASS**                  |
| Validation Report completed          | **This PR**               |

---

## Acceptance Criteria

| AC        | Criterion                         | Evidence                                                                                         | Result   |
| --------- | --------------------------------- | ------------------------------------------------------------------------------------------------ | -------- |
| **AC-1**  | Create Relationship               | Runtime `create` — POST → 201; body has `candidateId`, `jobId`, `status: "Sourced"`              | **PASS** |
| **AC-2**  | List theo Candidate               | Runtime `list-candidate` — GET `/candidates/:id/relationships` → 200                             | **PASS** |
| **AC-3**  | List theo Job                     | Runtime `list-job` — GET `/jobs/:id/relationships` → 200                                         | **PASS** |
| **AC-4**  | Update Status                     | Runtime `status` — Sourced → Applied → Screening; reload confirms `Screening`                    | **PASS** |
| **AC-5**  | N:N + uniqueness                  | Runtime `nn` — 2 jobs / 2 candidates; `uniqueness` — duplicate → **409**, count stays 1          | **PASS** |
| **AC-6**  | Candidate Workspace no regression | Runtime `candidate-workspace` — detail + list 200                                                | **PASS** |
| **AC-7**  | Job Workspace no regression       | Runtime `job-create` + `job-workspace` — create/get/list 200; `source: "manual"`                 | **PASS** |
| **AC-8**  | Resume Import no regression       | Runtime `import` — two imports succeed                                                           | **PASS** |
| **AC-9**  | `/health`                         | ok before and after mutations                                                                    | **PASS** |
| **AC-10** | `pnpm run ci`                     | Full CI green (see below)                                                                        | **PASS** |

---

## Edge cases (reviewer notes from PR #17)

| Check                                         | Expected                         | Observed                                      | Result |
| --------------------------------------------- | -------------------------------- | --------------------------------------------- | ------ |
| Missing Candidate on create                   | 404                              | `missingCand: 404`                            | PASS   |
| Missing Job on create                         | 404                              | `missingJob: 404`                             | PASS   |
| Duplicate `(candidateId, jobId)`              | 409; no extra row                | `DUPLICATE_RELATIONSHIP`; `countForJob1: 1`   | PASS   |
| Status transitions Sourced→Applied→Screening | Persist; reload shows Screening  | confirmed in `status` step                    | PASS   |

---

## Runtime verification summary

```bash
pnpm exec tsx scripts/validate-epic-003.ts
```

- `verdict`: **PASS**
- Steps: **13/13** passed
- Generated at: see `reports/epic-003-validation-evidence.json`

Method: in-process Fastify `inject` (same pattern as EPIC-001 / EPIC-002 validation).

---

## `pnpm run ci`

| Check            | Result                      |
| ---------------- | --------------------------- |
| `db:generate`    | PASS                        |
| `format:check`   | PASS                        |
| `lint`           | PASS                        |
| `build`          | PASS                        |
| `test`           | **121/121 PASS** (34 files) |
| `test:contracts` | PASS                        |
| `eval:resume`    | PASS                        |
| `verify:data`    | PASS                        |
| `security:smoke` | PASS                        |
| **Overall**      | **PASS** (`CI_EXIT=0`, 2026-07-19) |

---

## Out of scope confirmation

Validation did **not** require: Matching, AI, score/fit/recommendation, Pipeline / Kanban / workflow engine, Submission rewrite, TECH, architecture redesign.

Ubiquitous language verified in runtime payloads: aggregate remains **`CandidateJobRelationship`** / relationship APIs — not Application as root.

---

## Governance

| Gate                                    | Result |
| --------------------------------------- | ------ |
| Matches Spec PR #16                     | PASS   |
| No scope creep vs Implementation PR #17 | PASS   |
| Foundation Freeze intact                | PASS   |
| `main` deployable                       | PASS   |

---

## Final decision

```text
EPIC-003 — Candidate ↔ Job Relationship Foundation: PASS
```

**Recommendation:** Approve & merge this Validation Report; close EPIC-003.
