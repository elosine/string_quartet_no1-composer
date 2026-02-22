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

## Step 2: Create Notation Fragments in LilyPond with Custom Scheme MIDI Tagging

**Status:** Active

Create the `.ly` file for a notation fragment, embedding MIDI metadata directly in the notation using **Custom Scheme MIDI Tagging**. This system uses LilyPond `\set` context properties (via shorthand variables) to mark articulation modes, technique changes, and velocity overrides. A Scheme engraver reads these properties during compilation and writes a JSON event log alongside the SVG and MIDI output.

The tags are invisible — they have no effect on the rendered notation. They exist solely to inform the MIDI post-processing pipeline (Steps 3–4).

### File Setup

Every `.ly` file that produces MIDI output needs three things:

**1. Includes** at the top of the file:
```lilypond
\include "midi-tags.ily"
\include "midi-logger.ily"
```

**2. Engraver** in the `\layout` block:
```lilypond
\layout {
  \context {
    \Voice
    \consists \midiLogEngraver
  }
}
```

**3. MIDI block** in the `\score`:
```lilypond
\midi {}
```

### Tagging Checklist

Follow every time when writing or editing a `.ly` file:

1. ✅ `\include "midi-tags.ily"` and `\include "midi-logger.ily"` at top of file
2. ✅ `\context { \Voice \consists \midiLogEngraver }` in `\layout`
3. ✅ Set initial articulation mode BEFORE the first note (e.g., `\midiPizz`)
4. ✅ Add `\midiXxx` BEFORE each note where the technique changes
5. ✅ One-shot CC0 pattern: `\midiPizzOpen` → note → `\midiPizz` (revert)
6. ✅ One-shot velocity pattern: `\midiSfz` → note → `\midiVelReset`
7. ✅ Walk through the music — every note should have an active `midiCCZero` value

### Quick Lookup Table

| You see this in the score | Add this in the `.ly` file | Behavior |
|---|---|---|
| `"pizz."` text markup | `\midiPizz` | Persistent |
| `"o"` markup (open string in pizz context) | `\midiPizzOpen` → note → `\midiPizz` | One-shot, manual revert |
| `\snappizzicato` | `\midiBartokPizz` → note → revert to base mode | One-shot (consecutive Bartók pizz: no revert needed) |
| Return to arco / sustained | `\midiArco` | Persistent |
| `\sfz` dynamic | `\midiSfz` → note → `\midiVelReset` | One-shot, manual revert |

### Context Properties

| Property | Type | Persistence | Purpose |
|---|---|---|---|
| `Voice.midiCCZero` | integer (0–127) | Persistent until next `\set` | CC0 articulation mode |
| `Voice.midiVelocity` | integer (0–127) | One-shot — must `\unset` after note | Velocity override |

### Example: Tagged Notation

```lilypond
\include "midi-tags.ily"
\include "midi-logger.ily"

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

### MIDI Tagging System Reference

| Resource | Location | What it contains |
|---|---|---|
| Shorthand variables + property registration | `lilypond_code/midi-tags.ily` | `\midiPizz`, `\midiSfz`, etc. + `set-object-property!` registration |
| Scheme engraver | `lilypond_code/midi-logger.ily` | Reads context properties, writes JSON event log |
| CC mapping registry | `docs/cc_mapping_registry.json` | All CC values, shorthands, state rules, revert patterns |
| State tracker | `lilypond_code/state_tracker.js` | Converts event log → CC map for `modify_midi.js` |
| MIDI post-processor | `lilypond_code/modify_midi.js` | Injects CC events + velocity overrides into MIDI |
| Debugging protocols | `docs/MIDI_MUSIC_GENERATION.md` §17 | Three-level verification (event log → CC map → MIDI) |

### Deliverable

✅ `.ly` file with notation + `\midiXxx` tags, ready to render.

---

## Step 3: Render LilyPond → SVG + MIDI + Event Log

**Status:** Active

Compile the `.ly` file to produce three outputs: notation SVG, raw MIDI, and the Scheme engraver event log.

### Command

Standard LilyPond CLI — not a custom renderer:

```powershell
# If LilyPond is on PATH (current system):
lilypond --svg -dbackend=svg -o "NotationFragment[NNN]-[Instrument]" "NotationFragment[NNN]-[Instrument].ly"

# If LilyPond is NOT on PATH, use the full path:
& "C:\Users\jwloy\AppData\Local\frescobaldi\frescobaldi\lilypond-binaries\lilypond-2.24.4\bin\lilypond.exe" --svg -dbackend=svg -o "NotationFragment[NNN]-[Instrument]" "NotationFragment[NNN]-[Instrument].ly"
```

**During development:** User may also render in **Frescobaldi** for iterative editing (produces the same outputs).

> **Raw MIDI output:** The LilyPond render produces a raw `.mid` file alongside the SVG and event log. This is an interim base MIDI file — it will be used as input for the CC Injection Pipeline (Step 4).

### Outputs

All outputs are generated in the same directory as the `.ly` file (`lilypond_code/`):

| Output | Filename | Description |
|---|---|---|
| SVG | `NotationFragment[NNN]-[Instrument].svg` | Uncropped notation graphic |
| MIDI | `NotationFragment[NNN]-[Instrument].mid` | Raw MIDI (before CC injection) |
| Event Log | `NotationFragment[NNN]-[Instrument]-midi-log.json` | JSON event log from Scheme engraver — CC0 and velocity values per note group |

### Notes

- **LilyPond on PATH:** Currently installed at `C:\Users\jwloy\OneDrive\Documents\lilypond-2.24.4\bin\lilypond.exe` and available as `lilypond` on PATH. Frescobaldi uses its own copy at `C:\Users\jwloy\AppData\Local\frescobaldi\...\lilypond-2.24.4\bin\lilypond.exe` — same version.
- **SVG filename fallback:** LilyPond sometimes outputs `baseName-1.svg` instead of `baseName.svg`. Check for both.
- **MIDI extension fallback:** LilyPond may output `.mid` or `.midi`. Check for both.
- **Render command is identical** to what `render_bartok_pizz.js` and `render_pizz_tremolo.js` use — no special processing during rendering.
- **Version declaration:** `.ly` files declare `\version "2.20.0"` but LilyPond 2.24.4 is backward-compatible with 2.20 syntax. No need to update existing files.

### Verify

Check the event log (`-midi-log.json`) for correct `midiCCZero` and `midiVelocity` values at each note group. This is **Level 1** of the three-level verification protocol (see `MIDI_MUSIC_GENERATION.md` §17).

### Deliverable

✅ SVG, MIDI, and event log generated in `lilypond_code/`. Event log values match the `\midiXxx` tags in the `.ly` source.

---

## Step 4: Custom Score-Derived MIDI Data Injection Pipeline (Bespoke Application Set) (state_tracker.js → modify_midi.js → -Mod.mid)

**Status:** Active

Convert the raw LilyPond MIDI + Scheme engraver event log into a final modified MIDI file with per-note CC injections and velocity overrides. This is a two-stage Node.js pipeline.

### Stage A: Event Log → CC Map (`state_tracker.js`)

Converts the Scheme engraver event log (from Step 3) into a JSON CC map compatible with `modify_midi.js`.

```powershell
node state_tracker.js NotationFragment[NNN]-[Instrument]-midi-log.json --out fragment[NNN]_cc.json
```

**Input:** `lilypond_code/NotationFragment[NNN]-[Instrument]-midi-log.json` (event log from Step 3)
**Output:** `lilypond_code/fragment[NNN]_cc.json` (CC map)

The CC map contains one entry per note group with:
- `noteIndex` — 0-based index of the note group (chords count as one group)
- `cc` — array of CC messages to inject (e.g., `{ "num": 0, "val": 95 }` for pizzicato)
- `vel` — optional velocity override (e.g., `127` for sforzando)

### Stage B: CC Map + Raw MIDI → Modified MIDI (`modify_midi.js`)

Injects CC events and velocity overrides into the raw LilyPond MIDI file.

```powershell
node modify_midi.js NotationFragment[NNN]-[Instrument].mid NotationFragment[NNN]-[Instrument]-Mod.mid 0 --map fragment[NNN]_cc.json
```

**Inputs:**
- `lilypond_code/NotationFragment[NNN]-[Instrument].mid` (raw MIDI from Step 3)
- `lilypond_code/fragment[NNN]_cc.json` (CC map from Stage A)

**Output:** `lilypond_code/NotationFragment[NNN]-[Instrument]-Mod.mid` (final modified MIDI)

**Arguments:**
| Argument | Description |
|---|---|
| `input.mid` | Raw MIDI from LilyPond render |
| `output.mid` | Destination for modified MIDI — use `-Mod.mid` suffix |
| `channel` | MIDI channel, 0-indexed (track 1→0, track 2→1, etc.) |
| `--map` | Path to the CC map JSON file |

### Outputs Summary

All files are generated in `lilypond_code/`:

| Stage | Output | Filename |
|---|---|---|
| A | CC map | `fragment[NNN]_cc.json` |
| B | Modified MIDI | `NotationFragment[NNN]-[Instrument]-Mod.mid` |

### Verify

- **Level 2:** Inspect `fragment[NNN]_cc.json` — confirm correct `noteIndex`, CC numbers, and velocity overrides per note group.
- **Level 3:** Check `modify_midi.js` console output — confirm correct number of note groups processed, CC injections, and velocity overrides applied.

See `MIDI_MUSIC_GENERATION.md` §17 for the full three-level verification protocol.

### Notes

- The `state_tracker.js` → `modify_midi.js` pipeline is the **bespoke application set** — custom scripts built for this project's MIDI post-processing needs.
- `modify_midi.js` also supports tick-0 CC injection (`--cc <num> <val>`) and channel-only mode (no CC), but the `--map` workflow is the standard path for notation fragments.
- The final `-Mod.mid` file is what gets loaded into the DAW or inserted into the score's `MidiSnippetDatabase`.

### Expanding the Pipeline

The Custom Score-Derived MIDI Data Injection Pipeline is designed to be extensible. To add a new MIDI control type (new CC number, pitch bend, channel pressure, etc.), update four components:

#### 1. Register a new context property in `midi-tags.ily`

Add a `set-object-property!` registration and a shorthand variable:

```lilypond
%% Register the property type
#(set-object-property! 'midiNewProperty 'translation-type? number?)

%% Create a shorthand
midiNewTag = { \set Voice.midiNewProperty = #<value> }
```

**Existing properties:** `midiCCZero` (CC0 articulation), `midiVelocity` (velocity override).

**Candidate future properties:**

| Property Name | MIDI Message Type | Use Case |
|---|---|---|
| `midiPitchBend` | Pitch Bend (0–16383) | Quarter-tone adjustments, glissando start points |
| `midiChannelPressure` | Channel Pressure (0–127) | Aftertouch effects, vibrato intensity |
| `midiCC7` | CC7 Volume (0–127) | Dynamic shaping, volume automation |
| `midiCC4` | CC4 (0–127) | Vibrato intensity per note |
| `midiProgramChange` | Program Change (0–127) | Patch switching mid-stream |

#### 2. Read the property in `midi-logger.ily`

In the Scheme engraver's `process-music` callback, add a `ly:context-property` call for the new property and include it in the JSON event log output:

```scheme
(let* ((new-prop (ly:context-property context 'midiNewProperty)))
  ;; add to the JSON entry alongside midiCCZero and midiVelocity
```

#### 3. Map the property in `state_tracker.js`

Add logic to read the new field from the event log and emit the corresponding MIDI instruction in the CC map JSON. For example:

- **New CC number:** Add to the `ccList` array as `{ "num": <N>, "val": <V> }`
- **Pitch bend:** Add a `"bend": <0–16383>` field to the note event
- **Channel pressure:** Add a `"pressure": <0–127>` field

#### 4. Inject in `modify_midi.js`

Add handling for the new JSON field. Insert the appropriate MIDI message bytes before the Note On event of the targeted group. See `MIDI_MUSIC_GENERATION.md` §15 for the enhancement roadmap and planned JSON field names.

#### Summary: Files to Touch

| File | What to change |
|---|---|
| `lilypond_code/midi-tags.ily` | Register property + add shorthand variable |
| `lilypond_code/midi-logger.ily` | Read property in `process-music`, add to JSON output |
| `lilypond_code/state_tracker.js` | Map new event log field → CC map JSON field |
| `lilypond_code/modify_midi.js` | Inject new MIDI message type at note position |
| `docs/cc_mapping_registry.json` | Add entry for new CC/message type |
| `docs/MIDI_MUSIC_GENERATION.md` | Update §4 (CC Registry), §15 (Enhancement Roadmap) |

### Deliverable

✅ Final `-Mod.mid` file in `lilypond_code/` with all CC and velocity data injected. Verification at Levels 2 and 3 passes.

---

## Step 5: SVG Cropping

**Status:** Pending

Crop the rendered SVG to remove excess whitespace around the notation. LilyPond SVGs include the full paper dimensions — cropping trims the viewBox and physical dimensions to tightly fit the content.

### Command

```powershell
node crop_svg.js NotationFragment[NNN]-[Instrument].svg
```

Run from `lilypond_code/`. Supports multiple files: `node crop_svg.js file1.svg file2.svg ...`

### How It Works

`crop_svg.js` parses all visual elements in the SVG (lines, rects, paths, text) including nested `<g transform="translate(...)">` groups, computes the bounding box, adds 0.5-unit padding, then rewrites the `viewBox`, `width`, and `height` attributes. The file is modified **in-place**.

### Input / Output

| | File | Location |
|---|---|---|
| **Input** | `NotationFragment[NNN]-[Instrument].svg` | `lilypond_code/` (from Step 3) |
| **Output** | Same file, overwritten in-place | `lilypond_code/` |

Console output shows the cropped dimensions:
```
Cropped: NotationFragment001-Cello.svg → 18.42x12.31mm (viewBox: 1.23,3.45 10.48x7.00)
```

### Tools

| Tool | Location | Notes |
|---|---|---|
| `crop_svg.js` | `lilypond_code/crop_svg.js` | Standalone CLI cropper — extracted from `server.js` |
| `cropSvgToContent()` | `server.js` | Same logic, server-side (used by render pipelines) |

### Notes

- **In-place modification:** The SVG is overwritten. If you need the uncropped version, copy it first.
- **Same script** used by `render_bartok_pizz.js` and `render_pizz_tremolo.js` — identical cropping logic.
- Handles LilyPond's SVG structure: `<g transform="translate(tx,ty)">` groups containing `<line>`, `<rect>`, `<path>`, and `<text>` elements, including nested paths (e.g., dynamics like `fff`).
- For notation fragments, the cropped SVG may need additional adjustments before score integration (Step 6) — e.g., if the fragment includes elements that extend beyond the staff.

### Deliverable

✅ Cropped SVG in `lilypond_code/`, dimensions tightly fit to notation content.

---

## Step 6: Score Integration

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

## Step 7: MIDI Generation (if needed)

**Status:** Pending

Generate MIDI corresponding to the notation fragment. This step is optional — some fragments are purely graphic.

*Details TBD — depends on the notation content and whether programmatic MIDI generation is needed.*

### Deliverable

✅ MIDI file (if applicable) inserted into MidiSnippetDatabase.

---

## Step 8: Pipeline Automation

**Status:** Pending

Automate the full workflow: LilyPond render → SVG crop → score insertion (→ optional MIDI).

*Details TBD — may follow the render_pizz_tremolo.js / render_bartok_pizz.js pattern.*

### Deliverable

✅ Single command or UI button executes the full pipeline.

---

## Step 9: AI Prompt Guide

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
