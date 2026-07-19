# EPIC-002 — Review Workspace

**Status:** ⚠️ **Approved as Product Hypothesis** — Founder · 2026-07-10

> Không phải hợp đồng UX. Sprint 2 **kiểm chứng** giả thuyết — Alpha có quyền bác bỏ.

---

## Product Vision (frozen philosophy)

> **Zero Friction Recruiting**

Review Session / Focus Mode = **Working Mode** — một implementation, không phải vision.

---

## Giả thuyết cần kiểm chứng (Sprint 2)

> Recruiter muốn **Focus Review Session** (Start → Next → Next → Complete) hơn là review ngắt quãng.

**Có thể sai** với:

| Persona | Hành vi |
|---------|---------|
| Agency | Zalo → review → gọi điện → dừng → quay lại |
| Internal HR | 40 CV một lượt — Session hợp |
| Executive Search | 20 phút/CV — không Next liên tục |

→ Phải hỗ trợ **2 Working Modes** trong MVP, đo telemetry.

---

## Mode 1 — Focus Review (hypothesis A)

```text
Start Review → Next → Next → Session Complete
```

Wireframes: `home-start-review.png`, `focus-mode-review.png`, `session-complete.png`

---

## Mode 2 — Flexible Review (hypothesis B)

```text
Inbox → click CV bất kỳ → Review → quay lại → CV khác
```

Không ép session. Không ẩn sidebar bắt buộc.

```text
┌──────────┬─────────────────────────┐
│ Inbox    │  Review panel (selected) │
│ John.pdf │  Resume | Knowledge      │
│ Jane.docx│  [Ready] [Back to list]  │
└──────────┴─────────────────────────┘
```

Wireframe: chưa vẽ — build song song Mode 1 trong Sprint 2 alpha.

---

## Telemetry (personalization sau Alpha)

Đo % thời gian mỗi mode:

```text
User A: 90% Focus / 10% Flexible
User B: 5% Focus / 95% Flexible
```

Sau đó hỏi: *"Bật Focus Review mặc định?"*

**Implementation status (đối chiếu với `web/` thực tế, cập nhật 2026-07-13):**

| Hạng mục | Trạng thái |
|---|---|
| Product shell (`web/`, App Shell, routing) | ✅ đã có (`web/src/layouts/AppShell.tsx`, `App.tsx`) |
| Mode 1 — Focus Review (`?session=1`) | ✅ đã có (`ReviewScreen.tsx`) |
| Mode 2 — Flexible (click trực tiếp từ Inbox) | ✅ đã có, cùng component với Focus | 
| Import UI | ✅ đã có (`ImportScreen.tsx`) |
| Knowledge Library | ✅ đã có (`CandidatesScreen.tsx`) |
| Keyboard shortcuts (a/e/s/j/k) | ✅ đã có |
| **Telemetry: mode usage %, friction by mode** | ✅ mới thêm — `review_mode_used` event + `usage.review_mode_split` trên Operations Dashboard |
| Telemetry: time per CV by mode | ✅ mới thêm — `candidate_qualified.review_mode` + `business.ttqc_by_mode` |
| 3 recruiter profiles test | ❌ chưa — cần Alpha thật, không code được |

> Ghi chú: tài liệu Sprint trước đó (`sprint-2.md`) mô tả Sprint 2 là "chưa code" — trên thực tế phần lớn UI đã tồn tại trong `web/`. Phần thực sự còn thiếu chỉ là đo lường (mode telemetry), nay đã bổ sung. Việc *đánh giá* mode nào recruiter thật sự chọn vẫn cần Alpha thật — không có cách nào code thay được bước đó.

---

## Sprint 2 goal (revised)

**Không** implement Review Flow như gospel.

**Có:**

1. Product shell tối thiểu (có app, không curl)
2. **Cả hai modes** usable
3. Telemetry: mode usage, time per CV, friction events
4. 3 recruiter profiles test (agency / in-house / exec search nếu có)

**Success:** Biết mode nào recruiter **thực sự** dùng — không đoán.

---

## North Star (giữ, đo trong cả hai modes)

| Metric | Ghi chú |
|--------|---------|
| TTIZ | Có thể đo per-session hoặc per-day |
| CV Processing Velocity | sec/CV |
| Friction events | Back, abandon mid-review, Excel escape |

---

## Actions (hypothesis — có thể đổi)

Approve · Correct · Skip + shortcuts R E S J K

---

## Backend

**Đóng băng** — chỉ bug fix. Frontend blocked → ticket riêng.

---

## Wireframes

| File | Hypothesis |
|------|------------|
| `home-start-review.png` | Mode 1 entry |
| `focus-mode-review.png` | Mode 1 core |
| `session-complete.png` | Mode 1 completion |
| `knowledge-library.png` | Archive (cả hai modes) |
| Mode 2 | Text spec above — wireframe TBD |

**Wireframe ≠ hợp đồng.**

---

## Founder sign-off

| Layer | Status |
|-------|--------|
| Foundation | ✅ Frozen |
| Product Philosophy | ✅ Frozen |
| UX Vision | ⚠️ Experimental |
| EPIC-002 | ⚠️ Approved as Product Hypothesis |

---

*Manifesto v1.3 · Sprint 2 validates, does not cement.*
