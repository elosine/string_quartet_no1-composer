# AI Bartók Pizzicato Prompt Guide

Create Bartók Pizzicato gestures via AI prompt — **hands-free** via AI Command Bridge (Pattern 4). Tell Cascade what you want, it appears in the score.

---

## How It Works

One click or one command. No save/reload needed.

1. Server runs `render_bartok_pizz.js` → generates SVG notation + MIDI file
2. GC created at impact time (fixed params: stiffness=62, damping=100, ictus=90, descentRatio=60, duration=0.6, neonMagenta)
3. SVG notation inserted into live score (50% track height, centered on impact)
4. MIDI snippet added to database + tracks rebuilt via `reloadFromDatabase()`
5. Auto-save captures everything

---

## Prompt Templates

### Option A: Copy-Paste Template

```
Bartók pizzicato:
- Track: ___ (1-4)
- Clef: ___ (treble / alto / bass)
- Pitch: ___ (e.g., C4, C#4, Bb3, C+4, Cd4)
- Dynamic: ___ (fff, ff, f, mf, mp, p, pp, ppp)
- Time: ___ s (impact time in seconds)
```

### Option B: Natural Language

> "Bartók pizz on track 1, treble, G#5, fff, at 243s"

> "Snap pizz track 3, bass clef, C2, ff, 85.5 seconds"

> "Bartók pizzicato: track 2, alto, Bb3, mf, at 120s"

### Option C: Batch (multiple in one prompt)

> "Three Bartók pizzicatos:
> 1. Track 1, treble, G#5, fff, 243s
> 2. Track 2, alto, C4, ff, 243.2s
> 3. Track 4, bass, E2, mf, 243.5s"

Cascade runs each as a separate `BartokPizzUI.go()` call.

### Option D: Trigger Phrase (Guided)

> "Create a Bartók pizzicato"

Cascade will ask each parameter in turn. Say "default" to skip any question.

---

## How Cascade Executes

### Primary: AI Direct (Pattern 4 — hands-free)

Cascade sends the command directly to the browser via the AI Command Bridge. The user does nothing — the material appears in the score automatically.

Cascade runs this terminal command:
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/ai/command" -Method POST -ContentType "application/json" -Body '{"command": "return await BartokPizzUI.go({ pitch: ''G#5'', dynamic: ''fff'', clef: ''treble'', track: 1, time: 243 })"}'
```

#### Batch (multiple commands)
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/ai/command" -Method POST -ContentType "application/json" -Body '{"command": "return await BartokPizzUI.go({ pitch: ''G#5'', dynamic: ''fff'', clef: ''treble'', track: 1, time: 243 })"}'
Invoke-WebRequest -Uri "http://localhost:5000/api/ai/command" -Method POST -ContentType "application/json" -Body '{"command": "return await BartokPizzUI.go({ pitch: ''C4'', dynamic: ''ff'', clef: ''alto'', track: 2, time: 243.2 })"}'
Invoke-WebRequest -Uri "http://localhost:5000/api/ai/command" -Method POST -ContentType "application/json" -Body '{"command": "return await BartokPizzUI.go({ pitch: ''E2'', dynamic: ''mf'', clef: ''bass'', track: 4, time: 243.5 })"}'
```

### Fallback: Console Paste (Pattern 3)

If the command bridge is unavailable, Cascade provides JS for the browser console:

```javascript
await BartokPizzUI.go({
    pitch: 'G#5',
    dynamic: 'fff',
    clef: 'treble',
    track: 1,
    time: 243
});
```

**Important:** Cascade must NEVER check/start/interact with the dev server.

---

## Parameters

| Parameter | Key | Required | Values | Example |
|-----------|-----|----------|--------|---------|
| Track | `track` | Yes | 1–4 | `1` |
| Clef | `clef` | Yes | `treble`, `alto`, `bass` | `'treble'` |
| Pitch | `pitch` | Yes | Plain English (see below) | `'G#5'` |
| Dynamic | `dynamic` | Yes | `ppp`, `pp`, `p`, `mp`, `mf`, `f`, `ff`, `fff` | `'fff'` |
| Time | `time` | Yes | Seconds (decimal OK) | `243` or `85.5` |

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

**Note:** Octave numbers follow standard convention (C4 = middle C, 261 Hz).

---

## What Happens Inside

1. `englishToLilypond()` converts pitch (e.g., `G#5` → `gs'''`)
2. Server calls `render_bartok_pizz.js` with LilyPond pitch, dynamic, clef, track
3. LilyPond renders notation SVG (snap pizz `\snappizzicato` + dynamic marking)
4. SVG cropped via `crop_svg.js`
5. MIDI modified via `modify_midi.js` (CC0=97, channel = track - 1)
6. GC created with fixed Bartók Pizzicato shape (neonMagenta)
7. SVG placed in score at impact time, 50% track height
8. MIDI events generated programmatically:
   - CC0 = 97 (Bartók pizzicato identifier)
   - Note On (velocity from dynamic mapping)
   - Note Off after 95.4ms (snap pizz duration)
9. Snippet added to `MidiSnippetDatabase`, tracks rebuilt via `reloadFromDatabase()`
10. `markDirty()` triggers auto-save

---

## Defaults (when omitted)

All parameters are required — there are no defaults. Cascade should ask for any missing parameter.

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

---

## MIDI Details

- **CC0 = 97** at impact time (identifies Bartók pizzicato for DAW/synth)
- **Note On** at impact time (velocity from dynamic)
- **Note Off** 95.4ms after Note On (snap pizz is very short)
- **Channel** = track - 1 (track 1 → ch 0, track 2 → ch 1, etc.)
- Shares MIDI channels 1–4 with glissando (OK — discrete single events)

---

## GC Parameters (Fixed)

These are not user-configurable — they match GC_20260117_204645:

| Parameter | Value |
|-----------|-------|
| stiffness | 62 |
| damping | 100 |
| ictus | 90 |
| descentRatio | 60 |
| duration | 0.6 |
| color | neonMagenta |

---

## Server Endpoint

| Endpoint | Purpose |
|----------|---------|
| `POST /api/bartok-pizz/generate` | Runs `render_bartok_pizz.js`, returns `{ svgPath, midiPath }` |

---

## Key Functions

| Function | Purpose |
|----------|---------|
| `BartokPizzUI.go(params)` | Full workflow — pipeline → GC → SVG → MIDI |
| `BartokPizzUI.insertBartokSvg()` | Insert notation SVG into score |
| `BartokPizzUI.insertBartokMidi()` | Build + insert MIDI snippet |
| `BartokPizzUI.englishToLilypond()` | Convert plain English pitch to LilyPond notation |
| `BartokPizzUI.englishToMidi()` | Convert plain English pitch to MIDI note number |
| `BartokPizzUI.dynamicToVelocity()` | Convert dynamic marking to MIDI velocity |

---

## Pre-Execution Validation Checklist

Before executing, Cascade should verify:

1. **All 5 parameters present** — pitch, dynamic, clef, track, time. Ask if any missing.
2. **Pitch range vs clef** — Flag if pitch needs >3 ledger lines; suggest alternative clef.
3. **Track in range** — Must be 1–4.
4. **Time is positive** — Must be > 0.
5. **Pitch format valid** — Must match pattern: letter (A-G) + optional accidental (#/B/+/D) + octave digit.
6. **Dynamic valid** — Must be one of: ppp, pp, p, mp, mf, f, ff, fff.

### Clef ↔ Pitch Range Guidelines

| Clef | Comfortable Range | Notes |
|------|-------------------|-------|
| treble | G3 – C7 | Standard violin/upper register |
| alto | C3 – G5 | Viola range |
| bass | C1 – G3 | Cello/bass lower register |

If the pitch is far outside the comfortable range, suggest a different clef (the notation will have excessive ledger lines).
