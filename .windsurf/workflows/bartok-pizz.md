---
description: Create Bartók Pizzicato notation files (SVG + MIDI) from pitch, dynamic, clef, and track inputs
---

# Bartók Pizzicato Workflow

## Quick Reference

Generate Bartók Pizzicato notation SVG and MIDI files. Full documentation: `docs/BARTOK_PIZZICATO_WORKFLOW.md`

## What You Need

The user provides:
- **Pitch** — LilyPond English notation (e.g., `b'`, `ftqs'''`, `eqf`, `cs''`)
- **Dynamic** — without backslash (e.g., `fff`, `ff`, `f`, `mf`, `mp`, `p`, `pp`, `ppp`)
- **Clef** — `treble`, `alto`, or `bass`
- **Track** — 1–4 (determines MIDI channel)

See `docs/LILYPOND_SETTINGS_REGISTRY.md` §28 for microtonal pitch syntax.

## Single Generation

Run the pipeline from the `lilypond_code/` directory:

```powershell
node render_bartok_pizz.js --pitch "b'" --dynamic fff --clef treble --track 1
```

## Batch Generation

1. Create a JSON file with an array of inputs:

```json
[
  { "pitch": "b'", "dynamic": "fff", "clef": "treble", "track": 1 },
  { "pitch": "ftqs'''", "dynamic": "fff", "clef": "treble", "track": 2 },
  { "pitch": "eqf", "dynamic": "ff", "clef": "alto", "track": 3 }
]
```

2. Run:

```powershell
node render_bartok_pizz.js --batch inputs.json
```

## What the Pipeline Does (Steps 2–7)

1. **Generates .ly file** from template with correct clef, pitch, dynamic, paper dimensions
2. **Renders** via LilyPond → SVG + MIDI
3. **Crops** SVG using `crop_svg.js`
4. **Modifies** MIDI: sets channel (track 1→ch0, track 2→ch1, etc.) + inserts CC0=97
5. **Saves** both to `public/SVG_graphics/bartok_pizzicato/`

## Output Files

All outputs go to `public/SVG_graphics/bartok_pizzicato/`:
- `BartokPizz-[clef]-[PitchName]-[dynamic].svg` — cropped notation
- `BartokPizz-[clef]-[PitchName]-[dynamic].mid` — modified MIDI

The .ly source file is saved in `lilypond_code/` for reference.

## Key Scripts

- `lilypond_code/render_bartok_pizz.js` — full pipeline (this workflow)
- `lilypond_code/crop_svg.js` — standalone SVG cropper
- `lilypond_code/modify_midi.js` — general-purpose MIDI post-processor
