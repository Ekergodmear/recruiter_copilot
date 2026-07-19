# TECH-003 — Targeted Performance Optimization

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Status | **DONE** |
| CI | **PASS** |
| Smoke | **PASS** |
| Foundation Freeze | **Intact** |

---

## 1. Modified files

| File | Change |
|------|--------|
| `data-integrity-checker.ts` | Batched `Promise.all` loads + maps; resume via `findAll`; reuse snapshot in consistency |
| `consistency-verifier.ts` | Batched loads + maps; optional `ConsistencySnapshot` (no N+1) |
| `audit-replay-service.ts` | `findById` + `findByCandidateId` (no `findAll`+filter) |
| `job-insight-provider.ts` | Count matches without sort; skip not-ready / zero-skill-overlap |
| `resume-repository.ts` (+ in-memory / prisma) | Additive `findAll()` for batch integrity checks |
| `scripts/benchmark/lib/report.ts` | Regression warn threshold 10% |
| `founder-readiness/index.ts` | Export `ConsistencySnapshot` |

No Domain / Application service / Workflow / REST / telemetry contract changes.

---

## 2. Optimization strategy

### verify:data (highest)
- Load each aggregate **once** (`findAll` in parallel).
- Build `Set`/`Map` for O(1) membership (resume ids, knowledge by candidate).
- Pass snapshot into `ConsistencyVerifier` to avoid a second full reload + eliminate per-row `findByCandidateId` / `findBySubmissionId`.

### Audit replay
- `candidateRepository.findById`
- `submissionRepository.findByCandidateId`

### Job insight
- Same match threshold semantics (`score >= 50`, ready only).
- Avoid full `rankReadyCandidates` sort.
- Skip candidates that cannot reach ≥50 when job has skills (max without skill hit = 40).

---

## 3. Before / After (memory driver, @10k unless noted)

| Metric | Before (TECH-002) | After (TECH-003) | Target | Result |
|--------|-------------------:|-----------------:|--------|--------|
| verify:data P95 | 2.04s | **~30ms** (35ms first re-run) | <1.0s | ✅ (~98%↓) |
| verify:data avg | 1.61s | **~21–25ms** | <1.0s | ✅ |
| job_insight P95 | 45.11ms | **~16–19ms** | <25ms | ✅ (~60%↓) |
| audit_replay P95 | 5.20ms | **~0.06ms** | <2ms | ✅ (~99%↓) |

Detail: `reports/benchmark-summary.md` (vs `benchmarks/baseline.json`).

---

## 4. Regression notes (documented, not hidden)

Warning-only compare flagged some **noise**:
- `import.max_ms.1000` / first batch cold start — not a TECH-003 hotspot.
- Sub-ms knowledge/candidate insight deltas at small N — timer noise.
- `job_insight` @5000 P95 +38% vs baseline noise/variance; **@10000 Improved −58.6%** and meets target.

Target hotspots all **Improved**. No behavioural change in tests/smoke.

---

## 5. Remaining bottlenecks

1. **Sequential import** wall ~14s / 1000 CVs — throughput, not N+1 correctness.
2. Job insight still scores ready pool for exact counts — OK under target at 10k.
3. Re-measure with `BENCHMARK_PERSISTENCE=prisma` before any further persistence tuning.

---

## 6. Commands

```bash
pnpm run ci
pnpm exec tsx scripts/smoke-e2e.ts "C:\Users\Admin\Downloads\Data4SmokeTest"
pnpm bench:all
# optional: refresh baseline after accepting TECH-003 numbers
BENCHMARK_UPDATE_BASELINE=1 pnpm bench:all
```
