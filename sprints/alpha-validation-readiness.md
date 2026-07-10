# Alpha Validation Readiness

**Thay thế:** AH-005 Import History (cancelled by CTO)  
**Status:** ⬜ Next — không thêm feature UX  
**Mode:** Product Validation — instrumentation only

---

## Participants (CTO)

**Đừng chỉ có 1 recruiter.** Mục tiêu **3 người**:

| # | Profile | Vì sao |
|---|---------|--------|
| 1 | Recruiter quen (founder network) | Baseline thói quen |
| 2 | In-house HR | Khác agency workflow |
| 3 | Agency recruiter khác | Pattern thị trường |

1 người = không phân biệt được **nhu cầu thị trường** vs **thói quen cá nhân**.

---

## Quy tắc Alpha (CTO)

### Không sửa sau mỗi CV

| Bằng chứng | Hành động |
|------------|-----------|
| 1 lần sai | Bỏ qua |
| 3 lần | Ghi nhận trong weekly report |
| **10 lần cùng pattern** | P0 backlog Sprint 2 |

Tránh overfitting sản phẩm cho từng CV cá biệt.

### Buổi đầu: ngồi cạnh, quan sát

Không gửi link rồi chờ. Ghi chú:

- Dừng ở đâu? Đọc gì trước?
- Có hiểu Review Queue không?
- Mark Ready tự nhiên hay phải hỏi?
- Mở CV gốc ngay không?

> Đừng hỏi người dùng muốn gì **trước khi** xem họ làm gì.

### Chụp màn hình

Mỗi khi recruiter nói *"đoạn này khó hiểu"* → chụp ngay.

Lưu: `reports/screenshots/` (tạo khi Alpha bắt đầu).

30 screenshot sau 2 tuần thường hữu ích hơn hàng nghìn dòng log.

### Câu hỏi phỏng vấn (ưu tiên)

**Đừng hỏi:** *"Có thích không?"*

**Hỏi:**

- *"Nếu ngày mai không còn dùng ứng dụng này, bạn sẽ nhớ điều gì nhất?"*
- *"Có bước nào hôm nay bạn vẫn phải làm ngoài hệ thống?"*

Chi tiết: `docs/recruiter-interview-guide.md`

---

## Mục tiêu

Chuẩn bị cho **30–50 CV thật** sao cho sau Alpha mở dashboard / đọc report và trả lời **5 câu hỏi** ngay — không đoán.

---

## 5 câu hỏi Alpha (CTO)

| # | Câu hỏi | Nguồn dữ liệu |
|---|---------|---------------|
| 1 | Recruiter sửa gì nhiều nhất? | `knowledge_edited` / `knowledge_reviewed` by `field_name` |
| 2 | Field nào AI luôn đúng? | Acceptance by field (no override after review) |
| 3 | Field nào AI luôn sai? | Override rate by field |
| 4 | Review Queue có hoạt động không? | Review rate by `review_priority` (HIGH vs LOW) |
| 5 | TTQC tăng vì sao? | Time-on-field / `edit_duration_ms` by field |

---

## Deliverables (instrumentation, không UI mới)

### A. Dashboard extensions (Operations)

Aggregate từ telemetry hiện có (`data/telemetry/events.jsonl`):

- Override distribution by field (%)
- Acceptance by field (%)
- Review completion by priority tier
- TTQC breakdown by field (avg edit duration)

### B. Weekly alpha report (file, không DB)

```text
reports/weekly-alpha.md
```

Mỗi tuần generate (script hoặc manual từ dashboard JSON):

- Top Override Fields
- Top Accepted Fields
- Average TTQC
- Top Missing Fields
- Top Review Reasons
- Product Notes (recruiter quotes)

→ **Nhật ký tiến hóa** sản phẩm.

### C. Churn risk checklist

`docs/what-would-make-recruiter-stop.md` — đối chiếu sau phỏng vấn.

---

## Alpha Gate (nhắc lại)

| Metric | Target |
|--------|--------|
| TTQC | < 2 min |
| AI Acceptance Rate | > 85% |
| Human Override Rate | < 15% |
| Verification Rate | > 95% |
| Review Completion Rate | track (baseline TBD) |
| Import Success Rate | > 98% |
| Parse Failure Rate | < 2% |
| Daily Active Recruiters | ≥ 1/day |

---

## Sau Alpha — nửa ngày không code (CTO)

1. Đọc `reports/weekly-alpha.md` (quotes trước)
2. Xem screenshots trong `reports/screenshots/`
3. Xem dashboard / telemetry
4. Viết **một trang**: `docs/alpha-top-10-learned.md`

Không phải *"Top 10 tính năng cần làm"*.

Mà là *"Top 10 điều chúng ta đã học"* → tài liệu quan trọng nhất cho Sprint 2.

---

## Sau 50 CV — Data Review (không review code)

Ví dụ phân tích:

```text
English → Override 61% → Why? → Parser / LLM / Prompt / KC?
```

**Roadmap Sprint 2 thay đổi theo dữ liệu**, không theo kế hoạch ban đầu.

Có thể phát hiện:

- Không cần Duplicate Detection
- Cần Bulk Import hơn
- Summary ít sửa, English nhiều sửa
- Luôn thêm Notice Period

---

## Out of scope

- AH-005 Import History UI
- Feature mới cho recruiter
- Memory Bank changes
- Sprint 2 engineering (gated đến khi data review xong)

---

## Definition of Done

- [ ] **3 recruiter profiles** (hoặc ghi lý do nếu chỉ có 1–2)
- [ ] Buổi đầu: quan sát trực tiếp (không chỉ link)
- [ ] Recruiter alpha chạy 30–50 CV (2 tuần)
- [ ] 5 câu hỏi trả lời được từ telemetry
- [ ] `reports/weekly-alpha.md` tuần 1 tồn tại
- [ ] Churn checklist điền ≥1 lần
- [ ] `docs/alpha-top-10-learned.md` hoàn thành (sau Alpha)
- [ ] CTO data review session → Sprint 2 scope draft
