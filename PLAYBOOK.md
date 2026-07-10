# Recruiter Copilot — Engineering Playbook

> Operating manual for the team.  
> **MANIFESTO** = why we build. **Memory Bank** = product. **ADR** = decisions. **PLAYBOOK** = how we work.

**Bắt buộc:** Đọc [docs/MANIFESTO.md](./docs/MANIFESTO.md) trước khi viết code.

---

# Roles

| Role          | Responsibility                                  |
| ------------- | ----------------------------------------------- |
| Founder / CTO | Scope, ADR approval, sprint goals               |
| Cursor        | **Junior Engineer** — implement only, no design |
| Human         | Review, accept, real-user validation            |

## Cursor rules

- Do not redesign architecture
- Do not optimize without task
- Do not edit Memory Bank except bugs, user requirements, or approved ADR
- Implement from sprint task + Memory Bank reference + ADR

---

# Document hierarchy

```
docs/MANIFESTO.md    ← founding principles (read first)
PLAYBOOK.md          ← how we work (this file)
docs/                ← product discovery (interview guides, validation)
memory-bank/         ← product spec (FROZEN)
memory-bank/29-.../  ← ADRs (decisions)
sprints/             ← active sprint tasks
evaluation/          ← golden datasets
quality-gates/       ← CI thresholds
```

## Foundation is Frozen (2026-07-10)

Memory Bank, Architecture, Manifesto v1.0, và toàn bộ tư duy v1.0 — **đóng băng**.

Chỉ **bằng chứng Alpha** được phép thay đổi nền móng. Chi tiết: [docs/FOUNDATION-FROZEN.md](./docs/FOUNDATION-FROZEN.md)

## Product Validation Mode (from Sprint 1 Alpha)

- No new architecture
- No new AI modules
- No new Memory Bank docs
- Success = **TTQC down**, daily usage, no Excel escape
- Recruiter feedback > new ideas

## Weekly Product Review

60 phút/tuần. Agenda cố định. Không thay đổi.

→ [docs/weekly-product-review.md](./docs/weekly-product-review.md)

---

# How to start a sprint

1. CTO publishes `sprints/sprint-N.md` with goal, story, acceptance criteria
2. Sprint 0.5 infra must be green before Sprint 1 business work
3. No parallel sprints — finish N before N+1
4. Milestone gate: real recruiter validation before next sprint

## Sprint lifecycle

```
Engineering Complete → Alpha Hardening (optional) → Alpha Validation → Done
```

| State                    | Meaning                                               |
| ------------------------ | ----------------------------------------------------- |
| **Engineering Complete** | CI green, API works, not user-validated               |
| **Alpha Hardening**      | Pre-recruiter UX/tasks (`sprints/alpha-hardening.md`) |
| **Alpha Validation**     | 1 real recruiter, ≥30 CVs, telemetry thresholds       |
| **Done**                 | Sprint officially closed; next sprint may start       |

**Sprint 2 gate:** ≥30 real CVs + telemetry review (Override Rate, Parse Time, failure rate).

---

# How to write a task

Every task uses this format:

```markdown
## Task: [Title]

### Background

Why this task exists.

### Task

What to implement (specific files, endpoints).

### Acceptance Criteria

- [ ] Measurable outcome 1
- [ ] ...

### Out of Scope

What NOT to do.

### Definition of Done

- [ ] Tests pass
- [ ] CI green
- [ ] Telemetry (if AI)
- [ ] Contracts validated (if KC)
```

No brainstorming in implementation threads.

---

# How to create an ADR

1. Copy `memory-bank/_adr-template.md` → `memory-bank/29-architecture-decisions/ADR-xxx-title.md`
2. Status: Proposed → review with CTO → Accepted
3. Update `29-architecture-decisions/_index.md`
4. Only then change code if ADR requires it

Memory Bank changes require ADR or explicit user requirement.

---

# How to add a Knowledge Contract

1. Spec in `memory-bank/27-knowledge-contracts/KC-xxx.md` (requires CTO approval — Memory Bank frozen)
2. JSON schema in `contracts/KC-xxx-output.schema.json`
3. Golden samples in `evaluation/`
4. Quality gate thresholds in `quality-gates/`
5. Feature flag if optional AI path
6. Telemetry events for contract_id

**No AI merge without all of the above.**

---

# How to evaluate AI

```bash
pnpm run eval:resume      # golden set vs output
pnpm run test:contracts   # KC output schema validation
pnpm run test             # unit + integration
pnpm run ci               # full pipeline
```

Thresholds: `quality-gates/sprint-N.yaml` + ADR-000

Model swap (GPT → Gemini): must pass same evaluation — no manual guessing.

---

# How to review PR

Checklist:

- [ ] Matches sprint task acceptance criteria only (no scope creep)
- [ ] No Memory Bank edits (unless approved)
- [ ] No architecture changes without ADR
- [ ] Tests added/updated
- [ ] CI green
- [ ] AI features: telemetry + contracts + eval
- [ ] Feature flags for new AI capabilities
- [ ] No prompts in docs — prompts live in provider code only

---

# How to release

## Release types

| Type               | Audience             | Criteria                               |
| ------------------ | -------------------- | -------------------------------------- |
| **Internal Alpha** | 1 recruiter (friend) | Engineering Complete + Alpha Hardening |
| **Production**     | Paying customers     | Alpha Validation Done + security + SLA |

## Checklist

1. All quality gates for current sprint pass
2. Docker image builds
3. Tag: `alpha-sprint-N` or `sprint-N-done` when validation completes
4. Feature flags control rollout
5. Monitor telemetry: **TTQC**, Human Override Rate, parse time, daily usage — not token counts

---

# North Star Metric

## Time To Qualified Candidate (TTQC)

> Time from resume upload to candidate ready for shortlist.

Example:

| Event               | Time     |
| ------------------- | -------- |
| Upload              | 09:00:00 |
| AI parse done       | 09:00:05 |
| Recruiter edit done | 09:01:30 |
| Qualified           | 09:01:45 |

**TTQC = 1m 45s**

### Supporting metrics

| Metric              | Role                         |
| ------------------- | ---------------------------- |
| Human Override Rate | Explains TTQC inflation      |
| Parse Time          | System latency slice of TTQC |
| Daily Active Usage  | Habit vs trial               |
| Time Saved vs Excel | Business value               |
| Excel escape rate   | Product failure signal       |

Interview guide: `docs/recruiter-interview-guide.md`

---

# Sprint roadmap (sequential)

| Phase | Goal                                                                                          |
| ----- | --------------------------------------------------------------------------------------------- |
| 0.5   | Infra: CI, Docker, eval, contracts, telemetry, flags                                          |
| 1     | Upload resume → Candidate Profile (**Engineering Complete**)                                  |
| α     | Alpha Hardening — **AH-000 Telemetry Dashboard first** (`alpha-hardening.md`)                 |
| 1✓    | Alpha Validation — 30 CVs, telemetry thresholds                                               |
| 2     | Recruiter Candidate Workspace (list, detail, edit, resume viewer, import history, SQL search) |
| 3+    | Duplicate detection, Job, Matching, Submission — **data-driven, after workspace exists**      |

**Not Production Ready until Alpha Validation Done.**

Recruiter feedback > new architecture ideas after Alpha starts.

---

# Local development

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm run dev
pnpm run test
pnpm run ci
```

Health: `GET http://localhost:3000/health`

---

# Foundation tag

Repository foundation locked at **v3.1**. Tag: `foundation-v3.1-frozen`

**Foundation is Frozen** — xem [docs/FOUNDATION-FROZEN.md](./docs/FOUNDATION-FROZEN.md).

Do not expand Memory Bank. Let Alpha and Weekly Product Review drive what comes next.
