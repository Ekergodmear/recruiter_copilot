# Epilogue

> Ghi lại khi đóng chương thiết kế · 2026-07-10  
> Không phải spec. Không phải nguyên tắc mới. Chỉ là điều đáng nhớ khi quay lại đọc.

---

Có một hiện tượng rất phổ biến trong các dự án AI.

Ban đầu, mọi người hỏi:

> "Model nào tốt nhất?"

Sau đó là:

> "Prompt nào tốt nhất?"

Rồi:

> "Framework nào tốt nhất?"

Nhưng rất ít người hỏi:

> **"Công việc của người dùng sẽ thay đổi như thế nào?"**

Theo mình, đó mới là câu hỏi đúng.

---

## Thành quả lớn nhất

Trong dự án này, mình không nghĩ thành quả lớn nhất là:

- Knowledge Model,
- Truth Model,
- hay Provider Architecture.

Thành quả lớn nhất là việc chúng ta đã định nghĩa lại **một đơn vị công việc (unit of work)** của recruiter.

### Trước đây

```text
Nhận CV
↓
Đọc CV
↓
Tự tổng hợp
↓
Nhập ATS
↓
Tiếp tục
```

### Bây giờ

```text
Nhận CV
↓
AI chuẩn bị tri thức
↓
Review những điểm quan trọng
↓
Xác nhận
↓
Tiếp tục
```

Nếu quy trình thứ hai thực sự trở thành thói quen của recruiter, thì AI đã tạo ra giá trị.

Không phải vì AI thông minh hơn.

Mà vì **công việc của con người trở nên đơn giản hơn**.

---

## Một lời hứa với chính sản phẩm

Nếu sau Alpha, dữ liệu nói rằng:

- Knowledge Model quá phức tạp,
- Review Queue không hiệu quả,
- hay recruiter không dùng một tính năng nào đó,

thì hãy sẵn sàng thay đổi.

Không phải vì thiết kế ban đầu sai.

Mà vì một thiết kế tốt luôn có khả năng học từ thực tế.

Ngược lại, nếu dữ liệu xác nhận rằng recruiter ngày nào cũng mở ứng dụng lên trước khi xử lý CV mới, thì hãy giữ vững những nguyên tắc cốt lõi của Foundation. Đừng thay đổi chúng chỉ vì có một mô hình AI mới hay một xu hướng mới xuất hiện.

---

## Một cột mốc đáng nhớ

Không phải:

> "Hôm nay chúng ta đóng Sprint 1."

Mà là:

> **"Hôm nay chúng ta trao quyền quyết định roadmap cho người dùng thật."**

Đó là khoảnh khắc dự án chuyển từ *"ý tưởng của đội ngũ"* thành *"sản phẩm của thị trường"*.

---

## Lần tới chúng ta nói chuyện

Hy vọng không phải về kiến trúc.

Mà về những điều thú vị mà recruiter đã dạy cho cả đội thông qua chính cách họ làm việc.

Đó sẽ là cuộc trò chuyện đáng giá nhất của dự án này.

---

*Tài liệu liên quan: [MANIFESTO.md](./MANIFESTO.md) · [FOUNDATION-FROZEN.md](./FOUNDATION-FROZEN.md)*
