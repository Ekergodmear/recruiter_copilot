# Weekly Product Review

> **Nghi thức sản phẩm.** 60 phút mỗi tuần. Agenda cố định — không được thay đổi.
>
> Bắt đầu sau khi Alpha Validation khởi động. Tiếp tục suốt giai đoạn sản phẩm.

**Output:** cập nhật [reports/weekly-alpha.md](../reports/weekly-alpha.md)

---

## Quy tắc phòng họp

1. Không đưa giải pháp trong 40 phút đầu.
2. Không tranh luận khi đọc quote recruiter.
3. Tối đa **2 vấn đề** được chọn mỗi tuần — không hơn.
4. Cuối buổi viết *"What did we learn?"* — không phải *"What will we build?"*

### Nếu ai nói: *"Hay là thêm AI..."*

**Dừng cuộc họp ngay.** Hỏi:

> **Telemetry hay recruiter nào chứng minh điều này cần thiết?**

Chưa có bằng chứng → **không làm.**

---

## Agenda (60 phút)

### 1. Nghe recruiter — 10 phút

Đọc nguyên văn quote. Không phân tích. Không phản biện.

Ví dụ:

> *"Mình vẫn phải mở CV vì không tin phần English."*

Chỉ ghi nhận vào Product Notes.

---

### 2. Đọc telemetry — 15 phút

Nguồn: Operations Dashboard (`/internal/operations-dashboard/ui`) hoặc `data/telemetry/events.jsonl`.

Chỉ trả lời:

> **Điều gì đã xảy ra?**

Không đưa giải pháp.

---

### 3. Đối chiếu — 15 phút

Quote ↔ Telemetry.

| Recruiter nói | Telemetry | Kết luận |
|---------------|-----------|----------|
| *"Summary hơi chung chung."* | Summary Override = 47% | Có bằng chứng |
| *"Review Queue hữu ích."* | HIGH priority reviewed 89% | Có bằng chứng |
| *"Cần thêm AI matching."* | Không có usage data | Chưa có bằng chứng |

Ghi vào weekly report.

---

### 4. Quyết định — 10 phút

Chọn **0**, **1**, hoặc tối đa **2** vấn đề để theo dõi tiếp.

Không commit build trong buổi này — chỉ ghi nhận và đếm bằng chứng (rule of 10).

| Bằng chứng tuần này | Tích lũy | Hành động |
|---------------------|----------|-----------|
| English override ×3 | 3/10 | Ghi nhận |
| | | |

---

### 5. Viết — 10 phút

Hoàn thành section trong `reports/weekly-alpha.md`:

> **What did we learn this week?**

Không phải:

> What will we build?

---

## Checklist trước khi kết thúc

- [ ] ≥1 quote recruiter nguyên văn
- [ ] Telemetry đã đọc (không giải pháp)
- [ ] ≥1 đối chiếu quote ↔ metric
- [ ] 0–2 vấn đề được chọn
- [ ] "What did we learn?" đã viết
- [ ] Không có quyết định "thêm AI" không căn cứ

---

## Ai tham dự

| Vai trò | Trách nhiệm |
|---------|-------------|
| CTO / Founder | Điều phối, quyết định 0–2 vấn đề |
| Người ghi chép | Cập nhật `reports/weekly-alpha.md` |
| Engineer (tùy chọn) | Chỉ nghe — không pitch giải pháp trong 40 phút đầu |

---

*Foundation Frozen: [FOUNDATION-FROZEN.md](./FOUNDATION-FROZEN.md) · Nguyên tắc: [MANIFESTO.md](./MANIFESTO.md)*
