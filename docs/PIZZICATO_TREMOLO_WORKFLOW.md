# Pizzicato Tremolo Workflow

*Created: Feb 21, 2026*

End-to-end process for generating Z-stem Pizzicato Tremolo notation SVGs and MIDI files.

---

## Step 1: Gather Inputs

| Parameter | Required | Description | Example Values |
|-----------|----------|-------------|----------------|
| **Pitch** | Yes | Concert pitch in LilyPond English notation | `b'` (B4), `ftqs'''` (F¾#6), `eqf` (E¼♭3) |
| **General Dynamic** | Yes | Dynamic marking shown in notation + peak MIDI velocity | `fff`, `ff`, `f`, `mf`, `mp`, `p`, `pp`, `ppp` |
| **Clef** | Yes | Staff clef for LilyPond pitch placement | `treble`, `alto`, `bass` |
| **Track** | Yes | Score track number (1–4) | `1`, `2`, `3`, `4` |
| **Dynamic Shape** | Yes | Determines which template and velocity envelope | `cres`, `decres`, `hp` |
| **Start Time** | Yes | Score time in seconds | `12.5` |
| **Duration** | Yes | Tremolo duration in seconds | `2.0`, `3.5` |
| **Alignment** | Yes | Whether the motive is placed before or after the start time | `pre`, `post` |

Track determines the MIDI channel: track 1 → MIDI ch 8, track 2 → ch 9, track 3 → ch 10, track 4 → ch 11. Formula: `midiChannel = trackIndex + 8`.

See Registry §28 (Microtonal Pitch Syntax) for full suffix reference.

### Which inputs affect which outputs

| Input | Affects Notation | Affects MIDI |
|-------|-----------------|-------------|
| **Pitch** | ✅ Note on staff | ✅ MIDI note number |
| **General Dynamic** | ✅ Dynamic marking (e.g. fff) | ✅ Peak velocity |
| **Clef** | ✅ Clef in LilyPond | — |
| **Dynamic Shape** | ✅ Hairpin shape in notation | ✅ Velocity envelope |
| **Track** | — | ✅ MIDI channel |
| **Start Time** | — | ✅ Event placement |
| **Duration** | — | ✅ How many notes sampled |
| **Alignment** | — | ✅ Pre/post offset |

### Parameter Details

**Dynamic Shape** controls which template is used for notation and how velocity is shaped across the tremolo MIDI:
- `cres` — crescendo hairpin; velocity ramps from soft to the general dynamic level
- `decres` — decrescendo hairpin; velocity ramps from the general dynamic level to soft
- `hp` — wedge hairpin (crescendo → decrescendo); velocity ramps up to the general dynamic level then back down

**Alignment** controls temporal placement relative to start time:
- `pre` — the tremolo *ends* at start time (motive leads into a downbeat or event)
- `post` — the tremolo *begins* at start time (motive follows a downbeat or event)

| Alignment | Start Time = 10.0s | Duration = 2.0s | MIDI Range |
|-----------|--------------------|-----------------|------------|
| `pre` | Motive ends at 10.0s | 2.0s before | 8.0s → 10.0s |
| `post` | Motive starts at 10.0s | 2.0s after | 10.0s → 12.0s |

---

## Step 2: Generate LilyPond File

**Three templates** — one per dynamic shape. The Dynamic Shape input determines which template to use:

| Dynamic Shape | Template File |
|---------------|---------------|
| `cres` | `PizzTrem-treble-CTQS4-fff-cres.ly` |
| `decres` | `PizzTrem-treble-CTQS4-fff-decres.ly` |
| `hp` | `PizzTrem-treble-CTQS4-fff-hp.ly` |

**What to change per instance:**
1. `\clef` — set to the input clef (treble/alto/bass)
2. Pitch on the notation line (e.g., `ctqs'4` → `b'4`)
3. Dynamic marking (e.g., `\fff` → `\pp`)
4. Paper dimensions — adjust based on ledger lines and dynamic shape (see tables below)

**Paper dimension guide (cres / decres):**

| Pitch Range | paper-width | paper-height |
|-------------|-------------|-------------|
| On staff (no ledger lines) | 20\mm | 50\mm |
| 1–2 ledger lines + microtonal | 20\mm | 50\mm |
| 3+ ledger lines + microtonal | 22\mm | 50\mm |

**Paper dimension guide (hp — wedge):**

| Pitch Range | paper-width | paper-height |
|-------------|-------------|-------------|
| On staff (no ledger lines) | 27\mm | 50\mm |
| 1–2 ledger lines + microtonal | 27\mm | 50\mm |
| 3+ ledger lines + microtonal | 29\mm | 50\mm |

**Fixed settings (from Registry §30, updated):**

| Setting | Value | Notes |
|---------|-------|-------|
| NoteHead.font-size | #-3.3 | Current default |
| DynamicText.font-size | #-8.5 | Current default |
| Stem.details.beamed-lengths | #'(5.5) | Technique-specific |
| Stem.details.lengths | #'(6.2) | Pizz tremolo specific |
| Accidental.font-size | #-4 | Technique-specific |
| Staff line width | 1.2 mm | Narrow for notation snippet |
| Staff line factor | 3.1 | Width-staff-spaces conversion |
| Stem.stencil | #stem-with-z | Z overlay |
| z-y-offset | 0.85 | Z position on stem (pizz trem) |
| Hairpin.height | #0.4 | Small hairpin for snippet |
| DynamicLineSpanner.staff-padding | #1.2 | Consistent dynamic placement |
| Z-stem variables | See Registry §30 | |

**"pizz." text marking** — Crimson Pro Light Italic, fontsize #-6, positioned above note via `^\markup`.

**Hairpin tweaks (cres/decres — single hairpin):**

| Tweak | Value |
|-------|-------|
| Dynamic extra-offset | `#'(-0.7 . -0.1)` |
| Hairpin extra-offset | `#'(-1.3 . -0.1)` |
| Hairpin shorten-pair | `#'(0 . 4)` |

**Hairpin tweaks (hp — wedge, second hairpin):**

| Tweak | Value |
|-------|-------|
| Decresc extra-offset | `#'(-5.5 . -0.1)` |
| Decresc shorten-pair | `#'(0 . 5.3)` |

**Layout:**

| Dynamic Shape | time | line-width |
|---------------|------|------------|
| cres / decres | 2/4 | 31\mm |
| hp | 3/4 | 45\mm |

---

## Step 3: Save LilyPond File

**Location:** `lilypond_code/`

**Naming convention:** `PizzTrem-[clef]-[PitchName]-[dynamic]-[shape].ly`

PitchName uses uppercase display format: letter + accidental suffix + octave number. Dynamic is lowercase without backslash. Shape is one of `cres`, `decres`, `hp`.

| LilyPond pitch | Dynamic | Shape | Filename |
|----------------|---------|-------|----------|
| `ctqs'` | `\fff` | cres | `PizzTrem-treble-CTQS4-fff-cres.ly` |
| `ctqs'` | `\fff` | decres | `PizzTrem-treble-CTQS4-fff-decres.ly` |
| `ctqs'` | `\fff` | hp | `PizzTrem-treble-CTQS4-fff-hp.ly` |
| `b'` | `\ff` | cres | `PizzTrem-treble-B4-ff-cres.ly` |
| `cs''` | `\f` | hp | `PizzTrem-alto-CS5-f-hp.ly` |

**Accidental suffix mapping:** Same as Bartók Pizzicato — see `BARTOK_PIZZICATO_WORKFLOW.md` Step 3.

---

## Step 4: Render (LilyPond → SVG + MIDI)

**Command:**
```powershell
lilypond --svg -dbackend=svg -o "lilypond_code\PizzTrem-treble-CTQS4-fff-cres" "lilypond_code\PizzTrem-treble-CTQS4-fff-cres.ly"
```

**Outputs (in `lilypond_code/`):**
- `PizzTrem-treble-CTQS4-fff-cres.svg` — uncropped SVG
- `PizzTrem-treble-CTQS4-fff-cres.mid` — raw MIDI file (not used directly — see Step 6)

**Note:** The LilyPond MIDI is a single sustained note. The actual tremolo MIDI pattern is generated programmatically in Step 6.

---

## Step 5: Crop SVG

**Standalone script:** `lilypond_code/crop_svg.js`

```powershell
node crop_svg.js PizzTrem-treble-CTQS4-fff-cres.svg
```

Same process as Bartók Pizzicato — see `BARTOK_PIZZICATO_WORKFLOW.md` Step 5.

---

## Step 6: Generate Tremolo MIDI

**This is the key difference from Bartók Pizzicato.** Instead of post-processing LilyPond's raw MIDI, we generate the MIDI file programmatically by sampling the timing database.

**Timing database:** `public/midi_files/pizz_tremolo_db.json`

**Process:**
1. Read the timing database
2. Select a segment (or random clip across segments) that covers the requested duration
3. For each note in the clip:
   - Map to the target MIDI note number (from input pitch)
   - Shape velocity according to hairpin setting and general dynamic
   - Apply quarter-tone pitch bend if needed
   - Place note-on/off at the sampled timing offsets
4. Apply alignment (pre/post) to shift all events relative to start time
5. Write as a standard MIDI file (Format 1, 480 TPB, 60 BPM)

**MIDI event structure per note:**
1. CC0 = [articulation ID] (first note only)
2. Pitch bend (if quarter-tone, first note only)
3. Note On (velocity shaped by hairpin)
4. Note Off (at sampled duration)
5. [gap to next note from database timing]

**Velocity shaping (hairpin):**

The general dynamic sets the peak velocity via the dynamic→velocity map:

| Dynamic | Peak Velocity |
|---------|--------------|
| ppp | 30 |
| pp | 45 |
| p | 60 |
| mp | 70 |
| mf | 85 |
| f | 95 |
| ff | 107 |
| fff | 120 |

The dynamic shape modulates velocity across the duration:
- `cres` — ramp from ~30% of peak to 100% of peak
- `decres` — ramp from 100% of peak to ~30% of peak
- `hp` — ramp from ~30% → 100% → ~30% (diamond shape)

The database's original velocity variation is preserved as a multiplier on top of the hairpin envelope, giving natural human feel.

---

## Step 7: Move to Output Directory

**Output directory:** `public/SVG_graphics/pizz_tremolo/`

Both cropped SVGs and generated MIDI files live together in one flat directory.

**Naming in output:** `PizzTrem-[clef]-[PitchName]-[dynamic]-[shape].svg` / `.mid`

---

## Step 8: Graphic Notation Development

Three graphic objects are placed on the score for each pizzicato tremolo event:

### Object 1: Gravitational Curve (GC)

The GC is the same baton-physics model used by Bartók Pizzicato. It represents the gestural arc of the event.

**GC Parameters (fixed — same as Bartók Pizzicato):**

| Parameter | Value |
|-----------|-------|
| Stiffness | 62 |
| Damping | 100 |
| Ictus | 90 |
| Descent Ratio | 60 |
| Duration | 0.6 |
| Color | neonMagenta |

The GC is placed at the **Start Time** (`impactSeconds`) on the specified **Track**. The GC object exposes three key time points:
- `gc.startSeconds` — beginning of the descent curve (before impact)
- `gc.impactSeconds` — the impact point (the musically significant moment)
- `gc.endSeconds` — end of the bounce curve (after impact)

### Object 2: SVG Notation

The cropped LilyPond SVG (Z-stem + hairpin) is loaded from `public/SVG_graphics/pizz_tremolo/`.

**Scale:** SVG height is scaled to **70%** of track height (`heightFraction = 0.70`). Initial test at 50% was too small; bumped to 70% after visual testing.

**Vertical position:** `offsetYFraction = 0.10` (shifted slightly down from top of track). Initial value of 0.05 was adjusted to 0.10 after testing.

**Unit conversion:** LilyPond SVGs use `mm` units — converted to pixels at `1mm = 3.78px`.

### Object 3: Blue Direction Arrow

A horizontal right-pointing arrow placed just below the SVG notation bottom edge. Provides a visual indicator of the temporal direction of the tremolo relative to the GC.

**Arrow properties:**
- **Color:** brightBlue (`rgba(56,126,211,255)`)
- **Stroke width:** 1.5
- **Arrowhead:** triangle style, size 8 (reuses existing connector system markers: `arrow-end-brightBlue-triangle-8`)
- **Line start:** 10% from SVG left edge (`svgWidth * 0.1`)
- **Arrowhead tip:** at SVG right edge (`svgWidth`)
- **Y position:** `svgHeight + 4` (4 units below SVG bottom, in unscaled coords)
- **Direction:** always right-pointing for both pre and post alignment

The arrow is appended to the SVG wrapper `<g>` so it scales and moves with the notation.

### Alignment Positioning

The **Alignment** input controls where the SVG notation + arrow sit relative to the GC curve:

**Pre-alignment** (`pre`):
- `referenceSeconds = gc.startSeconds` (beginning of descent curve)
- `offsetSeconds = 0` (left edge of SVG aligns with start of curve)
- The notation sits to the **right** of the curve start, overlapping the GC
- Musically: the tremolo begins at the event onset

**Post-alignment** (`post`):
- `referenceSeconds = gc.endSeconds` (end of bounce curve)
- `offsetSeconds = -svgWidthInSeconds` (right edge of SVG aligns with end of curve)
- The notation sits to the **left** of the curve end, overlapping the GC
- Musically: the tremolo concludes at the event tail

**Width-in-seconds calculation:**
```
scaledContentWidth = svgWidth * scale
secondsPerPixel = secondsPerPage / scoreWidth
svgWidthInSeconds = scaledContentWidth * secondsPerPixel
```

### Development Notes

- Initial pre-alignment had the SVG's right edge at `gc.startSeconds` (notation fully before the curve). After visual testing, changed to left edge at `gc.startSeconds` so the notation overlaps the GC.
- Post-alignment anchors to `gc.endSeconds` (end of bounce) rather than `gc.startSeconds`, with the SVG's right edge at that point.
- Arrow was initially 60% of SVG width (starting at 40% from left). Extended 50% longer to start at 10% from left for better visual weight.
- Arrow always points right in both alignments — the direction indicates temporal flow (left-to-right).
- The blue arrow reuses the existing `FlowchartConnector` marker definitions (`<defs>`) already present in the score SVG, avoiding duplicate marker creation.

### Test Script

`lilypond_code/test_pizz_trem_gc.js` — browser console test function for creating a GC + SVG + arrow at a given time, track, and alignment. Usage:

```javascript
testPizzTremGC({ time: 243, track: 1, alignment: 'pre' })
testPizzTremGC({ time: 243, track: 1, alignment: 'post' })
```

---

## Step 9: UI Development

The Pizzicato Tremolo UI panel (`PizzTremUI`) lives in the composition panel, styled with `brightBlue` section label. All element IDs use the `pt` prefix.

### Inputs

| Row | Label | Element | ID | Notes |
|-----|-------|---------|----|-------|
| 1 | Track | `<input type="number">` | `ptTrackInput` | 1–4, default 1 |
| 1 | Clef | `<select>` | `ptClefSelect` | Treble / Alto / Bass |
| 2 | Pitch | `<input type="text">` | `ptPitchInput` | English format with hint tooltip |
| 2 | Dyn | `<select>` | `ptDynamicSelect` | ppp–fff, default ff |
| 3 | Start | `<input type="number">` | `ptStartInput` | Start time in seconds |
| 3 | Dur | `<input type="number">` | `ptDurationInput` | Duration in seconds, default 3 |
| 4 | Shape | Radio group (`ptShape`) | `ptShapeCres` / `ptShapeDecres` / `ptShapeBoth` | Cres / Decres / Both (hp) |
| 5 | Align | Radio group (`ptAlign`) | `ptAlignPre` / `ptAlignPost` | Pre / Post |
| 6 | Go | `<button>` | `ptGoBtn` | Triggers pipeline |

### Pitch Format

Same as Bartók Pizzicato — plain English notation:
`C4`, `C#4` (sharp), `Bb3` (flat), `C+4` (quarter sharp), `Cd4` (quarter flat), `C#+4` (3/4 sharp), `Cbd4` (3/4 flat)

### JS Module

`PizzTremUI` object in `index.html`:
- `GC_PARAMS` — fixed GC parameters (same as Bartók Pizzicato)
- `getInputs()` — reads all UI inputs and returns an object
- `go()` — triggers the full pipeline (not yet wired)

### Pipeline (to be wired)

1. Run server pipeline (render LilyPond → crop SVG → generate MIDI)
2. Create GC at `start` time on `track`
3. Insert SVG notation + blue arrow with `alignment` positioning
4. Insert MIDI snippet

---

## Step 10: Pipeline Execution

### Section A: UI Launch

The **Go** button in the PizzTremUI panel triggers a four-step pipeline:

1. **Server pipeline** — `POST /api/pizz-tremolo/generate`
   - Calls `render_pizz_tremolo.js` which: generates `.ly` → renders with LilyPond → crops SVG → generates tremolo MIDI via `generate_pizz_tremolo_midi.js`
   - Returns `svgPath` and `midiPath` (web-accessible paths in `public/SVG_graphics/pizz_tremolo/`)
   - Naming: `PizzTrem-[clef]-[PitchName]-[dynamic]-[shape].svg` / `.mid`

2. **GC creation** — creates a Gravitational Curve at `start` time on `track` using fixed GC parameters

3. **SVG + arrow insertion** — fetches the cropped SVG, scales to 70% of track height, adds blue arrow, positions with pre/post alignment logic (Step 8)

4. **MIDI snippet insertion** — programmatic events built client-side:
   - Fetches timing DB from `/midi_files/pizz_tremolo_db.json` (cached after first fetch)
   - Samples rapid repeated notes from the timing database
   - Generates CC7 volume ramp (cres/decres/hp)
   - Builds MIDI events: CC0=95, pitch bend (if quarter-tone), CC7 ramp, note-on/off, pitch bend reset

**MIDI Channel Mapping:**
- Track index 0 → MIDI channel 8
- Track index 1 → MIDI channel 9
- Track index 2 → MIDI channel 10
- Track index 3 → MIDI channel 11
- Formula: `midiChannel = trackIndex + 8` (same as `generate_pizz_tremolo_midi.js`)

**MIDI Alignment Positioning:**
- **Pre-alignment**: MIDI snippet **ends** at `startTime` — the note-off of the final note coincides with `startTime`. Snippet starts at `startTime - duration`.
- **Post-alignment**: MIDI snippet **begins** at `startTime` — normal positioning.

**Programmatic usage:**
```javascript
PizzTremUI.go({ pitch: 'C#4', dynamic: 'ff', clef: 'treble', track: 1, start: 120, duration: 3, shape: 'cres', alignment: 'pre' })
```

### Section B: AI Prompt Launch

Cascade sends commands directly to the browser via the AI Command Bridge (Pattern 4 — hands-free):

```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/ai/command" -Method POST -ContentType "application/json" -Body '{"command": "return await PizzTremUI.go({ pitch: ''G#5'', dynamic: ''fff'', clef: ''treble'', track: 1, start: 243, duration: 3, shape: ''cres'', alignment: ''pre'' })"}'
```

Fallback: Cascade provides JS for browser console paste (Pattern 3). See `docs/AI_PIZZ_TREMOLO_PROMPT_GUIDE.md` for full prompt templates, validation checklist, and parameter reference.

### Pipeline Script

`lilypond_code/render_pizz_tremolo.js` — server-side automation:
```
node render_pizz_tremolo.js --pitch "ftqs" --dynamic fff --clef treble --track 1 --shape cres --duration 3
node render_pizz_tremolo.js --batch inputs.json
```

Outputs to `public/SVG_graphics/pizz_tremolo/`:
- `PizzTrem-[clef]-[PitchName]-[dynamic]-[shape].svg` — cropped notation
- `PizzTrem-[clef]-[PitchName]-[dynamic]-[shape].mid` — tremolo MIDI (CC0=95, sampled timing, CC7 ramp)

---

## Current Status

| Step | Status | Notes |
|------|--------|-------|
| 1. Gather inputs | ✅ Done | Defined: pitch, dynamic, clef, track, dynamic shape, start time, duration, alignment |
| 2. Generate .ly | ✅ Done | 3 templates: `PizzTrem-*-cres.ly`, `PizzTrem-*-decres.ly`, `PizzTrem-*-hp.ly` |
| 3. Save .ly | ✅ Done | Naming: `PizzTrem-[clef]-[Pitch]-[dynamic]-[shape].ly` |
| 4. Render | ✅ Done | LilyPond CLI → SVG + MIDI |
| 5. Crop SVG | ✅ Done | `crop_svg.js` in-place crop |
| 6. Generate tremolo MIDI | ✅ Done | `generate_pizz_tremolo_midi.js` — CC0=95, CC7 ramp, pitch bend |
| 7. Move to output | ✅ Done | `public/SVG_graphics/pizz_tremolo/` created, SVGs copied |
| 8. Graphic notation | ✅ Done | GC + SVG notation + blue arrow; pre/post alignment tested |
| 9. UI development | ✅ Done | PizzTremUI panel — Track, Clef, Pitch, Dynamic, Start, Duration, Shape, Alignment |
| 10. Pipeline execution | ✅ Done | `render_pizz_tremolo.js` + server endpoint + PizzTremUI.go() wired; MIDI ch 8-11 |
