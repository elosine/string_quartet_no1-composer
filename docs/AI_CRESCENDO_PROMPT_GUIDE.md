# AI Crescendo-Decrescendo Prompt Guide

Create Crescendo/Decrescendo gestures via AI prompt — **two-step UI workflow** or **single `go()` call**.

---

## How It Works

### UI Workflow (Two Steps)
1. **Step 1 — "1: Curve"**: Creates the curve. User can visually adjust slope/shape.
2. **Step 2 — "2: Generate"**: Creates LilyPond notation → SVG → MIDI (pitch bend + CC7 volume ramp). Inserts all into score.

### AI Prompt Workflow
User describes the crescendo → Cascade provides `CrescendoUI.go({...})` command → user pastes in browser console.

**Important:** Cascade provides copy-paste JS commands. Cascade must NEVER check/start/interact with the dev server.

---

## Prompt Templates

### Option A: Copy-Paste Template

```
Create a crescendo:
- Track: ___ (1-4)
- Clef: ___ (treble / cClef / bass)
- Start: ___ s, End: ___ s   (OR: Start: ___ s, Duration: ___ s)
- Pitch model: ___ (glissando / single)
- Start pitch: ___ (glissando only, e.g., A3)
- End pitch: ___ (glissando only, e.g., Ab3)
- Pitch: ___ (single pitch only, e.g., A3)
- Y1: ___, Y2: ___ (0-10, curve intensity — Y up = crescendo, Y down = decrescendo)
- Model: ___ (logarithmic / exponential / power / sigmoid / bezier)
- Slope: ___ (-3 to +3)
- Dynamic 1: ___ (p, ppp, mf, etc. — notation start dynamic)
- Dynamic 2: ___ (f, fff, mp, etc. — notation end dynamic)
- Velocity: ___ (0-127, MIDI velocity)
- Color: ___ (brightOrange, limeGreen, brightRed, etc.)
- Fill: ___ (line / bottom / top)
```

### Option B: Natural Language

> "Crescendo on track 1, treble, 247s to 257s, glissando A#3 to A3, Y1 0 Y2 10, logarithmic slope -0.65, ppp to f, velocity 115"

> "Decrescendo on track 2, cClef, start 100s duration 5s, single pitch Bb3, Y1 10 Y2 0, power slope 1, ff to pp"

### Option C: Trigger Phrase (Guided)

> "Create a crescendo"

Cascade will ask each parameter in turn. Say "default" to skip any question.

---

## How Cascade Executes

Cascade provides this JavaScript for the browser console:

### Glissando Pitch Model
```javascript
CrescendoUI.go({
    startSeconds: 247,
    endSeconds: 257,
    gTrack: '1',
    clef: 'treble',
    pitchModel: 'glissando',
    startPitch: 'A#3',
    endPitch: 'A3',
    y1: 0,
    y2: 10,
    model: 'logarithmic',
    slope: -0.65,
    dynamic1: 'ppp',
    dynamic2: 'f',
    velocity: 115,
    color: 'limeGreen',
    fillMode: 'bottom'
});
```

### Single Pitch Model
```javascript
CrescendoUI.go({
    startSeconds: 100,
    endSeconds: 105,
    gTrack: '2',
    clef: 'cClef',
    pitchModel: 'single',
    pitch: 'Bb3',
    y1: 10,
    y2: 0,
    model: 'power',
    slope: 1,
    dynamic1: 'ff',
    dynamic2: 'pp',
    velocity: 100,
    color: 'brightOrange',
    fillMode: 'bottom'
});
```

---

## What Happens Inside

1. **Curve created** via `CurveMaker.createCurve()` with model/slope/Y values
2. **LilyPond file** created from template (`CrescendoGlissandoTemplate.ly` or `CrescendoSinglePitchTemplate.ly`)
3. **SVG rendered** via `render_glissando.ps1` + server-side crop
4. **SVG inserted** into score (42% track height, 5px left of curve start)
5. **MIDI segments** generated:
   - **Pitch bend** segments (glissando model: 2-semitone segments like LongToneUI)
   - **CC7 volume** ramp following curve Y (0-127, sampled every 50ms)
   - Both interleaved in each segment's MIDI file
6. **MIDI inserted** into MidiSnippetDatabase + MidiController tracks

---

## Defaults (when omitted)

| Parameter | Default |
|-----------|---------|
| Track | 1 |
| Clef | treble |
| Pitch model | glissando |
| Y1 | 0 |
| Y2 | 10 |
| Model | logarithmic |
| Slope | -0.65 |
| Dynamic 1 | p |
| Dynamic 2 | f |
| Velocity | 115 |
| Color | limeGreen |
| Fill | bottom |
| Articulation (CC0) | 89 (senza vibrato) |

---

## Y Direction Rules

| Y Direction | Hairpin | Volume |
|-------------|---------|--------|
| Y1 < Y2 (curve goes up) | Crescendo `<` | CC7 ramps from low to high |
| Y1 > Y2 (curve goes down) | Decrescendo `>` | CC7 ramps from high to low |

---

## Pitch Model Details

### Glissando Model
- Two pitches (start + end) with glissando line in notation
- MIDI: multi-segment pitch bend (same as Long Tone Glissando)
- CC7 volume ramp interleaved with pitch bend in each segment
- Notation: two noteheads with glissando line, hairpin, two dynamics, "Non-Vib" text, "secco" text

### Single Pitch Model
- One pitch, half-note notehead without stem
- MIDI: single segment, no pitch bend (center 8192)
- CC7 volume ramp only
- Notation: single notehead, hairpin, two dynamics, "Non-Vib" text, "secco" text

---

## MIDI Channel Notes

- CC7 (Volume) messages use standard channel (0xB0)
- Pitch bend messages use standard channel (0xE0)
- CC0 articulation (89 = senza vibrato) sent at segment start
- Sample rate: 50ms (20 messages/second) for both CC7 and pitch bend

---

## Server Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `POST /api/lilypond/create-crescendo` | Create .ly file from template |
| `POST /api/lilypond/render-glissando` | Render .ly to SVG (shared endpoint) |
| `POST /api/midi/save` | Save MIDI segment files |

---

## Key Functions

| Function | Purpose |
|----------|---------|
| `CrescendoUI.step1(params)` | Create curve only |
| `CrescendoUI.step2(params)` | Generate notation + SVG + MIDI |
| `CrescendoUI.go(params)` | Full workflow (step1 + step2) |
| `CrescendoUI.generateCrescendoMidi()` | Build MIDI segments with CC7 + pitch bend |
| `CrescendoUI.insertCrescendoMidi()` | Insert MIDI into score |
| `CrescendoUI.insertCrescendoSvg()` | Insert notation SVG into score |

---

<!-- Pre-Step 1 Validation Checklist: Add/modify/remove checks here -->
## Pre-Step 1 Validation Checklist

Before executing, Cascade should verify:

1. **Missing Required Parameters** — Ask if start/end time, track, or pitches are missing
2. **Clef vs Pitch Range** — Flag if pitches need >2 ledger lines; suggest alternative clef
3. **Dynamic Direction** — Warn if dynamics contradict Y direction (e.g., Y crescendo but dynamics go fff→ppp)
4. **Pitch Order vs Y Direction** — For glissando model, flag if pitch direction contradicts Y
5. **Time Overlap** — Warn if curve already exists on same track/time
6. **Duration Sanity** — Warn if <0.5s or >60s
