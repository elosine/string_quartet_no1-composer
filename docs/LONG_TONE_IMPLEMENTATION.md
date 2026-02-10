# Long Tone MIDI Model Implementation

## Overview

The Long Tone MIDI model generates glissando segments from CurveMaker curves, mapping the curve's Y-axis to pitch. Each segment is exported as a separate MIDI file with pitch bend automation.

## Core Principles

### Pitch Mapping
- **High Y value** → Higher pitch (regardless of curve direction)
- **Low Y value** → Lower pitch (regardless of curve direction)
- User specifies low and high pitch; the curve shape determines the glissando contour

### Segment Division
- Each segment spans **exactly 2 semitones** (one whole tone)
- This maximizes the pitch bend range (±2 semitones is the standard sampler default)
- The **final segment** may span less than 2 semitones to reach the exact target pitch

### Pitch Bend Logic

#### Glissando Down (high Y → low Y)
1. MIDI note = sounding pitch **- 1 semitone**
2. Initial pitch bend = **16383** (max up, +1 semitone from MIDI note = target pitch)
3. End pitch bend = **0** (max down, -1 semitone from MIDI note = 2 semitones below start)

#### Glissando Up (low Y → high Y)
1. MIDI note = sounding pitch **+ 1 semitone**
2. Initial pitch bend = **0** (max down, -1 semitone from MIDI note = target pitch)
3. End pitch bend = **16383** (max up, +1 semitone from MIDI note = 2 semitones above start)

### Pitch Bend Values
- **Center (no bend):** 8192
- **Maximum up (+2 semitones):** 16383
- **Maximum down (-2 semitones):** 0
- **Per semitone:** ±4096 from center

## Configurable Constants

Located at the top of `generateLongToneSegments()`:

```javascript
const PITCH_BEND_RANGE = 2;           // semitones before new segment
const PITCH_BEND_SAMPLE_INTERVAL = 50; // ms between pitch bend messages (20/sec)
const PITCH_BEND_CENTER = 8192;
const PITCH_BEND_MAX = 16383;
const PITCH_BEND_MIN = 0;
```

## Segment Data Structure

Each segment object contains:

```javascript
{
  index: number,              // Segment index (0-based)
  startTime: number,          // Start time in seconds
  endTime: number,            // End time in seconds
  duration: number,           // Duration in seconds
  startPitch: number,         // Sounding pitch at start (MIDI, can be fractional)
  endPitch: number,           // Sounding pitch at end
  midiNote: number,           // Actual MIDI note-on value (offset by 1 semitone)
  startBend: number,          // Initial pitch bend (0-16383)
  endBend: number,            // Final pitch bend
  pitchBendSamples: [{time, value}], // Pitch bend messages at 50ms intervals
  cc0Value: number|null,      // Articulation (only for segments 0-1)
  velocity: number,           // From dynamics dropdown
  isGlissDown: boolean        // Direction flag
}
```

## MIDI Export

### File Naming Convention
`{curveName}_seg{##}_{pitchName}_{direction}.mid`

Example: `myCurve_seg01_C4_dn.mid`

### MIDI File Structure (Format 1)
- **Ticks per beat:** 480
- **Tempo:** 120 BPM
- **Track 0:** Tempo track
- **Track 1:** Data track containing:
  1. CC0 (articulation) at tick 0 (if applicable)
  2. Initial pitch bend at tick 0
  3. Note On at tick 0 with velocity
  4. Pitch bend samples at 50ms intervals following curve shape
  5. Note Off at segment end

## UI Elements

All located in `longToneParams` div (lines ~1010-1062 in index.html):

| Element ID | Purpose |
|------------|---------|
| `longTonePitchMode` | Single note vs Glissando selector |
| `longToneSinglePitchRow` | Single pitch input container |
| `longTonePitch` | Single pitch input field |
| `longToneGlissandoParams` | Glissando inputs container |
| `longToneLowPitch` | Low pitch input |
| `longToneHighPitch` | High pitch input |
| `longToneArticulation` | CC0 articulation dropdown |
| `longToneDynamic` | Velocity/dynamic dropdown |
| `longToneGenerateBtn` | Generate Segments button |
| `longToneExportMidiBtn` | Export MIDI Files button |
| `longToneSegmentInfo` | Segment info display panel |

## Key Functions

### `generateLongToneSegments()`
- Reads curve data and pitch inputs
- Calculates pitch at each curve sample point
- Walks through samples, creating new segment when pitch deviates > 2 semitones
- For each segment, calculates MIDI note (offset by 1 semitone) and pitch bend samples
- Stores segments in `this.longToneSegments`
- Calls `displayLongToneSegments()` to update UI

### `displayLongToneSegments(segments, curve, lowPitch, highPitch)`
- Renders segment info in the UI panel
- Shows per-segment: duration, velocity, MIDI note, sounding pitch range, pitch bend range, sample count, CC0

### `exportLongToneMidiFiles()`
- Uses File System Access API (`showDirectoryPicker`)
- Builds proper MIDI files with tempo track and data track
- Exports each segment as a separate .mid file
- Requires Chrome or Edge browser

### `updateLongTonePitchModeUI()`
- Toggles visibility of single pitch vs glissando input fields

### `midiToPitchName(midiPitch)`
- Converts MIDI pitch number to readable name (e.g., 60 → "C4")
- Handles fractional pitches with cents notation

## Event Listeners

Located in `MidiModelSystem.init()`:

```javascript
this.longTonePitchModeSelect.addEventListener('change', () => this.updateLongTonePitchModeUI());
this.longToneGenerateBtn.addEventListener('click', () => this.generateLongToneSegments());
this.longToneExportMidiBtn.addEventListener('click', () => this.exportLongToneMidiFiles());
```

## Articulation Values (CC0)

| Articulation | CC0 Value |
|--------------|-----------|
| Sustain | 89 |
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

## Future Considerations

1. **Pitch bend range** is configurable (`PITCH_BEND_RANGE = 2`) in case different samplers use different ranges
2. **Sample rate** is configurable (`PITCH_BEND_SAMPLE_INTERVAL = 50`) - decrease if glissando sounds choppy
3. **Single note mode** UI exists but pitch logic not yet implemented (only glissando mode is functional)
