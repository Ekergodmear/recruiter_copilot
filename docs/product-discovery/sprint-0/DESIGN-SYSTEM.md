# Design System — Recruiter Assistant (Sprint 0 · v2)

**Status:** DESIGN FREEZE · Quiet productivity UI  
**Inspiration:** GitHub · Linear · Vercel · Notion AI · Cursor · ChatGPT Team  
**Reject:** Salesforce / Workday ATS chrome · Dribbble “AI glow” · glassmorphism · neon

> Design for software users spend **8 hours/day** in.  
> Pass: *“Could a recruiter comfortably work here for an entire day?”*  
> If no → simplify. Clarity > novelty. Speed > decoration. Trust > excitement.

---

## 1. What this product is (UI implication)

| Is | Is not |
|----|--------|
| AI-native Recruiting **Workspace** | ATS with a chat bolted on |
| Assistant = **the application** | Chatbot + dashboard |
| Artifacts in a timeline | Messenger bubbles only |
| Document-like reading width | Enterprise widget wall |

---

## 2. Design philosophy

**Quiet UI. Content first. Almost invisible chrome.**

- White space is a feature  
- Typography is hierarchy  
- Motion is subtle (≤150ms)  
- No unnecessary gradients  
- No glassmorphism / neon / oversized icons / floating decorative cards  
- Avoid looking “too AI” — this is professional productivity software  

---

## 3. Visual language (GitHub-inspired)

| Trait | Spec |
|-------|------|
| Surfaces | Flat; white / near-white |
| Borders | Light `#d0d7de` (GitHub-like) |
| Shadow | Only where needed: `0 1px 0 rgba(31,35,40,0.04)` |
| Radius | **8–12px** |
| Hover | Subtle background shift, no bounce |
| Font UI | **Inter** (system fallback: `ui-sans-serif, system-ui`) |
| Mono | Only technical / tool / citation: `ui-monospace, SFMono-Regular, Menlo` |
| Grid | **8px** |

Max content width: **~1400px** shell; Assistant reading column **~720–800px**; artifacts may expand to **~960px**.

Assistant should feel like **editing a document**, not chatting in Messenger.

---

## 4. Color (90% grayscale)

| Token | Hex | Use |
|-------|-----|-----|
| `--bg` | `#ffffff` | App / page |
| `--bg-subtle` | `#f6f8fa` | Sidebar, muted panels |
| `--border` | `#d0d7de` | Hairlines |
| `--border-muted` | `#d8dee4` | Dividers |
| `--fg` | `#1f2328` | Primary text |
| `--fg-muted` | `#656d76` | Secondary |
| `--fg-subtle` | `#8c959f` | Captions |
| `--accent` | `#238636` | **Success / primary CTA only** — never paint the UI green |
| `--accent-emphasis` | `#1a7f37` | Primary button hover |
| `--danger` | `#cf222e` | Destructive |
| `--attention` | `#9a6700` | Warning |
| `--accent-muted` | `#dafbe1` | Soft success wash (rare) |

**Mode badges** (text + quiet bg, not neon):

| Mode | Style |
|------|--------|
| Ask | Neutral border + muted fg |
| Analyze | Subtle blue-gray border (`#0969da` text on `#ddf4ff` at low chroma) |
| Act | Attention / border emphasis before Confirm — still mostly gray |

Around **90% of pixels** stay neutral. Green is for **positive commit actions** only.

---

## 5. Typography hierarchy

| Role | Size / weight |
|------|----------------|
| Page title | 20–24 / 600 |
| Section | 14–16 / 600 |
| Body | 14 / 400 · line-height 1.5 |
| Meta | 12 / 400 · `--fg-muted` |
| Mono tool lines | 12 / 400 |

---

## 6. Navigation (unchanged structure)

```
Assistant · Knowledge · Automation · History · Settings
```

Candidate / Job / Pipeline / Search / Review / Matching / Analytics = **tools opened when needed**, not primary destinations. Search page **eventually disappears** into conversational Ask.

---

## 7. Assistant experience

### Artifacts (not text-only)

Review Result · Candidate List · Matching Report · Job Draft · Interview Questions · Weekly Report  

Artifacts stay **editable**. Conversation = **timeline**.

### Show the AI working (Quiet AI · D11)

**Never** only: `Thinking…`  
**Never** multi-step tool theatre (Searching → Reading → Matching → Ranking…).

**While running — one line only:**

```
Searching candidates…
```

or `Analyzing CV…` / `Matching JD…`

### Working memory (right context)

Always show when relevant: Current JD · Candidate · Filters · Conversation · Uploaded files · Recent actions.

### Transparency (progressive disclosure · D11)

Default footer: one quiet line — `AI response · 1.1s` + ⓘ  

Details (tools, sources, intent, slots, confidence, model) **only** after **Show details**.

Default surface: Answer · Artifacts · Next actions — speak like a skilled colleague, not a system log.

### Read vs Write

| Class | Behavior |
|-------|----------|
| Read | Immediate |
| Write | Preview → Confirmation → Execution — **never** mutate immediately |

---

## 8. Micro-interactions

- Transitions **~150ms**  
- Small fades / tiny scale on hover  
- Never bounce, never flashy  

---

## 9. Tables

GitHub Issues feel: compact, readable, sticky header, keyboard-friendly, strong empty states.

---

## 10. Empty states

Never only “No data.”

Explain: what it does · why empty · **one** suggested next action.

---

## 11. Components

One button language. One card language. Reuse ruthlessly. No parallel style systems.

---

## 12. Responsive

**Desktop first** → tablet → mobile. Never sacrifice desktop productivity for novelty.

---

## 13. Implementation discipline (when coding starts)

1. Do **not** redesign randomly or whole-app in one PR  
2. Audit screen → reuse components → replace only violations  
3. Per PR deliver: UX rationale · IA delta · component delta · wireframe ref · React for **one** screen  
4. Goal = **reduce cognitive load**, not prettier pixels  

**Coding still gated** on Founder sign-off of Sprint 0 package + this v2 language.
