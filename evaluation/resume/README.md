# Resume Evaluation Dataset

Target: **100 golden samples** (Sprint 1 start: 10)

## Golden output conforms to

- `memory-bank/27-knowledge-contracts/KC-001-resume-to-skill-knowledge.md`
- `memory-bank/27-knowledge-contracts/KC-002-resume-to-english-knowledge.md`
- `memory-bank/24-knowledge-model/KM-002-skill-knowledge.md`
- `memory-bank/24-knowledge-model/KM-003-english-knowledge.md`

## Sample categories to cover

| Category | Count (target) |
|----------|----------------|
| Clean PDF | 30 |
| DOCX | 20 |
| Vietnamese CV | 25 |
| English CV | 25 |
| Scanned / OCR | 15 |
| Multi-page | 10 |
| Sparse / minimal | 10 |

## manifest.json schema

```json
{
  "version": "1.0",
  "contract_ids": ["KC-001", "KC-002"],
  "samples": [
    {
      "id": "001",
      "path": "samples/001",
      "tags": ["pdf", "vietnamese", "it"],
      "annotator": "recruiter_verified",
      "annotated_at": "ISO-8601"
    }
  ]
}
```

## Run evaluation

```bash
# Sprint 1 — implement:
# npm run eval:resume
# or: python -m eval.resume --manifest evaluation/resume/manifest.json
```

Exit code non-zero if below quality-gates/sprint-1.yaml thresholds.
