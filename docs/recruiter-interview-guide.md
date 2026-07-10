# Recruiter Interview Guide — Alpha Validation

> Product discovery document. Not engineering spec. Not Memory Bank.  
> Use after recruiter has used Internal Alpha for 3–5 days (~30 CVs).

---

## Purpose

Collect **behavioral truth**, not compliments.

Goals:

- Understand if recruiter stays in the app or returns to Excel
- Find where AI helps vs wastes time
- Measure willingness to pay
- Inform Sprint 2+ from real usage, not assumptions

**Interviewer:** Founder or CTO  
**Duration:** 30–45 minutes  
**Format:** 1-on-1, open conversation — follow up on answers

---

## Before the interview

- [ ] Recruiter has imported ≥20 CVs in the app
- [ ] Telemetry dashboard reviewed (parse time, override rate, failures)
- [ ] Note which candidates they edited vs accepted as-is

---

## Opening questions (ưu tiên — CTO)

Dùng **trước** hoặc **thay** câu "Có thích không?":

1. **"Nếu ngày mai không còn dùng ứng dụng này, bạn sẽ nhớ điều gì nhất?"**
2. **"Có bước nào hôm nay bạn vẫn phải làm ngoài hệ thống?"**

Thành công Alpha = recruiter nói: *"Giờ mỗi lần nhận CV mới, việc đầu tiên mình làm là mở ứng dụng này."*

---

## Core questions (10)

### 1. Usage patterns

**Phần nào bạn dùng nhiều nhất?**

- Listen for: import, profile review, edit, search, or "almost nothing"
- Follow-up: *Bạn mở app bao nhiêu lần/ngày?*

### 2. What they ignore

**Phần nào bạn bỏ qua hoặc không tin?**

- Listen for: summary, skills, english level, confidence scores
- Signals which AI outputs to deprioritize

### 3. Override behavior

**Bạn sửa AI nhiều nhất ở đâu?**

- Map to: summary, skills, english, years, name
- Cross-check with `human_override_rate` telemetry

### 4. Missing extraction

**Có trường nào AI nên tự lấy nhưng chưa lấy không?**

- Listen for: salary, linkedin, phone, certifications, languages
- Feeds deterministic extraction backlog — not new AI features

### 5. Still opening the CV

**Bạn vẫn phải mở CV gốc để xem gì?**

- If answer is "everything" → preview + source trust failed
- If specific fields → target AH-003 / extraction improvements

### 6. Time sinks

**Điều gì khiến bạn mất thời gian nhất?**

- Listen for: upload friction, waiting for parse, fixing wrong fields, finding old candidates
- Direct input to **TTQC** reduction

### 7. Trust in Summary

**Bạn có tin Summary không? Có dùng nó khi nhắn khách hàng không?**

- Yes/no + why
- Low trust → summary quality or disable in UI

### 8. Search usage

**Bạn có dùng Search (hoặc tìm ứng viên cũ) không?**

- If no → list/history (Sprint 2) higher priority than matching
- If yes → what did they search for?

### 9. Switching cost / loss aversion

**Nếu ngày mai mất ứng dụng này bạn có tiếc không? Tại sao?**

- Strong signal for product-market fit
- Weak answer → still in trial mode, not habit

### 10. Willingness to pay

**Bạn sẵn sàng trả bao nhiêu/tháng nếu công ty bạn dùng?**

- Anchor: per recruiter vs per company
- "0" is valid data — ask what would change their mind

---

## Behavioral probes (use if time allows)

| Probe | Why |
|-------|-----|
| *Hôm qua bạn làm gì đầu tiên khi có CV mới?* | Daily habit vs one-off |
| *Bạn còn copy thông tin sang Excel không?* | Excel escape rate |
| *Mất bao lâu từ upload đến khi ứng viên "đủ để shortlist"?* | **TTQC** ground truth |
| *Bạn có giới thiệu đồng nghiệp dùng không?* | Organic spread |

---

## Scoring rubric (post-interview)

| Dimension | 1 (Poor) | 3 (OK) | 5 (Strong) |
|-----------|----------|--------|------------|
| Daily usage | Rarely opens | Few times/week | Daily session |
| Trust in AI | Edits everything | Edits some fields | Mostly accepts |
| Time saved vs old workflow | Slower | Same | Clearly faster |
| Would miss if gone | No | Maybe | Yes |
| Willingness to pay | 0 | Low | Clear budget |

**Satisfaction target for Alpha Validation:** average ≥ 4/5 across dimensions 2–4.

---

## What to do with answers

| Answer theme | Action |
|--------------|--------|
| "Still use Excel for X" | Sprint 2 scope — workspace, not AI |
| "AI wrong on Y" | Extraction rules or KC eval — not new model |
| "Can't find old candidates" | List/search — Sprint 2 scope từ data |
| "Don't trust summary" | Feedback data (AH-004) + maybe hide summary |
| "Would pay if Z" | Roadmap input — requires 30+ CV proof first |

**Do not:** add architecture, new AI modules, or Memory Bank changes from interview alone.  
**Do:** update sprint tasks and telemetry targets.

---

## After interview

1. Write 5-bullet summary within 24h
2. Tag themes: `usage`, `trust`, `time`, `pay`, `excel-escape`
3. Compare recruiter-stated TTQC vs telemetry `parse_time_ms` + edit timestamps
4. CTO decides: Alpha Validation pass / extend / pivot

---

## North Star reminder

**Time To Qualified Candidate (TTQC)** — upload → profile ready for shortlist.

Human Override Rate explains *why* TTQC is high. It is not the goal itself.
