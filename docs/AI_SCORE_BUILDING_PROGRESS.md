# AI Score Building Progress

**Status:** Active  
**Last Updated:** Feb 19, 2026  
**Current ASB Number:** ASB-069

---

## Last Session Summary

> **Crescendo-Decrescendo System + SVG Dynamic Resize.** Built complete Crescendo-Decrescendo system (LilyPond templates, UI, JS, MIDI generation with CC7 volume, server endpoint, prompt guide). Fixed SVG notation not resizing on window resize by introducing `heightFraction` property and scale recomputation in `reRenderAllElements`. Fixed extreme resize breakage (rAF + forced reflow + degenerate height guard). Fixed backward compatibility for old saves missing `heightFraction`.

---

## Current Session

**Date:** Feb 19, 2026  
**Focus:** LilyPond Master Template  
**Tier 1 Count This Session:** 2  
**Tier 2 Threshold:** 3-4 increments

### Session Log (prior sessions)
- ASB-001 through ASB-013: Long Tone Glissando workflow (see Tier 3 milestone below)

### Session Log — Vibrato System
- ASB-030: Dynamic Vibrato LilyPond templates (Wide→Narrow + Narrow→Wide) with Scheme `build-vibrato-stencil` function
- ASB-031: UI reorganization — rename "Long Tone Workflow" → "Long Tone Glissando System", drag-reorder panel sections, add Vibrato System placeholder
- ASB-032: Vibrato System UI controls (direction radio, clef, pitch, start/end dynamics) + collapsible panel sections with localStorage persistence
- ASB-033: Vibrato Generate button + notation pipeline (template selection → LilyPond substitution → SVG render → crop), SVG crop three-pass rewrite for vibrato waves, dynamics auto-positioning fix
- ASB-035: Vibrato System UI expansion (track, times, Y1/Y2, model/slope, velocity, color, fill) + createCurve() + generate() 4-step flow
- ASB-036: Vibrato MIDI generation (CC4 + channel pressure) + server automation endpoint (`/api/vibrato/create-and-save`) + auto-load latest score + AI Vibrato Prompt Guide
- ASB-037: Bug fixes — ObjectSelector SVG z-order for drag, server SVG track positioning (trackYFraction), cursor offset -1s

### Session Log — Curve Fugue Algorithm
- ASB-038: Curve Fugue Algorithm #1 documentation — parameterized duration/gap (shuffled bins), cumulative QT pitch descent + scenario interludes, vibrato integration, collision handling, prompt guide
- ASB-039: Add `glissandoSlope` and `vibratoSlope` as configurable parameters
- Score composition: Ran algorithm 3× — 13 motives (scores 51–63), 18 motives (scores 66–83), 21 motives (scores 86–106)

### Session Log — SVG Anchor System
- ASB-040: Full SVGElementManager refactor — anchor-based positioning (referenceSeconds + offsetSeconds + offsetYFraction), same formula as CurveMaker, fixed scale on resize, backward-compatible import, updated insertGlissandoSvg/insertVibratoSvg + server endpoints
- ASB-041: Standard object info UI (Name/Start/Track), SVG_YYYYMMDD_HHMMSS_NN naming convention with retroactive rename on import, anchor line scoped to track, Connectors section made draggable/collapsible

### Session Log — SVG & Curve Maker UI Redesign
- ASB-042: Curve Maker HTML redesign — orange heading, Start+End/Y1+Y2 same rows, slope input, track+model as dropdowns, button colors (Draw=blue, Delete=red, Save=green), Recall Curve section with dropdown+time+track+Insert
- ASB-043: CurveMaker JS updates — getCurveGTrack/setCurveGTrack/getCurveModel/setCurveModel use selects, createCurve reads slope input, selectCurve/updateInputsFromCurve sync slope, insertRecalledCurve uses recall time/track inputs
- ASB-044: Curve Maker UI polish — Save button mustard (vs Insert green), tighter spacing on Slope/Trk/Mdl row, 8px fonts on track+model selects
- ASB-045: Motive Grouping System — MotiveGroupDatabase, MotiveGroupManager, neonMagenta UI section with Motives/Objects listboxes, Add Selected/Remove/Save New/Delete buttons, time+track move for all grouped objects
- ASB-046: Collapsible SVG element listbox (under scale) + fix offsetYFraction=1 → 0.05 in 119-groups.json
- ASB-047: Fix SVG element listbox visibility — update parent section-content maxHeight on toggle so overflow:hidden doesn't clip
- ASB-048: Curve Maker Slope/Trk/Mdl row further tightened — labels abbreviated (Slp/Tk/Md), gap:2px, narrower inputs
- ASB-049: Motive group move fix — always regenerate curveData/motiveData on reloadFromDatabase, clear stale data in setObjectTime; fixes curve follower, motive follower, and multi-page segments after move
- ASB-050: MIDI snippet move fix — shift all internal event.timeMs values by delta when moving snippet via motive group; fixes only display bounds moving but MIDI events staying at old positions
- ASB-051: Fix MotiveMaker crash — add missing `generateMotiveDataArray` to simplified MotiveMaker (was only in disabled MotiveMakerFull), remove duplicate init; fixes legacy motives invisible on score load
- ASB-052: Rename "Motive Groups" → "Groups" — MotiveGroupDatabase→GroupDatabase, MotiveGroupManager→GroupManager, all HTML IDs (motiveGroupList→groupList etc), UI labels, auto-naming ("Group N"), comments; save key `databases.motiveGroups` kept for backward compat

### Session Log — Bulk Move + Score Composition + Audio Mixer
- Bulk move 170→171 (≥135s by -17.4s, 38 objects + 2839 MIDI events, verified)
- Score composition: Multiple glissandos created via AI prompt (tracks 1, 2, 4 — treble + bass clefs, quarter-tone pitches)
- ASB-053: Sort score dropdown descending (biggest number on top)
- ASB-054: Per-track audio volume sliders — 4 GainNodes, range 0-150%, real-time control
- ASB-055: GroupManager enhancements — button relabels, Delete Group and All Objects, auto-update time/track on add, magenta bounding box, group deselection (dblclick/click-off)
- ASB-056: Volume slider localStorage persistence

### Session Log — Two-Stage Vibrato + Bug Fixes + Score Composition
- ASB-057: Vibrato MIDI channel offset +4 (channels 5-8) — server + existing score patch
- ASB-058: Rewrite Glissando + Vibrato Prompt Guide templates for natural dictation order
- ASB-059: Server-side SVG left-edge clamping for glissando + vibrato endpoints
- ASB-060: Vibrato System two-stage generation (Step 1: Curve, Step 2: Generate) + programmatic params + UI styling
- ASB-061: Fix OneDrive file-lock in render_glissando.ps1 — retry loop (5 attempts, 1s delay) for Move-Item
- ASB-062: Glissando pitch tracking marker clamping — clamp left/right edges to prevent off-page markers
- Score composition: Regenerated track 4 vibrato (A+3, bass, 186-192s, score 222). Created glissandos (tracks 2+4, G+3→Ad3/Ab3, 192.2-202s, scores 225-226). Created vibratos (tracks 1+2+4, Ad3/Ab3/Abd3, 202.15-206.6s, scores 228-230) (restore on load, save on change)

### Session Log — SVG Page-Boundary Clamp + Score Composition
- ASB-063: Dynamic client-side SVG page-boundary clamp in calcPixelPosition — prevents SVG notation from disappearing when moved near page edge via group move
- Score composition: Created glissandos (tracks 1+2+4, G+3→Ab3/Ad3/G#3, 207-216.3s + 223.25-240.4s, scores 233-235 + 249-251). Created vibratos (tracks 1+2+4, A+3/Ad3/Ab3, 215.55-223.25s, ff→f, scores 244-246)

### Session Log — LilyPond Master Template
- ASB-069: LilyPond Master Template — unified settings repository from 38 .ly files, grouped by function (15 groups), toggle system for AI-assisted editing, 8 sample notation examples, companion guide document
- ASB-070: StartingTemplate.ly (clean base with defaults) + AI LilyPond Prompt Guide (user prompts + AI self-reference workflow)

### Session Log — Crescendo-Decrescendo System + SVG Dynamic Resize
- ASB-064: Crescendo-Decrescendo System — LilyPond templates (CrescendoGlissandoTemplate.ly, CrescendoSinglePitchTemplate.ly), UI HTML (darkRed heading, secco checkbox), CrescendoUI JS object (go/step1/step2, generateCrescendoMidi, insertCrescendoSvg), server endpoint (/api/lilypond/create-crescendo with pitch-register positioning), AI Crescendo Prompt Guide
- ASB-065: Crescendo bug fixes — SVG insertion rewrite to match insertGlissandoSvg pattern (containerTop/Bottom, updateElementTransform, drag handlers), MIDI channel offset (trackIndex+8 = channels 9-12), Secco checkbox + CC7 ramp-down (5ms wait + 10ms ramp after last segment note-off)
- ASB-066: SVG dynamic resize on window resize — introduced `heightFraction` property (fraction of track height SVG occupies), `reRenderAllElements` recomputes scale from heightFraction on resize, added to all insertion functions (glissando=0.42, vibrato=0.85, crescendo=0.67), export/import persistence
- ASB-067: SVG resize robustness — `requestAnimationFrame` in resize handler (ensures DOM layout settled before reading dimensions), `void scoreTopEl.offsetHeight` forced reflow, guard against degenerate `trackDims.height <= 0` (keeps last good scale), moved backward-compat `heightFraction` computation from `reRenderAllElements` to `importData` (prevents corruption when window size at load differs from creation)
- ASB-068: Crescendo default tuning — heightFraction 0.42→0.67 (matching user's 0.47→0.75 manual adjustment), offsetYFraction 0.1→0.05, X positioning overlap=8 (SVG extends slightly past anchor)

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

**Rollback point:** `git checkout beating-section-complete` — all beating section composition done (scores up to 255), SVG page-boundary clamp fix, commit 55e5127.

*(Items to pick up next session)*

- [x] Test AI prompt workflow end-to-end ✔️
- [x] Full end-to-end test of glissando workflow ✔️
- [x] Update LONG_TONE_IMPLEMENTATION.md ✔️
- [x] Tier 3 milestone complete ✔️
- [x] Begin actual score composition using the glissando + vibrato systems ✔️ (Curve Fugue Algorithm #1, 52 motives across 3 runs)
- [x] Extend AI prompt system to other gesture types (cresc/decresc, etc.) ✔️ (Crescendo-Decrescendo System)
- [ ] Extend ObjectSelector z-order fix to curves, motives, MIDI snippets
- [x] Test vibrato generation with various pitches/clefs/dynamics combinations ✔️ (tracks 1, 2, 4 — treble + bass clefs, natural + quarter-tone pitches)
- [ ] Investigate why Pass 2 regex fails on vibrato wave path (Pass 3 string-search fallback works)

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
| ASB-030 | Dynamic Vibrato LilyPond templates (Wide→Narrow + Narrow→Wide Bézier wave) | Complete |
| ASB-031 | UI reorganization: section rename, drag-reorder, Vibrato System placeholder | Complete |
| ASB-032 | Vibrato System UI controls + collapsible panel sections | Complete |
| ASB-033 | Vibrato Generate pipeline + SVG crop three-pass rewrite + dynamics fix | Complete |
| ASB-035 | Vibrato System UI expansion + createCurve() + multi-step generate() | Complete |
| ASB-036 | Vibrato MIDI generation + server automation endpoint + auto-load + prompt guide | Complete |
| ASB-037 | Bug fixes: ObjectSelector z-order, SVG track positioning, cursor offset | Complete |
| ASB-038 | Curve Fugue Algorithm #1 documentation — parameterized bins, pitch descent, prompt guide | Complete |
| ASB-039 | Add glissandoSlope and vibratoSlope parameters to Curve Fugue Algorithm | Complete |
| ASB-040 | SVG Anchor System refactor — referenceSeconds + offsetSeconds + offsetYFraction positioning | Complete |
| ASB-041 | Standard object info UI + SVG naming convention + anchor line track-scoped + Connectors section collapsible | Complete |
| ASB-042 | Curve Maker HTML redesign — orange heading, layout, selects, slope input, recall section | Complete |
| ASB-043 | CurveMaker JS updates — select/slope handlers, createCurve slope read, recall time/track | Complete |
| ASB-044 | Curve Maker UI polish — Save mustard, tighter spacing, smaller fonts | Complete |
| ASB-045 | Motive Grouping System — database, manager, UI, time/track move | Complete |
| ASB-046 | Collapsible SVG element listbox + offsetYFraction fix in 119-groups.json | Complete |
| ASB-047 | Fix SVG element listbox visibility — update parent maxHeight on toggle | Complete |
| ASB-048 | Curve Maker Slope/Trk/Mdl row further tightened | Complete |
| ASB-049 | Motive group move fix — regenerate curveData/motiveData on reload | Complete |
| ASB-050 | MIDI snippet move fix — shift internal event.timeMs on group move | Complete |
| ASB-051 | Fix MotiveMaker crash — add missing generateMotiveDataArray | Complete |
| ASB-052 | Rename Motive Groups → Groups (all code + UI, save key compat) | Complete |
| ASB-053 | Sort score dropdown descending (biggest number on top) | Complete |
| ASB-054 | Per-track audio volume sliders (GainNodes, 0-150%, real-time) | Complete |
| ASB-055 | GroupManager enhancements — delete all objects, auto time/track, bounding box, deselection | Complete |
| ASB-056 | Volume slider localStorage persistence | Complete |
| ASB-057 | Vibrato MIDI channel offset +4 (channels 5-8) — server + existing score patch | Complete |
| ASB-058 | Rewrite Glissando + Vibrato Prompt Guide templates for natural dictation order | Complete |
| ASB-059 | Server-side SVG left-edge clamping for glissando + vibrato endpoints | Complete |
| ASB-060 | Vibrato System two-stage generation + programmatic params + UI styling | Complete |
| ASB-061 | Fix OneDrive file-lock in render_glissando.ps1 — Move-Item retry loop | Complete |
| ASB-062 | Glissando pitch tracking marker clamping — left/right edge clamp | Complete |
| ASB-063 | Dynamic client-side SVG page-boundary clamp in calcPixelPosition | Complete |
| ASB-064 | Crescendo-Decrescendo System — templates, UI, JS, server endpoint, prompt guide | Complete |
| ASB-065 | Crescendo bug fixes — SVG insertion rewrite, MIDI channel offset, Secco feature | Complete |
| ASB-066 | SVG dynamic resize — heightFraction property, reRenderAllElements scale recompute | Complete |
| ASB-067 | SVG resize robustness — rAF, forced reflow, degenerate height guard, import-time compat | Complete |
| ASB-068 | Crescendo default tuning — heightFraction 0.67, offsetY 0.05, X overlap | Complete |
| ASB-069 | LilyPond Master Template — unified settings repo, toggle system, 8 examples, guide doc | Complete |
| ASB-070 | StartingTemplate.ly (base defaults) + AI LilyPond Prompt Guide (user + AI reference) | Complete |

---

## Tier 2 Commits

| Date | Commit Hash | Summary |
|------|-------------|---------|
| Feb 14, 2026 | 78ba06f | Long Tone Workflow Step 1 - UI + model/slope + ASB-001 to ASB-004 |
| Feb 14, 2026 | ac68bf5 | Long Tone Glissando workflow complete + bug fixes - ASB-005 to ASB-012 |
| Feb 15, 2026 | af30931 | addendum: glissando - dynamic notation, velocity input, UI polish (ASB-014 to ASB-017) |
| Feb 15, 2026 | 7c7ee71 | addendum: glissando - SVG positioning investigation (ASB-019 to ASB-021) |
| Feb 16, 2026 | 3b68813 | vibrato system: LilyPond templates, UI controls, generate pipeline, SVG crop fix (ASB-030 to ASB-033) |
| Feb 16, 2026 | 568a2a0 | vibrato system: UI expansion, MIDI generation, server automation, bug fixes, implementation doc (ASB-035 to ASB-037) |
| Feb 16, 2026 | 6e245fe | Curve Fugue Algorithm #1: documentation, parameterized slopes, score composition (ASB-038 to ASB-039, scores 51-106) |
| Feb 17, 2026 | 5c8fd71 | SVG anchor system + Curve Maker UI redesign (ASB-040 to ASB-043) |
| Feb 18, 2026 | c942c2c | audio mixer + groups enhancements + score composition + prompt guide duration option (ASB-053 to ASB-056) |
| Feb 19, 2026 | d039063 | two-stage vibrato, prompt guide rewrite, bug fixes, pitch tracking clamping, score composition (ASB-057 to ASB-062, scores 209-230) |
| Feb 19, 2026 | 9857d39 | SVG page-boundary clamp fix + score composition (ASB-063, scores 233-251) |
| Feb 19, 2026 | a3ef721 | crescendo-decrescendo system + SVG dynamic resize + bug fixes (ASB-064 to ASB-068) |

---

## Tier 3 Milestones

| Date | Tag | Description |
|------|-----|-------------|
| Feb 14, 2026 | `milestone-asb-glissando-complete` | Full glissando automation: UI + AI prompt, notation, SVG, MIDI, all bugs fixed |
| Feb 15, 2026 | `milestone-glissando-ui-prompt-good` | Glissando System UI Prompt Good. Caveat: SVG notation manual reposition may vary with different size SVGs |
| Feb 15, 2026 | `milestone-ai-prompt-validated-copy-paste` | AI prompt tested with validation checklist + copy-paste workflow clarified |
| Feb 19, 2026 | `beating-section-complete` | Beating section composition complete (scores 233–255), SVG page-boundary clamp fix (ASB-063) |

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

### DOM Layout Timing + Proportional Resize (Feb 19, 2026)
When updating SVG positions/scales on window resize, passively reading `clientHeight`/`clientWidth` can return stale values (unlike CurveMaker which forces reflow via DOM mutation). Fix: `requestAnimationFrame` + `void el.offsetHeight` + guard degenerate heights. For proportional resize, store `heightFraction` and recompute scale on each resize. Compute `heightFraction` at import time for old saves (not on first resize). See WORKFLOW_METHODOLOGY.md → "DOM Layout Timing on Window Resize" and "Proportional Resize with heightFraction".

### Debugging Session Management (Feb 15, 2026)
When debugging becomes unproductive (>3 iterations without convergence, diagnostics pass but visual reality mismatches, fixes create new problems), follow the Abort Protocol: stop immediately, clean up all diagnostic code, commit with clear INCONCLUSIVE note, create memory documenting what was tried/confirmed/unresolved. Tag as INCONCLUSIVE not "failed" — ruled-out causes are valuable. Fresh start: don't re-read old session, state problem simply, test ONE thing at a time, ensure test element is VISIBLE. See WORKFLOW_METHODOLOGY.md → "Debugging Session Management" for full protocol.

---
