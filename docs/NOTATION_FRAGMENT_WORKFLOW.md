# Notation Fragment Workflow

*Created: Feb 21, 2026*

End-to-end process for creating notation fragment SVGs for score insertion.

---

## Overview

Notation Fragments are small, self-contained pieces of musical notation rendered as SVGs via LilyPond. Each fragment represents a compositional gesture — tuplets, chords, articulations, text markings — that will be inserted into the score as a graphic element.

**Naming convention:** `NotationFragment[NNN]-[Instrument].ly`

**Settings source of truth:** `docs/LILYPOND_SETTINGS_REGISTRY.md`

**Working MO:** AI writes/edits the `.ly` code; the user renders in **Frescobaldi**. Do NOT run `lilypond` compilation commands — just produce the code.

---

## Step 1: Gather Input

**Status:** Pending

| Parameter | Required | Options | Notes |
|-----------|----------|---------|-------|
| **Tempo** | Yes | `random` or specific BPM (e.g. `120`) | If `random`, generate a random tempo within certain bounds (bounds TBD) |

---

## Step 2: Generate LilyPond File ⬅️ CURRENT

**Status:** In Progress

### Step 2A: Create Notation Fragments

*Placeholder — details TBD.*

### Step 2B: Render LilyPond → SVG + MIDI

Render the `.ly` file to produce both the SVG (notation graphic) and MIDI (raw musical data). The `.ly` file must include a `\midi {}` block for MIDI output.

**During development:** User renders manually in **Frescobaldi** (iterative editing).

**In automated pipeline:** Use `lilypond` CLI, following the pattern from `render_bartok_pizz.js`:
```powershell
lilypond --svg -dbackend=svg -o "<output_base>" "<input.ly>"
```

This produces `<output_base>.svg` (or `-1.svg`) and `<output_base>.mid` (or `.midi`).

**Output naming:** `NotationFragment[NNN]-[Instrument].mid` / `.svg`

### Step 2C: Tag Notation with MIDI Properties + Modify MIDI

Post-process the LilyPond-generated MIDI file to add CC messages that the notation implies but LilyPond doesn't encode (articulation presets, volume shaping, etc.).

**Tools:**
- `lilypond_code/midi-tags.ily` — shorthand variables for `\set` context properties (include in every `.ly` file)
- `lilypond_code/modify_midi.js` — injects CC messages into MIDI
- `docs/cc_mapping_registry.json` — persistent lookup table for notation symbol → CC/velocity mappings

#### MIDI Tagging Protocol

When writing a `.ly` file that will produce MIDI output, embed MIDI metadata directly in the notation using `\set` context properties. These are invisible (no visual effect) and read by the Scheme engraver during compilation.

**Setup:** Add `\include "midi-tags.ily"` at the top of the `.ly` file.

**Checklist (follow every time):**

1. ✅ `\include "midi-tags.ily"` at top of file
2. ✅ Set initial articulation mode BEFORE the first note (e.g., `\midiPizz`)
3. ✅ Add `\midiXxx` BEFORE each note where the technique changes
4. ✅ One-shot CC0 pattern: `\midiPizzOpen` → note → `\midiPizz` (revert)
5. ✅ One-shot velocity pattern: `\midiSfz` → note → `\midiVelReset`
6. ✅ Walk through the music — every note should have an active `midiCCZero` value

#### Quick Lookup Table

| You see this in the score | Add this in the `.ly` file | Behavior |
|---|---|---|
| `"pizz."` text markup | `\midiPizz` | Persistent |
| `"o"` markup (open string in pizz context) | `\midiPizzOpen` → note → `\midiPizz` | One-shot, manual revert |
| `\snappizzicato` | `\midiBartokPizz` | Persistent |
| Return to arco / sustained | `\midiArco` | Persistent |
| `\sfz` dynamic | `\midiSfz` → note → `\midiVelReset` | One-shot, manual revert |

**Context properties used:**

| Property | Type | Persistence | Purpose |
|---|---|---|---|
| `Staff.midiCCZero` | integer (0–127) | Persistent until next `\set` | CC0 articulation mode |
| `Staff.midiVelocity` | integer (0–127) | One-shot — must `\unset` after note | Velocity override |

**Source of truth:** `docs/cc_mapping_registry.json` — defines all CC values, shorthand names, and revert patterns.

#### Example: Tagged Notation

```lilypond
\include "midi-tags.ily"

\midiPizz                           % CC0=95 for all following notes
fs'16-. ^\markup { "pizz." } \ff
a16-.
\midiPizzOpen                       % CC0=71 for this note only
c,16 ^\markup { \teeny "o" }
\midiPizz                           % revert to pizz
<f' b fs>8
\midiSfz                            % vel=127 for next chord
<bf fs b,>16\sfz
\midiVelReset                       % clear velocity override
```

#### CC Injection Pipeline

1. Scheme engraver reads `\set` properties during compilation → produces event log
2. Node.js state tracker converts event log → JSON map for `modify_midi.js`
3. `modify_midi.js` injects CC events and velocity overrides into the MIDI
4. Save modified MIDI with `-Mod` suffix

**JSON map format:**
```json
{
  "noteEvents": [
    { "noteIndex": 0, "cc": [{ "num": 0, "val": 95 }] },
    { "noteIndex": 1, "cc": [{ "num": 0, "val": 95 }], "vel": 127 }
  ]
}
```

**Output naming:** `NotationFragment[NNN]-[Instrument]-Mod.mid`

**Output location:** `public/midi_files/`

**Example command:**
```
node modify_midi.js input.mid output.mid 0 --map fragment001_cc.json
```

**Expandability:** Any CC 0–127 can be specified per note group. Future uses include CC7 for volume/crescendo shaping, CC1 for vibrato intensity, pitch bend for glissando, etc. New properties are added to `midi-tags.ily` and `cc_mapping_registry.json`.

---

## Step 3: Adjust Paper Dimensions & Layout

**Status:** Pending

Tune `paper-width`, `paper-height`, `line-width`, and `proportionalNotationDuration` so the notation fits tightly in the SVG output. The user renders in Frescobaldi and adjusts iteratively.

### Key Settings

| Setting | Purpose | Typical Range |
|---------|---------|---------------|
| paper-width | Total SVG width | 20–100\mm |
| paper-height | Total SVG height | 20–50\mm |
| line-width | Notation area width | paper-width minus margins |
| proportionalNotationDuration | Note spacing density | 1/8 (tightest) to 1/28 (widest) |
| staff-line-width-mm | Staff line extent | Match notation width |

### Deliverable

✅ Paper dimensions tuned — notation renders cleanly without clipping or excess whitespace.

---

## Step 4: SVG Cropping

**Status:** Pending

Crop the rendered SVG to remove whitespace around the notation. Uses the same cropping pipeline as other systems.

### Tools

- `lilypond_code/crop_svg.js` — standalone SVG cropper
- Server-side crop in `server.js` (same logic)

### Deliverable

✅ Cropped SVG ready for score insertion.

---

## Step 5: Score Integration

**Status:** Pending

Insert the cropped SVG into the score at a specified time and track. Uses the SVGElementManager anchor-based positioning system.

### Parameters

| Parameter | Description |
|-----------|-------------|
| Start Time | Score time in seconds |
| Track | Score track (1–4) |
| heightFraction | SVG scale relative to track height |
| offsetYFraction | Vertical offset within track |
| alignment | pre or post |

### Deliverable

✅ SVG appears in score at correct position, scales with window resize.

---

## Step 6: MIDI Generation (if needed)

**Status:** Pending

Generate MIDI corresponding to the notation fragment. This step is optional — some fragments are purely graphic.

*Details TBD — depends on the notation content and whether programmatic MIDI generation is needed.*

### Deliverable

✅ MIDI file (if applicable) inserted into MidiSnippetDatabase.

---

## Step 7: Pipeline Automation

**Status:** Pending

Automate the full workflow: LilyPond render → SVG crop → score insertion (→ optional MIDI).

*Details TBD — may follow the render_pizz_tremolo.js / render_bartok_pizz.js pattern.*

### Deliverable

✅ Single command or UI button executes the full pipeline.

---

## Step 8: AI Prompt Guide

**Status:** Pending

Create an AI prompt guide for notation fragment generation, following the pattern of `AI_BARTOK_PIZZ_PROMPT_GUIDE.md` and `AI_PIZZ_TREMOLO_PROMPT_GUIDE.md`.

### Deliverable

✅ Prompt guide document with templates, validation checklist, parameter reference.

---

## Analysis Roadmap: .ly File → CC Mapping

How to get from LilyPond notation symbols to the correct CC messages in the MIDI file. This is the analysis step referenced in Step 2C.

**Core concern:** AI cognitive analysis may vary between sessions. The goal is a reliable, consistent, automated process.

### Option A: AI Cognitive Analysis ← CURRENT

AI reads the `.ly` file, identifies notation markers ("pizz.", "o", `\snappizzicato`, `\sfz`), tracks articulation state, and produces the JSON map.

- **Pro:** Handles complex context-dependent logic (state tracking, modifier combinations), flexible
- **Con:** Requires AI session, not reproducible without AI, potential inconsistency across sessions
- **Use:** Short-term / fallback

### Option B: LilyPond Scheme Engraver (side-channel output)

Write a custom Scheme engraver that hooks into LilyPond's event system during compilation. Intercepts `TextScriptEvent` ("pizz."), `ArticulationEvent` (`\snappizzicato`), `DynamicEvent` (`\sfz`), `StringNumberEvent` ("o"), and outputs a structured JSON file alongside the MIDI.

- **Pro:** Uses LilyPond's own understanding of the music — always in sync, automatic, no regex
- **Con:** LilyPond Scheme is complex, sparse documentation, debugging is hard
- **Feasibility:** Medium-hard

### Option C: Structured Metadata Comments in `.ly` + Parser

Add machine-readable comments to `.ly` files (e.g., `% @cc0:95`) that a lightweight parser reads.

- **Pro:** Explicit, simple parser
- **Con:** Manual annotation burden, annotations can drift out of sync with notation
- **Use:** Not recommended — too much overhead

### Option D: Pattern-Matching `.ly` Parser + JSON Config

A Node.js script (`analyze_ly.js`) that regex-scans the `.ly` file for known notation markers, counts note positions, tracks articulation state, and consults `cc_mapping_registry.json` to produce the JSON map.

- **Pro:** Fully automated, config-driven, reproducible, batchable
- **Con:** LilyPond syntax is complex — regex parsing is fragile for edge cases
- **Feasibility:** Medium — works well for the subset of LilyPond patterns we use

### Option E: `\set` Context Properties + Scheme Logger ← ACTIVE

Composer embeds MIDI metadata directly in the `.ly` file using `\set Staff.midiCCZero`, `\set Staff.midiVelocity`, etc. (via shorthand variables from `midi-tags.ily`). A lightweight Scheme engraver (`midi-logger.ily`) reads these properties at each timestep and writes a JSON event log. A Node.js script converts the log to a JSON map for `modify_midi.js`.

**Architecture:**
```
.ly file (with \midiPizz, \midiSfz, etc.)
  → Scheme engraver reads \set properties → event log (.json)
    → Node.js state tracker → CC map (.json)
      → modify_midi.js → modified MIDI
```

- **Pro:** Explicit, deterministic, no markup parsing needed. State machine lives in the notation itself. Scheme engraver is trivial (just reads properties + writes file). Works for custom grobs too.
- **Con:** Requires composer to add `\midiXxx` tags when writing notation (mitigated by checklist + lookup table in Step 2C)
- **Key files:** `lilypond_code/midi-tags.ily` (shorthands), `lilypond_code/midi-logger.ily` (engraver), `docs/cc_mapping_registry.json` (source of truth)

### Roadmap

| Phase | Approach | Status |
|-------|----------|--------|
| **Completed** | Option A (AI cognitive) + `cc_mapping_registry.json` | ✅ Proven (ASB-088/089) |
| **Active** | Option E (`\set` properties + Scheme logger) | 🔧 Building |
| **Fallback** | Option D (regex parser + config) | Backup if Scheme fails |

---

## Appendix: LilyPond Settings Quick Reference

Consult `docs/LILYPOND_SETTINGS_REGISTRY.md` for the full registry. Key sections for notation fragments:

- **§1 Noteheads** — font-size, style, stencil
- **§2 Stems** — lengths, direction, transparency
- **§3 Beams** — damping (flat beams), breakable
- **§4 Accidentals** — font-size, extra-offset
- **§5 Dynamics** — font-size, spacing
- **§6 Hairpins** — height, Y-offset, shorten-pair
- **§7 Rests** — font-size
- **§8 Tuplets** — bracket visibility, direction, padding, number format, positions
- **§11 Staff Lines** — thickness, custom stencil, width
- **§12 Text & Markup** — font names, sizes
- **§13 Articulations** — types used in project
- **§15 Layout & Spacing** — proportionalNotationDuration, indent
- **§16 Paper Dimensions** — width/height presets, margins
- **§26 Scheme Definitions** — custom-staff-lines, flatten-tuplet-bracket
- **§27 Tweak Reference** — per-instance positioning tweaks
- **§28 Microtonal Pitch Syntax** — suffix reference, octave marks
