# Foundation is Frozen

**Quyết định CTO · 2026-07-10 · Kết thúc giai đoạn thiết kế**

---

## Tuyên bố

Không chỉ Memory Bank.

Không chỉ Architecture.

**Toàn bộ cách tư duy v1.0 đã đóng băng.**

Từ thời điểm này, chỉ có **bằng chứng từ Alpha** (và sau đó là production telemetry + recruiter) mới được phép thay đổi nền móng.

---

## Đã đóng băng

| Thành phần | Trạng thái |
|------------|------------|
| Memory Bank | FROZEN |
| Architecture (Foundation v3.1) | FROZEN — tag `foundation-v3.1-frozen` |
| [MANIFESTO.md](./MANIFESTO.md) v1.3 philosophy | FROZEN |
| UX / Working Modes (EPIC-002) | **HYPOTHESIS** — Alpha validates |
| North Star: *AI chuẩn bị tri thức. Recruiter xác nhận tri thức.* | FROZEN |
| Sprint 1 scope & Recruiter Review Experience | SHIPPED — không mở rộng |

---

## Được phép thay đổi khi có bằng chứng

- **UX workflow** — Focus vs Flexible vs Kanban — Alpha + telemetry quyết định
- Extraction rules / prompt tuning — khi telemetry + quote cùng chỉ một field
- Sprint 2 scope — sau data review 30–50 CV
- UX điều chỉnh — rule of 10 (≥10 bằng chứng cùng pattern)
- ADR mới — chỉ khi Alpha chứng minh giả thuyết sai

---

## Không được phép (trước Alpha data review)

- Thêm AI module / provider-centric features
- Mở rộng Memory Bank
- Redesign kiến trúc
- Feature vì "hay là thêm AI..."
- Roadmap thay đổi vì ý kiến nội bộ chưa có data

---

## Kiểm tra sau 3 tháng (CTO)

Không xem code. Không xem kiến trúc. Không xem prompt.

Chỉ xem ba thứ:

1. [MANIFESTO.md](./MANIFESTO.md)
2. [reports/](../reports/)
3. [alpha-top-10-learned.md](./alpha-top-10-learned.md)

**Nhất quán** → sản phẩm đi đúng hướng.

**Mâu thuẫn** (ví dụ Manifesto nói recruiter quyết định nhưng roadmap đầy tính năng tự động quyết định) → cần xem lại định hướng.

---

## Thị trường là người đánh giá thiết kế tốt nhất

Từ thời điểm này, thành công không đo bằng độ đẹp của kiến trúc.

Đo bằng:

> **Mỗi ngày có recruiter mở ứng dụng lên để làm việc.**

---

*[EPILOGUE.md](./EPILOGUE.md) — lời kết chương thiết kế.*

---

*Tài liệu liên quan: [weekly-product-review.md](./weekly-product-review.md) · [alpha-validation-readiness.md](../sprints/alpha-validation-readiness.md)*
