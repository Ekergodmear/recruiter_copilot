# Figma-ready Layout Specification

**Status:** Sprint 0 · import as frames 1440×900 (desktop) + 390×844 (mobile)

---

## Global grid

- Desktop canvas: 1440×900  
- Left nav: **220px** fixed  
- Main: fluid, content max **880px** centered in Assistant; Knowledge max **1120px**  
- Gutter: 24px  

```
| 220 nav | 24 | ——— content (max 880) ——— | 24 | optional context 320 |
```

Context panel (WF-02): **320px** right, collapsible.

---

## WF frames (name exactly)

| Frame | Size | Notes |
|-------|------|-------|
| WF-01 Assistant Home | 1440×900 | Hero greeting + composer |
| WF-02 Conversation | 1440×900 | Thread + context |
| WF-03 Review CV | 1440×900 | Scorecard dominant |
| WF-04 JD Matching | 1440×900 | JD left / ranks right OR stacked |
| WF-05 Candidate Search | 1440×900 | Cards grid 2-col |
| WF-06 Candidate Workspace | 1440×900 | Knowledge chrome ok |
| WF-07 Job Workspace | 1440×900 | |
| WF-08 Analytics | 1440×900 | Narrative + charts |
| WF-09 Modes | 1440×900 | Three columns Ask/Analyze/Act |
| WF-10 Mobile | 390×844 | Bottom composer |

---

## Auto-layout rules

- Nav: vertical, 8px item gap  
- Composer: hug height, min 56px, max 160px  
- Card lists: 12px gap  
- Act Preview: full-width in thread, sticky footer Confirm  

---

Tokens (Figma variables)

Mirror [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) **v2**: Inter, GitHub neutrals, `#238636` CTA only, 8px grid, radius 8–12.

Publish library: `RecruiterSup / Sprint0-v2-Quiet`.

---

## Handoff checklist

- [ ] Modes labeled on every Assistant frame  
- [ ] Act frames include Preview + Confirm  
- [ ] Tool state line present on WF-02  
- [ ] Mobile: no hover-only actions  
