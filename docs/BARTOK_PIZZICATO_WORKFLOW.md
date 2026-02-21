# Bartók Pizzicato Workflow

*Created: Feb 20, 2026*

End-to-end process for generating Bartók Pizzicato notation SVGs and MIDI files.

---

## Step 1: Gather Inputs

| Parameter | Required | Description | Example Values |
|-----------|----------|-------------|----------------|
| **Pitch** | Yes | Concert pitch in LilyPond English notation | `g''` (G5), `ftqs'''` (F¾#6), `eqf` (E¼♭3), `b'` (B4) |
| **Dynamic** | Yes | LilyPond dynamic marking | `\fff`, `\ff`, `\f`, `\mf`, `\mp`, `\p`, `\pp`, `\ppp` |
| **Clef** | Yes | Staff clef for pitch placement | `treble`, `alto`, `bass` |
| **Track** | Yes | Score track number (1–4) | `1`, `2`, `3`, `4` |

Track determines the MIDI channel (1:1 mapping: track 1 → MIDI ch 1, track 2 → MIDI ch 2, etc.).

See Registry §28 (Microtonal Pitch Syntax) for full suffix reference.

---

## Step 2: Generate LilyPond File

**Template:** `lilypond_code/BartokPizz-Violin-G5.ly`

**What to change per instance:**
1. `\clef` — set to the input clef (treble/alto/bass)
2. Pitch + duration + articulation + dynamic on the notation line (e.g., `ftqs'''16\snappizzicato\fff`)
3. Paper dimensions — adjust based on ledger lines (see table below)

**Paper dimension guide:**

| Pitch Range | paper-width | paper-height |
|-------------|-------------|-------------|
| On staff (no ledger lines) | 9\mm | 23\mm |
| 1–2 ledger lines, no microtonal | 9\mm | 25\mm |
| 1–2 ledger lines + microtonal accidental | 11\mm | 25\mm |
| 3 ledger lines + microtonal accidental | 11\mm | 30\mm |

**Fixed settings (from Registry §29):**

| Setting | Value |
|---------|-------|
| NoteHead.font-size | #-2 |
| DynamicText.font-size | #-6 |
| Stem.details.beamed-lengths | #'(5.5) |
| Stem.details.lengths | #'(6.5) |
| Accidental.font-size | -4 |
| Staff line width | 1.2 mm |
| NoteColumn.X-offset | #-0.8 |
| proportionalNotationDuration | 1/28 |
| line-width | 37\mm |

---

## Step 3: Save LilyPond File

**Location:** `lilypond_code/`

**Naming convention:** `BartokPizz-[clef]-[PitchName]-[dynamic].ly`

PitchName uses uppercase display format: letter + accidental suffix + octave number. Dynamic is lowercase without backslash.

| LilyPond pitch | Dynamic | Filename |
|----------------|---------|----------|
| `g''` | `\fff` | `BartokPizz-treble-G5-fff.ly` |
| `ftqs'''` | `\fff` | `BartokPizz-treble-FTQS6-fff.ly` |
| `eqf` | `\ff` | `BartokPizz-treble-EQF3-ff.ly` |
| `b'` | `\fff` | `BartokPizz-treble-B4-fff.ly` |
| `cs''` | `\f` | `BartokPizz-alto-CS5-f.ly` |

**Accidental suffix mapping (LilyPond → display):**

| LilyPond | Display | Meaning |
|----------|---------|---------|
| `s` | S | Sharp |
| `f` | F | Flat |
| `ss` | SS | Double sharp |
| `ff` | FF | Double flat |
| `qs` | QS | Quarter sharp |
| `qf` | QF | Quarter flat |
| `tqs` | TQS | Three-quarter sharp |
| `tqf` | TQF | Three-quarter flat |

---

## Step 4: Render (LilyPond → SVG + MIDI)

**Command:**
```powershell
lilypond --svg -dbackend=svg -o "lilypond_code\BartokPizz-treble-B4-fff" "lilypond_code\BartokPizz-treble-B4-fff.ly"
```

**Outputs (in `lilypond_code/`):**
- `BartokPizz-treble-B4-fff.svg` — uncropped SVG
- `BartokPizz-treble-B4-fff.mid` — raw MIDI file (before modification)

**Note:** LilyPond produces both SVG and MIDI in one pass because the template includes `\midi{}`.

---

## Step 5: Crop SVG

**Standalone script:** `lilypond_code/crop_svg.js`

```powershell
node crop_svg.js BartokPizz-treble-B4-fff.svg BartokPizz-treble-Ftqs6-fff.svg
```

Accepts one or more SVG files. Crops in-place by parsing LilyPond SVG structure (`<line>`, `<rect>`, `<path>`, `<text>` elements), computing content bounding box, adding 0.5-unit padding, and rewriting the viewBox and dimensions.

Same logic as `server.js` `cropSvgToContent()` (line ~1200), extracted for standalone use.

---

## Step 6: Move to Output Directory

**Output directory:** `public/SVG_graphics/bartok_pizzicato/`

Both cropped SVGs and modified MIDI files live together in one flat directory. Clef and dynamic are encoded in the filename.

**Naming in output:** `BartokPizz-[clef]-[PitchName]-[dynamic].svg` / `.mid`

Examples:
- `BartokPizz-treble-B4-fff.svg` + `BartokPizz-treble-B4-fff.mid`
- `BartokPizz-alto-CS5-f.svg` + `BartokPizz-alto-CS5-f.mid`
- `BartokPizz-bass-FTQS3-ff.svg` + `BartokPizz-bass-FTQS3-ff.mid`

**Each clef is generated fresh from LilyPond** — no copying/transposing treble SVGs to other clefs. Each clef gets its own `.ly` file with the correct `\clef` setting, rendered independently.

---

## Step 7: Modify MIDI

**Script:** `lilypond_code/modify_midi.js` *(general-purpose MIDI post-processor, reusable across workflows)*

```powershell
node modify_midi.js BartokPizz-treble-B4-fff.mid "..\public\SVG_graphics\bartok_pizzicato\BartokPizz-treble-B4-fff.mid" 0 --cc 0 97
```

**Arguments:** `<input.mid> <output.mid> <channel> [--cc <num> <val>] ...`

- `channel` is 0-indexed: track 1 → 0, track 2 → 1, track 3 → 2, track 4 → 3
- `--cc` is repeatable — add as many CC messages at tick 0 as needed
- Without `--cc`, the script only rewrites channel (no CC insertion)

**For Bartók Pizzicato, the specific arguments are:**
- `--cc 0 97` — CC0 = 97 identifies this as a Bartók pizzicato event

**What the script does:**
1. Inserts all specified **CC messages** at tick 0 on the target channel
2. Rewrites all Note On/Off and CC events to the specified **MIDI channel**
3. Preserves the meta/tempo track unchanged
4. Saves the modified MIDI to the output path

**MIDI channel mapping (1:1 with score tracks):**

| Score Track | MIDI Channel (0-indexed) | MIDI Channel (display) |
|-------------|--------------------------|------------------------|
| Track 1 | 0 | Ch 1 |
| Track 2 | 1 | Ch 2 |
| Track 3 | 2 | Ch 3 |
| Track 4 | 3 | Ch 4 |

**Note:** This shares channels 1–4 with the glissando system. This is acceptable because Bartók pizzicato events are discrete (single 16th notes), not sustained.

**LilyPond raw MIDI characteristics (before modification):**
- Format 1, 2 tracks, 384 ticks/quarter
- Tempo: 60 BPM (1,000,000 µs/beat)
- Note duration: 96 ticks (16th note)
- Velocity: determined by dynamic marking (e.g., fff → 107)
- Channel: 0 (default from LilyPond)

---

## Step 8: Score Integration (Future)

Insert notation SVG + MIDI at a specified time and timeline position in the score application.

*Details TBD — will follow existing glissando/vibrato automation patterns in server.js.*

---

## Pipeline Automation

**Script:** `lilypond_code/render_bartok_pizz.js`

Automates Steps 2–7 in one command. Generates .ly, renders, crops SVG, modifies MIDI, and saves outputs.

**Single:**
```powershell
node render_bartok_pizz.js --pitch "b'" --dynamic fff --clef treble --track 1
```

**Batch** (from a JSON file):
```powershell
node render_bartok_pizz.js --batch inputs.json
```

**Batch JSON format:**
```json
[
  { "pitch": "b'", "dynamic": "fff", "clef": "treble", "track": 1 },
  { "pitch": "ftqs'''", "dynamic": "fff", "clef": "treble", "track": 2 },
  { "pitch": "eqf", "dynamic": "ff", "clef": "alto", "track": 3 }
]
```

The pipeline auto-determines paper dimensions from pitch/clef (ledger line count + microtonal accidental detection).

**Slash command:** Type `/bartok-pizz` in Cascade to recall this workflow.

---

## Current Status

| Step | Status | Notes |
|------|--------|-------|
| 1. Gather inputs | ✅ Done | Defined: pitch, dynamic, clef, track |
| 2. Generate .ly | ✅ Done | Template established, 3 test files created |
| 3. Save .ly | ✅ Done | Naming: `BartokPizz-[clef]-[Pitch]-[dynamic].ly` |
| 4. Render | ✅ Done | LilyPond CLI, produces SVG + MIDI |
| 5. Crop SVG | ✅ Done | `crop_svg.js` standalone script |
| 6. Move to output | ✅ Done | SVG + MIDI together in `bartok_pizzicato/` |
| 7. Modify MIDI | ✅ Done | `modify_midi.js` — CC0=97, channel assignment |
| Pipeline | ✅ Done | `render_bartok_pizz.js` — single + batch mode |
| 8. Score integration | ⬜ Future | |
