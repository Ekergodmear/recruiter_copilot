# Phase 1 PR — Recruiter Assistant

## User Story

As a recruiter, I open RecruiterSup and land on **Recruiter Assistant** so I can express recruiting intent (Ask / Analyze / Act) instead of navigating an ATS menu first.

## Interaction Pattern IDs

- `P-ASK-FIND` — natural language find → candidate cards  
- `P-AN-CV` — upload CV → import → review deep link  
- `P-ACT-CREATE` — create job Preview → Confirm → Execute  

## UX rationale

Implements Sprint 0 SIGNED UX Foundation: Assistant as application, progressive tool steps (no bare “Thinking…”), working memory panel, transparency footer, keyboard-first, deep-linkable `/assistant/c/:id`.

## Screens affected

- New: Assistant (`/assistant`, `/assistant/c/:id`), History, Automation/Settings placeholders  
- Nav: AppShell → Assistant · Knowledge(+) · Automation · History · Settings  
- Default route `/` → `/assistant`  
- Legacy inbox preserved at `/inbox`

## Accessibility

- Mode badges include text labels  
- Composer keyboard: Enter send, Shift+Enter newline, Tab suggestions, ↑ restore last prompt  
- Global `/`, ⌘/Ctrl+K, Esc  

## Performance

- Client-side conversation store (localStorage, max 50 threads)  
- Reuses existing `listCandidates` / `importResume` / `createJobFromText` — no new backend  

## Screenshots

Before: ATS nav (Inbox first)  
After: Assistant shell (capture in review)

## Regression checklist

- [ ] `/assistant` creates deep-linkable conversation  
- [ ] Find query returns cards + transparency  
- [ ] Upload CV imports and links `/review/:id`  
- [ ] Create job shows Preview; Confirm creates job  
- [ ] Knowledge routes still work  
- [ ] `/inbox` legacy review queue works  
- [ ] Eight-Hour Test: quiet UI, no glow  
