# EPIC-018 — AI Automation

| Field    | Value |
|----------|--------|
| Status   | **ROADMAP** (after EPIC-017) |
| Depends  | Automation nav · EPIC-008 · orchestration |

## Intent

Workflow chạy theo rule / schedule qua Assistant capabilities, ví dụ:

- Mỗi sáng review CV mới trong queue  
- Khi có JD mới → shortlist ứng viên  
- Ingest job complete → notify + suggested actions  

Write path vẫn Preview → Confirm trừ khi user bật auto-confirm policy (product rule later).

## Out of scope here

Unattended irreversible writes without policy; LinkedIn scraping ethics edge cases.

## Next

Spec PR after Tool Orchestration.
