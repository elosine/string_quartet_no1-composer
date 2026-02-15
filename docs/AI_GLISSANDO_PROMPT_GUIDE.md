# AI Glissando Prompt Guide

Create Long Tone Glissandos via AI prompt — parallel to the UI workflow.

**Two-stage process:**
1. **Prompt with all data** → curve appears → adjust slope/shape as needed
2. **Say "Generate"** → notation, SVG, and MIDI are created automatically

---

## Stage 1: Create the Curve

### Option A: Copy-Paste Template

```
Create a glissando:
- Start: ___ s, End: ___ s
- Track: ___ (1-4)
- Start pitch: ___ (e.g., E4, C#3)
- End pitch: ___ (e.g., C3, G#4)
- Clef: ___ (treble / cClef / bass)
- Dynamic: ___ (p, mp, mf, f, ff, etc. — notation only, not MIDI velocity)
- Y1: ___, Y2: ___ (0-10, curve intensity)
- Model: ___ (logarithmic / exponential / power / sigmoid / bezier)
- Slope: ___ (-3 to +3)
```

### Option B: Natural Language

> "Glissando on track 3, 120s to 128s, alto clef, A3 down to F3, mp, logarithmic steep slope"

### Option C: Trigger Phrase (Guided)

> "Create a glissando"

Cascade will ask you each parameter in turn. Say "default" to skip any question.

### What Happens

- Cascade parses your parameters, shows a summary for confirmation
- Runs Step 1: curve appears on the score
- **You can now adjust the slope in the UI** — drag, change model, etc.
- All pitch/clef/track data is remembered for Stage 2

---

## Stage 2: Generate Everything

When you're happy with the curve shape, say:

> **"Generate"**

That's it. Cascade will run Steps 2-4 automatically using the data you provided in Stage 1:
- Generate LilyPond notation
- Render and insert SVG
- Generate and insert MIDI segments

---

## Defaults (when omitted)

| Parameter | Default |
|-----------|---------|
| Y1 | 10 |
| Y2 | 0 |
| Model | logarithmic |
| Slope | 0 (linear) |
| Dynamic | p (notation only) |
| Velocity | 64 (mp) |
| Articulation | 89 (senza vibrato) |

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

## Full Example

**You say:**
> Create a glissando: Start 120s, End 128s, Track 3, E4 to C3, cClef, mp, Y1=10 Y2=0, logarithmic slope -1

**Cascade responds:**
> Created curve on track 3 (120s–128s), E4→C3, logarithmic slope -1. Adjust the curve shape if needed, then say "Generate".

**You adjust the slope in the UI if desired, then say:**
> Generate

**Cascade responds:**
> Done. Notation SVG inserted, 4 MIDI segments generated and placed on track 3.
