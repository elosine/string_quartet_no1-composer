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
- Velocity: ___ (0-127, MIDI velocity — independent from dynamic notation)
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
- Runs `LongToneUI.step1(params)`: curve appears on the score
- **You can now adjust the slope/model in the UI** — drag, change model, etc.
- All manual adjustments are tracked in real time (curve data regenerates on every edit)
- Pitch/clef/track/dynamic/velocity data is remembered for Stage 2

---

## Stage 2: Generate Everything

When you're happy with the curve shape, say:

> **"Generate"**

That's it. Cascade will run `LongToneUI.step2(params)` — Steps 2-4 automatically using the data from Stage 1 **plus any manual slope/model adjustments you made**:
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

## Pre-Step 1 Validation Checklist

<!-- VALIDATION CHECKLIST: Cascade performs these checks before running step1.
     To add, remove, or modify checks, edit this section.
     Each check has: what to check, when to flag, and what to suggest. -->

Before running `LongToneUI.step1()`, Cascade validates the parsed parameters and flags issues:

### 1. Missing Required Parameters
**Check:** Start time, end time, track, start pitch, end pitch must all be provided.
**Flag:** If any are missing, ask the user before proceeding.

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

## Full Example

**You say:**
> Create a glissando: Start 120s, End 128s, Track 3, E4 to C3, cClef, mp, Y1=10 Y2=0, logarithmic slope -1

**Cascade responds:**
> Created curve on track 3 (120s–128s), E4→C3, logarithmic slope -1. Adjust the curve shape if needed, then say "Generate".

**You adjust the slope in the UI if desired, then say:**
> Generate

**Cascade responds:**
> Done. Notation SVG inserted, 4 MIDI segments generated and placed on track 3.
