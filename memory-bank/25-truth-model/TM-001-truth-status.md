# TM-001 — Truth Status

---

# Metadata

| Field | Value |
|-------|-------|
| Spec ID | TM-001 |
| Phase | 2 — NOT MVP runtime |
| Status | Approved (design) |

---

# Truth Status Enum

```
VERIFIED | LIKELY | CLAIMED | CONFLICTED | OUTDATED
```

---

# Definitions

## VERIFIED

- High-weight source confirmed (Interview, Reference Check)
- OR recruiter manually verified (`verified: true`, `verified_by: Recruiter`)
- AI may state as fact with high Truth Confidence

## LIKELY

- 2+ sources agree with weight sum ≥ threshold
- No high-weight source contradicts
- AI: "Strong indication..."

## CLAIMED

- Single low/medium weight source only (typically Resume)
- No corroboration
- AI: "Candidate **claims**..."

## CONFLICTED

- Sources disagree beyond tolerance
- Example: Resume B2, Client "Poor", Interview B1
- **Must surface to recruiter** — never auto-resolve silently
- AI: "Conflicting information — review needed"

## OUTDATED

- Skill/fact was VERIFIED or LIKELY but `last_used` or activity gap exceeds threshold
- Example: AWS on resume, no usage evidence in 5 years
- AI: "May be outdated..."

---

# Status Transitions

```
CLAIMED + Interview confirms     → VERIFIED
CLAIMED + second source agrees   → LIKELY
LIKELY + high-weight confirms    → VERIFIED
VERIFIED + no usage N years      → OUTDATED
any + contradicting source       → CONFLICTED
CONFLICTED + recruiter resolves  → VERIFIED or LIKELY (recruiter decision)
```

Recruiter always wins on CONFLICTED resolution.

---

# UI Requirements (Phase 2)

| Status | UI Treatment |
|--------|--------------|
| VERIFIED | Green indicator |
| LIKELY | Blue indicator |
| CLAIMED | Yellow — "unverified" |
| CONFLICTED | Red — requires action |
| OUTDATED | Gray — stale warning |

---

# Common Mistakes

❌ Auto-resolving CONFLICTED without recruiter

❌ CLAIMED displayed as VERIFIED in UI

❌ No transition to OUTDATED

---

# Cursor Validation Checklist

- [ ] Status matches source evidence
- [ ] CONFLICTED flagged to recruiter
- [ ] AI language matches status
- [ ] Phase 2 scope
