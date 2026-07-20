# Sprint 0 — AI Workspace UX

**Status:** ✅ SIGNED — see [SPRINT-0-SIGNED.md](./SPRINT-0-SIGNED.md)  
**Phase 1:** [PHASE-1-ASSISTANT-PR.md](./PHASE-1-ASSISTANT-PR.md)

> The Assistant is the application. Everything else is a capability.

Decisions: [../DECISIONS-LOCKED.md](../DECISIONS-LOCKED.md)

---

## Package contents

| Artifact | Path |
|----------|------|
| **Conversation Grammar** | [CONVERSATION-GRAMMAR.md](./CONVERSATION-GRAMMAR.md) |
| Design System | [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) (**v2** GitHub/Linear quiet UI) |
| Eight-Hour Test | [EIGHT-HOUR-TEST.md](./EIGHT-HOUR-TEST.md) |
| User Journeys | [USER-JOURNEYS.md](./USER-JOURNEYS.md) |
| Information Architecture | [INFORMATION-ARCHITECTURE.md](./INFORMATION-ARCHITECTURE.md) |
| Assistant States | [ASSISTANT-STATES.md](./ASSISTANT-STATES.md) |
| Component Inventory | [COMPONENT-INVENTORY.md](./COMPONENT-INVENTORY.md) |
| Figma Layout Spec | [FIGMA-LAYOUT-SPEC.md](./FIGMA-LAYOUT-SPEC.md) |
| Interaction Diagrams | [INTERACTION-DIAGRAMS.md](./INTERACTION-DIAGRAMS.md) |
| PNG Wireframes | [wireframes/](./wireframes/) |

---

## Wireframes (PNG)

> **Note:** WF-01…10 PNGs are **v1 layout** (structure + IA). Visual language is now **Design System v2** (GitHub quiet UI: Inter, grayscale-dominant, GitHub green CTAs only). Regenerate or restyle in Figma before implementation sign-off.

| ID | File | Intent |
|----|------|--------|
| WF-01 | [wf-01-assistant-home.png](./wireframes/wf-01-assistant-home.png) | Recruiter Assistant home |
| WF-02 | [wf-02-conversation.png](./wireframes/wf-02-conversation.png) | Conversation + cards + context |
| WF-03 | [wf-03-review-cv.png](./wireframes/wf-03-review-cv.png) | Analyze · CV scorecard |
| WF-04 | [wf-04-jd-matching.png](./wireframes/wf-04-jd-matching.png) | JD extract + rank |
| WF-05 | [wf-05-candidate-search.png](./wireframes/wf-05-candidate-search.png) | NL search |
| WF-06 | [wf-06-candidate-workspace.png](./wireframes/wf-06-candidate-workspace.png) | Knowledge · Candidate |
| WF-07 | [wf-07-job-workspace.png](./wireframes/wf-07-job-workspace.png) | Knowledge · Job |
| WF-08 | [wf-08-analytics.png](./wireframes/wf-08-analytics.png) | Conversation analytics |
| WF-09 | [wf-09-ask-analyze-act.png](./wireframes/wf-09-ask-analyze-act.png) | Three modes |
| WF-10 | [wf-10-mobile.png](./wireframes/wf-10-mobile.png) | Mobile |

---

## Approval gate (Founder)

Before any implementation EPIC:

- [ ] Conversation Grammar approved  
- [ ] Nav / IA approved  
- [ ] **Design System v2** (quiet / GitHub-like) accepted  
- [ ] Eight-Hour Test accepted as product law  
- [ ] Journeys 1–4 accepted  
- [ ] WF structure signed (Figma restyle to v2 OK)  

**Only after sign-off:** open PRs **one screen at a time** (Assistant first), with UX rationale per PR.

---

## Explicit non-goals

- No React pages  
- No API changes  
- No Memory Bank edits  
- No “temporary chat on Home”
