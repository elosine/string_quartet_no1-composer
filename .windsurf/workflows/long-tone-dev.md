---
description: Long Tone development workflow with three-tier documentation system
---

# Long Tone Development Workflow

Use this workflow when building Long Tone features or any incremental feature development.

## Three-Tier Documentation System

### Tier 1: Micro-Increment (after each small exchange)
- Create Cascade memory numbered `LT-XXX`
- Content: What user asked, what I did, code location/lines
- **No git commit yet**
- Tag memory with: `long_tone`, `tier1`, `LT-XXX`

### Tier 2: Minor Milestone (after several Tier 1 increments)
- User says "Tier 2 commit" or similar
- Summarize all Tier 1 work since last commit into git commit message
- Run:
```bash
git add -A
git commit -m "Long Tone: [summary of all Tier 1 work]"
```
- Update memory to note the commit hash

### Tier 3: Major Milestone (significant feature complete)
- User says "Tier 3 milestone" or similar
- Do all three:
  1. Create comprehensive Cascade memory
  2. Update `docs/LONG_TONE_IMPLEMENTATION.md` with everything up to this stage
  3. Git commit + tag:
```bash
git add -A
git commit -m "Long Tone: [major milestone description]"
git tag milestone-longtone-[feature-name]
```

---

## Checklist for Each Tier

### Tier 1 Checklist
- [ ] Implement the requested change
- [ ] Test it works (or note "pre-test" if user will test)
- [ ] Create memory with:
  - LT-XXX number (increment from last)
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
- [ ] Update LONG_TONE_IMPLEMENTATION.md
- [ ] Git commit with detailed message
- [ ] Create git tag
- [ ] Push tag: `git push origin [tag-name]`

---

## Current LT-XXX Numbering

Check existing memories for the latest LT-XXX number and increment from there.
Known memories: LT-001 through LT-005 (as of Feb 2026)

---

## Key Files

- **Main code**: `public/index.html` (MidiModelPanel, GlissandoSystem)
- **Progress doc**: `docs/LONG_TONE_IMPLEMENTATION.md`
- **Pre-longtone baseline**: `git tag milestone-pre-longtone`

---

## Rollback Commands

```bash
# View all Long Tone related commits
git log --oneline --grep="Long Tone"

# Return to pre-longtone state
git checkout milestone-pre-longtone

# Create branch from milestone
git checkout -b longtone-experiment milestone-pre-longtone
```
