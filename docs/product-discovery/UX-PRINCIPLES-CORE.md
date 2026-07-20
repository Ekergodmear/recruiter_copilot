# UX Principles Core — AI Recruiting Workspace

**Status:** LOCKED (Product Discovery) · Founder approved PR #57  
**PR role:** Design / Discovery — not EPIC-015 implementation.

Four decisions, one philosophy: **tự nhiên** ở mọi lớp tương tác.

| Decision | Layer | One-liner |
|----------|-------|-----------|
| **D10** | Input | Người dùng nói tự nhiên → Intent + slots (VI / EN / mixed / shorthand) |
| **D11** | Output tone | AI phản hồi tự nhiên → outcomes, không phô pipeline |
| **D12** | Intake | Dữ liệu đi vào tự nhiên → Intelligent Ingestion từ mọi nguồn |
| **D13** | Output shape | Kết quả hiển thị tự nhiên → **artifact-first**, text chỉ giải thích ngắn |

```
Speak naturally (D10)
        ↓
Ingest naturally (D12)  →  Knowledge
        ↓
Answer quietly (D11) + show as artifacts (D13)
        ↓
Next actions
```

> Workspace, không chatbot: Question → short Answer → **Artifact** → Next Action.

Canonical lock: [DECISIONS-LOCKED.md](./DECISIONS-LOCKED.md)  
Capability roadmap: [ASSISTANT-CAPABILITY-ROADMAP.md](./ASSISTANT-CAPABILITY-ROADMAP.md)

### Governance after Discovery merge

```
PR A (this)     D10–D13 Discovery (+ Assistant reference UX for D10/D11/D13)
PR B            EPIC-015 Spec sign (Intelligent Ingestion)
PR C            EPIC-015 Implementation
PR D            EPIC-015 Validation
```

No bulk/ZIP worker in PR A.

> Former filename: `UX-PRINCIPLES-TRIAD.md` — content superseded by this Core Four doc.
