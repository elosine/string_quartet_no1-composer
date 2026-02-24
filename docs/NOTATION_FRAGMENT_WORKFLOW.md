# Notation Fragment Workflow

*Created: Feb 21, 2026*

End-to-end process for creating notation fragment SVGs for score insertion.

---

## Overview

Notation Fragments are small, self-contained pieces of musical notation created in LilyPond. The system uses custom scripts to produce a relatively accurate representation in a MIDI file, customized and adapted to specific software instruments.

### Gravitational Conductor System

Gravitational Conductors (GCs) are an ictus-based conduction system — essentially an animated bouncing ball that impacts at a particular point in time. Like a real-life conductor, or like an object thrown into the air and acted upon by gravity, the GC provides not just the ictus (the impact point) but also the *feel* of the motion leading into and away from impact.

The core principle is that the kinetic information in the curve — the descent into impact and the ascent from impact — can inform how material is performed. Playing something just before impact has a certain feel to its accent and approach. Playing something just after impact is shaped by the release energy of the curve. The entire spectrum of the GC's curve — from the top of the arc, through descent, at impact, through the rebound — can influence the way anything is played.

The GC graphic object itself has a curve that descends into the impact point and ascends from the impact point. This curve can be used to inform performance interpretation across its full duration.

### Fragments and Gravitational Conductors

Notation fragments are used in conjunction with the Gravitational Conductor system. An assortment of notated fragments is available as a menu of material that can be played in coordination with GCs. The performer interprets the fragment relative to the GC's curve and impact point.

There is a variety of ways to align a fragment with a GC, including:

- **Begin at the top of the curve** — let the gravity of the descending curve influence how the fragment unfolds into impact
- **Begin along the descending curve** — start the fragment at some point during the descent, letting the accelerating gravitational pull shape the approach toward impact
- **End on impact** — the fragment is played leading into the ictus, ending at the impact point; the weight of the descending curve drives the performance toward the downbeat
- **Begin just before impact** — the fragment starts moments before the ictus, charged by the final gravitational acceleration into impact
- **Begin on impact** — the fragment starts at the ictus (the most conventional mode)
- **Begin just after impact** — the fragment starts moments after the ictus, propelled by the immediate release energy of the bounce
- **Begin after impact** — start the fragment somewhere during the ascending curve, letting the rebound energy shape the performance
- **Begin at the end of the curve** — the fragment starts at the tail of the ascending arc, where the upward momentum dissipates and weightlessness takes over

The GC curve provides a continuous spectrum of interpretive possibilities — any point along the curve can serve as a starting or ending reference for the fragment.

### Development Notes (working sketch)

#### Performance Model: Performer Decides

The performer decides how to interpret the GC and the notational fragment. The score does not prescribe a specific alignment — instead, a **bright orange GC** signals to the performer: "learn this fragment, then in performance, decide when and where to play it relative to this GC." Performance notes in the score will describe the meaning of orange GCs and how to approach them.

**GC reference model:** `GC_20260116_151414` (save score 284). Orange GCs use **bright orange** color.

This means the composer does not need to make explicit choices about tempo or onset/offset for each fragment. The system makes those choices algorithmically for MIDI playback simulation.

#### MIDI Placement Logic

Each GC provides three key times: **curveStart** (top of arc), **impact** (ictus), and **curveEnd** (end of ascending arc). The system selects an alignment and derives the MIDI onset:

| Alignment | MIDI Onset Time |
|---|---|
| Begin at top of curve | `curveStart` |
| Begin along descending curve | Random between `curveStart` and `impact` |
| End on impact | `impact - fragmentDuration` |
| Just before impact | `impact - smallOffset` (e.g., 0.1–0.5s) |
| On impact | `impact` |
| Just after impact | `impact + smallOffset` |
| Along ascending curve | Random between `impact` and `curveEnd` |
| At end of curve | `curveEnd` |

#### Tempo Logic

Tempo is the primary lever for simulating the gravitational feel of each curve position. The system derives tempo from the GC curve data rather than the composer specifying it explicitly.

| Curve Position | Gravitational Feel | Tempo Tendency |
|---|---|---|
| Pre-impact (top, descending, end-on, just-before) | Gravity accelerating, energy building | Faster |
| On impact | Decisive, direct | Moderate-fast |
| Post-impact (just-after, ascending) | Rebound energy, dissipating | Moderate |
| End of curve | Weightless, suspended | Slower |

**Sliding tempo scale (per-fragment max, percentage reductions outward):**

Each notation fragment has its own **max tempo** (set by the composer). The Core tier uses the max tempo; outer tiers reduce by a fixed percentage derived from the original 110 BPM reference (where 10 BPM steps = 9.1% per tier).

| Tier | BPM Formula | % of Max | Alignments |
|---|---|---|---|
| Core | `maxTempo` | 100% | On impact, End on impact |
| Mid | `round(maxTempo × 0.909)` | 90.9% | Just before impact, Just after impact |
| Mid-Outer | `round(maxTempo × 0.818)` | 81.8% | Along descending curve, Along ascending curve |
| Outer | `round(maxTempo × 0.727)` | 72.7% | Begin at top of curve, At end of curve |

**Examples:**

| Fragment | Max Tempo | Core (100%) | Mid (90.9%) | Mid-Outer (81.8%) | Outer (72.7%) |
|---|---|---|---|---|---|
| NF001 (maxTempo=110) | 110 | 110 | 100 | 90 | 80 |
| NF003 (maxTempo=90) | 90 | 90 | 82 | 74 | 65 |
| NF004 (maxTempo=130) | 130 | 130 | 118 | 106 | 95 |

Pattern: percentage-based reductions moving outward from impact. Max tempo is a per-fragment composer input (see Step 1). Rounding to nearest integer BPM.

> **✅ RESOLVED — Tempo implementation:**
> `rewrite_tempo.js` uses **delta-time compression** — it scales every delta time in every track (`Math.round(delta * scaleFactor)`) AND updates the Set Tempo meta-event. Notes physically move in time, so playback works correctly in any DAW regardless of project tempo. All 32 tempo variants (8 fragments × 4 tiers) generated Feb 23, 2026.
>
> Naming convention: `NotationFragment[NNN]-[Instrument]-[BPM]bpm.mid`
> Output directory: `public/midi_files/notation_fragments/`

#### Alignment Selection: Weighted Random

The system uses **weighted random selection** to choose which of the 8 alignment possibilities to simulate for MIDI playback. Default weights can be set globally, and overridden per-fragment when the composer wants to nudge the behavior (e.g., weight a rhythmically punchy fragment toward impact-adjacent alignments, or a lyrical fragment toward curve positions).

**Default weights:**

| Alignment | Weight | Tier | Tier total |
|---|---|---|---|
| On impact | 30% | Core | 60% |
| End on impact | 30% | Core | |
| Just before impact | 12.5% | Mid | 25% |
| Just after impact | 12.5% | Mid | |
| Begin along descending curve | 3.75% | Outer | 15% |
| Along ascending curve | 3.75% | Outer | |
| Begin at top of curve | 3.75% | Outer | |
| At end of curve | 3.75% | Outer | |

Weights are overridable per-fragment. For example, a rhythmically punchy fragment could shift weight toward Core; a lyrical fragment could shift toward Outer.

#### Implementation Plan

**Key insight:** Unlike the pizzicato tremolo or glissando systems where parameters vary freely at composition time, notation fragments have a small, fixed menu of pre-composed material. This means we can **pre-generate everything** — SVGs, enhanced MIDIs, and tempo variants — and store them in a database. At composition time, the composer just selects and inserts from the database.

**What exists:**

1. ✅ Notation fragment `.ly` files with MIDI tagging (Steps 2–4)
2. ✅ SVG rendering + cropping pipeline (Steps 3, 5)
3. ✅ MIDI post-processing with CC injection (Step 4)
4. ✅ GC system exists in the score (bouncing ball animation with curve data)
5. ✅ `rewrite_tempo.js` — rewrites Set Tempo meta-event in MIDI files to any BPM

**What is pre-generated (one-time, per fragment):**

- **SVG** — cropped notation graphic (static, doesn't vary)
- **Enhanced MIDI** — CC-injected MIDI with correct articulation/velocity data (static)
- **Tempo variants** — pre-generated MIDI files at each alignment tempo (limited set, pre-generated)

**Expandability:** The collection of fragments will grow. A clear pipeline must exist for adding a new fragment: compose .ly → render → crop SVG → tag MIDI → inject CCs → generate tempo variants → register in database.

**Composition workflow (target):**

1. Composer opens UI, selects a fragment from a menu (sees SVG preview)
2. Composer sets start time
3. Composer either hits **Go** (algorithmic choice) or explicitly selects an alignment
4. System chooses alignment (weighted random) or uses the explicit choice
5. System grabs the appropriate pre-generated MIDI snippet for that alignment's tempo
6. System computes MIDI onset time from the GC curve geometry + alignment
7. System places SVG notation + orange GC + MIDI snippet on the timeline

**Steps / decisions to make:**

| # | Item | Type | Status |
|---|------|------|--------|
| 1 | Decide tempo per alignment — listen to tempo variants in DAW, determine BPM ranges | Decision | ✅ Resolved — 110/100/90/80 BPM tiers |
| 2 | Develop the weighted random alignment selector algorithm | Build | Pending |
| 3 | Define default alignment weights | Decision | ✅ Resolved — 60/25/15% tiers |
| 4 | Build the fragment object database (JSON registry of fragments with SVG/MIDI paths, instrument, duration, alignment weights) | Build | ✅ Done — `notation_fragment_db.json` |
| 5 | Build clear pipeline/workflow for adding new fragments and incorporating into the system | Document | ✅ Done — "Adding a New Fragment" runsheet below |
| 6 | Build MIDI onset time calculator (alignment + GC curve → onset time) | Build | Pending |
| 7 | Build score integration (SVG placement, MIDI snippet loading, orange GC creation) | Build | Pending |
| 8 | Build bright orange GC visual indicator (ref: `GC_20260116_151414`, save score 284) | Build | Pending |
| 9 | Build fragment selection UI (menu, SVG preview, start time, Go button, explicit alignment override) | Build | Pending |
| 10 | Write performance notes for the score (meaning of orange GCs, how performers should approach fragments) | Document | Pending |


### Conventions

**Naming convention:** `NotationFragment[NNN]-[Instrument].ly`

**Settings source of truth:** `docs/LILYPOND_SETTINGS_REGISTRY.md`

**Working MO:** AI writes/edits the `.ly` code; the user renders in **Frescobaldi**. Do NOT run `lilypond` compilation commands — just produce the code.

---

## Step 1: Gather Inputs

**Status:** Active

These are the inputs required at **composition time** when inserting a fragment into the score.

| # | Parameter | Required | Source | Options / Default | Notes |
|---|-----------|----------|--------|-------------------|-------|
| 1 | **Fragment ID** | Yes | UI menu | e.g. `NF001`, `NF002` | Menu is organized by instrument section (Violin, Viola, Cello); composer selects with SVG preview |
| 2 | **Instrument** | Auto | Fragment ID | Derived from fragment filename | e.g. `NotationFragment002-Viola.ly` → Viola. No separate instrument choice needed |
| 3 | **Violin part** | If instrument = Violin | Composer | `Violin 1` or `Violin 2` | Only prompted when a Violin fragment is selected; Viola/Cello skip this step |
| 4 | **Start time** | Yes | Composer | Timeline position (seconds or beats) | Where the fragment begins on the score timeline |
| 5 | **Alignment mode** | Yes | Composer | `algorithmic` (default) or explicit choice | `algorithmic` = weighted random; explicit = composer picks one of the 8 alignments |
| 6 | **Explicit alignment** | If mode = explicit | Composer | One of 8 alignment choices | Only used when alignment mode is explicit |
| 7 | **Weight overrides** | No | Composer | Per-alignment weight adjustments | **Strictly optional** — sensible defaults are built in. The composer should never feel obligated to provide weights; the system works well without them. Only use when intentionally biasing a specific fragment toward certain alignments. |

**Instrument → Track / Channel mapping (0-indexed):**

| Instrument | Track | MIDI Channel |
|---|---|---|
| Violin 1 | 0 | Ch 0 |
| Violin 2 | 1 | Ch 1 |
| Viola | 2 | Ch 2 |
| Cello | 3 | Ch 3 |

**Resolved by system at insertion time (not composer inputs):**

| Derived value | Source | Notes |
|---------------|--------|-------|
| **Track** | Instrument (+ violin part choice if applicable) | 0-indexed; see mapping table above |
| **MIDI channel** | Track | Same as track number for notation fragments. **Future:** may need channel offsets if fragments use CC7 volume ramps or channel pressure (see MIDI State Reset Problem in `MIDI_MUSIC_GENERATION.md` §13). |
| **Selected alignment** | Weighted random or explicit choice | Determines tempo + onset |
| **Tempo (BPM)** | Alignment → tempo lookup (110/100/90/80) | Pre-generated MIDI variant selected |
| **MIDI file path** | Fragment DB + selected tempo | Points to pre-generated tempo variant |
| **SVG file path** | Fragment DB | Static, one per fragment |
| **Orange GC** | Start time + GC reference model (`GC_20260116_151414`) | System creates a bright orange GC at the start time using the reference model parameters |
| **GC curve times** | Orange GC | curveStart, impact, curveEnd derived from the generated GC |
| **MIDI onset time** | GC curve times + alignment | Computed from curveStart, impact, curveEnd |
| **SVG placement position** | Start time + layout rules | Where the notation graphic goes on the visual timeline |

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
5. ✅ **MODE PERSISTENCE:** Base mode (pizz/arco) persists until explicitly changed. Do NOT infer mode changes from expression markings (e.g., "m.v." does not imply arco). Only explicit "arco" or "pizz." text resets the base mode.
6. ✅ One-shot CC0 pattern: `\midiPizzOpen` → note → `\midiPizz` (revert)
7. ✅ Multi-state modifier pattern: `\midiMoltoVibPizz` → note → `\midiPizz` (revert to base mode)
8. ✅ Glissando pitch bend pattern (Mode 1, ≤1 semitone): `\midiGlissUp` → gliss notes → `\midiGlissReset` before destination
9. ✅ One-shot velocity pattern: `\midiSfz` → note → `\midiVelReset`
10. ✅ Walk through the music — every note should have an active `midiCCZero` value

### Quick Lookup Table

| You see this in the score | Add this in the `.ly` file | Behavior |
|---|---|---|
| `"pizz."` text markup | `\midiPizz` | Persistent |
| `"o"` markup (open string, **pizz** context) | `\midiPizzOpen` → note → `\midiPizz` | One-shot, manual revert |
| `"o"` markup (open string, **arco** context) | `\midiArcoOpen` → note → `\midiArco` | One-shot, manual revert |
| `\snappizzicato` | `\midiBartokPizz` → note → revert to base mode | One-shot (consecutive Bartók pizz: no revert needed) |
| `"m.v."` markup (molto vibrato, **pizz** context) | `\midiMoltoVibPizz` → note → `\midiPizz` | One-shot, manual revert |
| `"m.v."` markup (molto vibrato, **arco** context) | `\midiMoltoVibArco` → note → `\midiArco` | One-shot, manual revert |
| Return to arco / sustained | `\midiArco` | Persistent |
| `\glissando` (up ≤1 semitone) | `\midiGlissUp` → gliss notes → `\midiGlissReset` | Persistent, unset before destination |
| `\glissando` (down ≤1 semitone) | `\midiGlissDown` → gliss notes → `\midiGlissReset` | Persistent, unset before destination |
| `\sfz` dynamic | `\midiSfz` → note → `\midiVelReset` | One-shot, manual revert |

### Context Properties

| Property | Type | Persistence | Purpose |
|---|---|---|---|
| `Voice.midiCCZero` | integer (0–127) | Persistent until next `\set` | CC0 articulation mode |
| `Voice.midiVelocity` | integer (0–127) | One-shot — must `\unset` after note | Velocity override |
| `Voice.midiGliss` | number (semitones) | Persistent until `\unset` | Pitch bend glissando (+1=up, -1=down, fractional OK) |

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

## Adding a New Fragment — Runsheet

Every time a new notation fragment is created and needs to enter the system, follow this checklist **in order**. Items marked ⏳ are pending future implementation.

### Phase 1: Compose (User + AI)

- [ ] **1. Read `LILYPOND_SETTINGS_REGISTRY.md`** before creating or editing any `.ly` file. Check CURRENT DEFAULT values — do NOT copy settings from previous fragment files (they may have stale values).
- [ ] **2. Create `.ly` file** in `lilypond_code/` following naming convention: `NotationFragment[NNN]-[Instrument].ly`
  - Next available number: check existing files and increment
  - Use `StartingTemplate.ly` + registry as source of truth (NOT `MasterTemplate.ly`)
- [ ] **3. Add MIDI tagging** — follow the Tagging Checklist in Step 2 above:
  - `\include "midi-tags.ily"` and `\include "midi-logger.ily"`
  - `\consists \midiLogEngraver` in `\layout` Voice context
  - `\midi {}` block in `\score`
  - `\midiXxx` tags before every technique change (see Quick Lookup Table)
- [ ] **4. Compose notation** in Frescobaldi, iterate until satisfied
- [ ] **5. Decide on a base tempo** — while the material is fresh, listen and determine an appropriate `maxTempo` (BPM) for the fragment. Record it for Phase 4 step 16.
- [ ] **6. Paste final version** back into the main `.ly` file in the IDE

### Phase 2: Pipeline (AI / CLI)

All commands run from `lilypond_code/`.

- [ ] **7. Compile LilyPond** → SVG + MIDI + event log
  ```powershell
  lilypond --svg -dbackend=svg -o "NotationFragment[NNN]-[Instrument]" "NotationFragment[NNN]-[Instrument].ly"
  ```
  - **Dual-score files** (fragments with hidden MIDI voice using `\tag`): LilyPond outputs numbered SVGs (`-1.svg`, `-2.svg`). Copy the Score 1 SVG (layout) to the standard name:
    ```powershell
    Copy-Item "NotationFragment[NNN]-[Instrument]-1.svg" "NotationFragment[NNN]-[Instrument].svg" -Force
    ```

- [ ] **8. Verify event log** — Level 1 check: open `-midi-log.json`, confirm `midiCCZero` and `midiVelocity` values match the `\midiXxx` tags in the source

- [ ] **9. Generate CC map** (`state_tracker.js`)
  ```powershell
  node state_tracker.js NotationFragment[NNN]-[Instrument]-midi-log.json --out fragment[NNN]_cc.json
  ```

- [ ] **10. Inject CCs** (`modify_midi.js`) → `-Mod.mid`
  ```powershell
  node modify_midi.js NotationFragment[NNN]-[Instrument].mid NotationFragment[NNN]-[Instrument]-Mod.mid [channel] --map fragment[NNN]_cc.json
  ```
  Channel: **0**=Violin 1, **1**=Violin 2, **2**=Viola, **3**=Cello

- [ ] **11. Verify MIDI** — Level 2 (CC map) + Level 3 (modify_midi console output). See `MIDI_MUSIC_GENERATION.md` §17.

- [ ] **12. Crop SVG**
  ```powershell
  node crop_svg.js NotationFragment[NNN]-[Instrument].svg
  ```
  SVG is modified **in-place**.

### Phase 3: Deploy (AI / CLI)

- [ ] **13. Copy cropped SVG** to output directory:
  ```powershell
  Copy-Item "NotationFragment[NNN]-[Instrument].svg" "..\public\SVG_graphics\notation_fragments\" -Force
  ```

- [ ] **14. Copy -Mod.mid** to output directory:
  ```powershell
  Copy-Item "NotationFragment[NNN]-[Instrument]-Mod.mid" "..\public\midi_files\notation_fragments\" -Force
  ```

- [ ] **15. Register in `notation_fragment_db.json`** — add a new entry to the `fragments` array:
  ```json
  {
    "id": "NF[NNN]",
    "name": "NotationFragment[NNN]-[Instrument]",
    "instrument": "[Cello|Viola|Violin]",
    "clef": "[bass|alto|treble]",
    "timeSignature": "[4/4|2/4|...]",
    "noteEvents": [count from state_tracker output],
    "midiChannel": [0|1|2|3],
    "svgFile": "NotationFragment[NNN]-[Instrument].svg",
    "midiFile": "NotationFragment[NNN]-[Instrument]-Mod.mid",
    "maxTempo": null,
    "techniques": ["pizz", "bartokPizz", ...],
    "description": "[brief musical content description]",
    "alignmentWeights": null
  }
  ```
  **Database location:** `public/midi_files/notation_fragment_db.json`

### Phase 4: Tempo & Integration (User Decision + Future Build)

- [ ] **16. Decide base tempo** — user listens to `-Mod.mid` in DAW, determines appropriate `maxTempo` (BPM). Update the `maxTempo` field in `notation_fragment_db.json`.
- [ ] **17. Generate tempo variants** — use `rewrite_tempo.js` to create MIDI at each tier. Run from `lilypond_code/`:
  ```powershell
  # For each tier, calculate BPM = round(maxTempo × multiplier)
  # Core (×1.0), Mid (×0.909), Mid-Outer (×0.818), Outer (×0.727)
  node rewrite_tempo.js NotationFragment[NNN]-[Instrument]-Mod.mid ..\public\midi_files\notation_fragments\NotationFragment[NNN]-[Instrument]-[BPM]bpm.mid [BPM]
  ```
  This does **true delta-time compression** — physically scales all note durations and gaps, not just a tempo header change. Add `tempoVariants` object to the fragment's entry in `notation_fragment_db.json`.
- [ ] ⏳ **18. Test in score** — insert fragment via UI, verify SVG display + MIDI playback + GC alignment. *Pending UI implementation.*

### Output Directory Reference

| Asset | Directory | Naming |
|-------|-----------|--------|
| Source `.ly` files | `lilypond_code/` | `NotationFragment[NNN]-[Instrument].ly` |
| Pipeline intermediates | `lilypond_code/` | `.mid`, `-midi-log.json`, `fragment[NNN]_cc.json` |
| **Cropped SVGs (final)** | `public/SVG_graphics/notation_fragments/` | `NotationFragment[NNN]-[Instrument].svg` |
| **Enhanced MIDI (final)** | `public/midi_files/notation_fragments/` | `NotationFragment[NNN]-[Instrument]-Mod.mid` |
| Fragment database | `public/midi_files/` | `notation_fragment_db.json` |
| **Tempo variants** | `public/midi_files/notation_fragments/` | `NotationFragment[NNN]-[Instrument]-[BPM]bpm.mid` |

### Quick Reference: Instrument → Channel

| Instrument | Channel | Track |
|------------|---------|-------|
| Violin (1 or 2) | 0 or 1 | 0 or 1 |
| Viola | 2 | 2 |
| Cello | 3 | 3 |

Violin fragments default to channel 0; user chooses Violin 1 vs 2 at insertion time.

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
