# AI Score Building Progress

**Status:** Active  
**Last Updated:** Feb 22, 2026  
**Current ASB Number:** ASB-090

---

## 👤 For User

**To start a session:** Say *"Continuing AI score building"* or just describe what you want to work on. Cascade will read the checklist below and get oriented automatically.

**To end a session:** Say *"Wrapping up"* or *"End session."* Cascade will summarize, suggest a commit if needed, and update everything for next time.

That's it. Everything else below is for Cascade.

---

## ⚡ Session Startup Checklist

**Read this section FIRST at every session start. Then read the docs listed below before doing any work.**

### 1. Required Reading (before any code work)

| Document | When Required | Slash Command |
|----------|---------------|---------------|
| This file (`AI_SCORE_BUILDING_PROGRESS.md`) | Always | `/ai-score-building` |
| `docs/LILYPOND_SETTINGS_REGISTRY.md` | Any `.ly` file work | `/lilypond-registry` |
| `docs/BARTOK_PIZZICATO_WORKFLOW.md` | Bartók pizz work | `/bartok-pizz` |
| `docs/AI_BARTOK_PIZZ_PROMPT_GUIDE.md` | AI-prompted Bartók pizz insertion | — |
| `docs/MUSICAL_MATERIAL_WORKFLOW.md` | Building any new musical material system | — |
| `docs/WORKFLOW_METHODOLOGY.md` | Debugging or process questions | — |

### 2. Active Rules

- **LilyPond Registry**: ALWAYS read `docs/LILYPOND_SETTINGS_REGISTRY.md` before creating or modifying any `.ly` file. Use CURRENT DEFAULT values from the registry. Update the registry when settings change.
- **Tiered Documentation**: Follow the 3-tier system (see `/ai-score-building` workflow). Tier 1 after each code change, suggest Tier 2 at 3–4 increments, Tier 3 at major milestones.
- **Naming Conventions**: SVG files use `BartokPizz-[clef]-[Pitch]-[dynamic]` pattern. ASB numbers are sequential. Commit messages reference ASB ranges.

### 3. Active Workflows & Their State

| Workflow | Status | Next Step |
|----------|--------|-----------|
| Bartók Pizzicato | Complete (Pattern 4 — AI Direct) | Maintenance only |
| Glissando System | Complete | Maintenance only |
| Vibrato System | Complete | Maintenance only |
| Crescendo-Decrescendo | Complete | Maintenance only |
| Pizzicato Tremolo | **Complete** | All 10 steps done — Pattern 4 (AI Direct) + Pattern 3 (Direct Live Insertion) |
| Notation Fragment System | **In Progress** | Option E active: `midi-tags.ily` + `midi-logger.ily` + `state_tracker.js` built (ASB-090). Next: test full pipeline on NotationFragment001-Cello.ly |
| LilyPond Settings Registry | Active | Update when settings change |
| Musical Material Workflow | Active | Expand as new material types are built |

### 4. Reusable Tools (remember these exist)

| Tool | Location | Use For |
|------|----------|---------|
| `modify_midi.js` | `lilypond_code/` | MIDI post-processing: channel rewrite, CC at tick 0 (`--cc`), per-note CC + velocity override via JSON map (`--map`). See §15 in MIDI_MUSIC_GENERATION.md for enhancement roadmap. |
| `midi-tags.ily` | `lilypond_code/` | LilyPond include: shorthand variables for `\set` MIDI context properties (`\midiPizz`, `\midiSfz`, etc.). Source of truth: `cc_mapping_registry.json`. |
| `midi-logger.ily` | `lilypond_code/` | LilyPond include: Scheme engraver that reads `\set` properties and writes JSON event log during compilation. |
| `state_tracker.js` | `lilypond_code/` | Converts Scheme event log → CC map JSON for `modify_midi.js`. |
| `crop_svg.js` | `lilypond_code/` | Standalone SVG cropping (same logic as server.js) |
| `render_bartok_pizz.js` | `lilypond_code/` | Full Bartók pizz pipeline (single or batch) |
| `ingest_pizz_tremolo.js` | `lilypond_code/` | Parse recorded MIDI → JSON timing database (new/append modes) |
| `render_pizz_tremolo.js` | `lilypond_code/` | Full pizz tremolo pipeline (single + batch: .ly → SVG → MIDI) |
| `generate_pizz_tremolo_midi.js` | `lilypond_code/` | Standalone tremolo MIDI generator (timing DB sampling + CC7 ramp) |

### 5. Available Slash Commands

- `/ai-score-building` — Full workflow methodology (tiers, triggers, checklists)
- `/lilypond-registry` — LilyPond settings consultation workflow
- `/bartok-pizz` — Bartók Pizzicato generation workflow
- `/long-tone-dev` — Long Tone development workflow

---

## 🔮 Open Threads

*Medium/long-term context that may become relevant in future sessions. Review at session start; update at session wrap-up.*

| Thread | Context | When Relevant |
|--------|---------|---------------|
| `modify_midi.js` enhanced with `--map` | Now supports per-note CC injection via JSON map file. Note groups (chords = one group) get CC just before first Note On. Expandable: any CC 0–127 per note (CC0 for articulation, CC7 for volume, etc.). `--cc` still works for tick-0 insertion. | Any notation fragment MIDI post-processing, future articulation systems |
| Bartók pizz shares MIDI channels 1–4 with glissando | Both systems use track→channel 1:1 mapping. OK for now because Bartók events are discrete (single 16th notes). | If a 3rd system needs channels 1–4, address potential conflicts |
| Synth pitch bend range is ±1 semitone | All quarter-tone pitch bends use 8192 per semitone. Quarter sharp = 12288, quarter flat = 4096, center = 8192. Applied in Bartók pizz, Crescendo single-pitch, Vibrato. Glissando systems use their own segment-based approach (untouched). | If pitch bend sounds wrong or if synth config changes |
| Registry §28 microtonal pitch syntax | Full suffix reference for quarter/three-quarter tones. Used by `render_bartok_pizz.js` pitch parser. | Any new pitch-input automation |
| `crop_svg.js` Pass 3 fix | Handles nested `<g>`/`<a>` groups with scale transforms. Fix ported to both standalone and server.js. | If SVG cropping bugs reappear — check Pass 3 first |
| AI Command Bridge (Pattern 4) is the ideal pattern | `POST /api/ai/command` → Socket.IO `aiCommand` → browser `eval()`. Cascade sends commands directly to browser — no paste, no save, no reload. First used in Bartók Pizzicato. Pattern 3 (Direct Live Insertion) is the fallback. See `docs/MUSICAL_MATERIAL_WORKFLOW.md` "Insertion Patterns". | When building any new musical material system |
| MasterTemplate.ly is legacy | Registry + StartingTemplate are now the authoritative sources. MasterTemplate still exists but should NOT be consulted as source of truth. Only update it when StartingTemplate changes (propagation). Do NOT pull settings from MasterTemplate for new files. | If tempted to reference MasterTemplate for settings — use Registry instead |
| Saved GCs disappeared | GC library appears empty despite GCs existing in score save files (e.g., GC_20260117_204645 in 271-work). Needs investigation. | If user tries to recall saved GCs or if GC library features are used |
| Musical Material Workflow doc | `docs/MUSICAL_MATERIAL_WORKFLOW.md` — general process for multi-component musical objects. Includes 4 insertion patterns (Console→Save/Reload→Direct Live→AI Direct). | When building any new musical material system |

---

## Last Session Summary

> **Notation Fragment System — Option E MIDI Tagging System.** Built full pipeline: `midi-tags.ily` (shorthand variables for `\set` context properties), `midi-logger.ily` (Scheme engraver writing JSON event log), `state_tracker.js` (event log → CC map). Expanded `cc_mapping_registry.json` with `\set` property names and shorthands. Rewrote Step 2C in NOTATION_FRAGMENT_WORKFLOW.md with MIDI tagging protocol, lookup table, and pipeline description. Added §17 Debugging & Testing Protocols to MIDI_MUSIC_GENERATION.md. Tagged NotationFragment001-Cello.ly with `\midiPizz`/`\midiPizzOpen`/`\midiSfz`. **Full pipeline test PASSED** on NotationFragment001-Cello.ly: 8 note groups, CC0 values correct (95/71/95), velocity 127 on sfz chord, 251-byte modified MIDI. **Bug found & fixed:** LilyPond requires `set-object-property!` to register custom context properties before `\set` will accept them (commit 9ce8239). **Next session:** Tag NotationFragment002-Viola.ly from scratch and run full pipeline end-to-end.

---

## Current Session

**Date:** Feb 22, 2026  
**Focus:** Notation Fragment System — Option E MIDI Tagging System build + first test  
**Tier 1 Count This Session:** 3 (ASB-088, ASB-089, ASB-090)  
**Tier 2 Threshold:** 3-4 increments — **READY FOR TIER 2 COMMIT**

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

### Session Log — LilyPond Settings Registry
- ASB-074: Exhaustive scan of all 433 .ly files (771 unique setting lines), created `docs/LILYPOND_SETTINGS_REGISTRY.md` — 27-section registry covering noteheads, stems, beams, accidentals, dynamics, hairpins, rests, tuplets, glissando, vibrato, staff lines, text/markup, articulations, note column, layout, paper, staff visibility, clef, bar numbers, system brackets, instrument names, feathered beams, pressure wedge, special noteheads, arpeggio, Scheme definitions, tweak reference. Captured decision history (e.g. tuplet padding 3→2→0.5, stem lengths 7→6, accidental sizes -2→-4→-5). Found settings missed in MasterTemplate: tupletFullLength, padding=3, TupletNumber.stencil=##f, old-syntax ratio text, feathered beams, pressure wedge, system brackets, Rest.font-size, Score.Script.font-size.

### Session Log — Z-Stem Pizzicato Tremolo
- ASB-080: Notation research (Z-stem unmeasured tremolo — Penderecki, Wieniawski, Stockhausen, SMuFL glyphs, 3 LilyPond implementation approaches). Added to `docs/Notation_Research.md`. First test .ly file (`ZstemPizzTrem-treble-B4-fff.ly`) using custom `stem-with-z` Scheme stencil — compiles clean, Z renders correctly at stem midpoint.
- ASB-081: Z-stem calligraphic polygon — evolved from stroked path to filled parallelogram bars with / slants. Discovered `make-path-stencil` coordinate mapping (negative Y = up, **positive X = visual LEFT** — X-axis flipped). Built parameterized two-knob system: `z-bar-width` (wider/narrower, centered), `z-bar-height` (thicker/thinner, angle preserved via `z-nib-ratio`). Added `z-y-offset` (shift entire Z up/down), diagonal connecting line (thin polygon, adjusts with nib-ratio), `z-diag-nudge` (fine-tune diagonal endpoint position, negated for X-flip). Split into separate `bars-stencil` + `diag-stencil` to fix white anti-aliasing artifacts at polygon overlaps. User-dialed final values: width=1.1, height=0.4, y-offset=-0.7, vpos=1.4, nib=0.6, diag=0.09, nudge=0.06. Test file: `ZstemPizzTrem-treble-B4-fff-test.ly`. Registry §30 added. Registry §4 clarified: MasterTemplate is legacy, registry + StartingTemplate are authoritative.
- ASB-082: Pizzicato Tremolo pipeline — MIDI ingestion script (`ingest_pizz_tremolo.js`, new/append modes, gap threshold), ran on `PizzTremeloMidiSampleforDB.mid` (378 notes, 9 segments). Created `docs/MIDI_MUSIC_GENERATION.md` (consolidated all MIDI system insights). Created `docs/PIZZICATO_TREMOLO_WORKFLOW.md` (8-step process, 8 inputs including Dynamic Shape). Built 3 LilyPond notation templates with Z-stem + "pizz." text + dynamic + hairpin: `PizzTrem-*-cres.ly`, `PizzTrem-*-decres.ly`, `PizzTrem-*-hp.ly`. User tuned in Frescobaldi: z-y-offset=0.85, Stem.lengths=#'(6.2), Hairpin.height=#0.4, staff-line-factor=3.1, paper-height=50mm. Established hairpin tweak defaults. Registry §30 updated. MUSICAL_MATERIAL_WORKFLOW.md updated.
- ASB-083: Pizzicato Tremolo graphic notation — GC (same baton-physics model as Bartók Pizz, neonMagenta), SVG notation (70% track height, offsetYFraction=0.10), blue direction arrow (brightBlue, always right-pointing, reuses FlowchartConnector markers), pre/post alignment positioning (pre: left edge at gc.startSeconds; post: right edge at gc.endSeconds). Test script: `test_pizz_trem_gc.js`.
- ASB-084: Pizzicato Tremolo pipeline execution + AI prompt guide — `render_pizz_tremolo.js` (full pipeline: generate .ly → render → crop SVG → generate tremolo MIDI), server endpoint `POST /api/pizz-tremolo/generate`, `PizzTremUI.go()` fully wired (4-step: server pipeline → GC creation → SVG+arrow insertion → MIDI snippet from timing DB), MIDI channels 8–11 (trackIndex+8), AI Prompt Guide (`AI_PIZZ_TREMOLO_PROMPT_GUIDE.md`). Tested: UI Go button + AI Command Bridge (Pattern 4).

### Session Log — Notation Fragment System
- ASB-086: Notation Fragment system initial setup — NotationFragment001-Cello.ly (from PizzMotive001), NotationFragment002-Viola.ly (alto clef, quintuplet 5:4 + 16th notes with pizz/Bartók pizz/quad stops/ties), NOTATION_FRAGMENT_WORKFLOW.md (8-step workflow mirroring PizzTrem pattern, Step 1: Gather Input with tempo param, Step 2: Generate LilyPond File current), Viola_Notation_Guide.md + Violin_Notation_Guide.md (comprehensive instrument-specific references), Registry updates (§3 beams over rests default, §29 snap pizz font-size #-3 scaling)
- ASB-087: Enhanced modify_midi.js with --map flag for per-note CC injection via JSON. Note groups (chords at same tick = one group). Expandable for any CC 0–127 (CC0 articulation, CC7 volume, etc.). Documented Step 2B in NOTATION_FRAGMENT_WORKFLOW.md. CC0 mapping: 95=pizz, 97=Bartók pizz, 89=senza vibrato.
- ASB-088: First end-to-end test of modify_midi.js --map. AI cognitive analysis (Option A) of NotationFragment001-Cello.ly → fragment001_cc.json (8 note groups). Created cc_mapping_registry.json (CC0 articulations, velocity overrides, state rules, open strings). Analysis Roadmap added to NOTATION_FRAGMENT_WORKFLOW.md (5 options: A→E).
- ASB-089: Per-note velocity override in modify_midi.js (optional `vel` field). Enhancement Roadmap (§15) and State Tracker Strategy (§16) added to MIDI_MUSIC_GENERATION.md. Tested: group 7 sfz → vel=127 ✓.
- ASB-090: Option E MIDI Tagging System — built `midi-tags.ily` (shorthand variables), `midi-logger.ily` (Scheme engraver → JSON event log), `state_tracker.js` (event log → CC map). Expanded `cc_mapping_registry.json` with `\set` property names. Rewrote Step 2C with tagging protocol + lookup table. Added §17 Debugging & Testing Protocols. Tagged NotationFragment001-Cello.ly. **First test:** compiles clean, event log created (8 entries, correct pitches/moments), BUT `midiCCZero`/`midiVelocity` all null — Scheme `ly:context-property` not reading `\set` values. **Bug to fix.**

### Session Log — Bartók Pizzicato Workflow
- ASB-075: Bartók Pizzicato automation — 3 test .ly files (B4, F¾#6, E¼♭3 with ledger lines + microtonal accidentals), Registry §28 (Microtonal Pitch Syntax) + §29 (Bartók Pizzicato) + "When to Engage the Registry" guide, workflow document (`docs/BARTOK_PIZZICATO_WORKFLOW.md`), standalone SVG cropper (`lilypond_code/crop_svg.js`), **bug fix** in Pass 3 crop logic (nested `<g>`/`<a>` groups with scale transforms were missed — dynamics like fff cut off), fix ported to both crop_svg.js and server.js. Output dir: `public/SVG_graphics/bartok_pizzicato/`, each clef generated fresh (no copy-transpose).
- ASB-076: Bartók Pizzicato pipeline + MIDI tools — `render_bartok_pizz.js` full pipeline (single + batch mode, auto paper dimensions from pitch/clef/ledger lines), `modify_midi.js` general-purpose MIDI post-processor (configurable `--cc` args, channel rewrite, reusable across workflows), dynamic + track added to naming convention and Step 1 inputs, SVG+MIDI stored together in output dir, `/bartok-pizz` slash command created.
- ASB-077: Bartók Pizzicato score integration + Musical Material Workflow — `docs/MUSICAL_MATERIAL_WORKFLOW.md` (general multi-component material creation process, 3 insertion patterns documented), server endpoint `POST /api/bartok-pizz/generate`, UI section (neonMagenta, Track/Clef/Pitch/Dynamic/Time + Go button), `BartokPizzUI` JS object (Direct Live Insertion — Pattern 3), plain English pitch input (C#4 not `cis'`), `englishToMidi()`/`englishToLilypond()` converters, **bug fixes**: LilyPond `#` prefix on `Accidental.font-size`, English pitch suffixes (`s`/`f` not `is`/`es`), MIDI insertion via `MidiSnippetDatabase.add()` + `MidiController.reloadFromDatabase()` (not direct track push).
- ASB-078: AI Bartók Pizzicato Prompt Guide — `docs/AI_BARTOK_PIZZ_PROMPT_GUIDE.md`, copy-paste/natural language/batch/guided prompt templates, `BartokPizzUI.go()` execution format, pre-execution validation checklist, clef↔pitch range guidelines.
- ASB-079: AI Command Bridge (Pattern 4) + quarter-tone pitch bend — server `POST /api/ai/command` relays JS to browser via Socket.IO `aiCommand` event, client-side async eval listener (magenta console logging), Pattern 4 documented in `MUSICAL_MATERIAL_WORKFLOW.md` + `AI_BARTOK_PIZZ_PROMPT_GUIDE.md`. Quarter-tone pitch bend (±1 semitone range, 8192/semitone) added to Bartók pizz `insertBartokMidi`, Crescendo `generateCrescDecrescEvents` (4096→8192 fix), Vibrato `generateVibratoMidi` (new bend+reset). Tested hands-free: F+4 + F#+4 at 243.5/244.5s.

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

**Pizzicato Tremolo rollback:** Commit `f921a75` — all 10 steps complete, pipeline fully operational.

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
- [ ] **Add Glissando capability to Pizzicato Tremolo system** — allow pizz tremolo to follow a pitch glissando (pitch bend ramp during the rapid repeated notes)
- [ ] **MIDI snippet generating system** — longer-term goal: system that reads notation and/or instructions, knows what CC messages to add, and produces enhanced MIDI files automatically. Builds on modify_midi.js --map approach.
- [ ] **Test modify_midi.js --map with NotationFragment002-Viola.ly** — render MIDI in Frescobaldi, create JSON map, run post-processing, verify CC0 at correct note positions

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
| ASB-074 | LilyPond Settings Registry — 27-section exhaustive scan of 433 .ly files (771 settings) | Complete |
| ASB-075 | Bartók Pizzicato workflow — test files, registry updates, workflow doc, crop_svg.js, crop bug fix | Complete |
| ASB-076 | Bartók Pizzicato pipeline + general MIDI modifier — render_bartok_pizz.js, modify_midi.js, /bartok-pizz slash command | Complete |
| ASB-077 | Bartók Pizz score integration — server endpoint, UI, BartokPizzUI JS, Direct Live Insertion (Pattern 3), plain English pitch, MIDI reloadFromDatabase, Musical Material Workflow doc | Complete |
| ASB-078 | AI Bartók Pizzicato Prompt Guide — copy-paste/natural language/batch/guided templates, validation checklist, clef↔pitch range guidelines | Complete |
| ASB-079 | AI Command Bridge (Pattern 4) + quarter-tone pitch bend — REST→Socket.IO command relay, Bartók/Crescendo/Vibrato pitch bend for microtones (±1 semitone range) | Complete |
| ASB-080 | Z-stem notation research + first test file (Penderecki-style unmeasured tremolo, custom Scheme stencil) | Complete |
| ASB-081 | Z-stem calligraphic polygon — parameterized two-knob system (width/height), centered / slants, y-offset, diagonal line, coordinate discovery (X-flip), split stencils, diag-nudge, registry §30 | Complete |
| ASB-082 | Pizz tremolo pipeline — MIDI ingestion, timing DB, MIDI_MUSIC_GENERATION.md, workflow doc, 3 notation templates (cres/decres/hp), hairpin tweak defaults, registry §30 update | Complete |
| ASB-083 | Pizz tremolo graphic notation — GC + SVG (70% height) + blue arrow + pre/post alignment + test script | Complete |
| ASB-084 | Pizz tremolo pipeline execution — render_pizz_tremolo.js, server endpoint, PizzTremUI.go() wired, AI Prompt Guide | Complete |
| ASB-086 | Notation Fragment system setup — 2 .ly files, workflow doc, Viola+Violin notation guides, Registry §3+§29 updates | Complete |
| ASB-087 | Enhanced modify_midi.js — --map flag for per-note CC injection via JSON, note group detection, expandable CC types | Complete |
| ASB-088 | First modify_midi.js --map test + cc_mapping_registry.json + Analysis Roadmap (5 options) | Complete |
| ASB-089 | Per-note velocity override + Enhancement Roadmap (§15) + State Tracker Strategy (§16) | Complete |
| ASB-090 | Option E MIDI Tagging System — midi-tags.ily, midi-logger.ily, state_tracker.js, docs updates, first test (context property bug found) | In Progress |

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
| Feb 20, 2026 | 2f6e750 | bartok pizzicato: workflow, pipeline, crop fix, MIDI tools (ASB-074 to ASB-076) |
| Feb 21, 2026 | 46ec8ee | bartok pizzicato: AI command bridge, prompt guide, quarter-tone pitch bend (ASB-077 to ASB-079) |
| Feb 21, 2026 | b86008e | z-stem pizzicato tremolo: research, calligraphic polygon, parameterized controls, registry §30 (ASB-080 to ASB-081) |
| Feb 21, 2026 | be6caa4 | pizzicato tremolo complete: full system, documentation wrap-up (ASB-082 to ASB-084) |
| Feb 22, 2026 | 3c3f1bf | notation fragments: Option E MIDI tagging system + velocity override + CC registry (ASB-088 to ASB-090) |

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

### LilyPond Stencil Coordinate System + Split Stencils (Feb 21, 2026)
`make-path-stencil` uses Y-down AND X-flipped coordinates. For complex filled polygons, split into separate stencil calls composited via `ly:stencil-add` to avoid white anti-aliasing artifacts at polygon overlaps. See WORKFLOW_METHODOLOGY.md → "LilyPond `make-path-stencil` Coordinate System".

### Decoupled Notation and MIDI + Human Performance Timing Databases (Feb 21, 2026)
When notation and MIDI serve different purposes for the same gesture, generate them independently from shared input parameters. For unmeasured/irregular patterns (tremolo, ornaments), record a human performance and extract pitch-agnostic timing into a JSON database, then sample programmatically at generation time. This produces more natural results than algorithmic generation. See WORKFLOW_METHODOLOGY.md → "Decoupled Notation and MIDI Outputs" and "Human Performance Timing Databases".

### Debugging Session Management (Feb 15, 2026)
When debugging becomes unproductive (>3 iterations without convergence, diagnostics pass but visual reality mismatches, fixes create new problems), follow the Abort Protocol: stop immediately, clean up all diagnostic code, commit with clear INCONCLUSIVE note, create memory documenting what was tried/confirmed/unresolved. Tag as INCONCLUSIVE not "failed" — ruled-out causes are valuable. Fresh start: don't re-read old session, state problem simply, test ONE thing at a time, ensure test element is VISIBLE. See WORKFLOW_METHODOLOGY.md → "Debugging Session Management" for full protocol.

---
