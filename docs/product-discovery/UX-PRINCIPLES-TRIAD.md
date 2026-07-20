# UX Principles Triad — AI Recruiting Workspace

**Status:** LOCKED (Product Discovery)  
**PR role:** Design / Discovery only — not EPIC-015 implementation.

Three decisions, one philosophy: **tự nhiên** ở mọi lớp tương tác.

| Decision | Layer | One-liner |
|----------|-------|-----------|
| **D10** | Input | Người dùng nói tự nhiên → Intent + slots (VI / EN / mixed / shorthand) |
| **D11** | Output | AI trả lời tự nhiên → outcomes, không phô pipeline |
| **D12** | Action | Người dùng thao tác tự nhiên → Intelligent Ingestion từ mọi nguồn |

```
Speak naturally (D10)
        ↓
Act naturally (D12)  →  capabilities / Knowledge
        ↓
Hear naturally (D11)
```

Canonical lock: [DECISIONS-LOCKED.md](./DECISIONS-LOCKED.md)  
Capability roadmap: [ASSISTANT-CAPABILITY-ROADMAP.md](./ASSISTANT-CAPABILITY-ROADMAP.md)

### Governance after this PR

```
PR A (this)     D10 + D11 + D12 Discovery (+ Assistant reference UX for D10/D11)
PR B            EPIC-015 Spec sign (Intelligent Ingestion)
PR C            EPIC-015 Implementation
PR D            EPIC-015 Validation
```

No bulk/ZIP worker in PR A.
