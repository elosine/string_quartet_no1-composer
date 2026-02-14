---
description: AI Score Building Automation - incremental development workflow with three-tier documentation
---

# AI Score Building Automation Workflow

Use this workflow when building score automation features with incremental development.

## Three-Tier Documentation System

### Tier 1: Micro-Increment (after each small exchange)
- Create Cascade memory numbered `ASB-XXX` (AI Score Building)
- Content: What user asked, what I did, code location/lines
- **No git commit yet**
- Tag memory with: `ai_score_building`, `tier1`, `ASB-XXX`

### Tier 2: Minor Milestone (after several Tier 1 increments)
- User says "Tier 2 commit" or similar
- Summarize all Tier 1 work since last commit into git commit message
- Run:
```bash
git add -A
git commit -m "AI Score Building: [summary of all Tier 1 work]"
```
- Update memory to note the commit hash

### Tier 3: Major Milestone (significant feature complete)
- User says "Tier 3 milestone" or similar
- Do all three:
  1. Create comprehensive Cascade memory
  2. Update progress document in `docs/`
  3. Git commit + tag:
```bash
git add -A
git commit -m "AI Score Building: [major milestone description]"
git tag milestone-asb-[feature-name]
```

---

## Piece-by-Piece Development Methodology

A systematic approach combining git commits, git tags, and Cascade memories for traceable, reversible development.

### Three-Layer Documentation System

| Layer | Tool | Purpose | When to Use |
|-------|------|---------|-------------|
| **Code snapshots** | Git commits | Reversible code states | After each working increment |
| **Milestones** | Git tags | Named reference points | Before/after major features |
| **Conversation context** | Cascade memories | Design decisions, rationale, lessons learned | Key decisions, problems solved, patterns discovered |

### Workflow Pattern

**Before starting a feature:**
1. Create a "pre-feature" git tag (e.g., `milestone-pre-[feature]`)
2. Create a memory summarizing: what we're about to build, why, initial approach

**During development (each increment):**
1. Implement smallest working piece
2. Test it works
3. Git commit with descriptive message: "Add [feature]: [what it does]"
4. If a key decision was made or problem solved → create memory

**After completing a feature:**
1. Create a "post-feature" git tag
2. Create a summary memory: what was built, how it works, lessons learned

### Memory Types to Create

| Memory Type | Content | Example Tags |
|-------------|---------|--------------|
| **Decision Point** | Why we chose approach A over B | `decision`, `architecture` |
| **Problem/Solution** | Issue encountered + how we fixed it | `debugging`, `fix`, `lesson` |
| **Code Snapshot** | What exists at this point, key functions | `checkpoint`, `code_state` |
| **Pattern** | Reusable approach for similar problems | `pattern`, `reusable` |

### Naming Conventions

**Git tags:**
- `milestone-pre-[feature]` - Before starting
- `milestone-post-[feature]` - After completing
- `[feature]-stage[N]-[description]` - Incremental stages

**Git commit messages:**
- `Add [component]: [brief description]`
- `Fix [component]: [what was wrong]`
- `Refactor [component]: [why]`

**Memory titles:**
- `[Feature] Decision: [topic]`
- `[Feature] Problem/Solution: [issue]`
- `[Feature] Architecture: [component]`
- `Pattern: [reusable concept]`

### Referencing Past Work

Trigger phrases to recall memories:
- "Remember when we solved [X problem]?"
- "What was our approach for [Y feature]?"
- "Show me the decision we made about [Z]"
- "Go back to before we worked on [feature]"

---

## Checklist for Each Tier

### Tier 1 Checklist
- [ ] Implement the requested change
- [ ] Test it works (or note "pre-test" if user will test)
- [ ] Create memory with:
  - ASB-XXX number (increment from last)
  - What user requested
  - What I did (with line numbers)
  - Expected behavior

### Tier 2 Checklist
- [ ] List all Tier 1 memories since last commit
- [ ] Write commit message summarizing all changes
- [ ] Run git commit
- [ ] Note commit hash in memory

### Tier 3 Checklist
- [ ] Write comprehensive memory
- [ ] Update relevant docs/ file
- [ ] Git commit with detailed message
- [ ] Create git tag
- [ ] Push tag: `git push origin [tag-name]`

---

## Reference Documents

Architecture and system documentation for building score automation features:

| Document | Location | Description |
|----------|----------|-------------|
| Curve System Architecture | `docs/CURVE_SYSTEM_ARCHITECTURE.md` | Complete curve system with database, rendering, multi-page support |
| Motive System Architecture | Memory: `1ecbcfcd-8007-40f8-b3a0-f1ba6f38995f` | Motive rendering, time-based lookups, static windows |
| GC Maker Implementation | Memory: `3c8042ca-3b5e-4db6-9528-c3ba033611e1` | Gravitational conductor trajectories |
| Save Data Compatibility | Memory: `6049eb53-2582-4c27-b94d-0e40f64ed014` | ScoreManager save/load patterns |

---

## Key Files

- **Main code**: `public/index.html`
- **Server**: `server.js`
- **Docs folder**: `docs/`

---

## Current ASB-XXX Numbering

Start with ASB-001 for new AI Score Building work.
(Previous Long Tone work used LT-001 through LT-005)

---

## Automation Rules

### Proactive Tier 1 (after each code change)
// turbo
1. Create ASB-XXX memory automatically (no user prompt needed)
2. Update `docs/AI_SCORE_BUILDING_PROGRESS.md` - add to Recent Tier 1 table
3. Increment session Tier 1 count

### Threshold-Based Tier 2 (when Tier 1 count >= 4)
1. Proactively say: "This looks like a good Tier 2 checkpoint. Here's a draft commit message:"
2. Draft commit message summarizing all Tier 1 work since last commit
3. After user approves commit, reset Tier 1 count and log commit hash in progress file

### Tier 3 Suggestion (major feature complete)
1. Proactively suggest Tier 3 milestone
2. Draft updates to architecture docs
3. Propose git tag name

### Session Start Trigger
**User says:** "Continuing AI score building" or similar

**I do:**
1. Read `docs/AI_SCORE_BUILDING_PROGRESS.md`
2. Read this workflow file
3. Report: last session date, pending work, current ASB-XXX number
4. Ask what to work on

### Session End Trigger
**User says:** "Wrapping up" or "End session" or similar

**I do:**
1. Summarize what was accomplished
2. Suggest Tier 2 commit if threshold met
3. Update progress file with pending work
4. Update "Last Updated" date

### Workflow Insight Trigger
**When:** A reusable pattern or lesson emerges during development

**I do:**
1. Append to `docs/WORKFLOW_METHODOLOGY.md` under appropriate section
2. Mention: "Added this insight to Workflow Methodology"

---

## Progress File

**Location:** `docs/AI_SCORE_BUILDING_PROGRESS.md`

This file maintains state between sessions:
- Current ASB-XXX number
- Tier 1 count this session
- Recent memories table
- Tier 2/3 commit history
- Pending work items

---

## Rollback Commands

```bash
# View all AI Score Building related commits
git log --oneline --grep="AI Score Building"

# Create branch from current state
git checkout -b asb-experiment

# View tags
git tag -l "milestone-asb-*"
```
