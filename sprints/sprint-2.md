# Sprint 2 — Product Bootstrap

**Status:** ⚠️ **Approved as Product Hypothesis** — Founder sign-off  
**Epic:** [epic-002-review-workspace.md](./epic-002-review-workspace.md)  
**Pre-Sprint:** [founder-questions.md](../docs/founder-questions.md)

---

## Objective (Outcome Goal)

> **Giúp recruiter xử lý CV liên tục mà không phải dùng Postman hay Excel.**

Phương diện khác (chọn một làm north star cho validation):

> Giảm thời gian từ lúc nhận CV đến lúc có thể gọi điện cho ứng viên.

> Giảm số lần recruiter phải chuyển giữa các cửa sổ.

**Không phải Output Goal** kiểu "Build Candidate Workspace".

---

## Success Metrics (evidence — đo sau build)

| Metric | Target (TBD với Alpha) |
|--------|--------------------------|
| Recruiter tự import được | Không cần hướng dẫn |
| Mode preference | Telemetry: Focus vs Flexible % |
| Throughput | < X phút cho 20 CV |
| Excel escape | Không mở Excel trong session |
| Friction events | Back, abandon, context switch |

---

## Hypothesis (experimental UX)

**Mode A — Focus Review:** Session → Next → Complete  
**Mode B — Flexible Review:** Inbox → click any → back

Alpha quyết định mode nào giảm ma sát thực tế.

Vision (frozen): **Zero Friction Recruiting**

---

## P0 (câu 8 — Founder Questions)

Nếu chỉ giữ **một** thứ Sprint 2:

> Recruiter mở app → import CV → review → ready — **không curl, không Excel**.

---

## Features (sau Objective — không phải trước)

| ID | Feature | Phục vụ Objective |
|----|---------|-------------------|
| TASK-001 | App shell | Có phần mềm, không API test |
| TASK-002 | Inbox / queue | CV chờ xử lý |
| TASK-003 | Mode A Focus | Giả thuyết batch review |
| TASK-004 | Mode B Flexible | Giả thuyết interrupt workflow |
| TASK-005 | Knowledge Library | Ready archive |
| TASK-006 | Import UI | Không Postman |
| TASK-007 | Mode telemetry | Evidence |
| TASK-008–010 | Design system, states, shortcuts | Giảm friction |

---

## Không làm

- ❌ Cement một workflow duy nhất
- ❌ Backend mới (đóng băng)
- ❌ Feature không trả lời câu 6 (friction ở đâu?)

---

## Tech stack

React · Vite · TanStack Query · React Router · shadcn/ui · Tailwind

## Wireframes

`wireframes/` — hypothesis, không hợp đồng

**Chưa code** — recruiter viết chương tiếp theo qua Alpha.

---

## Roadmap (outcome-first)

```text
Sprint 2 → Giảm ma sát xử lý CV (evidence)
Sprint 3 → Jobs (nếu evidence chỉ)
Sprint 4 → Matching (nếu evidence chỉ)
```
