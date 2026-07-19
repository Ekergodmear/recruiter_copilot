# Review Benchmark

_Generated 2026-07-18T09:37:33.326Z — TECH-002_

## Environment

| Key | Value |
|-----|-------|
| CPU | AMD Ryzen 7 5800H with Radeon Graphics          × 16 |
| RAM | 15755 MB total / 958 MB free |
| Node | v24.11.1 |
| Platform | win32 x64 |
| Persistence | memory |
| Database | n/a (memory) |

## Results

### getReview

| Dataset / Op | N | Average | Median | P95 | Max |
|--------------|---|--------:|-------:|----:|----:|
| n=10 | 10 | 1.77ms | 1.00ms | 8.58ms | 8.58ms |
| n=50 | 50 | 1.06ms | 1.02ms | 1.35ms | 1.72ms |

### markReady

| Dataset / Op | N | Average | Median | P95 | Max |
|--------------|---|--------:|-------:|----:|----:|
| n=10 | 10 | 0.91ms | 0.83ms | 1.64ms | 1.64ms |
| n=50 | 50 | 0.95ms | 0.91ms | 1.33ms | 1.60ms |

## Memory snapshots

| Checkpoint | RSS | Heap Used | Heap Total | External |
|------------|----:|----------:|-----------:|---------:|
| start | 576.53 MB | 427.12 MB | 512.61 MB | 5.53 MB |
| after review n=10 | 555.15 MB | 205.62 MB | 361.51 MB | 5.65 MB |
| after review n=50 | 556.48 MB | 186.37 MB | 362.51 MB | 5.53 MB |
| end | 556.48 MB | 186.37 MB | 362.51 MB | 5.53 MB |

## Top 5 operations (by total time)

| Operation | Calls | Total | Avg | P95 | Max |
|-----------|------:|------:|----:|----:|----:|
| review.getReview | 50 | 52.88ms | 1.06ms | 1.35ms | 1.72ms |
| review.knowledgeAccept | 50 | 48.03ms | 0.96ms | 1.38ms | 1.74ms |
| review.markReady | 50 | 47.10ms | 0.94ms | 1.33ms | 1.59ms |
| CandidateRepository.findById | 300 | 0.26ms | 0.00ms | 0.00ms | 0.00ms |
| CandidateRepository.findAll | 200 | 0.25ms | 0.00ms | 0.00ms | 0.00ms |

