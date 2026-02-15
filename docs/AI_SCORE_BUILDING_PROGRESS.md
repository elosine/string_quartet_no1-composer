# AI Score Building Progress

**Status:** Active  
**Last Updated:** Feb 15, 2026  
**Current ASB Number:** ASB-029

---

## Last Session Summary

> **Tier 3 milestone complete.** Full glissando automation is feature-complete and tested. Two parallel input methods: UI (Step 1/Step 2 buttons) and AI prompt (guided questionnaire / natural language / template). All bugs fixed. AI prompt system tested end-to-end. Tag: `milestone-asb-glissando-complete`. Next session: begin actual score composition work or extend to new gesture types.

---

## Current Session

**Date:** Feb 15, 2026  
**Focus:** Glissando pitch tracking fix + SVG positioning clamp + score composition  
**Tier 1 Count This Session:** 0 (reset after Tier 2)  
**Tier 2 Threshold:** 3-4 increments

### Session Log (prior sessions)
- ASB-001 through ASB-013: Long Tone Glissando workflow (see Tier 3 milestone below)

### Addendum: Glissando Milestone (`milestone-asb-glissando-complete`)
*Post-finalization refinements — extending the glissando workflow with notation, velocity, and UI polish*

- ASB-014: Add dynamic notation marking to glissando (independent from MIDI velocity)
- ASB-015: UI adjustments — default clef treble, velocity input box (0-127), "Dynamic" label
- ASB-016: Add color swatches + fill mode (Line/Fill↓/Fill↑) to Long Tone UI
- Bug fix: SVG resize handle (blue square) persisting after element deletion
- Bug fix: CurveMaker swatch selectors were unscoped — stripping LT palette defaults
- ASB-017: Post-Milestone Addendum Protocol — documented in WORKFLOW_METHODOLOGY.md + progress file
- ASB-018: Fix quarter-tone pitch notation (Dutch→English) + always overwrite .ly/SVG (no caching)

---

## Pending Work

**Rollback point:** `git checkout milestone-glissando-ui-prompt-good` — scale 0.42 + Y offset 10px, confirmed working.

*(Items to pick up next session)*

- [x] Test AI prompt workflow end-to-end ✔️
- [x] Full end-to-end test of glissando workflow ✔️
- [x] Update LONG_TONE_IMPLEMENTATION.md ✔️
- [x] Tier 3 milestone complete ✔️
- [ ] Begin actual score composition using the glissando system
- [ ] Extend AI prompt system to other gesture types (cresc/decresc, etc.)

---

## Recent Tier 1 Memories

| ID | Description | Status |
|----|-------------|--------|
| ASB-001 | ScoreAutomation object + programmatic creation functions | Complete |
| ASB-002 | Long Tone Glissando Workflow document created | Complete |
| ASB-003 | Step 1 parameter discovery, y2=0 bug fix, default color change | Complete |
| ASB-004 | Long Tone Workflow UI + model/slope parameters | Complete |
| ASB-005 | Step 2a - Glissando notation template + single GO button | Complete |
| ASB-006 | Steps 2b-4: SVG rendering, MIDI generation, score insertion | Complete |
| ASB-007 | Split GO into Step 1 (Curve) + Step 2 (Generate) buttons | Complete |
| ASB-008 | Fix SVG rendering PowerShell script (Inkscape canvas-fit) | Complete |
| ASB-009 | Fix MIDI snippet backward compat + startSeconds/endSeconds | Complete |
| ASB-010 | Fix LilyPond octave notation (' and , marks vs numbers) | Complete |
| ASB-011 | Fix SVG positioning (content bounds + leadInSeconds bug) | Complete |
| ASB-012 | Fix audio display not rendering on score load | Complete |
| ASB-013 | AI Glissando Prompt Guide - two-stage parallel prompting system | Complete |
| ASB-014 | Dynamic notation marking (independent from MIDI velocity) | Complete |
| ASB-015 | UI: default clef treble, velocity input (0-127), Dynamic label | Complete |
| ASB-016 | Color swatches + fill mode in Long Tone UI (default: limeGreen, Fill↓) | Complete |
| ASB-017 | Post-Milestone Addendum Protocol (workflow methodology) | Complete |
| ASB-018 | Fix quarter-tone pitches + always overwrite .ly/SVG (no caching) | Complete |
| ASB-019 | Replace Inkscape crop with server-side Node.js SVG cropper | Complete |
| ASB-020 | Fix SVG scale (30% track height) + remove redundant client crop | Complete |
| ASB-021 | SVG positioning investigation — INCONCLUSIVE (coordinate system verified correct, visual mismatch unresolved) | Inconclusive |
| ASB-022 | Increase SVG scale multiplier 0.30→0.42 (~0.8 scale). Commit: 677f173 | Complete |
| ASB-023 | Add 10px Y offset to SVG positioning + update comment. Commit: ae60266 | Complete |
| ASB-024 | Add retry logic to renderGlissandoSvg for OneDrive file locks. Commit: 60ab457 | Complete |
| ASB-025 | Pre-step1 validation checklist in AI Glissando Prompt Guide. Commit: b0bcfb0 | Complete |
| ASB-026 | Prompt guide copy-paste workflow + validation + AI test artifacts. Commit: 1c2c404 | Complete |
| ASB-027 | Fix SVG reposition persistence — update trackYFraction on drag/manual input. Commit: 19eeaf5 | Complete |
| ASB-028 | Fix glissando pitch tracking half-step logic (E-F, B-C) + re-index + UI relabel. Commit: a3d7e66 | Complete |
| ASB-029 | Clamp glissando SVG X to page left edge (prevent off-page notation). | Complete |

---

## Tier 2 Commits

| Date | Commit Hash | Summary |
|------|-------------|---------|
| Feb 14, 2026 | 78ba06f | Long Tone Workflow Step 1 - UI + model/slope + ASB-001 to ASB-004 |
| Feb 14, 2026 | ac68bf5 | Long Tone Glissando workflow complete + bug fixes - ASB-005 to ASB-012 |
| Feb 15, 2026 | af30931 | addendum: glissando - dynamic notation, velocity input, UI polish (ASB-014 to ASB-017) |
| Feb 15, 2026 | 7c7ee71 | addendum: glissando - SVG positioning investigation (ASB-019 to ASB-021) |

---

## Tier 3 Milestones

| Date | Tag | Description |
|------|-----|-------------|
| Feb 14, 2026 | `milestone-asb-glissando-complete` | Full glissando automation: UI + AI prompt, notation, SVG, MIDI, all bugs fixed |
| Feb 15, 2026 | `milestone-glissando-ui-prompt-good` | Glissando System UI Prompt Good. Caveat: SVG notation manual reposition may vary with different size SVGs |
| Feb 15, 2026 | `milestone-ai-prompt-validated-copy-paste` | AI prompt tested with validation checklist + copy-paste workflow clarified |

---

## Quick Resume

**To continue next session, say:**
> "Continuing AI score building"

**I will:**
1. Read this progress file
2. Read the workflow file
3. Show you where we left off
4. Resume ASB-XXX numbering

---

## Automation Rules (for Cascade)

### After Each Code Change:
1. Create ASB-XXX memory automatically
2. Add entry to "Recent Tier 1 Memories" table above
3. Increment "Tier 1 Count This Session"

### When Tier 1 Count >= 4:
1. Proactively suggest: "This looks like a good Tier 2 checkpoint"
2. Draft commit message summarizing all Tier 1 work
3. After commit, reset Tier 1 count and log commit hash

### When Major Feature Complete:
1. Suggest Tier 3 milestone
2. Update relevant architecture docs
3. Create comprehensive memory
4. Propose git tag

### Post-Milestone Addendums:
1. Keep original Tier 3 tag intact (rollback point)
2. Continue linear ASB numbering
3. Group under `### Addendum: [milestone name]` in session log
4. Tier 2 commits use `addendum:` prefix in message
5. Bug fixes during addendum work noted in log (separate ASB only if significant)
6. If addendums are substantial, create revision tag: `milestone-{name}-v2`
7. See `docs/WORKFLOW_METHODOLOGY.md` → "Pattern: Post-Milestone Addendums" for full protocol

### On Session Start ("Continuing AI score building"):
1. Read this file and workflow file
2. Report: last session date, pending work, ASB count
3. Ask what to work on

### On Session End ("Wrapping up"):
1. Summarize what was done
2. Suggest Tier 2 if threshold met
3. Update "Pending Work" section
4. Update "Last Updated" date

---

## Workflow Methodology Insights

*(Auto-append new insights here)*

When a workflow insight emerges during development, append it here AND to `docs/WORKFLOW_METHODOLOGY.md`.

### Post-Milestone Addendums (Feb 15, 2026)
After finalizing a Tier 3 milestone, the next session often reveals refinements that extend the feature — new sub-features, default adjustments, UI polish. These are "addendums," not new features. Protocol: keep original tag intact, continue ASB numbering, group under `### Addendum:` heading, use `addendum:` prefix in Tier 2 commits. See WORKFLOW_METHODOLOGY.md for full pattern.

### Debugging Session Management (Feb 15, 2026)
When debugging becomes unproductive (>3 iterations without convergence, diagnostics pass but visual reality mismatches, fixes create new problems), follow the Abort Protocol: stop immediately, clean up all diagnostic code, commit with clear INCONCLUSIVE note, create memory documenting what was tried/confirmed/unresolved. Tag as INCONCLUSIVE not "failed" — ruled-out causes are valuable. Fresh start: don't re-read old session, state problem simply, test ONE thing at a time, ensure test element is VISIBLE. See WORKFLOW_METHODOLOGY.md → "Debugging Session Management" for full protocol.

---
