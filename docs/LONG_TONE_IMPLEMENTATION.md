# Long Tone Glissando Implementation

**Status:** Feature-complete (Tier 3 milestone)  
**Last Updated:** Feb 14, 2026  
**Git Tag:** `milestone-asb-glissando-complete`

## Overview

The Long Tone Glissando system creates fully automated glissando gestures on the score. From a single set of parameters, it generates: a shaped curve, LilyPond notation compiled to SVG, and segmented MIDI files with pitch bend automation — all inserted into the score and persisted via ScoreManager.

Two parallel input methods:
- **UI workflow**: Two-phase buttons (Step 1: Curve, Step 2: Generate)
- **AI prompt workflow**: Guided questionnaire or natural language → console commands

## Architecture

### Two-Stage Workflow

**Stage 1: Create Curve** (`LongToneUI.step1(params)`)
- Creates a CurveMaker curve with specified time, track, shape model, and slope
- Stores as `pendingCurve` for Stage 2
- User can adjust slope/shape visually before proceeding

**Stage 2: Generate All** (`LongToneUI.step2(params)`)
- Step 2a: Generate LilyPond notation file → server
- Step 2b: Render LilyPond to cropped SVG (via Inkscape)
- Step 2c: Insert SVG into score at curve position
- Step 3: Generate MIDI segment files → server
- Step 4: Insert MIDI segments into score

**One-shot**: `LongToneUI.go(params)` runs both stages sequentially.

### Key Files

| File | Purpose |
|------|---------|
| `public/index.html` | LongToneUI object (~line 15582), all client functions |
| `server.js` | `/api/lilypond/render-glissando`, `/api/midi/save` endpoints |
| `lilypond_code/render_glissando.ps1` | PowerShell: LilyPond compile + Inkscape crop |
| `lilypond_code/GlissandoNotationTemplate.ly` | LilyPond template with CLEF/PITCH variables |

### Server Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/lilypond/render-glissando` | POST | Compile .ly → .svg, crop with Inkscape |
| `/api/midi/save` | POST | Save MIDI file to `public/midi_files/` |

## Core Principles

### Pitch Mapping
- **High Y value** → Higher pitch (regardless of curve direction)
- **Low Y value** → Lower pitch
- Pitches sorted by `Math.max/min`, so user input order doesn't matter
- Curve direction determines gliss direction

### Segment Division
- Each segment spans **exactly 2 semitones**
- Maximizes pitch bend range (±2 semitones = standard sampler default)
- Final segment may span less to reach exact target pitch

### Pitch Bend Logic

**Glissando Down** (high Y → low Y):
- MIDI note = sounding pitch **- 1 semitone**
- Initial pitch bend = **16383** (max up), End = **0** (max down)

**Glissando Up** (low Y → high Y):
- MIDI note = sounding pitch **+ 1 semitone**
- Initial pitch bend = **0** (max down), End = **16383** (max up)

### Pitch Bend Values
- Center (no bend): 8192
- Maximum up (+2 semitones): 16383
- Maximum down (-2 semitones): 0

## Parameters

### Full Parameter Set

```javascript
LongToneUI.go({
    startSeconds: 221,      // Required: start time
    endSeconds: 227,        // Required: end time
    gTrack: '2',            // Required: track 1-4
    startPitch: 'Eb4',      // Required: start pitch
    endPitch: 'C#+4',       // Required: end pitch
    clef: 'treble',         // treble / cClef / bass
    y1: 10,                 // Curve intensity at start (0-10)
    y2: 0,                  // Curve intensity at end (0-10)
    model: 'logarithmic',   // logarithmic/exponential/power/sigmoid/bezier
    slope: -1.68,           // Curve steepness (-3 to +3)
    velocity: 64,           // MIDI velocity (default: mp)
    articulation: 89        // CC0 value (default: senza vibrato)
})
```

### Pitch Notation

| Format | Meaning |
|--------|---------|
| `C4` | Natural |
| `C#4` | Sharp |
| `Bb3` | Flat |
| `C+4` | Quarter sharp |
| `Cd4` | Quarter flat |
| `C#+4` | Three-quarter sharp |
| `Cbd4` | Three-quarter flat |

### Curve Models & Slope

| Model | Description |
|-------|-------------|
| `logarithmic` | Fast initial change, gradual tail (default) |
| `exponential` | Gradual start, fast finish |
| `power` | Adjustable power curve |
| `sigmoid` | S-curve |
| `bezier` | Bezier-based |

Slope (logarithmic): 0=linear, -1=~46% in first 10%, -2=~76%, -3=~91%

## SVG Notation Pipeline

1. `generateNotation()` → creates LilyPond .ly file from template
2. `renderGlissandoSvg()` → POST to server → runs `render_glissando.ps1`
3. Script: LilyPond compiles .ly → .svg, Inkscape crops to content bounds
4. `insertGlissandoSvg()` → fetches SVG, parses content bounds, positions right edge 5px before curve start
5. Uses SVGElementManager for persistence (time-based via `startSeconds`)

### SVG Positioning
- Scale: 90% of track height
- Content bounds analysis: finds actual drawn content width (excluding SVG whitespace)
- Position: visible right edge = curveStartX - 5px
- Uses `leadInSeconds` closure variable (not `window.leadInSeconds`)

## MIDI Generation

### Configurable Constants

```javascript
const PITCH_BEND_RANGE = 2;            // semitones per segment
const PITCH_BEND_SAMPLE_INTERVAL = 50; // ms between pitch bend messages
```

### MIDI File Structure (Format 1)
- 480 ticks/beat, 120 BPM
- Track 0: Tempo track
- Track 1: CC0 (articulation) → pitch bend → Note On → pitch bend samples → Note Off

### File Naming
`{curveName}_seg{##}_{pitchName}_{direction}.mid`

### Score Insertion
- First segment starts at curve startSeconds
- Subsequent segments overlap by 5ms
- Uses **note duration** (not file duration) for timing
- Track assignment from `curve.gTrack`
- Stored as MidiSnippetDatabase entries + MidiController events

## UI Elements

### Long Tone Workflow Section (left panel)

| Element | Purpose |
|---------|---------|
| `ltStartInput` / `ltEndInput` | Time range |
| `ltY1Input` / `ltY2Input` | Curve intensity |
| `ltTrackSelect` | Track 1-4 |
| `ltSlopeInput` | Slope coefficient |
| `ltModelSelect` | Curve model dropdown |
| `ltClefSelect` | Clef dropdown |
| `ltStartPitch` / `ltEndPitch` | Pitch inputs |
| `ltStep1Btn` | Step 1: Create Curve |
| `ltStep2Btn` | Step 2: Generate |

## AI Prompt System

**Reference:** `docs/AI_GLISSANDO_PROMPT_GUIDE.md`

Three input modes:
1. **Template**: Fill-in-the-blank form pasted into chat
2. **Natural language**: Describe freely, Cascade parses
3. **Guided**: Say "Create a glissando", Cascade asks each parameter

Two-stage: All data collected in Stage 1 (curve creation). Stage 2 is just "Generate".

## Articulation Values (CC0)

| Articulation | CC0 Value |
|--------------|-----------|
| Senza Vibrato | 89 |
| Tremolo | 40 |
| Harmonics | 4 |

## Dynamic/Velocity Values

| Dynamic | Velocity |
|---------|----------|
| pppp | 8 |
| ppp | 22 |
| pp | 36 |
| p | 50 |
| mp | 64 |
| mf | 78 |
| f | 92 |
| ff | 106 |
| fff | 120 |
| ffff | 127 |

## Bugs Fixed During Development

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Wrong octaves in notation | LilyPond uses `'`/`,` marks, not numbers | Rewrote `pitchToLilyPond()` octave logic |
| SVG positioned too far left | `window.leadInSeconds` undefined (`let` not `var`) | Use closure variable directly |
| SVG whitespace offset | Inkscape not cropping canvas | Use actions API + content bounds analysis |
| Audio displays missing on load | `audioContext.resume()` blocks forever without user gesture | Render overlays before async audio loading |
| MIDI snippets missing time props | No `startSeconds`/`endSeconds` on legacy snippets | Added fallback computation |

## Future Considerations

1. Pitch bend range configurable (`PITCH_BEND_RANGE = 2`)
2. Sample rate configurable (`PITCH_BEND_SAMPLE_INTERVAL = 50`)
3. Single note mode UI exists but not yet implemented
4. Could extend AI prompt system to other gesture types
