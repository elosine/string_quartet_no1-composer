# Workflow Methodology: AI-Assisted Score Building

A living document for accumulating ideas, patterns, and lessons learned about working with AI to build musical scores.

---

## Core Principles

### 1. Incremental Development
- Build in small, testable pieces
- Each increment should be independently verifiable
- Commit working states frequently

### 2. Documentation as You Go
- Three-tier system: memories (micro), commits (minor), docs + tags (major)
- Document decisions and rationale, not just what was done
- Create memories for problems solved - they become future references

### 3. Reversibility
- Always have a rollback point before major changes
- Use git tags for milestones
- Keep pre-feature snapshots

---

## Patterns That Work

### Pattern: Reference Architecture Documents
When building a new system similar to an existing one, first document the existing system's architecture completely. This becomes a template for the new implementation.

*Example: Curve System Architecture document used as reference for building new graphic systems*

### Pattern: Pre-Test Memories
Create a memory describing expected behavior BEFORE testing. This captures intent and makes debugging easier if behavior differs.

### Pattern: Problem/Solution Memories
When solving a tricky bug, create a memory with:
- What the symptom was
- What the root cause was
- How it was fixed
- Why that fix works

*Example: Glissando pitch follower not persisting after save/load - root cause was missing `glissando` property in GTrackSystem.addGraphicItem() call*

---

## Communication Patterns

### Effective Prompts
- Be specific about what you want changed
- Reference existing patterns: "like how CurveMaker does X"
- Specify scope: "only in this function" or "throughout the codebase"

### Tier Triggers
- "Tier 2 commit" - triggers git commit with summary
- "Tier 3 milestone" - triggers full documentation cycle
- "/ai-score-building" - activates the workflow

---

## Lessons Learned

*(Add lessons here as they emerge)*

### Save/Load Compatibility
Always check if new properties need to be:
1. Saved in exportData()
2. Restored in importData()
3. Passed to dependent systems (e.g., GTrackSystem)

### Console Debugging
Use `console.debug()` instead of `console.log()` - browser extensions can interfere with console.log.

---

## Ideas to Explore

*(Add future ideas here)*

- [ ] Automated test generation for UI components
- [ ] Template system for common patterns
- [ ] Checkpoint system for experimental branches

---

## Quick Reference

| Action | Command/Trigger |
|--------|-----------------|
| Start workflow | `/ai-score-building` |
| Minor commit | "Tier 2 commit" |
| Major milestone | "Tier 3 milestone" |
| Recall memory | "Remember when we solved X?" |
| Rollback | `git checkout milestone-pre-[feature]` |

---

*Last updated: Feb 2026*
