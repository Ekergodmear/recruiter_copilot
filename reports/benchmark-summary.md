# Benchmark Summary

_Generated 2026-07-18T09:37:33.329Z — TECH-002_

## Environment

| Key | Value |
|-----|-------|
| CPU | AMD Ryzen 7 5800H with Radeon Graphics          × 16 |
| RAM | 15755 MB total / 1274 MB free |
| Node | v24.11.1 |
| Platform | win32 x64 |
| Persistence | memory |
| Database | n/a (memory) |

## Dataset

- Import sizes: 10,100,500,1000
- Insight sizes: 100,1000,5000,10000
- verify:data sizes: 100,1000,10000

## Results (key P95 / wall)

| Metric | Value |
|--------|------:|
| import.avg_ms.1000 | 13.78ms |
| import.max_ms.1000 | 159.08ms |
| import.p95_ms.10 | 213.50ms |
| import.p95_ms.100 | 13.71ms |
| import.p95_ms.1000 | 15.91ms |
| import.p95_ms.500 | 13.76ms |
| import.wall_ms.10 | 359.59ms |
| import.wall_ms.100 | 1.28s |
| import.wall_ms.1000 | 14.11s |
| import.wall_ms.500 | 6.41s |
| insight.audit_replay.avg_ms.1000 | 0.03ms |
| insight.audit_replay.avg_ms.10000 | 0.03ms |
| insight.audit_replay.p95_ms.100 | 0.14ms |
| insight.audit_replay.p95_ms.1000 | 0.06ms |
| insight.audit_replay.p95_ms.10000 | 0.06ms |
| insight.audit_replay.p95_ms.5000 | 0.07ms |
| insight.candidate_insight.avg_ms.1000 | 0.04ms |
| insight.candidate_insight.avg_ms.10000 | 0.04ms |
| insight.candidate_insight.p95_ms.100 | 0.10ms |
| insight.candidate_insight.p95_ms.1000 | 0.05ms |
| insight.candidate_insight.p95_ms.10000 | 0.05ms |
| insight.candidate_insight.p95_ms.5000 | 0.06ms |
| insight.job_insight.avg_ms.1000 | 1.77ms |
| insight.job_insight.avg_ms.10000 | 14.18ms |
| insight.job_insight.p95_ms.100 | 0.43ms |
| insight.job_insight.p95_ms.1000 | 2.45ms |
| insight.job_insight.p95_ms.10000 | 16.54ms |
| insight.job_insight.p95_ms.5000 | 13.76ms |
| insight.knowledge_retrieval.avg_ms.1000 | 0.00ms |
| insight.knowledge_retrieval.avg_ms.10000 | 0.00ms |
| insight.knowledge_retrieval.p95_ms.100 | 0.01ms |
| insight.knowledge_retrieval.p95_ms.1000 | 0.01ms |
| insight.knowledge_retrieval.p95_ms.10000 | 0.00ms |
| insight.knowledge_retrieval.p95_ms.5000 | 0.00ms |
| review.getReview.p95_ms.10 | 8.58ms |
| review.getReview.p95_ms.50 | 1.35ms |
| review.markReady.p95_ms.10 | 1.64ms |
| review.markReady.p95_ms.50 | 1.33ms |
| verify.avg_ms.1000 | 2.03ms |
| verify.avg_ms.10000 | 20.86ms |
| verify.p95_ms.100 | 2.03ms |
| verify.p95_ms.1000 | 2.86ms |
| verify.p95_ms.10000 | 30.05ms |

**Peak memory (RSS):** 576.53 MB

**Slowest recorded metric:** `import.wall_ms.1000` = 14.11s

## Top 5 operations (by total time)

| Operation | Calls | Total | Avg | P95 | Max |
|-----------|------:|------:|----:|----:|----:|
| import.pipeline | 1000 | 13.77s | 13.77ms | 15.91ms | 159.07ms |
| job_insight | 20 | 283.51ms | 14.18ms | 16.54ms | 28.67ms |
| verify:data.check | 5 | 104.12ms | 20.82ms | 30.01ms | 30.01ms |
| review.getReview | 50 | 52.88ms | 1.06ms | 1.35ms | 1.72ms |
| review.knowledgeAccept | 50 | 48.03ms | 0.96ms | 1.38ms | 1.74ms |

## Regression vs baseline

_Threshold ±10% — warning only, no CI failure._

⚠ **6 regressed** metric(s)

| Metric | Baseline | Current | Δ% | Verdict |
|--------|---------:|--------:|----:|---------|
| import.max_ms.1000 | 61.36ms | 159.08ms | 159.2% | Regressed |
| review.getReview.p95_ms.10 | 3.32ms | 8.58ms | 158.2% | Regressed |
| verify.p95_ms.100 | 1.61ms | 2.03ms | 26.6% | Regressed |
| import.max_ms.500 | 23.45ms | 28.76ms | 22.6% | Regressed |
| insight.audit_replay.p95_ms.5000 | 0.06ms | 0.07ms | 21.9% | Regressed |
| import.max_ms.100 | 16.72ms | 19.38ms | 15.9% | Regressed |
| import.p95_ms.100 | 13.54ms | 13.71ms | 1.3% | Stable |
| import.avg_ms.100 | 12.14ms | 12.28ms | 1.2% | Stable |
| import.wall_ms.100 | 1.26s | 1.28s | 1.1% | Stable |
| import.p95_ms.10 | 216.87ms | 213.50ms | -1.6% | Stable |
| import.max_ms.10 | 216.87ms | 213.50ms | -1.6% | Stable |
| import.avg_ms.10 | 35.18ms | 34.36ms | -2.3% | Stable |
| import.wall_ms.10 | 368.99ms | 359.59ms | -2.5% | Stable |
| verify.avg_ms.100 | 0.63ms | 0.58ms | -7.3% | Stable |
| insight.knowledge_retrieval.p95_ms.100 | 0.01ms | 0.01ms | -9.0% | Stable |
| insight.knowledge_retrieval.avg_ms.100 | 0.01ms | 0.01ms | -13.4% | Improved |
| insight.candidate_insight.p95_ms.5000 | 0.07ms | 0.06ms | -14.4% | Improved |
| review.getReview.p95_ms.50 | 1.66ms | 1.35ms | -18.2% | Improved |
| import.wall_ms.1000 | 17.89s | 14.11s | -21.1% | Improved |
| import.avg_ms.1000 | 17.47ms | 13.78ms | -21.1% | Improved |
| import.wall_ms.500 | 8.15s | 6.41s | -21.3% | Improved |
| import.avg_ms.500 | 15.84ms | 12.46ms | -21.4% | Improved |
| review.markReady.p95_ms.50 | 1.76ms | 1.33ms | -24.4% | Improved |
| insight.audit_replay.p95_ms.10000 | 0.08ms | 0.06ms | -28.8% | Improved |
| import.p95_ms.1000 | 22.85ms | 15.91ms | -30.4% | Improved |
| import.p95_ms.500 | 19.78ms | 13.76ms | -30.4% | Improved |
| insight.candidate_insight.avg_ms.100 | 0.16ms | 0.11ms | -30.7% | Improved |
| insight.candidate_insight.avg_ms.5000 | 0.05ms | 0.04ms | -31.0% | Improved |
| insight.candidate_insight.p95_ms.10000 | 0.07ms | 0.05ms | -33.5% | Improved |
| insight.audit_replay.avg_ms.5000 | 0.04ms | 0.03ms | -36.9% | Improved |
| insight.job_insight.p95_ms.5000 | 21.99ms | 13.76ms | -37.4% | Improved |
| insight.candidate_insight.avg_ms.10000 | 0.06ms | 0.04ms | -37.6% | Improved |
| insight.audit_replay.p95_ms.100 | 0.22ms | 0.14ms | -37.9% | Improved |
| insight.knowledge_retrieval.p95_ms.10000 | 0.01ms | 0.00ms | -38.7% | Improved |
| insight.knowledge_retrieval.p95_ms.1000 | 0.01ms | 0.01ms | -39.1% | Improved |
| insight.audit_replay.avg_ms.100 | 0.90ms | 0.54ms | -39.8% | Improved |
| insight.job_insight.avg_ms.5000 | 14.22ms | 8.47ms | -40.4% | Improved |
| insight.job_insight.avg_ms.10000 | 24.26ms | 14.18ms | -41.5% | Improved |
| insight.audit_replay.p95_ms.1000 | 0.11ms | 0.06ms | -41.6% | Improved |
| insight.job_insight.p95_ms.10000 | 28.35ms | 16.54ms | -41.6% | Improved |
| insight.job_insight.avg_ms.1000 | 3.09ms | 1.77ms | -42.8% | Improved |
| insight.audit_replay.avg_ms.10000 | 0.05ms | 0.03ms | -43.2% | Improved |
| insight.audit_replay.avg_ms.1000 | 0.06ms | 0.03ms | -45.8% | Improved |
| insight.knowledge_retrieval.avg_ms.1000 | 0.01ms | 0.00ms | -46.3% | Improved |
| insight.job_insight.p95_ms.1000 | 4.61ms | 2.45ms | -46.9% | Improved |
| insight.knowledge_retrieval.avg_ms.10000 | 0.01ms | 0.00ms | -48.7% | Improved |
| verify.avg_ms.10000 | 41.17ms | 20.86ms | -49.3% | Improved |
| insight.job_insight.avg_ms.100 | 0.53ms | 0.25ms | -52.1% | Improved |
| verify.p95_ms.10000 | 63.22ms | 30.05ms | -52.5% | Improved |
| insight.candidate_insight.p95_ms.100 | 0.21ms | 0.10ms | -52.5% | Improved |
| insight.job_insight.p95_ms.100 | 0.99ms | 0.43ms | -56.9% | Improved |
| insight.candidate_insight.avg_ms.1000 | 0.10ms | 0.04ms | -61.0% | Improved |
| insight.knowledge_retrieval.avg_ms.5000 | 0.01ms | 0.00ms | -62.1% | Improved |
| verify.avg_ms.1000 | 5.47ms | 2.03ms | -63.0% | Improved |
| verify.p95_ms.1000 | 7.89ms | 2.86ms | -63.7% | Improved |
| insight.candidate_insight.p95_ms.1000 | 0.16ms | 0.05ms | -71.6% | Improved |
| review.markReady.p95_ms.10 | 7.12ms | 1.64ms | -76.9% | Improved |
| insight.knowledge_retrieval.p95_ms.5000 | 0.02ms | 0.00ms | -77.6% | Improved |

## Detail reports

- [import.md](./benchmarks/import.md)
- [insights.md](./benchmarks/insights.md)
- [verify-data.md](./benchmarks/verify-data.md)
- [review.md](./benchmarks/review.md)
- [memory.md](./benchmarks/memory.md)

## TECH-003 targets (hotspots)

| Hotspot | Before (TECH-002) | After | Target | Verdict |
|---------|------------------:|------:|--------|---------|
| verify:data @10k P95 | 2.04s | 30.05ms | <1.0s | Improved |
| job_insight @10k P95 | 45.11ms | 16.54ms | <25ms | Improved |
| audit_replay @10k P95 | 5.20ms | 0.06ms | <2ms | Improved |

## Remaining bottlenecks

1. Import wall clock for 1000 CVs (~14s sequential) — product throughput, not a correctness hotspot.
2. Job insight still O(ready candidates) for exact match counts — acceptable under 25ms @10k.

## Regression notes

Comparison is warning-only. CI does not fail on regression.
Sub-millisecond and cold-start (first import batch) deltas are noise unless >10% on P95 hotspots.
