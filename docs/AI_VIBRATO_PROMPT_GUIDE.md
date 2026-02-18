# AI Vibrato Motive Prompt Guide

Create vibrato motives via AI prompt — fully automated, no console commands needed.

**One-step process:**
1. **Prompt with all data** → Cascade calls the server → curve, notation SVG, and MIDI are generated and added to your score → refresh to see it

---

## Prompt Template

### Option A: Copy-Paste Template

```
Create vibrato motive:
- Start: ___ s, End: ___ s   (OR: Start: ___ s, Duration: ___ s)
- Track: ___ (1-4)
- Pitch: ___ (e.g., E4, C#3)
- Clef: ___ (treble / cClef / bass)
- Start dynamic: ___ (p, mp, mf, f, ff, etc.)
- End dynamic: ___ (p, mp, mf, f, ff, etc.)
- Velocity: ___ (0-127)
- Y1: ___, Y2: ___ (0-10, vibrato intensity)
- Model: ___ (logarithmic / exponential / power / sigmoid / bezier)
- Slope: ___ (-3 to +3)
- Color: ___ (limeGreen, brightOrange, brightBlue, etc.)
- Fill: ___ (bottom / top / line)
```

### Option B: Natural Language

> "Vibrato motive on track 2, 45s to 52s, D4, treble clef, mp to p, wide to narrow, logarithmic steep slope"
> "Vibrato motive on track 2, start 45s, duration 7s, D4, treble clef, mp to p, wide to narrow, logarithmic steep slope"

**Note:** You can specify timing as either **start + end** or **start + duration**. When duration is given, Cascade calculates end = start + duration before calling the API.

### Option C: Trigger Phrase (Guided)

> "Create vibrato motive"

Cascade will ask you each parameter in turn. Say "default" to skip any question.

---

## What Happens

1. Cascade parses your parameters and validates them
2. Cascade runs a single PowerShell command to call the server endpoint
3. The server:
   - Loads the latest score file (highest numbered)
   - Creates the curve with computed sample data
   - Creates and renders the LilyPond notation SVG
   - Generates the MIDI file (CC0=89, CC4 + channel pressure following curve Y)
   - Adds everything (curve, SVG element, MIDI events) to the score
   - Updates the cursor position to the vibrato start time
   - Saves as the next score iteration (e.g., "2-post" → "3")
4. **User refreshes the browser** — the new score auto-loads, scrolled to the vibrato position

> **No console commands needed.** The entire workflow is automated through the server.

---

## How Cascade Executes

Cascade runs this PowerShell command (user approves it):

```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/vibrato/create-and-save" -Method POST -ContentType "application/json" -Body '{"start":45,"end":52,"track":2,"pitch":"D4","clef":"treble","startDynamic":"mp","endDynamic":"p","velocity":115,"y1":10,"y2":0,"model":"logarithmic","slope":-0.65,"color":"limeGreen","fillMode":"bottom"}'
```

---

## Defaults (when omitted)

| Parameter | Default |
|-----------|---------|
| Y1 | 10 |
| Y2 | 0 |
| Model | logarithmic |
| Slope | -0.65 |
| Dynamic (start) | mp |
| Dynamic (end) | p |
| Velocity | 115 |
| Color | limeGreen |
| Fill | bottom |
| Clef | treble |

---

## Direction (Auto-Determined)

Direction is **not a parameter** — it's auto-determined from Y1 vs Y2:

| Y1 vs Y2 | Direction | Meaning |
|-----------|-----------|---------|
| Y1 ≥ Y2 (e.g., 10→0) | wide-narrow | Vibrato intensity decreases |
| Y1 < Y2 (e.g., 0→10) | narrow-wide | Vibrato intensity increases |

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

### Y1 / Y2 (Vibrato Intensity)

- **High Y = wide vibrato**, Low Y = narrow vibrato
- **Wide-to-narrow:** Y1=10, Y2=0 (default)
- **Narrow-to-wide:** Y1=0, Y2=10

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
- **-0.65** = default (moderate steep start)
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

### Colors

| Color | Key |
|-------|-----|
| Orange | `brightOrange` |
| Blue | `brightBlue` |
| Yellow | `mustard` |
| Red | `brightRed` |
| Green | `green` |
| Lime | `limeGreen` |
| Bright Green | `brightGreen` |
| Navy | `navyBlue` |
| Purple | `purple` |
| Rose | `roseGold` |
| Plum | `plum` |
| Coral | `coral` |

---

## MIDI Output

The generated MIDI file contains:
- **CC0 = 89** at tick 0 (vibrato articulation)
- **Note On** at tick 0 (pitch from parameter, velocity from parameter)
- **CC4** samples following curve Y (0-127 scale, 50ms interval)
- **Channel Pressure** (aftertouch) — identical to CC4 values
- **Note Off** at end of duration

---

## Pre-Generation Validation Checklist

Before calling the endpoint, Cascade validates:

### 1. Missing Required Parameters
**Check:** Start time, end time (or duration), track, and pitch must all be provided.
**Flag:** If any are missing, ask the user before proceeding.
**Note:** If user provides start + duration, Cascade calculates end = start + duration.

### 2. Clef vs Pitch Range
**Check:** Does the pitch sit comfortably in the chosen clef?
**Flag:** If the pitch requires more than 2 ledger lines.

| Clef | Comfortable Range |
|------|------------------|
| `treble` | C4 – C7 |
| `cClef` | C3 – C6 |
| `bass` | C1 – C4 |

### 3. Duration Sanity
**Check:** Is the duration extremely short (<0.5s) or extremely long (>60s)?
**Flag:** Warn and confirm intent.

### 4. Time Overlap
**Check:** Is there already a curve on the same track in the overlapping time range?
**Flag:** Warn if overlap detected.
**Note:** This check requires reading the score file — Cascade should mention if it cannot verify.

---

## Full Example

**You say:**
> Create vibrato motive: Start 120s, End 128s, Track 3, D4, cClef, mp to p, Y1=10 Y2=0, logarithmic slope -0.65

**Cascade responds:**
> Creating vibrato motive on track 3 (120s–128s), D4, cClef, mp→p, wide-narrow, logarithmic slope -0.65...
>
> ✓ Done. Score saved as "3". Refresh your browser to see the vibrato motive.

**You refresh the browser — the score auto-loads, scrolled to 120s, showing:**
- Lime green curve on track 3
- Vibrato notation SVG at the curve's left edge
- MIDI snippet with CC4 + channel pressure following the curve
