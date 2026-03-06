# LilyPond File Naming Convention

**Purpose:** Content-addressable filenames for `.ly` notation files, enabling reuse, lookup, and deduplication of hand-fixed SVGs across the score.

**Principle:** The filename is a **canonical key** — same musical parameters always produce the same filename. Fix an SVG once, and every bundle with matching parameters can find and reuse it.

---

## Pitch Encoding Rules

All systems use a single shared pitch encoder. Input pitches from the UI (e.g. `C#4`, `C+4`, `Cd4`) are normalized to a canonical form:

| UI Input | Meaning | Canonical | Rule |
|----------|---------|-----------|------|
| `C4` | Natural | `C4` | Uppercase letter + octave |
| `C#4` | Sharp | `Cs4` | `#` → `s` |
| `Cb4` / `Bb3` | Flat | `Cf4` / `Bf3` | `b` after note → `f` |
| `C+4` | Quarter-sharp | `Cqs4` | `+` → `qs` |
| `Cd4` | Quarter-flat | `Cqf4` | `d` → `qf` |
| `C##4` | Double-sharp | `Css4` | `##` → `ss` |
| `Cbb4` | Double-flat | `Cff4` | `bb` → `ff` |

**Rules:**
1. Note letter is **always uppercase**: `C`, `D`, `E`, `F`, `G`, `A`, `B`
2. Accidentals follow the letter: `s` (sharp), `f` (flat), `qs` (quarter-sharp), `qf` (quarter-flat)
3. Octave number comes last
4. No raw `#`, `+`, `b` (as flat), or `d` (as quarter-flat) in filenames — these are filesystem-unsafe or ambiguous

---

## System Prefixes

| System | Prefix | Full Name |
|--------|--------|-----------|
| Sustained Tone | `ST` | CrescendoUI |
| Vibrato | `Vib` | VibratoUI |
| Bartók Pizzicato | `BP` | BartokPizzUI |
| Pizzicato Tremolo | `PT` | PizzTremUI |
| Pizz Trem Glissando | `PTG` | PizzTremGlissUI |
| Notation Fragment | `NF` | NotationFragmentSystem |

---

## Filename Formats

### Sustained Tone (ST)
```
ST-{Gliss|Single}-{clef}-{pitches}-{dyn1}-{dyn2}[-secco].ly
```
- **Single pitch:** `ST-Single-alto-C4-p-fff.ly`
- **Glissando:** `ST-Gliss-alto-C4-Bf3-f-fff.ly`
- **With secco:** `ST-Single-treble-A4-pp-ff-secco.ly`

Parameters that affect notation: pitchModel, clef, pitch(es), dyn1, dyn2, secco

### Vibrato (Vib)
```
Vib-{WN|NW}-{clef}-{pitch}-{dyn1}-{dyn2}.ly
```
- `Vib-NW-treble-A4-ff-f.ly` (narrow→wide)
- `Vib-WN-bass-Cqs3-fff-ff.ly` (wide→narrow)

Parameters: direction, clef, pitch, startDynamic, endDynamic

### Bartók Pizzicato (BP)
```
BP-{clef}-{pitch}-{dyn}.ly
```
- `BP-alto-C3-fff.ly`
- `BP-bass-Cqs2-fff.ly`

Parameters: clef, pitch, dynamic

### Pizzicato Tremolo (PT)
```
PT-{clef}-{pitch}-{dyn}.ly
```
- `PT-alto-D4-fff.ly`

Parameters: clef, pitch, dynamic

### Pizz Trem Glissando (PTG)
```
PTG-{clef}-{p1}-{p2}-{dyn1}-{dyn2}.ly
```
- `PTG-alto-C4-Bf4-f-f.ly`
- `PTG-treble-Fs4-Aqs5-pp-fff.ly`

Parameters: clef, startPitch, endPitch, startDynamic, endDynamic

### Notation Fragment (NF)
```
NF{NNN}-{Instrument}.ly
```
- `NF001-Cello.ly`
- `NF005-Violin.ly`

Notation fragments are unique compositions — they don't follow the content-addressable pattern. The number is a sequential ID.

---

## Clef Encoding

| UI Value | Filename |
|----------|----------|
| `treble` | `treble` |
| `cClef` / `alto` | `alto` |
| `bass` | `bass` |

---

## Legacy Filenames

Files created before this convention use older naming:
- `Cres-` prefix → now `ST-`
- `BartokPizz-` prefix → now `BP-`
- `PizzTremGliss-` prefix → now `PTG-`
- `NotationFragment` prefix → now `NF`
- Raw `#`, `+`, `d` in pitches → now canonical encoding

Legacy files are **not renamed** — they remain as-is. New bundles use the new convention. When manually fixing an old file, optionally rename it to the new convention.

---

## SVG Reuse Logic

When a bundle generates notation:
1. Compute the canonical `.ly` filename from the bundle's parameters
2. Check if `lilypond_code/{filename}` already exists
3. Check if `public/SVG_graphics/{basename}.svg` already exists
4. **If SVG exists** → skip rendering, use the existing (possibly hand-fixed) SVG
5. **If only .ly exists** → re-render and crop, then use
6. **If neither exists** → generate .ly from template, render, crop, use

This means: fix an SVG once → every future bundle with the same notation parameters gets the fixed version automatically.

---

## Adding New Notation Types

When adding a new notation system:
1. Choose a **short, unique prefix** (2-3 chars)
2. Add it to the prefix table above
3. Identify all parameters that affect the visual notation
4. Define the filename format: `{PREFIX}-{params joined by hyphens}.ly`
5. Use the shared `canonicalPitch()` encoder for all pitch fields
6. Update this document
