# TM-002 — Confidence Types

---

# Metadata

| Field | Value |
|-------|-------|
| Spec ID | TM-002 |
| Phase | 2 — NOT MVP runtime |
| Status | Approved (design) |

---

# Three Independent Confidences

Never use one number for three different questions.

---

## Extraction Confidence

**Question:** Did we read the source correctly?

| Factor | Impact |
|--------|--------|
| Clean PDF text | High (0.95+) |
| OCR scanned image | Lower (0.70–0.85) |
| Ambiguous formatting | Lower |
| LLM parse clarity | Variable |

Example: OCR reads "React" correctly → extraction: 0.99

---

## Truth Confidence

**Question:** Is this information actually true?

| Factor | Impact |
|--------|--------|
| Interview confirmation | High |
| Multiple agreeing sources | High |
| Self-reported only | Low–Medium |
| Contradicting sources | Low + CONFLICTED |

Example: Resume says React, interview didn't discuss → truth: 0.55

---

## Business Confidence

**Question:** Is this relevant to the current Job context?

| Factor | Impact |
|--------|--------|
| Skill in Job requirements | High |
| Skill unrelated to Job | Very low |
| Industry mismatch | Low |

Example: React skill verified, but Job is pure backend Java → business: 0.05

**Business Confidence is contextual** — recalculated per Job, not stored globally on Candidate.

---

# Schema (Phase 2)

On Knowledge Object:

```json
{
  "confidences": {
    "extraction": 0.99,
    "truth": 0.55,
    "business": null
  }
}
```

`business` computed at match time, stored on Match Score not on Knowledge Object.

---

# MVP Mapping

Phase 1 single field:

```json
{ "confidence": 0.75 }
```

Maps approximately to **Truth Confidence** (simplified).

Document in code: `// TODO Phase 2: split into extraction/truth/business`

---

# AI Must Use Correct Confidence

| Context | Show |
|---------|------|
| Displaying parsed skill | extraction + truth |
| Matching to Job | truth + business |
| General profile view | truth primarily |

---

# Common Mistakes

❌ One confidence field meaning three things

❌ Storing business confidence on Candidate globally

❌ High extraction treated as high truth

---

# Cursor Validation Checklist

- [ ] Three types documented when Phase 2+
- [ ] MVP uses single field with documented mapping
- [ ] Business confidence contextual to Job
- [ ] Common Mistakes reviewed
