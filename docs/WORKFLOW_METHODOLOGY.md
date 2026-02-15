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

### Pattern: Post-Milestone Addendums
After a Tier 3 milestone is finalized, the next session often reveals refinements — new sub-features, default adjustments, UI polish, or workflow gaps that only become apparent after living with the feature. These are **addendums**, not new features or bug fixes.

**Protocol:**
1. **Original Tier 3 tag stays intact** — it remains the known-good rollback point
2. **ASB numbering continues linearly** — no special numbering scheme needed
3. **Session log groups addendums** under a labeled heading: `### Addendum: [parent milestone name]`
4. **Tier 2 commits** use an `addendum:` prefix (e.g., `addendum: glissando - dynamic notation, UI polish`)
5. **Bug fixes found during addendum work** are noted in the session log but don't need separate ASB entries unless they're independently significant
6. **Optional revision tag** — if addendums are substantial (new UI capabilities, new parameters), create a revision tag: `milestone-{name}-v2`
7. **Addendum scope** — addendums extend a finalized feature. If a change is unrelated to the parent milestone, it's a new feature, not an addendum

*Example: Glissando milestone finalized Feb 14. Feb 15 addendums added dynamic notation marking, velocity input, color/fill mode UI, and default adjustments — all extending the glissando workflow without changing its core architecture.*

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

### let vs var and window Access
Variables declared with `let` are NOT accessible via `window.varName` (unlike `var`). If a function needs a module-level `let` variable, use the closure variable directly—not `window.varName || fallback`. This caused the glissando notation positioning bug (ASB-011) where `window.leadInSeconds` was always `undefined`, falling back to 0 instead of the actual 2-second lead-in.

### Async Operations Blocking Visual Rendering
Never gate visual rendering on async audio operations that depend on user gestures. Chrome's autoplay policy causes `audioContext.resume()` to hang indefinitely without a user gesture, blocking any code after `await`. Render visual elements synchronously first, then load audio data in background. (ASB-012)

### Debugging Session Management
When a debugging session becomes unproductive — fixes create new problems, diagnostics are inconclusive, or the root cause remains elusive — follow this protocol:

**Recognizing a Stalled Debug Session:**
- More than 3 iterations of "fix → new problem" without convergence
- Diagnostic tests pass but visual reality still doesn't match
- Each fix is addressing symptoms rather than root cause
- User signals frustration or requests a reset

**Abort Protocol:**
1. **Stop immediately** — don't try "one more thing"
2. **Clean up** — remove ALL diagnostic/test code so the codebase is in a clean, working state
3. **Commit** with clear note: mark what was tried, what was confirmed, what remains unknown
4. **Create memory** documenting:
   - What was tried (numbered list)
   - What was confirmed working (✅)
   - What remains unresolved
   - Possible causes NOT yet investigated
   - Decision to abort and why
5. **Tag as INCONCLUSIVE** — not "failed." The diagnostics may have ruled out entire categories of causes, which is valuable.

**Fresh Start Protocol:**
1. Do NOT re-read the old diagnostic session in detail — start with fresh eyes
2. State the problem simply: "SVG appears at wrong Y position"
3. Take the simplest possible approach first (e.g., hardcode a known-good value and verify)
4. Test ONE thing at a time with immediate visual feedback
5. Ensure the test element is VISIBLE (correct page, correct panel, correct time position)

**What to Preserve from a Stalled Session:**
- Infrastructure code that was confirmed working (e.g., `trackYFraction` resize system)
- Confirmed facts about the coordinate system
- Ruled-out causes (saves time in the next attempt)

**What NOT to Preserve:**
- Diagnostic logging / debug markers
- Temporary test functions
- Workarounds that mask the real issue

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
