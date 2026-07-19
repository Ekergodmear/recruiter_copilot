# Import Benchmark

_Generated 2026-07-18T09:37:31.343Z — TECH-002_

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

Sizes: 10, 100, 500, 1000 synthetic DOCX via import pipeline.

## Results (per-resume latency)

| Dataset / Op | N | Average | Median | P95 | Max |
|--------------|---|--------:|-------:|----:|----:|
| Import n=10 | 10 | 34.36ms | 13.62ms | 213.50ms | 213.50ms |
| Import n=100 | 100 | 12.28ms | 12.02ms | 13.71ms | 19.38ms |
| Import n=500 | 500 | 12.46ms | 12.38ms | 13.76ms | 28.76ms |
| Import n=1000 | 1000 | 13.78ms | 13.57ms | 15.91ms | 159.08ms |

## Wall clock (full batch)

| Size | Wall | Failures | Peak RSS (end) |
|-----:|-----:|---------:|---------------:|
| 10 | 359.59ms | 0 | 106.42 MB |
| 100 | 1.28s | 0 | 134.36 MB |
| 500 | 6.41s | 0 | 266.68 MB |
| 1000 | 14.11s | 0 | 383.73 MB |

## Memory snapshots

| Checkpoint | RSS | Heap Used | Heap Total | External |
|------------|----:|----------:|-----------:|---------:|
| start | 81.51 MB | 21.53 MB | 36.19 MB | 4.87 MB |
| after import n=10 | 106.42 MB | 41.33 MB | 60.59 MB | 5.54 MB |
| after import n=100 | 134.36 MB | 61.87 MB | 110.34 MB | 5.56 MB |
| after import n=500 | 266.68 MB | 139.51 MB | 230.59 MB | 5.59 MB |
| after import n=1000 | 383.73 MB | 226.79 MB | 341.76 MB | 5.57 MB |
| end | 383.73 MB | 228.21 MB | 341.76 MB | 5.57 MB |

## Top 5 operations (by total time)

| Operation | Calls | Total | Avg | P95 | Max |
|-----------|------:|------:|----:|----:|----:|
| import.pipeline | 1000 | 13.77s | 13.77ms | 15.91ms | 159.07ms |
| CandidateRepository.findAll | 1000 | 2.44ms | 0.00ms | 0.00ms | 0.06ms |
| CandidateRepository.save | 1000 | 1.80ms | 0.00ms | 0.00ms | 0.05ms |
| KnowledgeRepository.save | 1000 | 0.77ms | 0.00ms | 0.00ms | 0.06ms |
| ResumeRepository.save | 1000 | 0.67ms | 0.00ms | 0.00ms | 0.00ms |

## Notes

- Each size uses a fresh workspace.
- Default persistence: memory. Set `BENCHMARK_PERSISTENCE=prisma` for Prisma.
