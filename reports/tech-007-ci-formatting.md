# TECH-007 — CI & Formatting Hardening

| Field             | Value                                      |
| ----------------- | ------------------------------------------ |
| Date              | 2026-07-19                                 |
| Status            | **DONE** (this PR)                         |
| Baseline          | `main @ fbc4461` (post EPIC-010)           |
| Foundation Freeze | **Intact**                                 |
| Business logic    | **Unchanged**                              |

---

## Problem

Local Windows checkouts with `core.autocrlf=true` convert LF → CRLF in the working tree. Prettier (default / configured LF) then fails `format:check` even when the Git index already stores LF.

That creates **false CI / local gate noise** and can hide real formatting or functional regressions.

Recent GitHub Actions failures on this repo also include an **account billing lock** (jobs not started). That is an ops/billing issue outside this TECH’s code scope; formatting hardening still removes the CRLF class of false negatives once Actions runs again.

---

## Scope (locked)

**In:**

- `.gitattributes` — `text=auto eol=lf` for source/docs; binaries marked `binary`
- `.editorconfig` — `end_of_line = lf` aligned with Prettier
- `prettier.config.cjs` — explicit `endOfLine: "lf"`
- Working-tree renormalization so local `pnpm run format:check` matches Linux CI

**Out:**

- Business capability / API / schema / Memory Bank changes
- Architecture redesign
- Fixing GitHub billing / Actions account lock
- Changing product quality gates beyond formatting consistency

---

## What changed

| File                    | Change                                      |
| ----------------------- | ------------------------------------------- |
| `.gitattributes`        | Force LF checkout for text; binary safe     |
| `.editorconfig`         | LF + 2-space defaults                       |
| `prettier.config.cjs`   | `endOfLine: "lf"`                           |
| Working tree            | Renormalized to LF via attributes + Prettier |
| `prisma-persistence.test.ts` | Prettier wrap-only (no assertion changes) |

---

## Verification

```bash
pnpm run format:check
pnpm run lint
pnpm run build
pnpm run test
```

Expected: `format:check` PASS on Windows and Linux with the same tree.

```bash
git ls-files --eol | findstr /i "w/crlf"
```

Expected after checkout with attributes applied: no source files with `w/crlf` (or only files not covered — should be none for `*.ts` / `*.md` / `*.json`).

---

## Acceptance

| Check                                              | Result |
| -------------------------------------------------- | ------ |
| LF enforced via repo config (not local git config) | Yes    |
| Prettier `endOfLine` explicit                      | Yes    |
| `format:check` consistent locally after normalize  | Yes    |
| No business logic / API changes                    | Yes    |

---

## Follow-up (out of scope)

1. Resolve GitHub Actions **billing lock** so CI jobs start again.  
2. Continue product cadence: EPIC-011 Integrations → EPIC-012 Audit & Governance.  
