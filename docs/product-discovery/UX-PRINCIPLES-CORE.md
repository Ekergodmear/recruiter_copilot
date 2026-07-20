# UX Principles Core — AI Recruiting Workspace

**Status:** LOCKED (Product Discovery) · Founder approved PR #57 for merge  
**PR role:** Design / Discovery — not EPIC-015 implementation.

Five decisions, one philosophy: **tự nhiên** ở mọi lớp — và **đúng lượng thông tin** ở từng thời điểm.

| Decision | Layer | One-liner |
|----------|-------|-----------|
| **D10** | Input | Người dùng nói tự nhiên → Intent + slots |
| **D11** | Output tone | AI phản hồi tự nhiên → Quiet, không phô pipeline |
| **D12** | Intake | Dữ liệu đi vào tự nhiên → Intelligent Ingestion |
| **D13** | Output shape | Kết quả = **artifact-first**, text chỉ giải thích ngắn |
| **D14** | Output depth | **Progressive disclosure** — chỉ hiện đủ cho bước hiện tại |

```
Speak (D10) → Ingest (D12) → Quiet answer (D11)
        ↓
Artifact (D13) at the right depth (D14)
        ↓
Next actions · Details on demand
```

### Product slogans (UX north star)

> **Don't make recruiters manage software. Let them recruit.**

> **Recruiters express intent. RecruiterSup orchestrates the work.**

Canonical lock: [DECISIONS-LOCKED.md](./DECISIONS-LOCKED.md)  
Capability roadmap: [ASSISTANT-CAPABILITY-ROADMAP.md](./ASSISTANT-CAPABILITY-ROADMAP.md)

### Governance after Discovery merge

```
PR A (this)     D10–D14 Discovery (+ Assistant reference UX)
PR B            EPIC-015 Spec sign
PR C            EPIC-015 Implementation
PR D            EPIC-015 Validation
```

No bulk/ZIP worker in PR A.
