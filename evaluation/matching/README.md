# Matching Evaluation Dataset

Target: **500 candidate-job pairs** with recruiter-rated relevance (Sprint 3+)

## Format

```json
{
  "candidate_id": "eval_candidate_001",
  "job_id": "eval_job_001",
  "expected_relevance": 0.92,
  "recruiter_rating": "high",
  "in_top_5": true
}
```

## Metrics (ADR-000 Sprint 3)

- Top-5 accuracy ≥ 85%
- Top-10 semantic search relevance ≥ 90%
