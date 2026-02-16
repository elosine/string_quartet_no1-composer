# Vibrato System Implementation

**Status:** Feature-complete (automation + UI + bug fixes)  
**Last Updated:** Feb 16, 2026  
**ASB Range:** ASB-030 through ASB-037

## Overview

The Vibrato System creates fully automated vibrato motives on the score. From a single set of parameters, it generates: a shaped intensity curve, LilyPond vibrato notation compiled to SVG, and a MIDI file with CC4 + channel pressure automation — all inserted into the score and persisted via ScoreManager.

Two parallel input methods:
- **UI workflow**: Multi-step buttons (Step 1: Create Curve, Generate button runs Steps 2-5)
- **AI prompt workflow**: Natural language → Cascade calls server endpoint → one-step automation

## Architecture

### Client-Side: 5-Step Generate Flow (`VibratoUI.generate()`)

**Step 1: Create Curve** (`VibratoUI.createCurve()`)
- Reads all UI controls (track, start/end, Y1/Y2, model, slope, color, fill)
- Auto-determines direction from Y1 vs Y2 (Y1≥Y2 = wide→narrow, Y1<Y2 = narrow→wide)
- Creates a CurveMaker curve via `CurveMaker.createCurve()`

**Step 2: Create LilyPond** (`VibratoUI.generate()` → POST `/api/lilypond/create-vibrato`)
- Selects template based on direction (Wide→Narrow or Narrow→Wide)
- Substitutes clef, pitch, start/end dynamics into template

**Step 3: Render SVG** (reuses `LongToneUI.renderGlissandoSvg()`)
- Compiles LilyPond → SVG via PowerShell
- Server-side crop to content bounds (3-pass algorithm)

**Step 4: Insert SVG** (`VibratoUI.insertVibratoSvg()`)
- Positions SVG at left edge of curve on the correct track
- Scale: 85% of track height
- Uses `trackYFraction: 0` for track-relative Y positioning
- Persisted via SVGElementManager

**Step 5: Generate + Insert MIDI** (`VibratoUI.generateVibratoMidi()` + `insertVibratoMidi()`)
- Builds Format 1 MIDI file with CC0=89, CC4, channel pressure
- Saves via `/api/midi/save`, inserts into MidiSnippetDatabase + MidiController

### Server-Side: One-Step Automation (`POST /api/vibrato/create-and-save`)

The server endpoint replicates the entire 5-step client workflow in a single request:

1. Loads latest score (highest numbered file)
2. Computes curve data server-side (all 5 interpolation models replicated)
3. Creates LilyPond file from template, renders SVG via PowerShell
4. Generates MIDI file (CC0=89, CC4 + channel pressure at 50ms intervals)
5. Adds curve to `databases.curves`, SVG to `svgElements`, MIDI to `midiTracks` + `databases.midiSnippets`
6. Updates cursor state to 1 second before vibrato start
7. Saves as next score iteration with version backup

### Auto-Load on Refresh

- `GET /api/score/latest` returns most recently modified score name
- `ScoreManager.init()` checks this endpoint first, falls back to localStorage
- After automation saves score "N", browser refresh auto-loads "N" and scrolls to vibrato position

### Key Files

| File | Purpose |
|------|---------|
| `public/index.html` | VibratoUI object (~line 17070), SVGElementManager, all client functions |
| `server.js` | `/api/vibrato/create-and-save` (~line 1644), server-side curve/MIDI/SVG generation |
| `lilypond_code/DynamicVibrato-Wide-Narrow_Template.ly` | LilyPond template: wide→narrow vibrato wave |
| `lilypond_code/DynamicVibrato-Narrow-Wide_Template.ly` | LilyPond template: narrow→wide vibrato wave |
| `docs/AI_VIBRATO_PROMPT_GUIDE.md` | AI prompt reference for creating vibrato motives |

### Server Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/vibrato/create-and-save` | POST | Full automation: curve + notation + MIDI → save score |
| `/api/lilypond/create-vibrato` | POST | Create .ly file from vibrato template |
| `/api/lilypond/render-glissando` | POST | Compile .ly → .svg (shared with glissando) |
| `/api/midi/save` | POST | Save MIDI file to `public/midi_files/` |
| `/api/score/latest` | GET | Return most recently modified score name |

## Parameters

### Full Parameter Set (Server Endpoint)

```json
{
    "start": 244,
    "end": 258,
    "track": 2,
    "pitch": "C4",
    "clef": "treble",
    "startDynamic": "fff",
    "endDynamic": "f",
    "velocity": 127,
    "y1": 10,
    "y2": 0,
    "model": "logarithmic",
    "slope": -0.44,
    "color": "limeGreen",
    "fillMode": "bottom"
}
```

### Defaults (when omitted)

| Parameter | Default |
|-----------|---------|
| track | 1 |
| pitch | C4 |
| clef | treble |
| startDynamic | mp |
| endDynamic | p |
| velocity | 115 |
| y1 | 10 |
| y2 | 0 |
| model | logarithmic |
| slope | -0.65 |
| color | limeGreen |
| fillMode | bottom |

### Direction (Auto-Determined)

| Y1 vs Y2 | Direction | Template |
|-----------|-----------|----------|
| Y1 ≥ Y2 (e.g., 10→0) | wide-narrow | `DynamicVibrato-Wide-Narrow_Template.ly` |
| Y1 < Y2 (e.g., 0→10) | narrow-wide | `DynamicVibrato-Narrow-Wide_Template.ly` |

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

Slope: 0=linear, -0.65=default, -1=~46% in first 10%, -2=~76%, -3=~91%

## LilyPond Templates

### Vibrato Wave Generation (Scheme)
Both templates use a Scheme `build-vibrato-stencil` function that generates a Bézier-based vibrato wave:
- Wave amplitude transitions from wide to narrow (or vice versa)
- Rendered as smooth cubic Bézier curves in LilyPond markup
- Dynamics hairpin positioned below with `DynamicLineSpanner.staff-padding = #1.2`

### Template Substitutions
- `CLEF` → treble / alto / bass (converted from input)
- `PITCH` → LilyPond pitch notation (without duration)
- Start/end dynamics → LilyPond dynamic marks

## MIDI Generation

### MIDI File Structure (Format 1)
- 480 ticks/beat, 120 BPM (configurable from score tempo)
- CC0 = 89 at tick 0 (vibrato articulation marker)
- Note On at tick 0 with specified velocity and pitch
- CC4 samples following curve Y values (0-127 scale, 50ms intervals)
- Channel Pressure (aftertouch) — identical to CC4 values
- Note Off at end of duration

### File Naming
`Vib_{curveName}_{pitch}.mid`

### Score Insertion
- MIDI snippet added to MidiSnippetDatabase with track index
- Events added to MidiController's track array
- Channel pressure (0xD0) parsing added to `LongToneUI.parseMidiFileToEvents()`

## SVG Positioning

### Track-Relative Positioning
- `trackYFraction: 0` = top of track (standard position)
- Scale: 85% of track height
- Position: SVG right edge at curve start minus 5px gap
- Uses `CompositionPanel.getTrackDimensions()` for accurate Y placement

### Import/Persistence
SVG elements saved with:
- `startSeconds` — time-based X position (survives lead-in changes)
- `trackYFraction` — track-relative Y position (survives window resize)
- `track` — track number (1-4)
- `baseScale` / `baseScoreWidth` — proportional scaling on resize

## UI Elements

### Vibrato System Section (left panel)

| Element | Purpose |
|---------|---------|
| `vibTrackInput` | Track number (1-4) |
| `vibStartInput` / `vibEndInput` | Time range (seconds) |
| `vibY1Input` / `vibY2Input` | Vibrato intensity (0-10) |
| `vibModelSelect` | Curve model dropdown |
| `vibSlopeInput` | Slope coefficient |
| `vibVelocityInput` | MIDI velocity (0-127) |
| `vibColorSwatches` | 12-color palette (independent from curves) |
| `vibFill` radio | Line / Fill ↓ / Fill ↑ |
| Clef select | treble / cClef / bass |
| Pitch input | Standard pitch notation |
| Start/End dynamic dropdowns | pppp through ffff |
| Generate button | Runs 5-step flow |

## AI Prompt System

**Reference:** `docs/AI_VIBRATO_PROMPT_GUIDE.md`

Three input modes:
1. **Template**: Copy-paste form with all parameters
2. **Natural language**: Describe freely, Cascade parses
3. **Guided**: Say "Create vibrato motive", Cascade asks each parameter

One-step: Cascade calls the server endpoint via PowerShell, server does everything. User refreshes browser.

## Server Helper Functions (server.js)

| Function | Purpose |
|----------|---------|
| `computeYAtT(model, slope, y1Norm, y2Norm, t)` | Curve Y interpolation (all 5 models) |
| `generateCurveSamples(start, end, y1, y2, model, slope)` | 100 samples/sec curve data |
| `pitchToLilyPond(pitch)` | Convert pitch string to LilyPond notation |
| `clefToLilyPond(clef)` | Convert clef name to LilyPond |
| `pitchToMidi(pitchStr)` | Convert pitch string to MIDI note number |
| `generateVibratoFilename(direction, clef, pitch, startDyn, endDyn)` | Generate base filename |
| `buildVibratoMidiFile(midiNote, velocity, duration, ccSamples, bpm)` | Build MIDI file Buffer |
| `parseMidiToEvents(midiData, baseTimeMs, bpm)` | Server-side MIDI parser |
| `findLatestScoreAndNext()` | Find highest numbered score, return next name |

## Bugs Fixed During Development

| Bug | Root Cause | Fix | ASB |
|-----|-----------|-----|-----|
| SVG crop clips vibrato waves | Single regex fails on long Bézier path `d` attributes | Three-pass crop: regex → substring → indexOf fallback | ASB-033 |
| Dynamics positioned wrong | Fixed `Hairpin.Y-offset` breaks with vibrato notation | Use `DynamicLineSpanner.staff-padding` for auto-positioning | ASB-033 |
| Server SVG always on track 1 | Missing `trackYFraction` in server SVG entry | Added `trackYFraction: 0` to SVG element data | ASB-037 |
| ObjectSelector select can't drag | SVG behind other objects in z-order | `bringToFront()` in `selectElement()` | ASB-037 |
| Cursor at exact start | No pre-scroll margin | Changed to `startSeconds - 1` | ASB-037 |
| Auto-load misses server scores | Client only checked localStorage | Added `/api/score/latest` endpoint | ASB-036 |

## Future Considerations

1. Extend ObjectSelector z-order fix to curves, motives, MIDI snippets
2. Quarter-tone pitch support in LilyPond templates (verify rendering)
3. Batch automation: create multiple vibrato motives in one prompt
4. Configurable CC sample interval (currently 50ms)
5. Visual preview of vibrato wave in UI before generating
