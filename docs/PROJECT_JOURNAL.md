# String Quartet No. 1 — Project Journal

**Composer:** Justin Wen-Lo Yang  
**Repository:** `elosine/string_quartet_no1-composer`  
**Production:** Live at `justinwenloyang.com` — homepage at `/`, SQ1 at `/string-quartet-no1`  
**Created:** 2024 (Workshop development) — 2026 (Performance pipeline complete)  
**Git Tags:** `v1.0-composition`, `v1.0-production`, `phase-15-complete`

> **This document consolidates ~40 individual markdown docs** accumulated across a year of AI-assisted development. The originals are preserved as separate files in `docs/` for reference. This journal provides narrative context, cross-references, and a unified reading path through the project's history.

---

## §2 Resume Here

> The cold-start block that `/session-start` reads. §3 – §6 follow it; everything after them (Parts 0–IV) is the consolidated history up to April 2026.

### LAST SESSION — 2026-10-08 (session 1 of the October work; Claude Code — Fable 5.1, then Opus 5.5)

- **The goal: a submission print score for the "2026 JACK Studio Readings"** (the JACK Quartet reads existing quartets; sessions December 2026, New York; **application deadline 2026-10-22, 11:59 pm ET**; `https://www.jackquartet.com/studio`). A Google Form: a LINK to the score (required), a link to a recording (optional), title, duration as h:mm, year, played before, technical needs. **He fills and submits it himself.**
- **The print score is assembled: `print/score/String_Quartet_No_1-JYang.pdf` — 36 pages, every one 1200 × 900 pt: cover 1 + performance instructions 3 + score 32.** A byte copy is in `submissions/Jack_Quartet_2026/`. Build: `node scripts/build_print_score.js` (`print/README.md` has the steps).
- **Everything new lives in `print/`; the originals are untouched** — `docs/notation_instructions/` (the live site's page, byte-identical to the site on this day) and `builds/print/` (the March PDFs, now tracked with `git add -f`).
- **Three updates to the score as sent, all his:** the Line Wedge figure replaced by a wedge that changes thickness · an opening paragraph taken from Recombination's instructions · a final barline at the right edge of the last system. `print/instructions/UPDATES.md` lists the instruction changes.
- **To look at anything in `print/`:** `node print/preview_server.js` → `http://localhost:3003/score/String_Quartet_No_1-JYang.pdf` · `/instructions/` · `/cover/cover-score-landscape.pdf`. (The servers started this session were stopped at its end.)

### NEXT UP

1. **His:** the form. The AI flagged three entries from his screenshots, his to settle — the duration typed `8:35` where the form wants h:mm (the score runs 508 s = 8:28, so `0:09`) · the title `String Quartet Number 1` against `No. 1` on the cover · technical needs `none` for a score read from four screens over the internet.
2. **His:** the Drive copy must be the latest build (2026-10-08 10:30, 3,491,043 bytes) and viewable by anyone with the link. The AI offered to check through his Drive; not asked.
3. Any further findings on the draft: fix together on his go, rebuild, re-copy to `submissions/Jack_Quartet_2026/`.
4. **Later, slotted by him among the other pieces:** the full performance score and parts — a separate build, when the originals are finalized.

### OPEN AT SESSION END

- **Not pushed.** Two local commits on `main`. See the deploy note in §3 before the next deploy.
- The final barline is in the ASSEMBLED PDF only — not in `builds/print/full_score.pdf`, the parts, the Workshop score or the live site.

### OPEN QUESTIONS

- The deadline (2026-10-22) is NOT on his imminent list (`composition-planning-and-notes/docs/next.md`). Asked in chat; add only at his word.
- A demo-recording link in the instructions, as Recombination has after its opening paragraph? Offered; he has not said.

### BLOCKERS

- None.

## §3 Principles

*Lessons of the October 2026 session. The older ones are in `docs/WORKING_PRINCIPLES.md`.*

- **Draw onto a PDF page from the PDF's own measurements, not the screen's.** Chrome lays the page out again for print: in `full_score.pdf` the score SVG runs x 11.99 → 1589.01, on screen 11.67 → 1588.33. A third of a pixel at the left, more than a pixel at the right. *(the final barline)*
- **A PDF page can be measured without poppler:** crop it to a few pixels with pdf-lib (`setMediaBox` + `setCropBox`), open the crop in headless Chrome's own PDF viewer, screenshot, read the colour edges in a canvas. Good to a few hundredths of a pixel.
- **`builds/` is gitignored.** A PDF there that must be kept goes in with `git add -f`. New print work goes in `print/`.
- **DEPLOY NOTE: `builds/print/*.pdf` are now tracked, and the live server holds its own untracked copies** (the landing page links `/print/full_score.pdf` and the four 6-page parts). The server is a sparse clone; if its sparse patterns include `builds/`, the next `git pull` there will refuse to overwrite them. Look at `.git/info/sparse-checkout` on the server before deploying. Not checked this session — no deploy was made.
- **A Bash heredoc on this machine halves backslashes** (`\\s` arrived as `\s`, then JavaScript made it `s` — a regex silently stopped matching). A script with a regex goes to disk with the Write tool, or builds the backslash with `String.fromCharCode(92)`. And a Bash command over ~8 KB fails with a false quote error — Write tool again.
- **Recombination's server answers 404 for a bare folder URL** — ask for `/docs/notation_instructions/index.html`.

## §4 Decisions

- **D-Oct-1 · The October 2026 updates live in `print/`; the originals are not touched** (his ask). He keeps `docs/notation_instructions/` and `builds/print/` as posted until the performance score and parts are finalized in a separate build. *Rejected:* editing the live page in place (a deploy would change the site); an `updates/` folder apart from the cover (two homes for one job). `print/instructions/UPDATES.md` is the list of changes; each is marked in the page as `[update 2026-10 #N]`.
- **D-Oct-2 · The March print PDFs are tracked in place** — `builds/print/full_score.pdf` and the twelve parts, force-added. The five test PDFs there (`stage4_*`, `test_vector`) are left untracked.
- **D-Oct-3 · The cover is the house's, with the block centred** (his ask). Generator copied whole from `septet_LGMF_2026/print/cover/make_cover.ps1`; words in `print/cover/cover.json`; title + name, no subtitle; `"vertical": "centre"` is a key added to THIS repo's copy (cap-top of the first line to the baseline of the last, centred on the sheet's height). Without it the block sits at the house place, 27.1 % down. The sheet is the score's own, 1200 × 900 pt (`print/formats.json`).
- **D-Oct-4 · The instructions print in the house dress, two columns** (he: "as in Recombination… one column or two, your discernment"). The sheet is 1600 × 1200 px — slightly LARGER than A3 landscape. Title bar and rule, column-fill auto, Crimson Pro Light, text 13 px. Each block keeps its on-screen layout (an 840 px column) and is scaled whole to the print column, 87.4 %; a block never breaks. **The eight notation fragments stand two to a row at 82 % of their page size** — *rejected:* one under the other, as on the web page: four sheets, the last with a single entry. Now three.
- **D-Oct-5 · Line Wedge: the flat line replaced by the swell** (his choice among keep-both / replace / a taper). `images/lineWedge_hairpin_264.svg` = the original folder's unused `lineWedge_hairpin_from 264.svg`.
- **D-Oct-6 · The instructions open with Recombination's first paragraph**, word for word, the piece's name changed (his ask).
- **D-Oct-7 · The final barline: at the last system's right edge, in the assembled PDF only** (his ask, placed by him on a second pass). The thick bar's right edge 10 px inside the page's white (he said "15… maybe about 10"); from 10 px under the timeline's numbers down to the same margin above the system's foot (y 625.1 → 1169.9, x to 1579.0). Weights are the house's (`septet_LGMF_2026` rules.json `finalBarLine`): thin 0.19 · gap 0.30 · thick 0.60 staff space, the instrument staves' own staff space (6.65 px) → 1.26 / 3.99 px, solid black. *Replaced:* the first pass, at the curves' end (508.05 s, 75.6 % across) with the extent of the opening system line. *Not done:* putting it in the Workshop score — that would reach the live site and the parts.

## §5 Done

- **2026-10-08** — the print score for the JACK Studio Readings assembled: cover, instructions, score, final barline. 36 pages.

## §6 Human Notes

- *(2026-10-08)* The form and the upload are his. Deadline 2026-10-22, 11:59 pm ET.

---

## Table of Contents

- [Part 0: AI Quick-Start](#part-0-ai-quick-start)
- [Part I: Workshop Development (Composition Phase)](#part-i-workshop-development-composition-phase)
  - [I.1 — What the Workshop Is](#i1--what-the-workshop-is)
  - [I.2 — Curve System](#i2--curve-system)
  - [I.3 — Musical Material Systems](#i3--musical-material-systems)
  - [I.4 — LilyPond Notation Pipeline](#i4--lilypond-notation-pipeline)
  - [I.5 — MIDI Generation Architecture](#i5--midi-generation-architecture)
  - [I.6 — AI-Assisted Composition Workflow](#i6--ai-assisted-composition-workflow)
  - [I.7 — Score Data Model](#i7--score-data-model)
- [Part II: Performance Pipeline (Phases 1–15)](#part-ii-performance-pipeline-phases-115)
  - [II.1 — Architecture Overview](#ii1--architecture-overview)
  - [II.2 — Build System](#ii2--build-system)
  - [II.3 — Phase Summary Table](#ii3--phase-summary-table)
  - [II.4 — Key Engineering Decisions](#ii4--key-engineering-decisions)
  - [II.5 — Testing & Quality](#ii5--testing--quality)
- [Part III: Operations & Deployment](#part-iii-operations--deployment)
  - [III.1 — Server Architecture](#iii1--server-architecture)
  - [III.2 — Deploy Process](#iii2--deploy-process)
  - [III.3 — Routing](#iii3--routing)
  - [III.4 — Maintenance](#iii4--maintenance)
- [Part IV: Future — New Piece Guide](#part-iv-future--new-piece-guide)
  - [IV.1 — What's Reusable](#iv1--whats-reusable)
  - [IV.2 — What's Piece-Specific](#iv2--whats-piece-specific)
  - [IV.3 — Creating a New Piece Repository](#iv3--creating-a-new-piece-repository)
  - [IV.4 — Onboarding Checklist](#iv4--onboarding-checklist)
- [Appendix A: Document Inventory](#appendix-a-document-inventory)

---

# Part 0: AI Quick-Start

> **Purpose:** Give any AI assistant enough context to be productive within minutes. Read this section first; drill into later parts only as needed.

## What This Project Is

**String Quartet No. 1** is a contemporary music composition for string quartet. The piece uses a **scrolling digital score** instead of traditional printed pages — performers read from tablets/laptops in real time, with animated conducting cues (Gravitational Conductors), colored curves representing gestures, and embedded notation fragments.

The project has two major software components:

1. **Workshop** (`public/index.html`, `server.js`) — A browser-based composition environment where the composer builds the score. It runs locally on `localhost:5000`. This is a single large HTML file (~30,000+ lines) with all rendering, editing, MIDI playback, and UI systems embedded.

2. **Performance Score** (`builds/performance/index.html`) — A stripped, optimized version of the Workshop HTML deployed to a web server. Built by `scripts/build_performance_app.js`, which performs subtractive transformations (removing editor UI, injecting patches for sync, parts mode, rehearsal tools). Performers access this at `justinwenloyang.com/string-quartet-no1`.

## Key Architecture Principles

- **Subtractive build:** The Performance Score is the Workshop with editing UI removed and performance features injected via patch files. This preserves rendering fidelity.
- **Patches, not source modification:** Performance features live in `scripts/performance_*_patches.js` files. The Workshop `public/index.html` stays unchanged.
- **Score as JSON:** All composition data (curves, SVG elements, MIDI snippets, GCs, bundles) is serialized to/from JSON via `ScoreManager`.
- **LilyPond for notation:** Musical notation is rendered as SVG via LilyPond, then inserted into the score. A custom pipeline (render → crop → insert) handles each technique.
- **MIDI channel banks:** 12 MIDI channels organized in 3 banks — Base (0–3), Vibrato (4–7), Volume (8–11) — to isolate persistent CC state.

## File Map (Where Things Live)

| Path | What It Is |
|------|-----------|
| `public/index.html` | Workshop — the composition engine (DO NOT MODIFY for performance features) |
| `server.js` | Workshop dev server (port 5000) |
| `scripts/build_performance_app.js` | Build script: Workshop → Performance Score |
| `scripts/performance_server.js` | Production Express server (port 3001) |
| `scripts/performance_*_patches.js` | Patch files injected during build (canvas, parts, rehearsal, annotation) |
| `scores/` | Score JSON files (composition data — the creative output) |
| `lilypond_code/` | LilyPond source files (`.ly`), tooling (`modify_midi.js`, `state_tracker.js`, `crop_svg.js`), SVG assembly engine |
| `landing/` | SQ1 landing page (instrument picker, room management) |
| `homepage/` | Composer homepage (portfolio, social links) |
| `docs/` | 40 markdown documents (this journal consolidates them) |
| `curve_library/` | Saved curve presets (JSON) |
| `gc_library/` | Saved Gravitational Conductor presets (JSON) |
| `SVG_graphics/` | Pre-generated notation SVGs (Bartók pizz, CLB, etc.) |
| `public/fonts/` | Crimson Pro font files for notation text |
| `public/pitchesSVGs/` | Pitch marker SVGs for glissando display |
| `tools/` | Standalone utility HTML tools |

## Musical Material Systems

The Workshop supports several musical gesture types, each with its own pipeline:

| System | CC0 | MIDI Channels | Key Files |
|--------|-----|---------------|-----------|
| **Long Tone Glissando** | — | 8–11 (Volume) | `AI_GLISSANDO_PROMPT_GUIDE.md` |
| **Crescendo/Decrescendo** | — | 8–11 (Volume) | `AI_CRESCENDO_PROMPT_GUIDE.md` |
| **Vibrato** | 89 | 4–7 (Vibrato) | `AI_VIBRATO_PROMPT_GUIDE.md` |
| **Bartók Pizzicato** | 97 | 0–3 (Base) | `AI_BARTOK_PIZZ_PROMPT_GUIDE.md` |
| **Pizzicato Tremolo** | 95 | 8–11 (Volume) | `AI_PIZZ_TREMOLO_PROMPT_GUIDE.md` |
| **Pizz Tremolo Glissando** | 95 | 8–11 (Volume) | `AI_PIZZ_TREM_GLISS_PROMPT_GUIDE.md` |
| **Bow Overpressure** | 53 | 0–3 (Base) | `AI_SCORE_BUILDING_PROGRESS.md` |
| **Col Legno Battuto/Jeté** | — | 0–3 (Base) | `AI_SCORE_BUILDING_PROGRESS.md` |
| **Notation Fragments** | varies | 0–3 (Base) | `NOTATION_FRAGMENT_WORKFLOW.md` |
| **Feathered Beam (Accel/Decel)** | — | 0–3 (Base) | `AI_SCORE_BUILDING_PROGRESS.md` |

Each system follows the **Musical Material Workflow** (`MUSICAL_MATERIAL_WORKFLOW.md`): build pipeline off-score → integrate via UI → optionally automate via AI Command Bridge.

## AI Interaction Patterns

Four patterns evolved for inserting musical material, each an improvement:

1. **Console Script → Save → Reload** — AI generates JS, user pastes in console, saves, reloads
2. **Programmatic API → Save → Reload** — UI buttons trigger pipelines, but still need save/reload
3. **Direct Live Insertion** — Everything happens in one click, no reload needed
4. **AI Direct (Pattern 4)** — AI sends commands via `POST /api/ai/command` → Socket.IO → browser eval. Hands-free.

**Pattern 4 is the target for all systems.** The composer describes what they want in natural language; it materializes in the score.

## Working Protocols

| Protocol | Document | When |
|----------|----------|------|
| **Session start** | `WORKING_PRINCIPLES.md` | Read first every session |
| **Pre-implementation** | `STRING_QUARTET_PIPELINE_PLAN.md` §13.2.7 | Before any new phase |
| **LilyPond work** | `LILYPOND_SETTINGS_REGISTRY.md` | Before any `.ly` file |
| **Score building** | `AI_SCORE_BUILDING_PROGRESS.md` | During composition sessions |
| **Testing** | `TESTING_PROTOCOL.md` | After integration work |
| **Post-mortem** | `IMPLEMENTATION_PROGRESS.md` | After completing each phase |

## Quick Commands

```bash
# Workshop (composition)
node server.js                    # Start Workshop on :5000

# Build Performance Score
node scripts/build_performance_app.js

# Performance server (local testing)
node scripts/performance_server.js  # Start on :3001

# Deploy to production
ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35 \
  "su - deploy -c 'cd /home/deploy/sq1 && git pull && node scripts/build_performance_app.js'"
```

---

# Part I: Workshop Development (Composition Phase)

## I.1 — What the Workshop Is

The Workshop is a browser-based composition environment — a single HTML page (`public/index.html`) that provides:

- **Scrolling timeline** — a horizontal score canvas where time flows left-to-right
- **Four instrument tracks** — Violin I, Violin II, Viola, Cello (mapped to tracks 1–4)
- **Graphic objects** — Curves (CurveMaker), Gravitational Conductors (GCMaker), SVG elements (SVGElementManager), Line-Wedges (LineWedgeMaker), MIDI snippets (MidiController), Badges (BadgeMaker)
- **Score persistence** — JSON save/load via ScoreManager with auto-save and versioning
- **MIDI playback** — Web MIDI API for real-time playback of all MIDI snippets
- **LilyPond integration** — Server endpoints for rendering notation to SVG
- **AI Command Bridge** — Socket.IO bridge for hands-free AI composition

The Workshop server (`server.js`, port 5000) provides REST endpoints for file operations, LilyPond rendering, curve/GC libraries, and the AI command bridge.

**Original docs:** `CURVE_SYSTEM_ARCHITECTURE.md`, `KEYBOARD_SHORTCUTS.md`, `MISCELLANEOUS_NOTES.md`

## I.2 — Curve System

Curves are the foundational graphic element. They represent gesture shapes — pitch trajectories, volume envelopes, vibrato intensity — as time-indexed bezier paths on the score timeline.

**Key concepts:**
- **CurveDatabase** — in-memory CRUD store, registered with ScoreManager
- **CurveMaker** — rendering, selection, editing, multi-page display, library save/recall
- **curveData** — sampled at 100 Hz (10ms intervals), normalized Y values 0–1
- **Curve models** — logarithmic, exponential, power, sigmoid, bezier — controlled by slope parameter (-3 to +3)
- **Fill modes** — line, fill-down, fill-up — visual representation of the gesture
- **Curve Follower** — real-time animated meter during playback (O(1) lookup)

Curves drive multiple musical systems. In Long Tone Glissando, the curve Y maps to pitch. In Crescendo/Decrescendo, it maps to CC7 volume. In Vibrato, it maps to CC4/channel pressure intensity.

**Original doc:** `CURVE_SYSTEM_ARCHITECTURE.md`

## I.3 — Musical Material Systems

Each musical gesture type has a complete pipeline: inputs → LilyPond notation → SVG → MIDI → score insertion. Systems are documented in dedicated workflow docs and AI prompt guides.

### Bundle System

Most systems use a **bundle** — a linked group of components (GC + SVG + MIDI snippet + curve) that move and delete together. The bundle system provides:
- **Unified drag** — drag any component, all move together
- **Unified delete** — delete any component, all are removed
- **Persistence** — bundles exported/imported via ScoreManager

Bundle types: CD (crescendo/decrescendo), VIB (vibrato), BP (Bartók pizz), PT (pizz tremolo), PTG (pizz trem glissando), NF (notation fragment), BOP (bow overpressure), AD (accel/decel feathered beam).

### Musical Material Catalog (MM System)

A higher-level grouping: **Musical Materials** (`MUSICAL_MATERIAL_SYSTEM.md`) let the composer name and version groups of bundles as compositional units. Captured via MultiSelect → purple MM button.

### Gravitational Conductor (GC)

An ictus-based animated conducting cue — a bouncing ball that impacts at a specific time. The kinetic curve (descent → impact → ascent) informs performance interpretation. Parameters: stiffness, damping, ictus percentage, descent ratio, duration, color.

### Selection & Grouping

- **ObjectSelector** — Ctrl+Win+Click opens a menu for overlapping objects
- **MultiSelect** — Shift+Click toggles objects in/out of group selection
- **Floating toolbar** — Duplicate, Delete, Track change, Time shift for selected objects

**Original docs:** `MUSICAL_MATERIAL_WORKFLOW.md`, `MUSICAL_MATERIAL_SYSTEM.md`, `KEYBOARD_SHORTCUTS.md`, `Bundle_Manager_Guide.md`

## I.4 — LilyPond Notation Pipeline

All notation SVGs are generated via LilyPond. The project uses a structured pipeline:

1. **Templates** — Parameterized `.ly` files for each technique (glissando, vibrato, crescendo, Bartók pizz, Z-stem, feathered beam, etc.)
2. **Settings Registry** — `LILYPOND_SETTINGS_REGISTRY.md` is the single source of truth (extracted from 433 `.ly` files, 771 unique setting lines)
3. **StartingTemplate.ly** — Clean base for new files
4. **Rendering** — LilyPond CLI or Frescobaldi produces SVG + MIDI + event log
5. **Cropping** — `crop_svg.js` trims whitespace from LilyPond's full-paper SVG
6. **SVG Assembly Engine** — `lilypond_code/svg_assembly/assemble_svg.js` assembles notation from component glyphs (alternative to LilyPond for simple cases)

### MIDI Tagging System

A custom pipeline for injecting per-note MIDI metadata:
1. **`midi-tags.ily`** — LilyPond shorthand variables (`\midiPizz`, `\midiSfz`, etc.)
2. **`midi-logger.ily`** — Scheme engraver that writes JSON event log during compilation
3. **`state_tracker.js`** — Converts event log → CC map JSON
4. **`modify_midi.js`** — Injects CC events and velocity overrides into raw MIDI

This decoupled pipeline means notation and MIDI serve different purposes from the same input.

**Original docs:** `AI_LILYPOND_PROMPT_GUIDE.md`, `LILYPOND_SETTINGS_REGISTRY.md`, `NOTATION_FRAGMENT_WORKFLOW.md`, `LY_NAMING_CONVENTION.md`, `Violin_Notation_Guide.md`, `Viola_Notation_Guide.md`, `Cello_Notation_Guide.md`

## I.5 — MIDI Generation Architecture

**12 MIDI channels in 3 banks:**

| Bank | Channels | Purpose | Systems |
|------|----------|---------|---------|
| **Base** | 0–3 | Note events, CC0 articulation, pitch bend | Bartók pizz, Bow overpressure, Notation fragments, Pizz trem glissando |
| **Vibrato** | 4–7 | CC4 modulation + channel pressure | Vibrato |
| **Volume** | 8–11 | CC7 volume ramp | Long tone glissando, Crescendo/decresc, Pizz tremolo |

**Why separate banks?** The synth doesn't reliably respond to CC120/CC123 for state reset. A crescendo ending at CC7=127 leaves the channel permanently loud. Isolating by bank prevents cross-contamination.

**CC0 Articulation IDs:** 53 (bow overpressure), 89 (vibrato/senza vibrato), 95 (pizz tremolo), 97 (Bartók pizz). Full registry in `MIDI_MUSIC_GENERATION.md` §4.

**Virtual instrument pitch bend range:** ±1 semitone (not the typical ±2). Quarter-tone: +50 cents = bend 12288, -50 cents = bend 4096, center = 8192.

**Original docs:** `MIDI_MUSIC_GENERATION.md`, `AI_SCORE_BUILDING_PROGRESS.md` (§MIDI Channel Designation)

## I.6 — AI-Assisted Composition Workflow

The composition process uses a 3-tier documentation system:

| Tier | Scope | Action |
|------|-------|--------|
| **Tier 1** | Each code change | Memory + ASB-NNN entry |
| **Tier 2** | Every 3–4 increments | Git commit summarizing ASB range |
| **Tier 3** | Major milestone | Full docs update + git tag |

**Session protocol:**
1. Read `WORKING_PRINCIPLES.md` (86 lines — short enough for every session)
2. Read `AI_SCORE_BUILDING_PROGRESS.md` → Session Startup Checklist
3. AI states understanding of current task; user confirms
4. Work proceeds with Tier 1 documentation
5. Wrap up: summarize, suggest Tier 2 commit, update progress

**ASB numbering:** Sequential from ASB-001 through ASB-189+ (as of Mar 2026). Each ASB is an atomic unit of composition work.

**Original docs:** `AI_SCORE_BUILDING_PROGRESS.md`, `WORKFLOW_METHODOLOGY.md`, `SESSION_START_AND_END_PROMPTS.md`, `WORKING_PRINCIPLES.md`

## I.7 — Score Data Model

The score is a single JSON file containing:

- **CurveDatabase** — all curves with sample data
- **MidiSnippetDatabase** — all MIDI snippets with event arrays
- **SVGElementManager data** — all SVG notation elements (base64 data URLs)
- **GCMaker data** — all Gravitational Conductors
- **LineWedgeMaker data** — all line-wedge objects
- **MotiveDatabase** — motive data (experimental)
- **BadgeDatabase** — animated badge elements
- **Bundle registries** — per-system bundle linkages (CD, VIB, BP, PT, PTG, NF, BOP, AD)
- **Musical Materials** — named, versioned groups of bundles
- **Score metadata** — cursor position, page, zoom, timeline length

Score files are in `scores/` (numbered sequentially, e.g., "2295-FinalScore-preVersioning.json"). The `scores/versions/` subdirectory holds timestamped backups.

**Original doc:** `BULK_MOVE_OBJECTS.md` (documents all 7+ object types and their time fields)

---

# Part II: Performance Pipeline (Phases 1–15)

## II.1 — Architecture Overview

The Performance Score transforms the Workshop into a deployable web app for live performance:

```
Workshop HTML (public/index.html)
        │
        ▼  build_performance_app.js
┌───────────────────────────────────┐
│  Strip editor UI                  │
│  Inject canvas patches            │
│  Inject parts mode patches        │
│  Inject rehearsal mode patches    │
│  Inject annotation patches        │
│  Embed score JSON                 │
│  Convert SVG text → vector paths  │
│  Copy fonts, staff SVGs, pitch SVGs│
└───────────────────────────────────┘
        │
        ▼
Performance HTML (builds/performance/index.html)
        │
        ▼  performance_server.js
┌───────────────────────────────────┐
│  Express server (port 3001)       │
│  Socket.IO (multi-client sync)    │
│  JWT session management           │
│  Room system                      │
│  Static file serving              │
└───────────────────────────────────┘
        │
        ▼
Live at justinwenloyang.com
```

**Key insight: Subtractive, not additive.** The build strips the Workshop down rather than rebuilding from scratch. This preserves all rendering fidelity — every curve, SVG, animation, and layout behaves exactly as it does in the composer's Workshop.

## II.2 — Build System

`scripts/build_performance_app.js` performs these transformations:

1. **Read** Workshop HTML
2. **Apply canvas patches** — replace rendering methods for performance context
3. **Apply parts patches** — add per-instrument part view (configurable page count)
4. **Apply rehearsal patches** — add gestures, markers, loops, annotations, sync controls, speed control, performance mode, emergency controls
5. **Apply annotation patches** — add annotation overlays
6. **Embed** score JSON inline (from `scores/2295-FinalScore-preVersioning.json`)
7. **Generate** stamp glyph paths from Emmentaler font (via `svg_component_library.json`)
8. **Convert** SVG text to vector paths via opentype.js (eliminates font dependency)
9. **Copy** staff header SVGs, pitch marker SVGs, font files to build output

Output: `builds/performance/index.html` + supporting assets.

## II.3 — Phase Summary Table

| Phase | Name | What It Did |
|-------|------|-------------|
| 1 | Subtractive Build | Strip Workshop → Performance HTML |
| 2 | Score Embedding | Inline score JSON, remove file I/O |
| 3 | Canvas Patches | Replace rendering for performance context |
| 4 | Print Score | PDF generation via Puppeteer (page pairs, proper margins) |
| 5 | Multi-page Curves | Curves spanning page boundaries render correctly |
| 6 | SVG Elements | Notation SVGs render, resize, multi-page |
| 7 | GC Animation | Gravitational Conductor bouncing ball in performance |
| 8 | Multi-Client Sync | Socket.IO sync, leader election, offline stub, navigation centralization |
| 9 | Line-Wedges | Line-wedge rendering in performance |
| 10 | Speed Control | Adjustable playback speed |
| 11 | Performance Mode | Readiness check, countdown, locked playback, ceremony, emergency controls |
| 12 | Parts Mode | Per-instrument view, configurable page count, swipe gestures |
| 13 | Rehearsal Mode | Full gesture reference, markers, loops, annotations, MiniMap overlay |
| 14 | Website & Production | Landing page, homepage, cloud deployment (Hetzner VPS), PM2, nginx, sparse git clone |
| 15 | Homepage & Polish | Homepage at `/`, SQ1 at `/string-quartet-no1`, YouTube link, sync bar auto-fade |

## II.4 — Key Engineering Decisions

1. **Subtractive approach** (Phase 1) — preserve Workshop rendering fidelity, don't reimplement
2. **Patches files** — keep `public/index.html` unchanged; all performance features in separate `.js` files
3. **Guard clause pattern** — Workshop uses `if (window.X)` guards, making stripping safe
4. **Socket.IO for sync** — real-time multi-client coordination with leader election
5. **Offline stub** — fallback when no server connection; must mirror server payload shape
6. **Navigation centralization** (Phase 8) — all goto paths through `SyncMode.localGoto()` (was 5 independent paths)
7. **Text-to-paths** (Phase 14) — opentype.js converts Crimson Pro text in SVGs to vector outlines, eliminating font dependency
8. **Sparse git clone** (Phase 14) — production server only checks out needed files (scripts, landing, docs, one score file)
9. **JWT session management** — returning performer detection via localStorage token

## II.5 — Testing & Quality

**Testing Protocol** (`TESTING_PROTOCOL.md`) — 15 tests across 4 tiers, ~25 minutes:

| Tier | Tests | Focus |
|------|-------|-------|
| 1 | 1.1–1.5 | Single-client parts: page turns, swipe/sync, goto, loop, page count |
| 2 | 2.1–2.5 | Multi-client: sync, broadcast isolation, disconnect/reconnect |
| 3 | 3.1–3.4 | Full score basics, cross-mode in same room |
| 4 | 4.1–4.4 | Edge cases: overflow, rapid input, boundary loops, font rendering |

**Pre-Implementation Protocol** (§13.2.7) — 7 steps before every phase:
1. System inventory → 2. Source reading (5:1 read:write ratio) → 3. Contract documentation → 4. Risk register → 5. Staged plan → 6. Focused tests → 7. Integration verification

**Working Principles** (`WORKING_PRINCIPLES.md`) — Distilled from all post-mortems:
- Fix upstream, not downstream
- Root cause before implementation
- Minimal fix (single-line when possible)
- Read before you write (5:1 ratio)
- One system per stage
- Never skip human verification

**Original docs:** `TESTING_PROTOCOL.md`, `WORKING_PRINCIPLES.md`, `STRING_QUARTET_PIPELINE_PLAN.md`, `IMPLEMENTATION_PROGRESS.md`

---

# Part III: Operations & Deployment

## III.1 — Server Architecture

**Production server:** Hetzner VPS at `5.161.233.35` (`justinwenloyang.com`)

| Component | Detail |
|-----------|--------|
| **OS** | Ubuntu (Hetzner cloud) |
| **User** | `deploy` (non-root, runs the app) |
| **Process manager** | PM2 (`sq1-server`) with systemd auto-restart |
| **Reverse proxy** | nginx (TLS termination, static caching) |
| **Node.js** | Express server (`scripts/performance_server.js`) |
| **Git** | Sparse clone at `/home/deploy/sq1/` |
| **Domain** | `justinwenloyang.com` (DNS → Hetzner IP) |

**Sparse checkout includes only production-needed files:**
- `scripts/`, `landing/`, `docs/`, `lilypond_code/`, `homepage/`
- `public/index.html`, `public/fonts/`, `public/pitchesSVGs/`
- `scores/2295-FinalScore-preVersioning.json`
- `package.json`, `package-lock.json`

## III.2 — Deploy Process

```bash
# 1. Edit locally, rebuild if needed
node scripts/build_performance_app.js

# 2. Commit and push
git add -A && git commit -m "description" && git push

# 3. One-liner deploy (pull + rebuild on server)
ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35 \
  "su - deploy -c 'cd /home/deploy/sq1 && git pull && node scripts/build_performance_app.js'"

# 4. If performance_server.js changed:
ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35 \
  "su - deploy -c 'pm2 restart sq1-server'"
```

The setup script `setup_server_clone.sh` automates initial server setup (sparse clone, npm install, build, PM2 start).

## III.3 — Routing

| URL | Content |
|-----|---------|
| `/` | Homepage — composer name, works list, social links |
| `/string-quartet-no1` | SQ1 landing page (name, instrument, pages, room, docs, print) |
| `/score` | SQ1 Performance Score app |
| `/docs/*` | Technical manual, notation instructions |
| `/print/*` | Print score PDFs |
| `/api/*` | Session API (JWT join, room management) |

## III.4 — Maintenance

- **PM2 auto-restart** — if the Node process crashes, PM2 restarts it automatically
- **Systemd service** — `pm2-deploy.service` ensures PM2 survives server reboot
- **Logs** — `pm2 logs sq1-server` for runtime output
- **SSL** — managed by nginx (Let's Encrypt or similar)
- **Git pull** — production always pulls from `main` branch

---

# Part IV: Future — New Piece Guide

## IV.1 — What's Reusable

The following infrastructure transfers directly to a new piece:

| Category | Files | Notes |
|----------|-------|-------|
| **Workshop engine** | `public/index.html`, `server.js`, `index.js` | The composition environment |
| **Build pipeline** | `scripts/build_performance_app.js`, all patch files | Transforms Workshop → Performance |
| **Production server** | `scripts/performance_server.js` | Multi-client sync, rooms, JWT |
| **Landing page** | `landing/` (template) | Customize title, instruments |
| **Homepage** | `homepage/` | Add new piece card |
| **LilyPond tooling** | `lilypond_code/*.ly` templates, `svg_assembly/`, `pitches/`, `modify_midi.js`, `state_tracker.js`, `crop_svg.js` | Full notation pipeline |
| **Fonts** | `public/fonts/` | Crimson Pro for notation text |
| **Pitch SVGs** | `public/pitchesSVGs/` | Glissando pitch display |
| **SVG graphics** | `SVG_graphics/` | Reusable graphic elements |
| **Curve presets** | `curve_library/` | Compositional shape templates |
| **GC presets** | `gc_library/` | Conductor gesture presets |
| **Documentation** | `docs/` | All 40 markdown docs |
| **Utility tools** | `tools/` | Standalone HTML tools |
| **Config** | `.gitignore`, `.gitattributes`, `LICENSE`, `package.json` | Project setup |

## IV.2 — What's Piece-Specific (Drop for New Piece)

| Category | Path(s) | Size |
|----------|---------|------|
| Score files | `scores/`, `scoresBackUp/` | ~29 GB |
| Audio renders | `public/audio_files/`, `StrQtrNo1-AudioRender-*/` | ~1.6 GB |
| MIDI files | `midi files/`, `midi_exports/` | varies |
| Reaper project | `Reaper/` | varies |
| Legacy/scratch | `Diagonistic/`, `JY_oldCode/`, `old_archived/`, `misc/` | ~4 MB |
| Motive library | `motive_library/` | 7.2 MB (test data) |
| AI conversation logs | `ai files/` | 1.3 MB |
| Root-level fonts | `fonts/` | duplicate of `public/fonts/` |
| Empty dirs | `svg_compositions/` | 0 |
| Runtime data | `data/` | session data |
| Generated LilyPond outputs | `lilypond_code/*.mid`, `*.svg`, `*.pdf` (root level) | varies |
| SQ1-specific tempo variants | `lilypond_code/tempo_variants/` | SQ1 specific |

## IV.3 — Creating a New Piece Repository

**Recommended approach:** Clone the repo, then surgically remove piece-specific files.

```bash
# 1. Clone
git clone https://github.com/elosine/string_quartet_no1-composer.git new-piece-name
cd new-piece-name

# 2. Remove piece-specific directories
rm -rf scores/ scoresBackUp/
rm -rf "public/audio_files/" "StrQtrNo1-AudioRender-"*
rm -rf "midi files/" midi_exports/
rm -rf Reaper/
rm -rf Diagonistic/ JY_oldCode/ old_archived/ misc/
rm -rf motive_library/ "ai files/" fonts/ svg_compositions/ data/
rm -rf lilypond_code/tempo_variants/

# 3. Remove generated LilyPond outputs (keep .ly and tooling subdirs)
find lilypond_code -maxdepth 1 -name "*.mid" -o -name "*.svg" -o -name "*.pdf" | xargs rm -f

# 4. Create a fresh score directory
mkdir scores

# 5. Update README, landing page title/instruments, homepage card

# 6. Initialize fresh git history (optional)
rm -rf .git
git init
git add -A
git commit -m "Initial: new piece from SQ1 infrastructure"
```

**Customize for instrumentation:**
- Update track count in Workshop HTML (search for `gTrack` references)
- Update `performance_server.js` room logic if needed
- Update landing page instrument picker
- Update MIDI channel mapping if different number of instruments

## IV.4 — Onboarding Checklist

For a new AI session on a new piece:

1. Read `docs/WORKING_PRINCIPLES.md` — session protocol
2. Read this journal (Part 0) — architecture overview
3. Read `docs/AI_SCORE_BUILDING_PROGRESS.md` → Session Startup Checklist
4. If doing LilyPond work: read `docs/LILYPOND_SETTINGS_REGISTRY.md`
5. If building new material: read `docs/MUSICAL_MATERIAL_WORKFLOW.md`
6. If doing performance pipeline work: read `docs/STRING_QUARTET_PIPELINE_PLAN.md` for the relevant phase

---

# Appendix A: Document Inventory

All 40 original documents in `docs/`, organized by category. Each is preserved as a separate file.

## Process & Methodology

| Document | Lines | Purpose |
|----------|-------|---------|
| `WORKING_PRINCIPLES.md` | 86 | Session-start rubric — distilled lessons from all phases |
| `WORKFLOW_METHODOLOGY.md` | 188 | AI-assisted score building patterns and lessons |
| `SESSION_START_AND_END_PROMPTS.md` | 71 | Quick reference for session triggers |
| `TESTING_PROTOCOL.md` | 215 | 15-test protocol for Performance Score verification |
| `KEYBOARD_SHORTCUTS.md` | 94 | All keyboard/mouse commands in the Workshop |
| `MISCELLANEOUS_NOTES.md` | 24 | PowerShell server management tips |
| `BULK_MOVE_OBJECTS.md` | — | Scripts for bulk-moving objects in score JSON |
| `ONEDRIVE_MIGRATION_GUIDE.md` | — | Notes on migrating the repo from OneDrive |

## AI Prompt Guides

| Document | Lines | Musical System |
|----------|-------|---------------|
| `AI_LILYPOND_PROMPT_GUIDE.md` | 225 | General LilyPond notation creation |
| `AI_GLISSANDO_PROMPT_GUIDE.md` | 216 | Long Tone Glissando |
| `AI_CRESCENDO_PROMPT_GUIDE.md` | 208 | Crescendo/Decrescendo |
| `AI_VIBRATO_PROMPT_GUIDE.md` | 229 | Vibrato Motive |
| `AI_BARTOK_PIZZ_PROMPT_GUIDE.md` | 224 | Bartók Pizzicato |
| `AI_PIZZ_TREMOLO_PROMPT_GUIDE.md` | 307 | Pizzicato Tremolo |
| `AI_PIZZ_TREM_GLISS_PROMPT_GUIDE.md` | 309 | Pizzicato Tremolo Glissando |

## System Architecture & Implementation

| Document | Lines | System |
|----------|-------|--------|
| `CURVE_SYSTEM_ARCHITECTURE.md` | 232 | Complete Curve System analysis |
| `LONG_TONE_IMPLEMENTATION.md` | 226 | Long Tone Glissando system |
| `VIBRATO_SYSTEM_IMPLEMENTATION.md` | 259 | Vibrato system |
| `MIDI_MUSIC_GENERATION.md` | 1187 | MIDI architecture, all systems, channel banks, tools |
| `MUSICAL_MATERIAL_WORKFLOW.md` | 231 | General musical material pipeline |
| `MUSICAL_MATERIAL_SYSTEM.md` | 102 | Musical Material catalog (MM naming/versioning) |
| `Bundle_Manager_Guide.md` | — | Bundle system guide |
| `CURVE_FUGUE_ALGORITHM_1.md` | — | Compositional algorithm notes |
| `Sequence_Generator_Guide.md` | — | Sequence generator tool guide |

## Notation & Workflow

| Document | Lines | Topic |
|----------|-------|-------|
| `LILYPOND_SETTINGS_REGISTRY.md` | 2150 | Single source of truth for all LilyPond settings |
| `NOTATION_FRAGMENT_WORKFLOW.md` | 822 | End-to-end notation fragment pipeline (10 steps) |
| `BARTOK_PIZZICATO_WORKFLOW.md` | 230 | Bartók Pizz generation workflow |
| `LONG_TONE_GLISSANDO_WORKFLOW.md` | — | Long Tone workflow |
| `PIZZICATO_TREMOLO_WORKFLOW.md` | — | Pizz Tremolo workflow |
| `PIZZICATO_TREMOLO_GLISSANDO_WORKFLOW.md` | — | Pizz Trem Glissando workflow |
| `LY_NAMING_CONVENTION.md` | — | LilyPond file naming convention |
| `Notation Fragment 005 Refinement.md` | — | Specific fragment refinement notes |
| `Notation_Research.md` | — | Notation research notes |

## Instrument-Specific Notation

| Document | Topic |
|----------|-------|
| `Violin_Notation_Guide.md` | Violin-specific notation guidance |
| `Viola_Notation_Guide.md` | Viola-specific notation guidance |
| `Cello_Notation_Guide.md` | Cello-specific notation guidance |

## Performance & Deployment

| Document | Lines | Topic |
|----------|-------|-------|
| `Performance_Instructions.md` | 60 | Performance interpretation guidance (GC system) |
| `AI_SCORE_BUILDING_PROGRESS.md` | 1131 | Session state, ASB numbering, all system statuses |

## Master References

| Document | Lines | Topic |
|----------|-------|-------|
| `STRING_QUARTET_PIPELINE_PLAN.md` | 5500+ | Complete pipeline plan — all phases, protocols, architecture |
| `IMPLEMENTATION_PROGRESS.md` | 3100+ | Phase-by-phase progress log with post-mortems |
