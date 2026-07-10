# TM-003 — Evidence Weight

---

# Metadata

| Field | Value |
|-------|-------|
| Spec ID | TM-003 |
| Phase | 2 |
| Status | Approved (design) |

---

# Source Weights

| Source | Weight | Type |
|--------|--------|------|
| Reference Check | 10 | External verification |
| Interview | 10 | Direct assessment |
| Recruiter | 7 | Professional judgment |
| GitHub | 8 | Observable artifacts |
| Resume | 6 | Self-reported document |
| Call Note | 6 | Recruiter observation |
| Client Feedback | 5 | Outcome-biased |
| LinkedIn | 4 | Self-curated profile |
| AI Inference | 3 | Machine inference — lowest |

Weights are configurable per Workspace (Phase 3).

---

# Merge Rules (Phase 2)

### Agreement

If sources agree on value:

```
truth_confidence = min(1.0, sum(weights) / 20)
truth_status = VERIFIED if max weight ≥ 10 else LIKELY
```

### Conflict

If sources disagree:

```
truth_status = CONFLICTED
truth_confidence = max(weight) / 20 for leading source only
→ flag for recruiter
```

### Single Source

```
truth_status = CLAIMED
truth_confidence = weight / 20
```

---

# Example: English Level Conflict

| Source | Value | Weight |
|--------|-------|--------|
| Resume | B2 | 6 |
| Recruiter | C1 | 7 |
| Client | Poor | 5 |
| Interview | B1 | 10 |

Interview has highest weight but others disagree → **CONFLICTED**

Recruiter must resolve. System suggests Interview value as primary but does not auto-apply.

---

# Example: React Skill Agreement

| Source | Claims React | Weight |
|--------|--------------|--------|
| Resume | yes | 6 |
| GitHub | yes | 8 |
| Interview | yes | 10 |

Agreement, high total weight → **VERIFIED**, truth confidence ~0.98

---

# Common Mistakes

❌ Equal weight for all sources

❌ Client feedback overriding Interview

❌ Auto-picking Resume over Interview

❌ AI Inference weight ≥ Interview

---

# Cursor Validation Checklist

- [ ] Weights applied per source type
- [ ] Conflict → CONFLICTED not silent merge
- [ ] Recruiter wins on manual resolution
- [ ] Phase 2 scope
