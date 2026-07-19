# verify:data Benchmark

_Generated 2026-07-18T09:37:32.382Z — TECH-002_

## Environment

| Key | Value |
|-----|-------|
| CPU | AMD Ryzen 7 5800H with Radeon Graphics          × 16 |
| RAM | 15755 MB total / 1022 MB free |
| Node | v24.11.1 |
| Platform | win32 x64 |
| Persistence | memory |
| Database | n/a (memory) |

## Dataset

Repeats: 5.

## Results

| Dataset / Op | N | Average | Median | P95 | Max |
|--------------|---|--------:|-------:|----:|----:|
| verify:data n=100 | 5 | 0.58ms | 0.22ms | 2.03ms | 2.03ms |
| verify:data n=1000 | 5 | 2.03ms | 1.85ms | 2.86ms | 2.86ms |
| verify:data n=10000 | 5 | 20.86ms | 19.66ms | 30.05ms | 30.05ms |

| Size | Errors (last run) |
|-----:|------------------:|
| 100 | 0 |
| 1000 | 0 |
| 10000 | 0 |

## Memory snapshots

| Checkpoint | RSS | Heap Used | Heap Total | External |
|------------|----:|----------:|-----------:|---------:|
| start | 496.74 MB | 309.40 MB | 435.41 MB | 5.53 MB |
| after seed n=100 | 497.06 MB | 310.89 MB | 435.41 MB | 5.53 MB |
| after verify n=100 | 497.15 MB | 311.95 MB | 435.41 MB | 5.53 MB |
| after seed n=1000 | 499.41 MB | 324.58 MB | 437.66 MB | 5.53 MB |
| after verify n=1000 | 497.77 MB | 332.84 MB | 437.91 MB | 5.53 MB |
| after seed n=10000 | 545.68 MB | 384.38 MB | 482.82 MB | 5.53 MB |
| after verify n=10000 | 576.51 MB | 427.08 MB | 512.61 MB | 5.53 MB |
| end | 576.51 MB | 427.08 MB | 512.61 MB | 5.53 MB |

## Top 5 operations (by total time)

| Operation | Calls | Total | Avg | P95 | Max |
|-----------|------:|------:|----:|----:|----:|
| verify:data.check | 5 | 104.12ms | 20.82ms | 30.01ms | 30.01ms |
| CandidateRepository.findAll | 5 | 2.92ms | 0.58ms | 0.69ms | 0.69ms |
| SubmissionRepository.findAll | 5 | 2.91ms | 0.58ms | 0.69ms | 0.69ms |
| JobRepository.findAll | 5 | 2.90ms | 0.58ms | 0.69ms | 0.69ms |
| KnowledgeRepository.findAll | 5 | 0.29ms | 0.06ms | 0.07ms | 0.07ms |

