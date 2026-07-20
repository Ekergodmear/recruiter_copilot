# Sprint 0 — SIGNED

**Status:** ✅ SIGNED (Founder) — 2026-07-20  
**Nature:** **UX Foundation** (interaction architecture), not merely UI cosmetics.

From this point:

- Interaction Model is **frozen** unless a new Product RFC is approved.
- Visual polish and implementation may improve **without** breaking locked principles.
- Implementation may **not** invent navigation, modes, or AI concepts outside Sprint 0.

---

## Locked product principles

1. The Assistant is the application.  
2. Everything else is a capability exposed through the Assistant.  
3. Conversation is the primary interaction model.  
4. Artifacts are first-class citizens.  
5. Tools are invisible to the user (capabilities, not chrome).  
6. Read → immediate. Write → Preview → Confirm → Execute.  
7. UI communicates **trust**, not “intelligence theater”.  
8. Eight-Hour Test always applies.  
9. **Keyboard-first** (see below).  
10. **Everything is deep-linkable** (see below).  
11. **Language-agnostic** — Intent → slots → Tool (VI / EN / mixed / shorthand). See D10.  
12. **Quiet AI** — outcomes first; tool chain / intent / confidence hidden behind Show details. See D11.  
13. **Intelligent Ingestion** — mọi nguồn → cùng pipeline → Knowledge. See D12 · EPIC-015.

Full package: [README.md](./README.md) · Decisions: [../DECISIONS-LOCKED.md](../DECISIONS-LOCKED.md)

---

## D8 — Keyboard-first (LOCKED)

| Shortcut | Action |
|----------|--------|
| `/` | Focus Assistant composer (when not in input) |
| `Cmd/Ctrl + K` | Global command palette |
| `Esc` | Close panel / cancel / blur |
| `↑` | Edit previous prompt (when composer empty) |
| `Tab` | Select next suggestion chip |
| `Enter` | Send |
| `Shift + Enter` | New line |

Recruiter should work mostly without leaving the keyboard.

---

## D9 — Deep-linkable (LOCKED)

Every durable object and conversation has a URL:

| Resource | Path |
|----------|------|
| Conversation | `/assistant/c/:conversationId` |
| Assistant home | `/assistant` |
| Candidate | `/candidates/:id` (Knowledge) |
| Job | `/jobs/:id` |
| Review | `/review/:id` |
| Matching result | `/matching/:id` (Phase 3+) |

Supports share, bookmark, resume work, clear history.

---

## What implementation must preserve

- Do **not** redesign interaction patterns  
- Do **not** invent new navigation  
- Do **not** move features between sections  
- Do **not** introduce new AI concepts  
- Implement exactly what Sprint 0 defines  
- Visual improvements allowed; interaction changes are **not**

---

## PR checklist (every implementation PR)

1. User Story  
2. Interaction Pattern ID (`P-ASK-…` / `P-AN-…` / `P-ACT-…`)  
3. UX rationale  
4. Screens affected  
5. Accessibility impact  
6. Performance impact  
7. Screenshot before  
8. Screenshot after  
9. Regression checklist  

**Rule:** One screen · One PR · One review · One merge.

---

## Screen order

| Phase | Scope |
|-------|--------|
| **1** | Recruiter Assistant · Timeline · Context · Artifacts · Composer · Progress Steps |
| **2** | Knowledge · Candidate / Job / Review workspaces |
| **3** | Matching · Search · JD Analysis · Comparison |
| **4** | Automation · History · Notifications · Settings |

---

## Engineering rule

Compose over reinvent. Reuse APIs, domain objects, business logic. UI adapts to the platform — no forced backend redesign for Sprint 0 UI.
