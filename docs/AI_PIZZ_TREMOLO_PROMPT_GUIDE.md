# AI Pizzicato Tremolo Prompt Guide

Create Pizzicato Tremolo gestures via AI prompt — **hands-free** via AI Command Bridge (Pattern 4). Tell Cascade what you want, it appears in the score.

---

## How It Works

One click or one command. No save/reload needed.

1. Server runs `render_pizz_tremolo.js` → generates SVG notation + MIDI file
2. GC created at start time (fixed params: stiffness=62, damping=100, ictus=90, descentRatio=60, duration=0.6, neonMagenta)
3. SVG notation + blue arrow inserted into live score (70% track height, pre/post alignment)
4. MIDI snippet built programmatically from timing database (rapid repeated notes, CC7 volume ramp)
5. Snippet added to `MidiSnippetDatabase` + tracks rebuilt via `reloadFromDatabase()`
6. Auto-save captures everything

---

## Prompt Templates

### Option A: Copy-Paste Template

```
Pizzicato tremolo:
- Track: ___ (1-4)
- Clef: ___ (treble / alto / bass)
- Pitch: ___ (e.g., C4, C#4, Bb3, C+4, Cd4)
- Dynamic: ___ (fff, ff, f, mf, mp, p, pp, ppp)
- Start: ___ s (start time in seconds)
- Duration: ___ s (tremolo duration in seconds)
- Shape: ___ (cres / decres / hp)
- Alignment: ___ (pre / post)
```

### Option B: Natural Language

> "Pizz tremolo on track 1, treble, G#5, fff, at 243s, 3 seconds, crescendo, pre-alignment"

> "Pizzicato tremolo track 3, bass clef, C2, ff, 85.5 seconds, 4s duration, decrescendo, post"

> "Pizz trem: track 2, alto, Bb3, mf, at 120s, 2.5s, hairpin, pre"

### Option C: Batch (multiple in one prompt)

> "Three pizzicato tremolos:
> 1. Track 1, treble, G#5, fff, 243s, 3s, cres, pre
> 2. Track 2, alto, C4, ff, 244s, 4s, hp, post
> 3. Track 4, bass, E2, mf, 245s, 2s, decres, pre"

Cascade runs each as a separate `PizzTremUI.go()` call.

### Option D: Trigger Phrase (Guided)

> "Create a pizzicato tremolo"

Cascade will ask each parameter in turn. Say "default" to skip any question (defaults listed below).

---

## How Cascade Executes

### Primary: AI Direct (Pattern 4 — hands-free)

Cascade sends the command directly to the browser via the AI Command Bridge. The user does nothing — the material appears in the score automatically.

Cascade runs this terminal command:
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/ai/command" -Method POST -ContentType "application/json" -Body '{"command": "return await PizzTremUI.go({ pitch: ''G#5'', dynamic: ''fff'', clef: ''treble'', track: 1, start: 243, duration: 3, shape: ''cres'', alignment: ''pre'' })"}'
```

#### Batch (multiple commands)
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/ai/command" -Method POST -ContentType "application/json" -Body '{"command": "return await PizzTremUI.go({ pitch: ''G#5'', dynamic: ''fff'', clef: ''treble'', track: 1, start: 243, duration: 3, shape: ''cres'', alignment: ''pre'' })"}'
Invoke-WebRequest -Uri "http://localhost:5000/api/ai/command" -Method POST -ContentType "application/json" -Body '{"command": "return await PizzTremUI.go({ pitch: ''C4'', dynamic: ''ff'', clef: ''alto'', track: 2, start: 244, duration: 4, shape: ''hp'', alignment: ''post'' })"}'
Invoke-WebRequest -Uri "http://localhost:5000/api/ai/command" -Method POST -ContentType "application/json" -Body '{"command": "return await PizzTremUI.go({ pitch: ''E2'', dynamic: ''mf'', clef: ''bass'', track: 4, start: 245, duration: 2, shape: ''decres'', alignment: ''pre'' })"}'
```

### Fallback: Console Paste (Pattern 3)

If the command bridge is unavailable, Cascade provides JS for the browser console:

```javascript
await PizzTremUI.go({
    pitch: 'G#5',
    dynamic: 'fff',
    clef: 'treble',
    track: 1,
    start: 243,
    duration: 3,
    shape: 'cres',
    alignment: 'pre'
});
```

**Important:** Cascade must NEVER check/start/interact with the dev server.

---

## Parameters

| Parameter | Key | Required | Values | Default | Example |
|-----------|-----|----------|--------|---------|---------|
| Track | `track` | Yes | 1–4 | — | `1` |
| Clef | `clef` | Yes | `treble`, `alto`, `bass` | — | `'treble'` |
| Pitch | `pitch` | Yes | Plain English (see below) | — | `'G#5'` |
| Dynamic | `dynamic` | Yes | `ppp`–`fff` | — | `'fff'` |
| Start | `start` | Yes | Seconds (decimal OK) | — | `243` |
| Duration | `duration` | No | Seconds (decimal OK) | `3` | `3` |
| Shape | `shape` | No | `cres`, `decres`, `hp` | `cres` | `'cres'` |
| Alignment | `alignment` | No | `pre`, `post` | `pre` | `'pre'` |

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

### Shape Values

| Shape | CC7 Ramp | Description |
|-------|----------|-------------|
| `cres` | 50 → 127 | Crescendo — starts quiet, ends loud |
| `decres` | 127 → 0 | Decrescendo — starts loud, ends silent |
| `hp` | 50 → 127 → 0 | Hairpin — crescendo to midpoint, then decrescendo |

### Alignment Values

| Alignment | MIDI Positioning | SVG Positioning |
|-----------|-----------------|-----------------|
| `pre` | Snippet **ends** at `start` time | Left edge of SVG at GC descent start |
| `post` | Snippet **begins** at `start` time | Right edge of SVG at GC bounce end |

**Pre-alignment** means the tremolo is a lead-in — the rapid notes build *toward* the start time. The final note-off coincides with the start time.

**Post-alignment** means the tremolo follows the impact — the rapid notes begin *at* the start time.

---

## What Happens Inside

1. `englishToLilypond()` converts pitch (e.g., `G#5` → `gs''`)
2. Server calls `render_pizz_tremolo.js` with LilyPond pitch, dynamic, clef, track, shape, duration
3. LilyPond renders notation SVG (Z-stem + hairpin)
4. SVG cropped via `crop_svg.js`
5. MIDI generated via `generate_pizz_tremolo_midi.js` (CC0=95, CC7 ramp, sampled timing)
6. MIDI file copied to `public/midi_files/` for DAW inspection
7. GC created with fixed Pizzicato Tremolo shape (neonMagenta)
8. SVG + blue right-pointing arrow placed in score with pre/post alignment
9. MIDI events built programmatically on client:
   - CC0 = 95 (pizzicato tremolo identifier)
   - Pitch bend (if quarter-tone)
   - CC7 volume ramp (shape-dependent, every 20ms)
   - Rapid repeated Note On/Off events (sampled from timing database)
   - Pitch bend reset at end
10. Snippet added to `MidiSnippetDatabase`, tracks rebuilt via `reloadFromDatabase()`
11. `markDirty()` triggers auto-save

---

## Defaults (when omitted)

| Parameter | Default |
|-----------|---------|
| Duration | `3` seconds |
| Shape | `cres` (crescendo) |
| Alignment | `pre` |

Track, Clef, Pitch, Dynamic, and Start are **required** — Cascade should ask for any missing parameter.

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

- **CC0 = 95** at snippet start (identifies pizzicato tremolo for DAW/synth)
- **CC7 volume ramp** throughout duration (shape-dependent, 20ms interval)
- **Rapid repeated notes** sampled from `public/midi_files/pizz_tremolo_db.json`
- **Pitch bend** for quarter-tones (±1 semitone range), reset at end
- **Channel mapping**: track 1 → ch 8, track 2 → ch 9, track 3 → ch 10, track 4 → ch 11
- Formula: `midiChannel = trackIndex + 8` (dedicated channels, separate from other techniques)
- **MIDI file** also saved to `public/midi_files/` for DAW inspection

### CC7 Volume Ramp Constants

| Constant | Value |
|----------|-------|
| CC7_PP_VOLUME | 50 (start volume for cres/hp) |
| CC7_INTERVAL_MS | 20ms between CC7 messages |

---

## GC Parameters (Fixed)

These are not user-configurable — same model as Bartók Pizzicato:

| Parameter | Value |
|-----------|-------|
| stiffness | 62 |
| damping | 100 |
| ictus | 90 |
| descentRatio | 60 |
| duration | 0.6 |
| color | neonMagenta |

---

## SVG Notation Details

| Property | Value |
|----------|-------|
| Height fraction | 70% of track height |
| Vertical offset | 0.10 |
| Arrow color | brightBlue (`rgba(56,126,211,255)`) |
| Arrow direction | Always right-pointing |
| mm → px | 1mm = 3.78px |

---

## Server Endpoint

| Endpoint | Purpose |
|----------|---------|
| `POST /api/pizz-tremolo/generate` | Runs `render_pizz_tremolo.js`, returns `{ svgPath, midiPath }` |

---

## Key Functions

| Function | Purpose |
|----------|---------|
| `PizzTremUI.go(params)` | Full workflow — pipeline → GC → SVG + arrow → MIDI |
| `PizzTremUI.insertPizzTremSvg()` | Insert notation SVG + blue arrow into score |
| `PizzTremUI.insertPizzTremMidi()` | Build + insert MIDI snippet from timing DB |
| `PizzTremUI.englishToLilypond()` | Convert plain English pitch to LilyPond notation |
| `PizzTremUI.englishToMidi()` | Convert plain English pitch to MIDI note number |
| `PizzTremUI.dynamicToVelocity()` | Convert dynamic marking to MIDI velocity |
| `PizzTremUI.sampleNotes()` | Sample note timing from pizz tremolo database |
| `PizzTremUI.generateCC7Ramp()` | Generate CC7 volume ramp for shape |
| `PizzTremUI.getTimingDb()` | Fetch + cache timing database |

---

## Pre-Execution Validation Checklist

Before executing, Cascade should verify:

1. **5 required parameters present** — pitch, dynamic, clef, track, start. Ask if any missing.
2. **Pitch range vs clef** — Flag if pitch needs >3 ledger lines; suggest alternative clef.
3. **Track in range** — Must be 1–4.
4. **Start time is positive** — Must be > 0.
5. **Duration is positive** — Must be > 0 (default: 3s).
6. **Shape valid** — Must be one of: `cres`, `decres`, `hp` (default: `cres`).
7. **Alignment valid** — Must be one of: `pre`, `post` (default: `pre`).
8. **Pitch format valid** — Must match pattern: letter (A-G) + optional accidental (#/B/+/D) + octave digit.
9. **Dynamic valid** — Must be one of: ppp, pp, p, mp, mf, f, ff, fff.
10. **Pre-alignment time check** — If alignment is `pre`, ensure `start - duration > 0` (snippet can't start before time 0).

### Clef ↔ Pitch Range Guidelines

| Clef | Comfortable Range | Notes |
|------|-------------------|-------|
| treble | G3 – C7 | Standard violin/upper register |
| alto | C3 – G5 | Viola range |
| bass | C1 – G3 | Cello/bass lower register |

If the pitch is far outside the comfortable range, suggest a different clef (the notation will have excessive ledger lines).

---

## Differences from Bartók Pizzicato

| Feature | Bartók Pizzicato | Pizzicato Tremolo |
|---------|-----------------|-------------------|
| CC0 | 97 | 95 |
| MIDI channels | 0–3 (track-1) | 8–11 (track+7) |
| Note events | Single snap (95.4ms) | Rapid repeated notes (sampled from DB) |
| CC7 | Not used | Linear volume ramp (cres/decres/hp) |
| Duration param | N/A (single event) | Required (seconds) |
| Shape param | N/A | cres / decres / hp |
| Alignment param | N/A | pre / post |
| SVG height | 50% track height | 70% track height |
| Arrow | None | Blue right-pointing arrow |
| Time param key | `time` (impact) | `start` (alignment anchor) |
