# AI Glissando Prompt Guide

Create Long Tone Glissandos via AI prompt — **one-step server automation**.

**Single-step process:** User describes the glissando → Cascade calls the server endpoint → score is saved → user refreshes browser.

---

## How It Works

1. User describes the glissando (natural language, copy-paste template, or guided)
2. Cascade validates parameters, then calls `POST /api/glissando/create-and-save`
3. Server creates curve, LilyPond notation, SVG, multi-segment MIDI, saves new score
4. User refreshes browser — glissando appears with auto-scroll to 1s before start

---

## Prompt Templates

### Option A: Copy-Paste Template

```
Create a glissando:
- Start: ___ s, End: ___ s   (OR: Start: ___ s, Duration: ___ s)
- Track: ___ (1-4)
- Start pitch: ___ (e.g., E4, C#3)
- End pitch: ___ (e.g., C3, G#4)
- Clef: ___ (treble / cClef / bass)
- Dynamic: ___ (p, mp, mf, f, ff, etc. — notation only)
- Velocity: ___ (0-127, MIDI velocity)
- Y1: ___, Y2: ___ (0-10, curve intensity)
- Model: ___ (logarithmic / exponential / power / sigmoid / bezier)
- Slope: ___ (-3 to +3)
- Color: ___ (brightOrange, blue, limeGreen, etc.)
- Fill: ___ (line / bottom / top)
```

### Option B: Natural Language

> "Glissando on track 3, 120s to 128s, alto clef, A3 down to F3, mp, logarithmic slope -1"
> "Glissando on track 3, start 120s, duration 8s, alto clef, A3 down to F3, mp, logarithmic slope -1"

**Note:** You can specify timing as either **start + end** or **start + duration**. When duration is given, Cascade calculates end = start + duration before calling the API.

### Option C: Trigger Phrase (Guided)

> "Create a glissando"

Cascade will ask you each parameter in turn. Say "default" to skip any question.

---

## How Cascade Executes

Cascade runs this PowerShell command (user approves):

```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/glissando/create-and-save" -Method POST -ContentType "application/json" -Body '{"start":120,"end":128,"track":3,"startPitch":"A3","endPitch":"F3","clef":"cClef","dynamic":"mp","velocity":64,"y1":10,"y2":0,"model":"logarithmic","slope":-1,"color":"brightOrange","fillMode":"bottom"}'
```

The server then:
1. Loads the latest score
2. Creates curve with computed sample data
3. Creates LilyPond file from template, renders to SVG, crops
4. Generates MIDI segments (pitch bend, 2-semitone segments with 5ms overlap)
5. Adds curve, SVG element, MIDI snippets to score
6. Saves as next score iteration with version backup
7. Sets cursor to 1 second before start time

---

## Defaults (when omitted)

| Parameter | Default |
|-----------|---------|
| Y1 | 10 |
| Y2 | 0 |
| Model | logarithmic |
| Slope | -0.65 |
| Dynamic | p (notation only) |
| Velocity | 64 (mp) |
| Articulation | 89 (senza vibrato CC0) |
| Color | limeGreen |
| Fill Mode | bottom |

---

## Parameter Reference

### Pitch Notation

| Format | Meaning | Example |
|--------|---------|---------|
| `C4` | Natural | Middle C |
| `C#4` | Sharp | C sharp 4 |
| `Bb3` | Flat | B flat 3 |
| `C+4` | Quarter sharp | |
| `Cd4` | Quarter flat | |
| `C#+4` | Three-quarter sharp | |
| `Cbd4` | Three-quarter flat | |

### Y1 / Y2 (Curve Intensity)

- High Y = high pitch, Low Y = low pitch
- **Descending gliss:** Y1=10, Y2=0 (default)
- **Ascending gliss:** Y1=0, Y2=10

### Curve Models

| Model | Shape |
|-------|-------|
| `logarithmic` | Fast initial change, gradual tail (default) |
| `exponential` | Gradual start, fast finish |
| `power` | Adjustable power curve |
| `sigmoid` | S-curve, smooth transition |
| `bezier` | Bezier-based |

### Slope (-3 to +3)

- **0** = linear
- **-1** = ~46% of change in first 10% of duration
- **-2** = ~76% in first 10%
- **-3** = ~91% in first 10%
- Positive = opposite curvature

### Tracks

| Track | Instrument |
|-------|-----------|
| 1 | Violin I |
| 2 | Violin II |
| 3 | Viola |
| 4 | Cello |

### Clefs

| Value | Clef |
|-------|------|
| `treble` | Treble (G clef) |
| `cClef` | Alto / C clef |
| `bass` | Bass (F clef) |

---

## Pre-Step 1 Validation Checklist

<!-- VALIDATION CHECKLIST: Cascade performs these checks before running step1.
     To add, remove, or modify checks, edit this section.
     Each check has: what to check, when to flag, and what to suggest. -->

Before running `LongToneUI.step1()`, Cascade validates the parsed parameters and flags issues:

### 1. Missing Required Parameters
**Check:** Start time, end time (or duration), track, start pitch, end pitch must all be provided.
**Flag:** If any are missing, ask the user before proceeding.
**Note:** If user provides start + duration, Cascade calculates end = start + duration.

### 2. Clef vs Pitch Range
**Check:** Do the pitches sit comfortably in the chosen clef?
**Flag:** If either pitch requires more than 2 ledger lines in the chosen clef.
**Suggest:** Alternative clef (e.g., "D4 in bass clef needs a ledger line — consider cClef?")

| Clef | Comfortable Range |
|------|------------------|
| `treble` | C4 – C7 |
| `cClef` | C3 – C6 |
| `bass` | C1 – C4 |

### 3. Unusual Interval
**Check:** Is the pitch interval very small (<1 semitone) or very large (>2 octaves)?
**Flag:** Warn and confirm intent.
**Rationale:** Very small intervals may produce barely audible glissandos; very large intervals may produce unusable MIDI segments.

### 4. Pitch Order vs Y Direction
**Check:** If start pitch > end pitch, the gliss is descending (Y1 should be > Y2, default 10→0). If start pitch < end pitch, it's ascending (Y1 should be < Y2, i.e., 0→10).
**Flag:** If the user specifies Y values that contradict the pitch direction.
**Suggest:** "Your pitches go D4→Cd4 (descending) but Y1=0, Y2=10 implies ascending. Did you mean Y1=10, Y2=0?"

### 5. Time Overlap
**Check:** Is there already a curve on the same track in the overlapping time range?
**Flag:** Warn if overlap detected.
**Note:** This check requires reading CurveDatabase — Cascade should mention if it cannot verify.

### 6. Duration Sanity
**Check:** Is the duration extremely short (<0.5s) or extremely long (>60s)?
**Flag:** Warn and confirm intent.

---

## MIDI Output Details

- **Format 1 MIDI** per segment (tempo track + data track)
- **Pitch bend range:** 2 semitones per segment (MIDI standard)
- **Segments:** Auto-divided when pitch deviates >2 semitones from segment base
- **Overlap:** 5ms between consecutive segments for seamless transitions
- **CC0 (articulation):** Sent on first 2 segments only (default 89 = senza vibrato)
- **Pitch bend samples:** Every 50ms (20 per second)
- **Note direction:** Gliss down = MIDI note at startPitch-1, bend starts at max; Gliss up = MIDI note at startPitch+1, bend starts at min

---

## Full Example

**You say:**
> Create a glissando: Start 120s, End 128s, Track 3, E4 to C3, cClef, mp, Y1=10 Y2=0, logarithmic slope -1

**Cascade runs:**
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/glissando/create-and-save" -Method POST -ContentType "application/json" -Body '{"start":120,"end":128,"track":3,"startPitch":"E4","endPitch":"C3","clef":"cClef","dynamic":"mp","velocity":64,"y1":10,"y2":0,"model":"logarithmic","slope":-1,"color":"brightOrange","fillMode":"bottom"}'
```

**Cascade responds:**
> Glissando created on track 3 (120s–128s), E4→C3, cClef, mp, logarithmic slope -1. Score saved as "10". Refresh browser to see it.

> **Note:** The two-stage UI workflow (Step 1: Create Curve → Step 2: Generate) is still available for manual use. The AI automation combines both stages into one server call.
