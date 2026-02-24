# Pizzicato Tremolo with Glissando Workflow

*Created: Feb 23, 2026*

End-to-end process for generating Z-stem Pizzicato Tremolo with Glissando — rapid repeated notes that glide between two pitches over a duration, with notation SVGs and MIDI files.

**Parent systems:**
- **Pizzicato Tremolo** (`PIZZICATO_TREMOLO_WORKFLOW.md`) — Z-stem notation, timing database sampling, CC7 volume ramp, GC + SVG + arrow graphic objects
- **Long Tone Glissando** (`LONG_TONE_GLISSANDO_WORKFLOW.md`) — Curve-based pitch traversal, pitch bend segmentation, LilyPond glissando notation

---

## Step 1: Gather Inputs

**Two input methods:**
1. **UI** — fill in the PizzTremGliss panel fields and click **Go**
2. **AI Prompt** — Cascade generates a `PizzTremGlissUI.go({...})` call (browser console or AI Command Bridge)

| Parameter | Required | Description | Example Values |
|-----------|----------|-------------|----------------|
| **Track** | Yes | Score track number (1–4) | `1`, `2`, `3`, `4` |
| **Clef** | Yes | Staff clef for LilyPond pitch placement | `treble`, `alto`, `bass` |
| **Start Time** | Yes | Score time in seconds where the gesture begins | `120.5` |
| **End Time** | Yes | Score time in seconds where the gesture ends (or use Duration) | `130.0` |
| **Duration** | Alt | Duration in seconds (alternative to End Time: `endTime = startTime + duration`) | `9.5` |
| **y1** | Yes | Curve start intensity (0–10 scale) | `10`, `0`, `5` |
| **y2** | Yes | Curve end intensity (0–10 scale) | `0`, `10`, `5` |
| **Curve Model** | Yes | Mathematical model for the curve shape | `logarithmic`, `exponential`, `power`, `sigmoid`, `bezier` |
| **Curve Slope** | Yes | Curve coefficient controlling shape intensity (−3 to +3) | `0` (linear), `-1` (front-loaded), `+2` (back-loaded) |
| **Start Pitch** | Yes | Starting pitch in plain English notation | `C4`, `G#5`, `Bb3`, `C+4` (quarter sharp) |
| **End Pitch** | Yes | Ending pitch in plain English notation | `G5`, `C4`, `Eb3`, `Ad4` (quarter flat) |
| **Start Dynamic** | Yes | Dynamic marking at the start of the gesture | `ppp`, `pp`, `p`, `mp`, `mf`, `f`, `ff`, `fff` |
| **End Dynamic** | Yes | Dynamic marking at the end of the gesture | `ppp`, `pp`, `p`, `mp`, `mf`, `f`, `ff`, `fff` |

### Derived Values

| Value | Derived From | Description |
|-------|-------------|-------------|
| Duration | `endTime − startTime` | Gesture length in seconds |
| MIDI Channel | Track | `track + 7` (track 1 → ch 8, track 2 → ch 9, track 3 → ch 10, track 4 → ch 11) |
| Glissando Direction | Start/End Pitch | Up if endPitch > startPitch, down if endPitch < startPitch |
| MIDI Note Range | Start/End Pitch | Converted to MIDI note numbers; pitch bend segments cover the interval |
| Hairpin Direction | Start/End Dynamic | `\<` if endDynamic > startDynamic, `\>` if endDynamic < startDynamic |

### Which Inputs Affect Which Outputs

| Input | Affects Notation | Affects Curve | Affects MIDI |
|-------|-----------------|---------------|-------------|
| **Track** | — | ✅ Track placement | ✅ MIDI channel |
| **Clef** | ✅ Clef in LilyPond | — | — |
| **Start Time** | — | ✅ Curve start | ✅ Event placement |
| **End Time / Duration** | — | ✅ Curve end | ✅ Gesture length |
| **y1** | — | ✅ Curve start intensity | — |
| **y2** | — | ✅ Curve end intensity | — |
| **Curve Model** | — | ✅ Curve shape | — |
| **Curve Slope** | — | ✅ Curve coefficient | — |
| **Start Pitch** | ✅ Left note on staff | — | ✅ Starting MIDI note + pitch bend |
| **End Pitch** | ✅ Right note on staff | — | ✅ Ending MIDI note + pitch bend |
| **Start Dynamic** | ✅ Left dynamic marking | — | ✅ Start velocity (mapped from dynamic) |
| **End Dynamic** | ✅ Right dynamic marking | — | ✅ End velocity (mapped from dynamic) |

### Slope Values (logarithmic model)

| Slope | Behavior |
|-------|----------|
| 0 | Linear (straight line) |
| −1 | ~46% of transition in first 10% (steep start, long tail) |
| −2 | ~76% of transition in first 10% |
| −3 | ~91% of transition in first 10% (very front-loaded) |
| +1 to +3 | Long lead-in, steep end |

### Pitch Format

Same as Bartók Pizzicato / Pizzicato Tremolo — plain English notation:
`C4`, `C#4` (sharp), `Bb3` (flat), `C+4` (quarter sharp), `Cd4` (quarter flat), `C#+4` (¾ sharp), `Cbd4` (¾ flat)

---

## Step 2: Create Curve
**Status:** 🔲 Not yet wired (reuse existing `CurveMaker.createCurve`)
**Function:** `CurveMaker.createCurve(params)`
**Code Location:** `public/index.html` (same as Long Tone Glissando Step 1)

The curve defines the **pitch trajectory** of the glissando over time. Curve Y values map to the pitch range between Start Pitch and End Pitch.

**Process:**
1. Call `CurveMaker.createCurve()` with timing, intensity, track, model, and slope parameters
2. Curve appears on the score at the specified position
3. User may tweak the curve visually before proceeding
4. Grab the finalized curve parameters (stored on the curve object)

**Parameters passed to CurveMaker:**

| Param | Source | Description |
|-------|--------|-------------|
| `startSeconds` | Start Time | Curve start |
| `endSeconds` | End Time (or `startTime + duration`) | Curve end |
| `y1` | y1 | Start intensity |
| `y2` | y2 | End intensity |
| `gTrack` | Track (as string) | Track placement `'1'`–`'4'` |
| `model` | Curve Model | `'logarithmic'`, `'exponential'`, etc. |
| `slope` | Curve Slope | −3 to +3 |

**Example (console):**
```javascript
CurveMaker.createCurve({
    startSeconds: 120,
    endSeconds: 130,
    y1: 10,
    y2: 0,
    gTrack: '1',
    model: 'logarithmic',
    slope: -1
})
```

**Curve object output** (key properties used by later steps):
- `curveData.samples` — array of `{x, y}` pairs for pitch mapping
- `startSeconds`, `endSeconds`, `duration`
- `gTrack`, `page`, `section`
- `name` — auto-generated `CRV_YYYYMMDD_HHMMSS`

> **⚠️ Test Curve:** Using `CRV_20260215_173616` from saved score 285 for pipeline validation. See [Test Curve](#test-curve) section below.

---

## Step 3: Generate LilyPond File
**Status:** ✅ Template created (`PizzTremGliss-Template.ly`); substitution logic TODO
**Template:** `lilypond_code/PizzTremGliss-Template.ly`

Substitute the following variables into the template:

| Template Variable | Input Parameter | Example |
|-------------------|----------------|---------|
| `CLEF` | Clef | `treble`, `alto`, `bass` |
| `START_PITCH` | Start Pitch (converted to LilyPond) | `as` (A#3), `cs'` (C#4), `bf,` (Bb2) |
| `END_PITCH` | End Pitch (converted to LilyPond) | `a` (A3), `d'` (D4), `g,` (G2) |
| `START_DYNAMIC` | Start Dynamic | `\ppp`, `\f`, `\mf` |
| `END_DYNAMIC` | End Dynamic | `\f`, `\ppp`, `\mp` |
| `HAIRPIN` | Derived from Start/End Dynamic | `\<` (crescendo) or `\>` (decrescendo) |
| `GLISS_Y_OFFSET` | Derived from pitch analysis | `0` (default) or `0.3` (same staff line — see Registry §9) |

**Pitch conversion:** Plain English → LilyPond (same as Long Tone Glissando Step 2a):

| Accidental | User Input | LilyPond | Example |
|------------|------------|----------|---------|
| Natural | C4 | `c'` | C4 → `c'` |
| Sharp | C#4 | `cs'` | C#4 → `cs'` |
| Flat | Bb3 | `bf` | Bb3 → `bf` |
| Quarter sharp | C+4 | `cqs'` | C+4 → `cqs'` |
| Quarter flat | Cd4 | `cqf'` | Cd4 → `cqf'` |
| ¾ sharp | C#+4 | `ctqs'` | C#+4 → `ctqs'` |
| ¾ flat | Cbd4 | `ctqf'` | Cbd4 → `ctqf'` |

**Gliss line offset rule** (Registry §9):

| Condition | GLISS_Y_OFFSET |
|-----------|----------------|
| Start and end pitch on **same staff line** | `0.3` (offset up) |
| Start and end pitch on **different staff lines/spaces** | `0` (default) |

See Registry §9 staff-line pitch tables for each clef to determine same-staff-line pairs.

**File existence check:** Before creating, check if the `.ly` file already exists → skip if found.

**Naming convention:** `PizzTremGliss-[clef]-[StartPitch]-[EndPitch]-[startDyn]-[endDyn].ly`

Example: `PizzTremGliss-treble-AS3-A3-ppp-f.ly`

---

## Step 4: Render & Crop SVG
**Status:** 🔲 Not yet wired
**Process:** LilyPond CLI → SVG → crop script → move to output
**Pattern:** Same as `render_pizz_tremolo.js` (lines 396–438) and `/notation-fragment` pipeline Step 1

### Step 4a: Render LilyPond to SVG

Run from `lilypond_code/` directory:

```powershell
lilypond --svg -dbackend=svg -o "PizzTremGliss-treble-AS3-A3-ppp-f" "PizzTremGliss-treble-AS3-A3-ppp-f.ly"
```

**Output:** `lilypond_code/PizzTremGliss-treble-AS3-A3-ppp-f.svg` (uncropped)

> Our template is single-score, so the output is always `baseName.svg`. (Dual-score files produce `baseName-1.svg` — not applicable here.)

### Step 4b: Crop SVG

**Script:** `lilypond_code/crop_svg.js` — standalone 3-pass SVG cropper (latest version with Pass 3 fix for nested `<g>`/`<a>` groups and scale transforms).

Run from `lilypond_code/` directory:

```powershell
node crop_svg.js PizzTremGliss-treble-AS3-A3-ppp-f.svg
```

Crops the SVG **in-place** to the bounding box of the notation content, removing whitespace. Updates `viewBox`, `width`, and `height` attributes.

### Step 4c: Move to Output Directory

Copy cropped SVG from `lilypond_code/` to output:

**Output directory:** `public/SVG_graphics/pizz_trem_gliss/` (new — separate from `pizz_tremolo/`)

```powershell
# Create directory if needed, then copy
New-Item -ItemType Directory -Force -Path "public\SVG_graphics\pizz_trem_gliss"
Copy-Item "lilypond_code\PizzTremGliss-treble-AS3-A3-ppp-f.svg" "public\SVG_graphics\pizz_trem_gliss\" -Force
```

**Skip logic:** If SVG already exists in the output directory, skip rendering and cropping (same as Long Tone Glissando Step 2b and Pizzicato Tremolo pipeline).

### Automation Reference

When automating as a Node.js script (like `render_pizz_tremolo.js`), use `child_process.execSync`:

```javascript
const { execSync } = require('child_process');

// Render
execSync(`lilypond --svg -dbackend=svg -o "${outputName}" "${lyPath}"`, {
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 30000
});

// Crop
execSync(`node "${path.join(LILYPOND_DIR, 'crop_svg.js')}" "${svgPath}"`, {
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 10000
});

// Move to output
fs.copyFileSync(svgPath, outputSvg);
```

---

## Step 5: Generate MIDI
**Status:** 🔲 Not yet implemented — **key development step**
**Resembles:** Pizzicato Tremolo Step 6 (timing DB sampling) + Long Tone Glissando Step 3 (pitch bend segmentation)

This is the core hybrid step. The MIDI output combines:
- **Pizzicato Tremolo timing** — rapid repeated note-on/off from the timing database (`public/midi_files/pizz_tremolo_db.json`)
- **Glissando pitch bend** — continuous pitch traversal mapped from the curve's Y values to the pitch range
- **Per-note velocity** — dynamic shaping from Start Dynamic to End Dynamic via velocity (no CC7)

### Process

1. **Read timing database** — sample a segment (or random clip) covering the requested duration
2. **Map curve to pitch** — for each sampled note's time position, look up the curve Y value and map to an effective pitch within the Start Pitch → End Pitch range
3. **Compute per-note velocity** — linearly interpolate from Start Dynamic velocity to End Dynamic velocity; each note gets its own velocity value
4. **Determine pitch bend segments** — track the effective pitch across notes; when the accumulated pitch traversal exceeds 2 semitones from the current segment's base MIDI note, trigger a segment transition
5. **For each note in the sampled clip:**
   - Use the current segment's MIDI note number
   - Calculate pitch bend value from the effective pitch at this note's time position
   - Apply interpolated velocity
   - Place note-on/off at the sampled timing offsets
6. **Write single MIDI file** (Format 1, 480 TPB, 60 BPM)

### Dynamics: Velocity-Only (No CC7)

**No CC7 volume ramp.** Dynamics are controlled exclusively through per-note velocity.

Start Dynamic and End Dynamic map to velocity via the dynamic→velocity table. Each note gets a linearly interpolated velocity between the start and end values:

| Dynamic | Velocity |
|---------|----------|
| ppp | 30 |
| pp | 45 |
| p | 60 |
| mp | 70 |
| mf | 85 |
| f | 95 |
| ff | 107 |
| fff | 120 |

**Example:** Start Dynamic = `ppp` (30), End Dynamic = `f` (95), 20 notes total → note 1 gets velocity 30, note 10 gets ~62, note 20 gets 95.

### MIDI Event Structure Per Note

**First note of the file:**
1. CC0 = 95 (pizz tremolo articulation ID)
2. Pitch bend (initial value for segment)
3. Note On (interpolated velocity)
4. Note Off (at sampled duration from timing DB)

**Subsequent notes (same segment):**
1. Pitch bend (updated value — NOT reset between notes)
2. Note On (interpolated velocity)
3. Note Off (at sampled duration from timing DB)

**Segment transition note:**
1. Previous Note Off
2. Pitch bend reset to appropriate start value for new segment
3. Note On with **new MIDI note number** (interpolated velocity)
4. Note Off (at sampled duration from timing DB)

### Pitch Bend Segmentation

**Synth pitch bend range:** ±1 semitone (center = 8192, ±8192 per semitone). Confirmed in `AI_SCORE_BUILDING_PROGRESS.md`.

**2-semitone traversal per segment** — same approach as `LongToneUI.generateGlissandoMidi()` (index.html line 16912):
- MIDI note is **offset by 1 semitone** from the segment's starting effective pitch
- Pitch bend covers ±1 semitone from that MIDI note
- Total traversal = 2 semitones before needing a new segment

**Ascending glissando example (starting at G3):**

| Notes | MIDI Note | Pitch Bend | Effective Pitch |
|-------|-----------|------------|-----------------|
| First notes | G#3 (68) | 0 (min, −1 semi) | G3 |
| ... | G#3 (68) | 8192 (center) | G#3 |
| Last before transition | G#3 (68) | 16383 (max, +1 semi) | A3 |
| **Transition** | **A#3 (70)** | **0 (min, −1 semi)** | **A3** |
| Next notes | A#3 (70) | increasing... | A3 → B3 |

**Transition sequence (ascending):**
1. Previous note off
2. Pitch bend → 0 (minimum = −1 semitone from new MIDI note = continues from previous effective pitch)
3. Note on: new MIDI note (next semitone + 1 offset)
4. Continue bending upward

**Descending glissando** — mirror: MIDI note = start pitch − 1, bend starts at 16383 (max), ramps down.

**Pitch bend is NOT reset between notes within a segment** — it just keeps incrementing/decrementing across successive notes. Only resets at segment transitions.

**Pitch bend value calculation per note:**
```
effectivePitch = curveYAtNoteTime mapped to [startPitch, endPitch] range
offsetFromMidiNote = effectivePitch - currentMidiNote
bendValue = 8192 + (offsetFromMidiNote * 8192)   // center ± 8192 per semitone
```

### Key Differences from Parent Systems

| Aspect | Long Tone Glissando | Pizz Tremolo | **Pizz Trem Glissando** |
|--------|-------------------|--------------|------------------------|
| Note pattern | Sustained notes | Rapid repeated (timing DB) | **Rapid repeated (timing DB)** |
| Pitch | Pitch bend segments | Fixed pitch | **Pitch bend segments (2-semi range)** |
| Volume | Fixed velocity | CC7 ramp (cres/decres/hp) | **Per-note velocity (no CC7)** |
| CC0 | 89 (senza vib) | 95 (pizz tremolo) | **95 (pizz tremolo)** |
| Curve | Drives pitch trajectory | Not used | **Drives pitch trajectory** |
| Bend within segment | Continuous 50ms samples | N/A | **One bend value per note** |
| Output | Multiple MIDI files (1 per segment) | Single MIDI file | **Single MIDI file** |
| Segment transition | New file | N/A | **Note off → reset bend → new note on** |

### File Naming

`PizzTremGliss-[StartPitch]-[EndPitch]-[startDyn]-[endDyn].mid`

Example: `PizzTremGliss-C4-A+4-pp-fff.mid`

### MIDI File Output

**Always save a copy** of the generated MIDI file to the output directory whenever one is created:

**Output directory:** `public/SVG_graphics/pizz_trem_gliss/` (same directory as SVG)

This is in addition to attaching the MIDI snippet to the score. The standalone `.mid` file allows DAW verification and archival.

**Generator script:** `lilypond_code/generate_pizz_trem_gliss_midi.js`

```powershell
node generate_pizz_trem_gliss_midi.js --startPitch C4 --endPitch "A+4" --startDynamic pp --endDynamic fff --track 2 --duration 4.2 --model logarithmic --slope -0.536 --y1 10 --y2 0.1
```

---

## Step 6: Place in Score
**Status:** 🔲 Not yet implemented

Three objects are placed on the score:

### Object 1: Curve (already placed in Step 2)

The curve is already visible on the score from Step 2. No additional placement needed — it serves as both the visual representation and the pitch mapping source.

### Object 2: MIDI Snippet

**Function:** Insert MIDI events at the curve's start time on the curve's track.

**Process** (similar to Long Tone Glissando Step 4 + Pizzicato Tremolo Step 10):
1. Load the generated MIDI file from `public/SVG_graphics/pizz_trem_gliss/`
2. Parse MIDI events (CC0, pitch bend, note on/off)
3. Insert at `curve.startSeconds` on the curve's track
4. MIDI channel determined by track: `trackIndex + 8`
5. Add to `MidiSnippetDatabase` for visualization
6. Add events to `MidiController` track for playback
7. Store snippet IDs on the curve object for cleanup/persistence

### Object 3: SVG Notation

**Process** (similar to Long Tone Glissando Step 2c):
1. Fetch the cropped SVG from `public/SVG_graphics/pizz_trem_gliss/`
2. Parse SVG dimensions (mm units → pixels at `1mm = 3.78px`)
3. Scale SVG height to a fraction of track height (start with **70%**, same as Pizzicato Tremolo)
4. Position SVG horizontally:
   - Convert `curve.startSeconds` to pixel X position
   - Offset/align relative to curve (exact positioning TBD — may use left-edge alignment or center)
5. Position SVG vertically: center in the curve's track
6. Create element via `SVGElementManager`

**Positioning parameters (tested Feb 23, 2026 — score 287-work, second 247):**

| Parameter | Value | Description |
|-----------|-------|-------------|
| `scale` | **0.75** | SVG scale (original auto-calc was 0.45, increased to 0.75) |
| `offsetYFraction` | **0.05** | Vertical offset from top of track (original 0.10, decreased to 0.05) |

> These values were tested on a treble-clef C4→A+4 gesture and confirmed to look correct on screen.

---

## Current Status

| Step | Status | Notes |
|------|--------|-------|
| 1. Gather Inputs | ✅ UI done | `PizzTremGlissUI` panel in `index.html`; all inputs wired |
| 2. Create Curve | ✅ UI done | `PizzTremGlissUI.step1()` → `CurveMaker.createCurve`; slope read/write |
| 3. Generate LilyPond | ✅ Server done | `/api/lilypond/create-pizz-trem-gliss` endpoint + template substitution |
| 4. Render & Crop SVG | ✅ Tested | Reuses `/api/lilypond/render-glissando` + `cropSvgToContent` |
| 5. Generate MIDI | ✅ Script done | `generate_pizz_trem_gliss_midi.js`; tested descending + ascending |
| 6. Place in Score | ✅ Complete | SVG: `insertSvg` scale=0.75, offsetY=0.05; MIDI: `insertMidi` parses + inserts snippet |

### What Needs New Code

| Component | Description | Estimate |
|-----------|-------------|----------|
| **MIDI generator** | ✅ `generate_pizz_trem_gliss_midi.js` — timing DB + pitch bend + per-note velocity | Done |
| **LilyPond substitution** | ✅ `/api/lilypond/create-pizz-trem-gliss` server endpoint | Done |
| **SVG placement** | ✅ `PizzTremGlissUI.insertSvg` — scale=0.75, offsetY=0.05 | Done |
| **Pipeline function** | ✅ `PizzTremGlissUI.go()` / `step1()` + `step2()` | Done |
| **UI panel** | ✅ HTML panel with all inputs, color swatches, fill toggle, buttons | Done |

### What Can Be Reused

| Component | Source | Notes |
|-----------|--------|-------|
| `CurveMaker.createCurve` | Long Tone Glissando | Unchanged |
| `crop_svg.js` | Pizzicato Tremolo | Unchanged |
| LilyPond CLI render | Both workflows | Same command pattern |
| Pitch bend segmentation | `LongToneUI.generateGlissandoMidi` | Adapt for repeated notes instead of sustained |
| Timing DB sampling | `generate_pizz_tremolo_midi.js` | Adapt to add pitch bend per note |
| CC7 volume ramp | `PizzTremUI.go` (client-side) | Adapt for start→end dynamic |
| SVG insertion | `LongToneUI.insertGlissandoSvg` | Adapt positioning |
| MIDI insertion | `LongToneUI.insertGlissandoMidi` | Adapt for single file instead of segments |

---

## Test Curve

> Using **`CRV_20260215_173616`** from saved score **285** to validate the pipeline end-to-end.
> This curve already has a long-tone glissando MIDI attached (`CRV_20260215_173616_seg01_C4_dn.mid`), confirming it's a proven pitch-bend curve.

**Curve parameters (from score 285):**

| Parameter | Value |
|-----------|-------|
| **name** | `CRV_20260215_173616` |
| **id** | 182 |
| **startSeconds** | 130.3 |
| **endSeconds** | 134.5 |
| **duration** | ~4.2s |
| **y1** | 10 |
| **y2** | ~0.1 |
| **gTrack** | `"2"` |
| **model** | `logarithmic` |
| **slope** | -0.536 |
| **color** | `limeGreen` |
| **fillMode** | `bottom` |
| **page** | 28 |
| **section** | `top` |

**Test input parameters (to pair with this curve):**

| Parameter | Test Value |
|-----------|-----------|
| Track | `2` |
| Clef | *TBD* |
| Start Time | `130.3` |
| End Time | `134.5` |
| y1 | `10` |
| y2 | `0.1` |
| Curve Model | `logarithmic` |
| Curve Slope | `-0.536` |
| Start Pitch | *TBD* |
| End Pitch | *TBD* |
| Start Dynamic | *TBD* |
| End Dynamic | *TBD* |
| Velocity | *TBD* |

**Console command to recreate the curve (if needed):**
```javascript
CurveMaker.createCurve({
    startSeconds: 130.3,
    endSeconds: 134.5,
    y1: 10,
    y2: 0.1,
    gTrack: '2',
    model: 'logarithmic',
    slope: -0.536
})
```

---

## Testing Checklist

### Step 2 Test
- [ ] Create curve programmatically
- [ ] Verify curve appears at correct position and track
- [ ] Verify curve parameters are accessible for later steps

### Step 3 Test
- [ ] Generate `.ly` file from template with variable substitution
- [ ] Verify correct pitch conversion (including quarter-tones)
- [ ] Verify gliss Y offset correctly applied for same-staff-line pairs

### Step 4 Test
- [ ] Render `.ly` → SVG via LilyPond CLI
- [ ] Crop SVG with `crop_svg.js`
- [ ] Verify cropped SVG looks correct in browser

### Step 5 Test
- [ ] Generate MIDI with timing DB + pitch bend + CC7 ramp
- [ ] Verify pitch bend follows curve shape
- [ ] Verify CC7 ramp matches start→end dynamic
- [ ] Verify note timing matches timing DB pattern
- [ ] Play back MIDI and confirm glissando + tremolo sound correct

### Step 6 Test
- [ ] Insert MIDI at curve start time on correct track/channel
- [ ] Insert SVG at correct position relative to curve
- [ ] Verify MIDI playback synchronized with curve visual
- [ ] Verify SVG notation aligned with curve

### End-to-End Test
- [ ] Run full pipeline from inputs through placement
- [ ] Verify all three objects on score (curve, MIDI, SVG)
- [ ] Compare result to manual creation

---

## Downstream Impact Tracking

When revising a step, check these downstream dependencies:

| If you change... | Check impact on... |
|------------------|-------------------|
| Step 1 (Inputs) | All subsequent steps |
| Step 2 (Curve) | Step 5 (pitch mapping from curve), Step 6 (placement timing) |
| Step 3 (LilyPond) | Step 4 (render input) |
| Step 5 (MIDI) | Step 6 (MIDI insertion) |
| Curve data structure | Steps 5 and 6 that read curve properties |
| Template file | Step 3 (variable substitution must match) |

---

## Notes

*(Add observations, issues, and ideas here as development progresses)*

---
