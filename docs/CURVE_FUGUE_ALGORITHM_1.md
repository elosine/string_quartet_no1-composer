# Curve Fugue Algorithm #1: Short Curve Short Gap

A macro algorithm for generating sequences of glissando motives via AI prompt automation.

---

## Initial Parameters (provided each run)

| Parameter | Description | Example |
|-----------|-------------|---------|
| `startTime` | Start time for the whole sequence (seconds) | 258.1 |
| `numMotives` | Number of motives in the sequence | 11 |
| `initialPitch` | Starting pitch of the first motive | C4 |
| `interval` | Interval size in quarter tones (downward) | 5 |
| `minLength` | Minimum motive duration (seconds) | 1.85 |
| `maxLength` | Maximum motive duration (seconds) | 2.75 |
| `gapMin` | Minimum onset-to-onset gap (seconds) | 0.3 |
| `gapMax` | Maximum onset-to-onset gap (seconds) | 1.0 |
| `glissandoSlope` | Slope for glissando curves (negative = fast start) | -0.65 |
| `vibratoSlope` | Slope for vibrato curves | -0.45 |

---

## Fixed Parameters (same every run)

| Parameter | Value |
|-----------|-------|
| Velocity | 115 |
| Dynamic | f |
| Y1 | 10 |
| Y2 | 0 |
| Model | logarithmic |
| Slope | `glissandoSlope` (from parameters) |
| Color | limeGreen |
| Fill Mode | bottom |

---

## Rule 1: Duration Algorithm (Shuffled Bins)

**Range:** `minLength` to `maxLength` (e.g., 1.85s to 2.75s)

**Method:** Divide range into **7 equal bins**. Bin width = (`maxLength` - `minLength`) / 7. Shuffle the bin order, then cycle through all 7 before reshuffling:
1. Create pool of bins [1, 2, 3, 4, 5, 6, 7]
2. Shuffle randomly
3. For each motive, take the next bin from the shuffled list
4. Pick a random time within that bin
5. When all 7 bins are exhausted, reshuffle and start over

**Example bins (minLength=1.85, maxLength=2.75, width=0.129):**

| Bin | Range |
|-----|-------|
| 1 | 1.850 – 1.979 |
| 2 | 1.979 – 2.107 |
| 3 | 2.107 – 2.236 |
| 4 | 2.236 – 2.364 |
| 5 | 2.364 – 2.493 |
| 6 | 2.493 – 2.621 |
| 7 | 2.621 – 2.750 |

**Why shuffled bins?** With small sample sizes (5–15 motives), pure `Math.random()` can cluster in the middle and miss the extremes. Shuffled bins guarantee every region of the range is visited before any region repeats — equal coverage of short, medium, and long durations.

---

## Rule 2: Track Assignment (Cycling Without Replacement)

**Available tracks:** 1, 2, 4

**Clef mapping:**
- Track 1: treble
- Track 2: treble
- Track 4: bass

**Method:** Cycle through all 3 tracks before repeating:
1. Start a cycle: pool = {1, 2, 4}
2. For each motive, pick randomly from the remaining pool
3. Remove the chosen track from the pool
4. When pool is empty, reset to {1, 2, 4}

**Example sequence:** [4, 1, 2, 2, 4, 1, 1, 2, 4, ...]
(each group of 3 contains all three tracks exactly once)

---

## Rule 3: Pitch Logic (Descending Base + Scenario Interludes)

Given `initialPitch` and `interval` (in quarter tones down):

### Base Pitch

A **base pitch** tracks the current register. It starts at `initialPitch` and descends cumulatively by 1 quarter tone during descent phases. It **never resets**.

### Three Scenarios (relative to current base pitch)

At any base pitch level, three scenarios are available:

| Scenario | Start Pitch | End Pitch |
|----------|-------------|-----------|
| A (original) | basePitch | basePitch - interval |
| B (+1 QT) | basePitch + 1QT | (basePitch + 1QT) - interval |
| C (-1 QT) | basePitch - 1QT | (basePitch - 1QT) - interval |

### Alternating Phases

The pitch sequence alternates between two phase types:

**1. Descent Phase:**
- Roll D = random(2, 3, or 4)
- The first motive uses the current base pitch (Scenario A)
- Each subsequent motive in this phase: base pitch descends by 1 QT
- After D motives, the base pitch has descended D-1 quarter tones from where it started

**2. Scenario Phase:**
- Roll S = random(1, 2, or 3)
- S motives, each randomly picking one of {A, B, C} at the **current** base pitch level
- Base pitch does NOT change during this phase

**Repeat:** descent → scenario → descent → scenario → ... for the entire sequence.

**Motive 1** is always the first motive of the first descent phase.

### Example (initialPitch = C4, interval = 5 QT down)

| Phase | Motive | Base Pitch | Type | Start → End |
|-------|--------|------------|------|-------------|
| Descent (D=2) | 1 | C4 (60.0) | A | C4 → Bbd3 |
| | 2 | Cd4 (59.5) | A | Cd4 → A3 |
| Scenario (S=2) | 3 | Cd4 | roll B | C4 → Bbd3 |
| | 4 | Cd4 | roll C | B3 → Gd3 |
| Descent (D=3) | 5 | B3 (59.0) | A | B3 → G+3 |
| | 6 | Bd3 (58.5) | A | Bd3 → G3 |
| | 7 | Bb3 (58.0) | A | Bb3 → Gd3 |
| Scenario (S=1) | 8 | Bb3 | roll A | Bb3 → Gd3 |
| Descent (D=2) | 9 | A+3 (57.5) | A | A+3 → ... |
| ... | | | | |

The descent is cumulative — it never resets to the initial pitch.

---

## Rule 4: Gap Algorithm (Shuffled Bins)

**Range:** `gapMin` to `gapMax` (e.g., 0.3s to 1.0s)

**Method:** Divide range into **5 equal bins**. Bin width = (`gapMax` - `gapMin`) / 5. Shuffle the bin order, then cycle through all 5 before reshuffling:
1. Create pool of bins [1, 2, 3, 4, 5]
2. Shuffle randomly
3. For each gap, take the next bin from the shuffled list
4. Pick a random gap within that bin
5. When all 5 bins are exhausted, reshuffle and start over

**Example bins (gapMin=0.3, gapMax=1.0, width=0.14):**

| Bin | Range |
|-----|-------|
| 1 | 0.300 – 0.440 |
| 2 | 0.440 – 0.580 |
| 3 | 0.580 – 0.720 |
| 4 | 0.720 – 0.860 |
| 5 | 0.860 – 1.000 |

Gap is measured **onset-to-onset** — from the **start time** of the previous motive to the **start time** of the next motive. Since durations typically exceed gap sizes, motives will intentionally overlap across different tracks.

---

## Rule 5: Collision Handling (for motives 4+)

Since onset-to-onset gaps are shorter than durations, motives overlap across tracks — but **never on the same track**. When the proposed start time falls within an active motive on the selected track:

1. **Try next available track** from the current cycle pool
2. If no track in the pool is free, try any track that is free
3. **If ALL tracks are occupied:** use the track with the **soonest-ending motive**, and **push startTime** to that track's end time

**No same-track overlap rule:** `startTime = max(proposedStart, selectedTrack's latestEndTime)`. This applies to ANY selected track, not just the fallback case. If the chosen track (even from the cycle) is still active, the motive waits until it's free.

**"Occupied" means:** proposed start time < (latest end time on that track)

**Track cycle rule:** Only the **actually-used track** is removed from the cycle pool. If collision forces a different track, the originally-rolled track stays in the pool for future selection.

The collision check uses a memory of each track's latest end time.

---

## Rule 6: Motive Type Selection

**Probability:** 70% glissando, 30% vibrato

**Method:** For each motive, roll a random number 0–1:
- ≤ 0.70 → **glissando**
- \> 0.70 → **vibrato**

**Force rule:** If **4 consecutive glissandos** have been generated without a vibrato, force the next motive to be vibrato (regardless of the roll). Counter resets after each vibrato.

---

## Rule 7: Vibrato-Specific Parameters

When a motive is vibrato (not glissando), the following parameters differ:

### Pitch (follows current base pitch)

The vibrato pitch follows the current pitch level from Rule 3. Randomly pick one of the 3 scenario start pitches at the current base pitch:

| Scenario | Vibrato Pitch |
|----------|---------------|
| A | basePitch |
| B | basePitch + 1QT |
| C | basePitch - 1QT |

This keeps vibrato motives at the same register as the surrounding glissandos.

### Direction (50/50)

For each vibrato motive, flip a coin:
- **Wide-to-narrow:** Y1=10, Y2=0
- **Narrow-to-wide:** Y1=0, Y2=10

### Dynamics (Tied to Direction)

Dynamics always span **fff → f**, mapped to the wide → narrow direction:

| Direction | Y1 | Y2 | Start Dynamic | End Dynamic |
|-----------|----|----|---------------|-------------|
| Wide-to-narrow | 10 | 0 | fff | f |
| Narrow-to-wide | 0 | 10 | f | fff |

### Slope & Model

- **Slope:** `vibratoSlope` (from parameters)
- **Model:** logarithmic

### Velocity, Color, Fill

Same as glissando: velocity=115, color=limeGreen, fillMode=bottom

### Vibrato Endpoint

```
POST /api/vibrato/create-and-save
{ start, end, track, pitch, clef,
  startDynamic, endDynamic, velocity: 115,
  y1, y2, model: "logarithmic", slope: vibratoSlope,
  color: "limeGreen", fillMode: "bottom" }
```

---

## Linear Step-by-Step Process

For each motive i = 1 to numMotives:

### Step 1: Determine Start Time
- **Motive 1:** `startTime` = algorithm's initial `startTime`
- **Motive 2+:** `startTime` = previous motive's `startTime` + gap (from Rule 4, onset-to-onset)
  - Subject to collision handling (Rule 5)

### Step 2: Roll Motive Type
- Apply Rule 6: roll 0–1 → glissando (≤0.70) or vibrato (>0.70)
- Check force rule: if 4+ consecutive glissandos, force vibrato

### Step 3: Roll Duration
- Apply Rule 1: take next bin from shuffled duration list, pick time within bin
- `endTime` = `startTime` + duration

### Step 4: Roll Track
- Apply Rule 2: pick from remaining tracks in current cycle
- Check for collisions (Rule 5) — may override track choice

### Step 5: Determine Clef
- Track 1 or 2 → treble
- Track 4 → bass

### Step 6: Roll Pitch
- **If glissando:** Apply Rule 3 — use the current phase (descent or scenario) to determine start/end pitch at the current base pitch level
- **If vibrato:** Apply Rule 7 — randomly pick one of {A, B, C} scenario start pitches at the current base pitch; roll direction (50/50); set dynamics accordingly
- **Advance phase counter:** decrement remaining count for current phase. When phase is exhausted, switch to the other phase and roll its count (D=2–4 for descent, S=1–3 for scenario)

### Step 7: Execute
- **Glissando:** Call `POST /api/glissando/create-and-save`
- **Vibrato:** Call `POST /api/vibrato/create-and-save`
- Record: track, startTime, endTime, type (for collision memory)

### Step 8: Roll Gap (for next motive)
- Apply Rule 4: take next bin from shuffled gap list, pick gap within bin
- Store for Step 1 of next motive

---

## Worked Example

**Initial parameters:**
- startTime = 258.1, numMotives = 8, initialPitch = C4, interval = 5 QT down
- minLength = 1.85, maxLength = 2.75, gapMin = 0.3, gapMax = 1.0

**Initial state:**
- Duration bins (7): shuffled → [4, 7, 1, 5, 2, 6, 3]
- Gap bins (5): shuffled → [3, 5, 1, 4, 2]
- Track pool: {1, 2, 4}
- Phase: **Descent**, D = 3 (rolled). Base pitch = C4 (60.0)
- Gliss streak: 0

| # | Phase | Base | Type | Track | Start | End | Pitch | Notes |
|---|-------|------|------|-------|-------|-----|-------|-------|
| 1 | Desc 1/3 | C4 | Gliss | 1 | 258.10 | 260.39 | A: C4→Bbd3 | |
| 2 | Desc 2/3 | Cd4 | Gliss | 4 | 258.74 | 261.45 | A: Cd4→A3 | base ↓1QT |
| 3 | Desc 3/3 | B3 | **Vib** | 2 | 259.67 | 261.58 | B3 (N→W, f→fff) | type roll=vib |
| | | | | | | | | → Scenario phase, S=2 |
| 4 | Scen 1/2 | B3 | Gliss | 1 | 260.39 | 262.81 | B: B+3→G+3 | pushed from 260.04 |
| 5 | Scen 2/2 | B3 | Gliss | 4 | 261.45 | 263.50 | C: Bd3→G3 | pushed from 261.18 |
| | | | | | | | | → Descent phase, D=2 |
| 6 | Desc 1/2 | Bd3 | Gliss | 2 | 261.96 | 264.52 | A: Bd3→G3 | base ↓1QT from B3 |
| 7 | Desc 2/2 | Bb3 | **Vib** | 1 | 262.81 | 264.98 | Bb3 (W→N, fff→f) | forced vib (4 gliss) |
| | | | | | | | | → Scenario phase, S=1 |
| 8 | Scen 1/1 | Bb3 | Gliss | 4 | 263.59 | 266.14 | A: Bb3→Gd3 | |

**Key observations:**
- **Pitch descent:** C4 → Cd4 → B3 → [scenario] → Bd3 → Bb3 → [scenario] — cumulative, never resets ✓
- **Scenario phases** use the frozen base pitch with random {A, B, C} offsets ✓
- **No same-track overlap:** M4 pushed to 260.39, M5 pushed to 261.45, M7 pushed to 262.81 ✓
- **Cross-track overlap:** Dense fugal texture as intended ✓
- **Vibrato pitches** follow current base pitch level ✓

---

## Prompt Guide

To invoke this algorithm, prompt Cascade with:

### Template

```
Run Curve Fugue Algorithm #1:
- Start time: ___ s
- Number of motives: ___
- Initial pitch: ___ (e.g., C4)
- Interval: ___ quarter tones down
- Min length: ___ s
- Max length: ___ s
- Gap min: ___ s
- Gap max: ___ s
- Vibrato slope: ___ (e.g., -0.45)
- Glissando slope: ___ (e.g., -0.65)
```

### Example

> Run Curve Fugue Algorithm #1: start 258.1, 11 motives, initial pitch C4, interval 5 quarter tones down, min length 1.85, max length 2.75, gap 0.3–1.0, vibrato slope -0.45, glissando slope -0.65

### What Cascade Does

1. Computes duration bins from `minLength`/`maxLength` and gap bins from `gapMin`/`gapMax`
2. Initializes the descending pitch sequence (Rule 3): rolls first descent phase count (D=2–4)
3. Initializes all shuffled pools (duration bins, gap bins, track cycle)
4. For each motive:
   - Rolls type (70/30 glissando/vibrato, force vibrato after 4 consecutive glissandos)
   - Rolls duration, track per the rules
   - Determines pitch from current phase (descent: base pitch descends by 1 QT each; scenario: random {A, B, C} at current base)
   - Handles collisions (no same-track overlap — pushes start time if needed)
   - Calls the appropriate server endpoint (`/api/glissando/create-and-save` or `/api/vibrato/create-and-save`)
   - Reports the result
5. After all motives: prints a summary table with phase annotations
6. User refreshes browser to see the full sequence
