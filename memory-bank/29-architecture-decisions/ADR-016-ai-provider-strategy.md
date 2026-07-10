---
adr_id: ADR-016
version: 1.0
status: Accepted
date: 2026-07-09
applies_to: Sprint 1 (MVP)
---

# ADR-016 — AI Provider Strategy (MVP)

## Status

**Accepted**

## Date

2026-07-09

## Applies To

Sprint 1 (MVP)

---

## Context

The goal of the MVP is to deliver a Recruitment Intelligence Platform that is reliable, affordable, and can be accessed from anywhere.

The project has a maximum infrastructure budget of approximately **10 USD/month**.

Therefore:

- The system must not depend on expensive proprietary AI APIs.
- The system must continue functioning even if no LLM is available.
- AI enhances recruiter productivity but never becomes a hard dependency.
- Every AI capability must be replaceable without changing business logic.

This decision aligns with:

- Zero Prompt Rule (ADR-007)
- Knowledge Contracts (ADR-006)
- Knowledge Model (ADR-002)
- Truth Model (ADR-003)
- LLM Independence Principle

---

## Decision

The MVP adopts an **AI-Enhanced, Not AI-Dependent** architecture.

Business logic must never depend directly on an LLM.

Instead, resume processing follows the pipeline below.

```
Resume
    │
    ▼
Document Detection
    │
    ▼
PDF / DOCX Parser
    │
    ▼
OCR (only if required)
    │
    ▼
Rule Extraction
    │
    ▼
Knowledge Contracts
    │
    ▼
LLM fills missing knowledge only
    │
    ▼
Knowledge Objects
```

The LLM is responsible only for information that cannot be extracted reliably using deterministic methods.

---

## Resume Processing Strategy

The system must always attempt deterministic extraction first.

Priority:

1. PDF Parser
2. DOCX Parser
3. OCR (only for image-based documents)
4. Rule Extraction
5. Knowledge Contract Execution
6. LLM Completion

LLM must never parse information that deterministic extraction can already obtain.

---

## Deterministic Extraction

The following information should be extracted without using an LLM whenever possible.

- Candidate Name
- Email
- Phone Number
- LinkedIn URL
- GitHub URL
- Portfolio URL
- Current Position
- Company Names
- Employment Dates
- Education
- Skills (keyword extraction)
- Years of Experience
- Certificates
- Languages
- Attachments
- Metadata

Deterministic extraction should rely on:

- PDF parsing
- DOCX parsing
- OCR
- Regular Expressions
- Rule Engine
- Dictionaries
- Skill normalization tables

---

## LLM Responsibilities

The LLM is responsible only for higher-level reasoning.

Examples:

- Generate Candidate Summary
- Normalize Skill Names
- Infer Seniority
- Estimate English Level
- Infer Domain Experience
- Classify Industry
- Identify Missing Information
- Suggest Candidate Tags
- Estimate Candidate Profile Completeness
- Generate Confidence Scores
- Generate Knowledge Objects required by Knowledge Contracts

The LLM must never overwrite deterministic data.

---

## AI Provider Architecture

Business code must never depend on a specific AI vendor.

Business code communicates only through provider interfaces.

Example interfaces:

- `KnowledgeExtractionProvider`
- `SummaryProvider`
- `EmbeddingProvider`
- `ReasoningProvider`

No module should reference Gemini, OpenAI, Claude, Ollama, or any other provider directly.

---

## Provider Implementations

The MVP supports interchangeable providers.

**Knowledge Extraction**

- Gemini Provider
- Mock Provider

**Embedding**

- Local Embedding Provider

**Summary**

- Gemini Provider
- Mock Provider

**Reasoning**

- Gemini Provider
- Mock Provider

Future providers may include:

- OpenAI
- Claude
- Qwen
- Ollama
- Local Llama

Adding a provider must not require modifying business logic.

---

## Embedding Strategy

Embeddings are independent from the LLM.

Preferred implementation:

- Local embedding model
- PostgreSQL + pgvector

Business logic communicates only with the `EmbeddingProvider` interface.

---

## OCR Strategy

OCR is executed only when necessary.

Decision flow:

```
Document contains selectable text → Skip OCR
Image-based document            → Execute OCR
```

Avoid unnecessary OCR to reduce processing time and infrastructure cost.

---

## Provider Selection (MVP)

| Capability           | MVP Provider                   |
| -------------------- | ------------------------------ |
| PDF Parsing          | Open-source parser             |
| DOCX Parsing         | Open-source parser             |
| OCR                  | Tesseract (only when required) |
| Knowledge Extraction | Gemini                         |
| Summary              | Gemini                         |
| Embedding            | Local embedding model          |
| Vector Storage       | PostgreSQL + pgvector          |
| Matching             | Rule Engine + LLM              |

OpenAI is intentionally excluded from the MVP.

---

## Cost Optimization Principles

The MVP prioritizes deterministic processing over AI inference.

The system should maximize:

- Open-source components
- Local processing
- Rule-based extraction

LLM usage should be minimized.

The LLM is reserved only for reasoning tasks that deterministic logic cannot perform reliably.

---

## AI Independence

The platform must remain usable if the LLM becomes unavailable.

Recruiters must still be able to:

- Upload resumes
- View candidate profiles
- Search candidates
- Manage candidates
- Edit knowledge manually

Only AI-assisted capabilities become temporarily unavailable.

---

## Cursor Implementation Rules

1. Cursor must never invoke an LLM before deterministic extraction.
2. Cursor must never hardcode any provider inside business modules.
3. Cursor must always program against provider interfaces.
4. Cursor must never expose provider-specific types outside the provider layer.
5. Business modules must not import: Gemini SDK, OpenAI SDK, Ollama SDK, Claude SDK.
6. Only Provider implementations may depend on external AI SDKs.

---

## Consequences

### Positive

- LLM vendor can be swapped without business code changes.
- System remains usable when LLM is unavailable.
- Infrastructure cost stays within MVP budget.
- Deterministic fields are more reliable than LLM parsing.

### Negative

- Two-phase extraction pipeline adds implementation complexity.
- Rule engine and parsers require maintenance.
- Gemini-specific code still exists in provider layer (isolated).

---

## Definition of Done

The AI provider strategy is considered complete when:

- [ ] Resume parsing works without an LLM for deterministic fields.
- [ ] LLM fills only missing or inferred knowledge.
- [ ] Business logic contains no provider-specific code.
- [ ] Providers are interchangeable.
- [ ] AI failure does not stop recruiter workflows.
- [ ] Knowledge Contracts remain unchanged regardless of provider.
- [ ] OpenAI is not required anywhere in the MVP.

---

## Related

- `memory-bank/28-ai-providers/_index.md`
- `memory-bank/27-knowledge-contracts/KC-001-resume-to-skill-knowledge.md`
- `memory-bank/27-knowledge-contracts/KC-002-resume-to-english-knowledge.md`
- ADR-006, ADR-007, ADR-008, ADR-010
- `src/providers/` — implementation layer
