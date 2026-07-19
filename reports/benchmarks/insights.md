# Insight Benchmark

_Generated 2026-07-18T09:37:32.106Z — TECH-002_

## Environment

| Key | Value |
|-----|-------|
| CPU | AMD Ryzen 7 5800H with Radeon Graphics          × 16 |
| RAM | 15755 MB total / 1101 MB free |
| Node | v24.11.1 |
| Platform | win32 x64 |
| Persistence | memory |
| Database | n/a (memory) |

## Dataset

Seeded ready candidates (direct repository writes).
Sizes: 100, 1000, 5000, 10000.
Samples/op: 20.

## Results

### candidate_insight

| Dataset / Op | N | Average | Median | P95 | Max |
|--------------|---|--------:|-------:|----:|----:|
| n=100 | 20 | 0.11ms | 0.06ms | 0.10ms | 1.13ms |
| n=1000 | 20 | 0.04ms | 0.03ms | 0.05ms | 0.15ms |
| n=5000 | 20 | 0.04ms | 0.03ms | 0.06ms | 0.11ms |
| n=10000 | 20 | 0.04ms | 0.03ms | 0.05ms | 0.12ms |

### job_insight

| Dataset / Op | N | Average | Median | P95 | Max |
|--------------|---|--------:|-------:|----:|----:|
| n=100 | 20 | 0.25ms | 0.18ms | 0.43ms | 1.01ms |
| n=1000 | 20 | 1.77ms | 1.57ms | 2.45ms | 4.28ms |
| n=5000 | 20 | 8.47ms | 7.25ms | 13.76ms | 24.64ms |
| n=10000 | 20 | 14.18ms | 13.10ms | 16.54ms | 28.67ms |

### audit_replay

| Dataset / Op | N | Average | Median | P95 | Max |
|--------------|---|--------:|-------:|----:|----:|
| n=100 | 20 | 0.54ms | 0.03ms | 0.14ms | 9.87ms |
| n=1000 | 20 | 0.03ms | 0.03ms | 0.06ms | 0.07ms |
| n=5000 | 20 | 0.03ms | 0.02ms | 0.07ms | 0.10ms |
| n=10000 | 20 | 0.03ms | 0.02ms | 0.06ms | 0.07ms |

### knowledge_retrieval

| Dataset / Op | N | Average | Median | P95 | Max |
|--------------|---|--------:|-------:|----:|----:|
| n=100 | 20 | 0.01ms | 0.00ms | 0.01ms | 0.06ms |
| n=1000 | 20 | 0.00ms | 0.00ms | 0.01ms | 0.01ms |
| n=5000 | 20 | 0.00ms | 0.00ms | 0.00ms | 0.01ms |
| n=10000 | 20 | 0.00ms | 0.00ms | 0.00ms | 0.01ms |

## Memory snapshots

| Checkpoint | RSS | Heap Used | Heap Total | External |
|------------|----:|----------:|-----------:|---------:|
| start | 383.74 MB | 228.26 MB | 341.76 MB | 5.57 MB |
| after seed n=100 | 383.81 MB | 229.98 MB | 342.01 MB | 5.57 MB |
| after insight n=100 | 383.98 MB | 235.28 MB | 342.26 MB | 5.57 MB |
| after seed n=1000 | 384.31 MB | 249.65 MB | 342.26 MB | 5.57 MB |
| after insight n=1000 | 391.81 MB | 228.61 MB | 342.51 MB | 5.57 MB |
| after seed n=5000 | 404.38 MB | 247.55 MB | 345.75 MB | 5.53 MB |
| after insight n=5000 | 426.06 MB | 260.86 MB | 367.00 MB | 5.53 MB |
| after seed n=10000 | 470.13 MB | 313.93 MB | 409.41 MB | 5.53 MB |
| after insight n=10000 | 496.74 MB | 309.33 MB | 435.41 MB | 5.53 MB |
| end | 496.74 MB | 309.34 MB | 435.41 MB | 5.53 MB |

## Top 5 operations (by total time)

| Operation | Calls | Total | Avg | P95 | Max |
|-----------|------:|------:|----:|----:|----:|
| job_insight | 20 | 283.51ms | 14.18ms | 16.54ms | 28.67ms |
| candidate_insight | 20 | 0.70ms | 0.03ms | 0.04ms | 0.11ms |
| audit_replay | 20 | 0.49ms | 0.02ms | 0.06ms | 0.07ms |
| JobRepository.findById | 20 | 0.20ms | 0.01ms | 0.01ms | 0.03ms |
| KnowledgeRepository.findByCandidateId | 80 | 0.14ms | 0.00ms | 0.00ms | 0.02ms |

