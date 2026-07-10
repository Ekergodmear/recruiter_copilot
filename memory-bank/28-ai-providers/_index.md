# AI Providers

Version: 2.0 (ADR-016)

---

# Overview

AI Providers are **pluggable adapters** behind provider interfaces.

Business code never imports vendor SDKs. Providers implement interfaces; Knowledge Contracts define output shape.

```
Resume
  → Deterministic pipeline (parser, OCR, rules)
  → Knowledge Contracts
  → Provider interfaces (LLM fills gaps only)
  → Knowledge Objects
```

**LLM is a plugin. Knowledge Contract is the dependency.**

See: `ADR-016-ai-provider-strategy.md`

---

# Provider Interfaces (MVP)

| Interface | MVP Implementations |
|-----------|---------------------|
| `KnowledgeExtractionProvider` | Gemini, Mock |
| `SummaryProvider` | Gemini, Mock |
| `EmbeddingProvider` | Local |
| `ReasoningProvider` | Gemini, Mock |

Code: `src/providers/interfaces/`

---

# Provider Catalog

| ID | Provider | Capability | Phase | Status |
|----|----------|------------|-------|--------|
| AP-001 | Mock Provider | KC-001, KC-002, summary, reasoning | 1 | ✅ Scaffold |
| AP-002 | Gemini Provider | KC-001, KC-002, summary, reasoning | 1 | ✅ Scaffold |
| AP-003 | Local Embedding Provider | embeddings | 1 | ✅ Scaffold |
| AP-004 | OpenAI Provider | — | — | ❌ Excluded MVP (ADR-016) |
| AP-005 | Claude Provider | — | 2+ | ⬜ |
| AP-006 | Ollama / Local Llama | — | 2+ | ⬜ |

---

# MVP Provider Selection

| Capability | Provider |
|------------|----------|
| PDF Parsing | Open-source (`pdf-parse`) |
| DOCX Parsing | Open-source (`mammoth`) |
| OCR | Tesseract (when required) |
| Knowledge Extraction | Gemini (+ Mock fallback) |
| Summary | Gemini (+ Mock fallback) |
| Embedding | Local model |
| Vector Storage | PostgreSQL + pgvector |

---

# Cursor Rules (ADR-016)

1. Never invoke LLM before deterministic extraction.
2. Never hardcode provider in business modules.
3. Program against interfaces only.
4. Prompts live in `src/providers/<vendor>/` only — not Memory Bank.

---

# Cursor Validation Checklist

- [ ] Provider implements approved KC only
- [ ] Output validated against KC schema before return
- [ ] No prompts in Memory Bank
- [ ] `extraction_method` identifies provider in output
- [ ] Business modules import only from `src/providers/interfaces` or registry
- [ ] OpenAI not used in MVP
