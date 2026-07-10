# What Would Make the Recruiter Stop Using This Product?

**Mục đích:** Danh sách rủi ro churn để đối chiếu sau Alpha Validation (30–50 CV thật).  
**Không phải backlog.** Là bộ lọc ưu tiên — nếu 3–4 lý do xảy ra liên tục, đó là Sprint 2.

**Cách dùng sau Alpha:**

1. Phỏng vấn recruiter theo `docs/recruiter-interview-guide.md`
2. Đánh dấu lý do nào **xảy ra** / **không xảy ra**
3. Lý do trùng ≥3 lần → **P0 backlog**, không thêm feature mới trước khi xử lý

---

## Bản chất sản phẩm (nhắc lại)

> AI chuẩn bị tri thức. Recruiter xác nhận tri thức.

Nếu recruiter cảm thấy phải **làm lại từ đầu** thay vì **xác nhận**, họ sẽ quay lại PDF + Excel.

---

## 20 lý do recruiter có thể bỏ sản phẩm

### 1. Parse sai quá nhiều

AI trích xuất sai tên, công ty, kinh nghiệm — recruiter mất niềm tin ngay từ CV đầu tiên.

**Tín hiệu Alpha:** Human Override Rate > 40% trên 10 CV đầu; recruiter nói *"mở ra là sai hết"*.

---

### 2. Chậm hơn mở CV bằng PDF

Upload + chờ parse + review mất nhiều thời gian hơn mở file trong Adobe/Word.

**Tín hiệu Alpha:** TTQC > 3 phút median; recruiter mở song song PDF trong khi chờ.

---

### 3. Phải sửa gần như mọi trường

Nếu 4/4 field editable đều bị override, AI không tiết kiệm công việc — chỉ thêm bước.

**Tín hiệu Alpha:** AI Acceptance Rate < 50%; Review Completion Rate cao nhưng Override Rate cũng cao.

---

### 4. Upload lỗi hoặc không ổn định

File hợp lệ bị reject, timeout, mất dữ liệu sau refresh — recruiter không dám tin workflow.

**Tín hiệu Alpha:** Import Success Rate < 95%; recruiter upload lại cùng file nhiều lần.

---

### 5. Không tìm lại được ứng viên

Sau khi import, recruiter không biết candidate ở đâu, không có danh sách, không search được.

**Tín hiệu Alpha:** *"Hôm qua upload ai rồi?"* — quay lại Excel để tracking.

---

### 6. English level luôn sai

Đây là field quyết định shortlist ở thị trường VN. Sai English = sai cả pipeline.

**Tín hiệu Alpha:** English chiếm >35% override; xuất hiện trong Top Review Reasons liên tục.

---

### 7. Summary vô dụng (quá chung, không đúng người)

Summary generic kiểu *"experienced professional with strong skills"* — recruiter phải viết lại hoàn toàn.

**Tín hiệu Alpha:** Summary override + reject cao; 👎 reject trên summary > accept.

---

### 8. Skills thiếu hoặc sai nghĩa

Thiếu skill quan trọng (Next.js, AWS), hoặc normalize sai (React → reactjs, Java → JavaScript).

**Tín hiệu Alpha:** *"Missing skill"* là override reason top 3.

---

### 9. Years of Experience sai hệ thống

Parser đọc sai số năm, hoặc không đọc được format VN (5+ years, 2018–present).

**Tín hiệu Alpha:** Years override > 25%; field xuất hiện trong Review Queue HIGH nhưng vẫn bị sửa.

---

### 10. Review Queue không giúp — vẫn đọc hết

Rule Priority không giảm TTQC; recruiter bỏ qua queue và đọc tuần tự mọi field.

**Tín hiệu Alpha:** HIGH priority review rate < 70%; LOW priority review rate tương đương HIGH.

---

### 11. Không đối chiếu được CV gốc thoải mái

Preview chậm, DOCX vỡ layout, PDF không hiển thị — recruiter tải file về để xem.

**Tín hiệu Alpha:** Recruiter mở file gốc song song thay vì dùng in-app preview.

---

### 12. Không hiểu vì sao AI hiển thị giá trị này

Thiếu provenance, thiếu confidence — recruiter không tin và không muốn verify.

**Tín hiệu Alpha:** Verification Rate thấp dù Acceptance Rate cao; *"sao biết B2?"*

---

### 13. Quy trình Mark Ready không rõ nghĩa

Recruiter không biết khi nào *"xong"* — bấm Ready sớm hoặc không bao giờ bấm.

**Tín hiệu Alpha:** Nhiều CV import nhưng ít `candidate_qualified`; TTQC không đo được.

---

### 14. Mất thao tác khi refresh / đóng tab

In-memory storage, không persist — reload mất candidate.

**Tín hiệu Alpha:** Recruiter complain mất data; không quay lại app ngày hôm sau.

---

### 15. Phải copy-paste sang Excel/ATS anyway

Sản phẩm không thay thế bước cuối; recruiter vẫn nhập tay vào hệ thống khác.

**Tín hiệu Alpha:** Excel escape KPI fail; recruiter song song spreadsheet cho cùng batch CV.

---

### 16. LLM chậm hoặc không predictable

Thời gian parse dao động lớn; đôi khi timeout — không dùng được trong giờ cao điểm.

**Tín hiệu Alpha:** Parse time p95 > 15s; recruiter chờ và làm việc khác.

---

### 17. OCR / scan PDF kém

CV scan, ảnh chụp — text extraction rỗng hoặc garbage.

**Tín hiệu Alpha:** OCR usage cao + override rate cao trên cùng cohort; parse failure trên PDF scan.

---

### 18. Không phù hợp loại CV VN

Format khác US/EU: ảnh đại diện, bảng kỹ năng, tiếng Việt mixed English — parser fail silent.

**Tín hiệu Alpha:** Golden resumes pass nhưng CV thật fail; missing fields spike trên batch thật.

---

### 19. Cảm giác "AI đang phán đoán thay tôi"

Ngôn ngữ UI hoặc confidence cao trên giá trị sai — recruiter cảm thấy bị override bởi máy.

**Tín hiệu Alpha:** Reject rate cao; recruiter nói *"AI tự tin quá"*; không dùng Accept.

---

### 20. Không đáng so với workflow cũ

Tổng thời gian (upload + review + sửa + export) ≥ mở PDF + ghi Excel 5 phút/CV.

**Tín hiệu Alpha:** Time saved < 30%; Daily Active drop sau ngày 2; recruiter quay lại cách cũ *"cho nhanh"*.

---

## Ma trận đối chiếu sau Alpha

| # | Lý do | Xảy ra? (Y/N) | Bằng chứng (quote / metric) | Ưu tiên |
|---|-------|---------------|-----------------------------|---------|
| 1 | Parse sai quá nhiều | | | |
| 2 | Chậm hơn PDF | | | |
| 3 | Sửa mọi trường | | | |
| 4 | Upload lỗi | | | |
| 5 | Không tìm lại CV | | | |
| 6 | English sai | | | |
| 7 | Summary vô dụng | | | |
| 8 | Skills sai/thiếu | | | |
| 9 | Years sai | | | |
| 10 | Review Queue vô dụng | | | |
| 11 | Preview kém | | | |
| 12 | Không hiểu provenance | | | |
| 13 | Mark Ready không rõ | | | |
| 14 | Mất data refresh | | | |
| 15 | Vẫn copy Excel/ATS | | | |
| 16 | LLM unpredictable | | | |
| 17 | OCR kém | | | |
| 18 | CV VN không fit | | | |
| 19 | AI "phán đoán" | | | |
| 20 | Không đáng vs workflow cũ | | | |

**Quy tắc:** ≥3 lý do đánh **Y** với bằng chứng rõ → dừng feature mới, Sprint 2 chỉ fix những lý do đó.

---

## Liên kết

- Phỏng vấn: `docs/recruiter-interview-guide.md`
- Alpha Gate metrics: `sprints/alpha-hardening.md` (Recruiter Review Experience)
- Alpha Instrumentation: `sprints/alpha-validation-readiness.md`

---

*Sprint 1 đóng 2026-07-10. Người dùng thật là kiến trúc sư Sprint 2.*
