# Evaluation Datasets

Golden datasets for regression testing AI features and Knowledge Contracts.

**Rule (ADR-000):** No AI feature merges without corresponding evaluation data.

## Structure

```
evaluation/
├── resume/          # 100 resumes + golden Knowledge output (KC-001, KC-002)
├── jobs/            # 100 JDs + golden Job Knowledge (KC-006)
└── matching/        # 500 candidate-job pairs + expected relevance scores
```

## Format per sample

```
evaluation/resume/
  samples/
    001/
      input.pdf              # or input.json reference
      expected/
        skills.json          # KM-002 golden output
        english.json         # KM-003 golden output
      metadata.yaml          # source, difficulty, language, annotator
  manifest.json              # index of all samples
  README.md
```

## Usage

1. **CI regression** — run Inference against all samples, compare to golden
2. **Model swap** — GPT → Gemini must pass same thresholds
3. **KC change** — contract change must not break golden compatibility without version bump

## Sprint 1 minimum

- Start with **10 resumes** annotated (grow to 100)
- Cover: PDF, DOCX, Vietnamese, English, scanned OCR case
- Golden output validated by recruiter annotator

## Metrics (from ADR-000)

| Metric | Target |
|--------|--------|
| Skill extraction F1 vs golden | ≥ 90% |
| English level accuracy | ≥ 85% |
| Parse p95 latency | < 8s |

## Privacy

- No real PII in repo — use synthetic or anonymized resumes
- `evaluation/resume/samples/` may be gitignored for real files; commit structure + synthetic samples only
