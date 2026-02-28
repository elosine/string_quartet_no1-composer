# Sequence Generator — System Documentation

## Overview

The Sequence Generator is a standalone HTML tool that creates timed note sequences for **String Quartet No. 1**. It produces structured data (TSV, JSON, or console scripts) that can be manually entered or programmatically inserted into the score via the composer application's notation systems (e.g., BartokPizzUI, CrescendoUI, PizzTremUI, etc.).

**Location:** `tools/sequence_generator.html`  
**How to run:** Open the file directly in a browser (no server required).

---

## What It Does (Human Description)

You configure:
- A **start time** and **number of notes**
- **Gap buckets** — categories of time gaps between notes (e.g., short: 0.06–0.14s, long: 0.23–0.27s)
- **Instruments** with ranges and octave rules
- A **pitch set** — the available pitch classes to distribute
- **Dynamic** settings (fixed, random from set, or none)

The tool then generates a sequence of notes where:
1. **Instruments** cycle through all enabled instruments, shuffled within each cycle
2. **Pitches** cycle through the full pitch set, shuffled each cycle, with octaves auto-assigned per instrument rules
3. **Gaps** follow a distribution pattern: short gaps are the "filler," and long gaps are placed semi-randomly with configurable clustering constraints

---

## Architecture (AI Description)

### Core Algorithm

```
generate() → {
    1. distributeInstruments(noteCount, firstInst)
       → Cycles through enabled instruments in shuffled groups of N
       → First note can be overridden to a specific instrument

    2. distributePitches(noteCount, firstPitch, instruments)
       → Cycles through pitch set, shuffled per cycle
       → First note can be overridden to a specific pitch+octave
       → assignOctave() applies per-instrument rules:
         - 'lowest': finds lowest octave within instrument range
         - 'highest': finds highest octave within instrument range (capped)

    3. generateGapSequence(totalGaps)
       → Bucket[0] is the "short" (default/filler) type
       → All other buckets are "long" types
       → Long gap count: random between each bucket's countMin/countMax
       → Distribution: shorts are grouped between longs
         - minShortsBetween / maxShortsBetween controls clustering
       → Each gap value is random within its bucket's [min, max] range

    4. Combine into timed sequence
       → time[0] = startTime
       → time[i] = time[i-1] + gap[i-1].value
}
```

### Output Formats

| Format | Purpose | How to Use |
|--------|---------|------------|
| **TSV** | Paste into Google Sheets | Copy → Ctrl+V into cell A1 |
| **JSON** | Programmatic insertion | Feed to insertion script (see below) |
| **Console Script** | Direct score insertion | Paste into browser console of score app |

### Key Functions

- `parsePitchClass(str)` — Parses pitch without octave: `G`, `G#`, `G+`, `Bbd`, `Cd`
- `parsePitchWithOctave(str)` — Parses full pitch: `G2`, `Bb4`, `Cd5`
- `assignOctave(pitchClass, instrument)` — Applies octave rule to pitch class
- `pitchToMidiApprox(p)` — Approximate MIDI number for range comparison
- `shuffle(arr)` — Fisher-Yates shuffle
- `randRange(min, max)` — Random float in range
- `randInt(min, max)` — Random integer in range

### Pitch Notation System

| Symbol | Meaning | Example |
|--------|---------|---------|
| `#` | Sharp | `G#3` |
| `b` | Flat | `Bb4` |
| `+` | Quarter sharp | `G+3` |
| `d` | Quarter flat | `Cd5`, `Ad4` |
| `b` + `d` | 3-quarter flat | `Bbd4` |
| `#` + `+` | 3-quarter sharp | `C#+4` |

This notation matches the `BartokPizzUI.englishToLilypond()` format used in the score app.

---

## Configurable Parameters

### Gap Buckets
Each bucket defines a gap type with:
- **name** — Label shown in output (e.g., "Short", "Long")
- **min / max** — Range in seconds for random gap value
- **countMin / countMax** — How many of this gap type appear (non-default buckets only)
- **enabled** — Checkbox to include/exclude

**Bucket[0]** is always the "filler" type — it fills all remaining gaps after long types are placed.

### Instruments
Each instrument defines:
- **abbrev** — Short label (VC, VLA, V1, V2)
- **fullName** — Display name
- **track** — Score track number (1–16)
- **clef** — treble, alto, tenor, bass
- **octaveRule** — `lowest` or `highest`
- **rangeBottom / rangeTop** — Instrument range bounds (e.g., C2–A5 for cello)
- **enabled** — Checkbox to include/exclude

### Other Settings
- **Start Time** — Timestamp of the first note
- **Note Count** — Total notes to generate
- **Min/Max shorts between longs** — Clustering constraint
- **First Note Override** — Force first note's instrument and pitch
- **Pitch Set** — Comma-separated pitch classes
- **Dynamic Mode** — Fixed value, random from set, or omitted

---

## How to Expand / Modify

### Add a new gap bucket type
1. Click **"+ Add Bucket"** in the UI
2. Name it (e.g., "Medium"), set its range (e.g., 0.15–0.22)
3. Set count min/max (e.g., 2–3)
4. The algorithm will distribute these alongside other long types

**In code:** Add to `DEFAULT_GAP_BUCKETS` array:
```javascript
{ name: 'Medium', min: 0.15, max: 0.22, countMin: 2, countMax: 3, isDefault: false }
```

### Add/modify an instrument
1. Click **"+ Add Instrument"** or edit existing rows
2. Set abbreviation, name, track, clef, octave rule, and range

**In code:** Add to `DEFAULT_INSTRUMENTS` array:
```javascript
{ abbrev: 'DB', fullName: 'Double Bass', track: 5, clef: 'bass',
  enabled: true, octaveRule: 'lowest', rangeBottom: 'E1', rangeTop: 'G3' }
```

### Change the pitch set
Edit the **Pitch Set** textarea. Use comma-separated pitch classes without octaves:
```
C, C#, D, Eb, E, F, F#, G, Ab, A, Bb, B
```
Or with quarter tones:
```
G, G+, G#, Ad, A, Bbd, Bb, B, Cd, C
```

### Change octave assignment rules
Currently two rules exist: `lowest` and `highest`. To add a new rule (e.g., `random`):

1. Open `sequence_generator.html`
2. Find `assignOctave()` function
3. Add a new branch:
```javascript
} else if (instrument.octaveRule === 'random') {
    // Collect all valid octaves
    const valid = [];
    for (let oct = 0; oct <= 8; oct++) {
        const test = { ...pitchClass, octave: oct };
        const midi = pitchToMidiApprox(test);
        if (midi >= bottomMidi && midi <= topMidi) valid.push(oct);
    }
    const oct = valid[randInt(0, valid.length - 1)];
    return formatPitchClass(pitchClass) + oct;
}
```
4. Add the option to the instrument `<select>` in `renderInstruments()`

### Change gap distribution rules
The current algorithm places "long" gaps with short-gap clusters between them. To change this:

1. Find `generateGapSequence()` function
2. The core logic is in the "distribute shorts between longs" section
3. You could implement alternatives like:
   - **Periodic:** Place a long gap every N notes
   - **Accelerating:** Short gaps get progressively shorter
   - **Random placement:** No clustering constraint, just randomly assign each gap to a bucket

### Add a new output format
1. Add a new tab button in the HTML
2. Add a case in `renderOutput()` and `switchTab()`
3. Create a `renderXXX()` function that transforms `generatedData` into the desired format

### Target a different notation system
The Console Script tab currently targets `BartokPizzUI.go()`. To target a different system:

1. Find `renderConsoleScript()` function
2. Change the `await BartokPizzUI.go(...)` call to the target system's API, e.g.:
   - `CrescendoUI.step2(curve, params)` — needs a curve object
   - `PizzTremUI.go(params)` — similar to BartokPizz
   - `VibratoUI.step2(curve, params)` — needs a curve object
3. Map the generated data fields to the target system's expected params

---

## Programmatic Score Insertion — Analysis

### Direct Console Script (simplest)
The **Console Script** tab generates a paste-ready script that:
1. Defines the note array inline
2. Loops through each note, calling `BartokPizzUI.go({ pitch, dynamic, clef, track, time })`
3. Waits 1.5s between calls (server needs time to run LilyPond pipeline)
4. Marks the score as dirty when complete

**Usage:** Copy the script → paste into browser DevTools console → wait for completion.

### JSON → Import Script (more flexible)
For a more reusable approach:

1. Generate JSON from the tool
2. Save it to a file (e.g., `sequences/bartok_section_323.json`)
3. Use a generic import function in the score app that:
   - Reads the JSON
   - Routes each note to the correct notation system based on `targetSystem`
   - Calls the appropriate `.go()` method

**Potential future enhancement:** Add a server endpoint `/api/sequence/import` that accepts the JSON and processes all notes server-side.

### Save Score Integration
The score's save system (`ScoreManager`) works via registered data sources. Each notation system (BartokPizzUI, CrescendoUI, etc.) has:
- `exportBundles()` → serializes all bundles for saving
- `importBundles(data)` → restores bundles from saved data

**Key insight:** You don't need to modify the save file directly. Instead:
1. Load the score
2. Run the console insertion script
3. Save the score

The bundles are automatically created by each `.go()` call and will be captured in the next save.

### Batch Insertion Considerations
- **Rate limiting:** Each BartokPizz call triggers a LilyPond render on the server (~1–2s). The 1.5s delay in the script accounts for this.
- **Track mapping:** The tool's track numbers must match the score's track layout.
- **Undo:** There's no batch undo. If insertion goes wrong, reload the last save.
- **Partial runs:** The script logs progress. If interrupted, note which index it reached and modify the script to start from there.

---

## Future Development Ideas

1. **Preset system** — Save/load configurations (instrument sets, gap profiles, pitch sets) as JSON presets
2. **Visual timeline** — Show a graphical preview of note placement before generating
3. **Multi-system targeting** — Generate sequences for different notation systems from the same data
4. **Constraint rules** — e.g., "never place the same instrument twice in a row," "avoid repeating a pitch within 3 notes"
5. **Import from existing score** — Parse an existing save file to continue a sequence from the last note
6. **Server integration** — Endpoint that accepts JSON and inserts notes without needing the console
