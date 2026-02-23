---
description: Notation Fragment Pipeline - compile LilyPond, run state_tracker, run modify_midi to produce final -Mod.mid
---

# Notation Fragment Pipeline

Run this workflow to take a completed `.ly` notation fragment through the full pipeline: compile → state_tracker → modify_midi.

**Reference:** `docs/NOTATION_FRAGMENT_WORKFLOW.md` (Steps 3–4) for full details.

## Prerequisites

- The `.ly` file must be complete and render-tested in Frescobaldi
- The `.ly` file must include `midi-tags.ily`, `midi-logger.ily`, and `\consists \midiLogEngraver`
- For dual-score `\tag` files: Score 2 must have `\midi {}` and `\midiLogEngraver`

## Inputs

| Input | Example |
|-------|---------|
| Fragment number (NNN) | `008` |
| Instrument | `Cello` |
| MIDI channel (0-indexed) | See table below |

### Instrument → MIDI Channel Mapping

| Instrument | MIDI Channel |
|------------|-------------|
| Violin 1 | 0 |
| Violin 2 | 1 |
| Viola | 2 |
| Cello | 3 |

## Pipeline Steps

### Step 1: Compile LilyPond → SVG + MIDI + Event Log

// turbo
```powershell
lilypond --svg -dbackend=svg -o "NotationFragment[NNN]-[Instrument]" "NotationFragment[NNN]-[Instrument].ly"
```

Run from `lilypond_code/` directory.

**Outputs:**
- `NotationFragment[NNN]-[Instrument].svg` (layout render)
- `NotationFragment[NNN]-[Instrument].mid` (raw MIDI)
- `NotationFragment[NNN]-[Instrument]-midi-log.json` (event log)

**For dual-score files:** Also produces `NotationFragment[NNN]-[Instrument]-1.svg` (ignored).

**Verify:** Open the `-midi-log.json` and confirm `midiCCZero` values match the `\midiXxx` tags in the source.

### Step 2: Event Log → CC Map (state_tracker.js)

// turbo
```powershell
node state_tracker.js NotationFragment[NNN]-[Instrument]-midi-log.json --out fragment[NNN]_cc.json
```

Run from `lilypond_code/` directory.

**Input:** `-midi-log.json` from Step 1
**Output:** `fragment[NNN]_cc.json`

**Verify:** Inspect the CC map — confirm correct `noteIndex`, CC numbers, velocity overrides per note group.

### Step 3: CC Map + Raw MIDI → Modified MIDI (modify_midi.js)

// turbo
```powershell
node modify_midi.js NotationFragment[NNN]-[Instrument].mid NotationFragment[NNN]-[Instrument]-Mod.mid [CHANNEL] --map fragment[NNN]_cc.json
```

Run from `lilypond_code/` directory. Replace `[CHANNEL]` with the 0-indexed MIDI channel from the mapping table.

**Inputs:** `.mid` from Step 1 + `_cc.json` from Step 2
**Output:** `NotationFragment[NNN]-[Instrument]-Mod.mid`

**Verify:** Check console output — confirm correct number of note groups, CC injections, velocity overrides.

## Quick Copy-Paste (fill in NNN, Instrument, Channel)

```powershell
cd lilypond_code
lilypond --svg -dbackend=svg -o "NotationFragment[NNN]-[Instrument]" "NotationFragment[NNN]-[Instrument].ly"
node state_tracker.js NotationFragment[NNN]-[Instrument]-midi-log.json --out fragment[NNN]_cc.json
node modify_midi.js NotationFragment[NNN]-[Instrument].mid NotationFragment[NNN]-[Instrument]-Mod.mid [CHANNEL] --map fragment[NNN]_cc.json
```

## Post-Pipeline

- User tests the `-Mod.mid` file in the DAW
- If MIDI sounds correct → create Tier 1 memory for the fragment
- Optional: run `node crop_svg.js NotationFragment[NNN]-[Instrument].svg` to crop the SVG
