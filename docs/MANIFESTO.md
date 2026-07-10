# Recruitment Intelligence Platform Manifesto v1.0

> **Nguyên tắc sáng lập.** Đọc trước khi viết code — dù là người đầu tiên hay người thứ mười trong đội.
>
> Kết thúc giai đoạn thiết kế · Chốt bởi CTO · 2026-07-10

---

## 1. Chúng ta không bán AI.

Chúng ta bán:

> **thời gian được tiết kiệm** và **niềm tin khi ra quyết định**.

Nếu AI rất thông minh nhưng recruiter vẫn mất nhiều thời gian hơn trước, thì AI đó không tạo ra giá trị.

---

## 2. AI không phải người dùng.

Recruiter mới là người dùng.

Mọi quyết định về:

- kiến trúc,
- mô hình AI,
- prompt,
- Knowledge Model,

đều phục vụ recruiter.

Không ngược lại.

---

## 3. Mọi AI đều có thể thay thế.

OpenAI. Gemini. Claude. Qwen. Llama. …

Không provider nào là tài sản của công ty.

**Knowledge**, **workflow**, và **dữ liệu xác nhận của recruiter** mới là tài sản.

---

## 4. Mỗi lần recruiter sửa AI là một món quà.

Đừng coi đó là lỗi.

Đó là dữ liệu mà không một mô hình nền tảng nào có sẵn.

Đó là tri thức được tạo ra trong chính quy trình tuyển dụng của khách hàng.

---

## 5. Đừng tối ưu thứ chưa ai dùng.

Nếu telemetry cho thấy recruiter không mở một màn hình nào, thì màn hình đó không đáng để tối ưu.

---

## 6. Không tranh luận khi đã có dữ liệu.

Nếu telemetry và phỏng vấn đều chỉ vào cùng một vấn đề, hãy sửa nó.

Nếu chỉ có ý kiến của đội phát triển mà chưa có dữ liệu, hãy chờ.

---

## 7. Đo giá trị bằng hành vi.

Không đo bằng:

- số prompt,
- số token,
- số API call.

Đo bằng:

- **TTQC** (Time To Qualified Candidate),
- tỷ lệ quay lại sử dụng,
- tỷ lệ hoàn thành review,
- việc recruiter có còn mở Excel không.

---

## 8. Mỗi Sprint phải trả lời đúng một câu hỏi.

Sprint 1 trả lời:

> "Recruiter có hoàn thành được một CV không?"

Sprint 2 có thể là:

> "Recruiter có quản lý được cả pipeline không?"

Sprint 3 có thể là:

> "AI có giúp tìm đúng người nhanh hơn không?"

Nếu một Sprint cố trả lời ba câu hỏi, Sprint đó thường thất bại.

---

## 9. Roadmap là giả thuyết.

Telemetry là bằng chứng.

Đừng yêu roadmap đến mức bỏ qua những gì người dùng thực sự làm.

---

## 10. Luôn giữ một câu hỏi ở đầu mọi cuộc họp

> **"Điều gì khiến recruiter tin tưởng hệ thống hơn hôm nay?"**

Nếu một tính năng không làm tăng niềm tin, giảm thời gian hoặc giảm thao tác, hãy cân nhắc rất kỹ trước khi xây.

---

## North Star (nhắc lại)

> **AI chuẩn bị tri thức. Recruiter xác nhận tri thức.**

---

## Tài liệu liên quan

| Tài liệu | Vai trò |
|----------|---------|
| [FOUNDATION-FROZEN.md](./FOUNDATION-FROZEN.md) | Tuyên bố đóng băng v1.0 |
| [weekly-product-review.md](./weekly-product-review.md) | Nghi thức 60 phút/tuần |
| [PLAYBOOK.md](../PLAYBOOK.md) | Cách làm việc hàng ngày |
| [sprints/](../sprints/) | Câu hỏi từng Sprint |
| [alpha-validation-readiness.md](../sprints/alpha-validation-readiness.md) | Quy tắc Alpha |
| [alpha-top-10-learned.md](./alpha-top-10-learned.md) | Học từ Alpha → Sprint 2 |
