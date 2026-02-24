# AI Pizzicato Tremolo Glissando Prompt Guide

Create Pizzicato Tremolo Glissando gestures via AI prompt — via AI Command Bridge (Pattern 4). Two modes:

- **Two-part go** (default) — Cascade creates the curve, you adjust the shape, then say "generate"
- **Single go** — Cascade does everything in one shot, no pause for adjustment

---

## How It Works

### Two-Part Go (default)

1. **Prompt 1:** Give Cascade all inputs → curve appears in the score
2. **You adjust** the curve shape by dragging (slope updates in real time)
3. **Prompt 2:** Say "generate" → SVG notation + MIDI file inserted into score

### Single Go

1. **One prompt:** Give Cascade all inputs + say "single go" → curve + SVG + MIDI all appear at once

No save/reload needed. Everything appears live via AI Command Bridge.

---

## Prompt Templates

### Prompt 1: Create Curve

#### Option A: Copy-Paste Template

```
Pizz trem gliss:
- Track: ___ (1-4)
- Clef: ___ (treble / alto / bass)
- Start Time: ___ s
- End Time: ___ s
- Start Pitch: ___ (e.g., C4, F#4, Bb3, A+5)
- End Pitch: ___
- Start Dynamic: ___ (ppp/pp/p/mp/mf/f/ff/fff)
- End Dynamic: ___
- y1: ___ (0-10, curve start intensity)
- y2: ___ (0-10, curve end intensity)
- Model: ___ (logarithmic / power / sigmoid / linear)
- Slope: ___ (-3 to +3)
- Color: ___ (limeGreen / cyan / orange / magenta / yellow / red)
- Fill: ___ (bottom / top / line)
```

#### Option B: Natural Language

> "Pizz trem gliss on track 1, treble, F#4 to A+5, pp to fff, from 247s to 253s, logarithmic curve slope -1, y1=0 y2=10, lime green fill down"

> "Pizzicato tremolo glissando: track 2, alto, C3 to G4, mf to ppp, 100s–106s, sigmoid slope 0.5, green"

> "Pizz trem gliss track 3, bass, E2 to C3, f to pp, 55–59s, linear"

### Prompt 2: Generate (two-part only)

After adjusting the curve shape, simply say:

> "Generate"

Cascade calls `step2()` which reads the current curve shape (including any slope changes from dragging) and generates everything.

### Single Go Examples

Add **"single go"** to any prompt to skip curve adjustment:

> "Pizz trem gliss on track 1, treble, F#4 to A+5, pp to fff, 247s to 253s, log slope -1 — **single go**"

> "Single go: pizz trem gliss track 3, alto, G5 to Bbd4, pp to fff, 247–252s, logarithmic slope -0.7"

Cascade runs `go()` which creates the curve and immediately generates SVG + MIDI without pausing.

---

## How Cascade Executes

### Prompt 1: Create Curve (AI Command Bridge)

```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/ai/command" -Method POST -ContentType "application/json" -Body '{"command": "PizzTremGlissUI.step1({ track: 1, clef: ''treble'', startSeconds: 247, endSeconds: 253, startPitch: ''F#4'', endPitch: ''A+5'', startDynamic: ''pp'', endDynamic: ''fff'', y1: 0, y2: 10, model: ''logarithmic'', slope: -1, color: ''limeGreen'', fillMode: ''bottom'' })"}'
```

This creates the curve and populates all UI fields. The user adjusts the curve shape.

### Prompt 2: Generate SVG + MIDI

```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/ai/command" -Method POST -ContentType "application/json" -Body '{"command": "return await PizzTremGlissUI.step2()"}'
```

No params needed — `step2()` reads all values from UI fields (populated by step1) and uses the pending curve (including any slope adjustments the user made).

### Single Go (both steps, no pause)

When the user says **"single go"** in their prompt, Cascade uses `go()` instead of `step1()`:

```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/ai/command" -Method POST -ContentType "application/json" -Body '{"command": "return await PizzTremGlissUI.go({ track: 1, clef: ''treble'', startSeconds: 247, endSeconds: 253, startPitch: ''F#4'', endPitch: ''A+5'', startDynamic: ''pp'', endDynamic: ''fff'', y1: 0, y2: 10, model: ''logarithmic'', slope: -1, color: ''limeGreen'', fillMode: ''bottom'' })"}'
```

### Fallback: Console Paste (Pattern 3)

If the command bridge is unavailable, Cascade provides JS for the browser console:

```javascript
// Step 1
PizzTremGlissUI.step1({
    track: 1, clef: 'treble',
    startSeconds: 247, endSeconds: 253,
    startPitch: 'F#4', endPitch: 'A+5',
    startDynamic: 'pp', endDynamic: 'fff',
    y1: 0, y2: 10,
    model: 'logarithmic', slope: -1,
    color: 'limeGreen', fillMode: 'bottom'
});
// ... user adjusts curve ...
// Step 2
await PizzTremGlissUI.step2();
```

**Important:** Cascade must NEVER check/start/interact with the dev server.

---

## Parameters

| Parameter | Key | Required | Values | Default | Example |
|-----------|-----|----------|--------|---------|---------|
| Track | `track` | Yes | 1–4 | — | `1` |
| Clef | `clef` | Yes | `treble`, `alto`, `bass` | — | `'treble'` |
| Start Time | `startSeconds` | Yes | Seconds (decimal OK) | — | `247` |
| End Time | `endSeconds` | Yes | Seconds (decimal OK) | — | `253` |
| Start Pitch | `startPitch` | Yes | Plain English (see below) | — | `'F#4'` |
| End Pitch | `endPitch` | Yes | Plain English (see below) | — | `'A+5'` |
| Start Dynamic | `startDynamic` | Yes | `ppp`–`fff` | — | `'pp'` |
| End Dynamic | `endDynamic` | Yes | `ppp`–`fff` | — | `'fff'` |
| y1 | `y1` | No | 0–10 | `10` | `0` |
| y2 | `y2` | No | 0–10 | `0` | `10` |
| Model | `model` | No | `logarithmic`, `power`, `sigmoid`, `linear` | `logarithmic` | `'logarithmic'` |
| Slope | `slope` | No | −3 to +3 | `-1` | `-1` |
| Color | `color` | No | CSS color name | `limeGreen` | `'cyan'` |
| Fill Mode | `fillMode` | No | `bottom`, `top`, `line` | `bottom` | `'bottom'` |

### Pitch Format (Plain English)

| Format | Meaning | Example |
|--------|---------|---------|
| `C4` | Natural, octave 4 | Middle C |
| `C#4` | Sharp | C sharp 4 |
| `Bb3` | Flat | B flat 3 |
| `C+4` | Quarter sharp | C quarter-sharp 4 |
| `Cd4` | Quarter flat | C quarter-flat 4 |
| `C#+4` | Three-quarter sharp | C three-quarter-sharp 4 |
| `Cbd4` | Three-quarter flat | C three-quarter-flat 4 |

### Curve Direction

- **y1 > y2** (e.g., y1=10, y2=0): Curve descends → pitch goes high to low (Start Pitch is high)
- **y1 < y2** (e.g., y1=0, y2=10): Curve ascends → pitch goes low to high (Start Pitch is low)
- **Slope < 0**: Steep at start, gradual at end
- **Slope > 0**: Gradual at start, steep at end
- **Slope = 0**: Linear (even distribution)

---

## What Happens Inside

### Step 1 (Curve Creation)
1. UI fields populated from params (if AI-driven)
2. `CurveMaker.createCurve()` creates visible curve on score
3. Slope watcher starts — polls curve every 200ms, updates slope input when user drags

### Step 2 (Generation)
1. Reads pitch, clef, dynamics from UI fields
2. Converts pitches to LilyPond notation via `LongToneUI.pitchToLilyPond()`
3. Creates `.ly` file from `PizzTremGliss-Template.ly` via `/api/lilypond/create-pizz-trem-gliss`
4. Renders SVG via `/api/lilypond/render-glissando` + crops
5. Inserts SVG into score (scale=0.75, offsetY=0.05)
6. Generates MIDI via `/api/pizz-trem-gliss/generate-midi` (runs `generate_pizz_trem_gliss_midi.js`)
7. Fetches + parses MIDI file, inserts as snippet into `MidiSnippetDatabase` + `MidiController`
8. `markDirty()` triggers auto-save

---

## Defaults (when omitted)

| Parameter | Default |
|-----------|---------|
| y1 | `10` |
| y2 | `0` |
| Model | `logarithmic` |
| Slope | `-1` |
| Color | `limeGreen` |
| Fill Mode | `bottom` (fill down) |

Track, Clef, Start/End Time, Start/End Pitch, and Start/End Dynamic are **required** — Cascade should ask for any missing parameter.

---

## Dynamic → Velocity Mapping

| Dynamic | MIDI Velocity |
|---------|---------------|
| ppp | 30 |
| pp | 45 |
| p | 60 |
| mp | 70 |
| mf | 85 |
| f | 95 |
| ff | 107 |
| fff | 120 |

Velocity interpolates linearly from start to end dynamic across all notes.

---

## MIDI Details

- **CC0 = 95** at beginning (pizz tremolo articulation identifier)
- **No CC7** — dynamics via per-note velocity only (not volume ramp)
- **Pitch bend segmentation**: 2-semitone traversal per segment, MIDI note offset ±1, bend ±1 semitone (center=8192, ±8192/semitone)
- **Pitch bend NOT reset** between notes within a segment
- **Transition sequence**: note off → pitch bend set → new MIDI note on
- **Single MIDI file** (not per-segment like Long Tone Glissando)
- **Timing** sampled from `public/midi_files/pizz_tremolo_db.json`
- **Channel mapping**: track 1 → ch 8, track 2 → ch 9, track 3 → ch 10, track 4 → ch 11
- Formula: `midiChannel = track + 7`

---

## SVG Notation Details

| Property | Value |
|----------|-------|
| Scale | 0.75 |
| Vertical offset | 0.05 (fraction of track height) |
| Height fraction | 0.42 |
| Template | `PizzTremGliss-Template.ly` (Z-stem + glissando + dynamics) |
| mm → px | 1mm = 3.78px |

---

## Server Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/lilypond/create-pizz-trem-gliss` | Create `.ly` file from template with substitutions |
| `POST /api/lilypond/render-glissando` | Render `.ly` → SVG + crop (shared with Long Tone) |
| `POST /api/pizz-trem-gliss/generate-midi` | Run `generate_pizz_trem_gliss_midi.js` → `.mid` file |

---

## Key Functions

| Function | Purpose |
|----------|---------|
| `PizzTremGlissUI.step1(params)` | Create curve + populate UI (Part 1) |
| `PizzTremGlissUI.step2(params)` | Generate SVG + MIDI from pending curve (Part 2) |
| `PizzTremGlissUI.go(params)` | One-shot: step1 + step2 without pause |
| `PizzTremGlissUI.generateAll(curve, params)` | Core pipeline: .ly → SVG → MIDI → insert all |
| `PizzTremGlissUI.createCurve(params)` | Create curve via CurveMaker |
| `PizzTremGlissUI.insertSvg(svgPath, curve)` | Insert notation SVG into score |
| `PizzTremGlissUI.insertMidi(midiPath, curve, track)` | Parse + insert MIDI as snippet |
| `PizzTremGlissUI._watchCurveSlope(curve)` | Poll curve slope → update UI input |

---

## Pre-Execution Validation Checklist

Before executing, Cascade should verify:

1. **8 required parameters present** — track, clef, startSeconds, endSeconds, startPitch, endPitch, startDynamic, endDynamic. Ask if any missing.
2. **Pitch range vs clef** — Flag if pitch needs >3 ledger lines; suggest alternative clef.
3. **Track in range** — Must be 1–4.
4. **Times are valid** — Start < End, both > 0.
5. **Duration reasonable** — Typically 2–10 seconds for a glissando gesture.
6. **Pitch interval** — Start and end pitch should differ (it's a glissando).
7. **Pitch format valid** — Must match pattern: letter (A-G) + optional accidental (#/b/+/d) + octave digit.
8. **Dynamics valid** — Must be one of: ppp, pp, p, mp, mf, f, ff, fff.
9. **y1 ≠ y2** — If equal, no glissando motion (flat curve).
10. **Curve direction matches pitch** — If y1 < y2 (ascending curve), start pitch should be lower than end pitch for intuitive mapping.

### Clef ↔ Pitch Range Guidelines

| Clef | Comfortable Range | Notes |
|------|-------------------|-------|
| treble | G3 – C7 | Standard violin/upper register |
| alto | C3 – G5 | Viola range |
| bass | C1 – G3 | Cello/bass lower register |

---

## Differences from Related Systems

| Feature | Pizz Tremolo | Long Tone Glissando | **Pizz Trem Gliss** |
|---------|-------------|--------------------|--------------------|
| CC0 | 95 | None | 95 |
| MIDI channels | 8–11 | 0–3 | 8–11 |
| Pitch | Single fixed | Gliss (sustained) | Gliss (rapid repeated) |
| Volume | CC7 ramp | CC7 ramp | Per-note velocity (no CC7) |
| Curve | Not used | Required | Required |
| MIDI output | Programmatic snippet | Multiple segment files | Single MIDI file |
| SVG scale | 0.70 | 0.75 | 0.75 |
| Workflow | One-shot | Two-part | **Two-part** |
| Template | Z-stem only | Glissando only | Z-stem + glissando |
