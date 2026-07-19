# TECH-002 — Performance Benchmark & Profiling (Deliverables)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Status | **DONE** |
| CI | **105/105 PASS** |
| verify:data | **PASS** |
| Smoke | **PASS** (with optional `SMOKE_PROFILE`) |
| Foundation Freeze | **Intact** |

---

## 1. Benchmark file tree

```text
scripts/benchmark/
  benchmark-import.ts
  benchmark-review.ts
  benchmark-insight.ts
  benchmark-verify-data.ts
  run-all.ts
  lib/
    docx.ts
    harness.ts
    memory.ts
    report.ts
    seed.ts
    stats.ts
    write-partial-reports.ts

src/shared/profiling/
  operation-profiler.ts
  index.ts

benchmarks/
  baseline.json

reports/
  benchmark-summary.md
  smoke-performance.md          # when SMOKE_PROFILE=true
  benchmarks/
    import.md
    insights.md
    verify-data.md
    review.md
    memory.md
```

---

## 2. Instrumentation

- `OperationProfiler` + `wrapWithProfiler` — timing wrappers only (no APM).
- Benchmark harness wraps repositories **only inside benchmark scripts** via injected `repositories` option.
- Production path: profiler never attached → **no behaviour change**.
- Named spans: `import.pipeline`, `verify:data.check`, insight ops, `CandidateRepository.*`, etc.

---

## 3. DI / wiring (minimal, additive)

`createAppDependencies(config, telemetry?, { repositories? })`

- Optional repo injection for instrumented benchmarks.
- Exposes `repositories` on `AppDependencies` for seed/ops.
- Application services still depend on interfaces only.

---

## 4. Commands

```bash
pnpm bench:import
pnpm bench:review
pnpm bench:insight
pnpm bench:verify-data
pnpm bench:all

# Quick local iteration
BENCHMARK_QUICK=1 pnpm bench:all

# Prisma persistence
BENCHMARK_PERSISTENCE=prisma pnpm bench:all

# Refresh baseline (warning-only compare)
BENCHMARK_UPDATE_BASELINE=1 pnpm bench:all

# Smoke timing (default smoke unchanged)
SMOKE_PROFILE=true pnpm exec tsx scripts/smoke-e2e.ts "C:\Users\Admin\Downloads\Data4SmokeTest"
```

---

## 5. Observed bottlenecks (evidence)

| Area | Evidence | Pattern |
|------|----------|---------|
| **verify:data** | ~1ms @100 → ~26ms @1000 → **~1.6–2.0s P95 @10000** | Near-linear / N+1 resume `findById` per candidate |
| **Job insight** | ~0.5ms @100 → ~3ms @1000 → **~45ms P95 @10000** | Scans candidate pool |
| **Audit replay** | ~5ms P95 @10000 | `findAll()` candidates then filter |
| **Import** | Steady **~13ms avg / ~15ms P95** after warmup; wall 1000 ≈ 14s | Throughput-bound, not pathological |
| **Candidate insight / knowledge get** | &lt;0.2ms even @10000 | Keyed lookup — healthy |

Peak RSS during suite: **~544 MB** (memory driver).

---

## 6. Recommended optimizations (DO NOT implement in TECH-002)

1. **verify:data** — batch resume existence check / index join instead of per-candidate `findById` (biggest Alpha ops win).
2. **Job insight** — avoid full candidate scan; prefilter by ready + skill index when Product requires scale.
3. **Audit replay** — `findById` instead of `findAll` + filter.
4. Re-measure with `BENCHMARK_PERSISTENCE=prisma` before optimizing persistence path.

Rule: **Measure → Report → Decide → Optimize**.

---

## 7. AC checklist

- [x] `pnpm run ci` PASS
- [x] `verify:data` PASS
- [x] smoke PASS (profile optional)
- [x] benchmark scripts reproducible
- [x] reports generated
- [x] baseline JSON + warning-only regression
- [x] no Domain / Application / Workflow / API / telemetry contract changes
- [x] no caching / Redis / CQRS / premature optimization
