# MIDI Music Generation

*Created: Feb 21, 2026*

Reference document for MIDI file generation across all musical material systems in this project. Collects patterns, conventions, discoveries, and per-system specifics.

---

## Table of Contents

1. [Global Conventions](#1-global-conventions)
2. [Pitch Bend & Quarter Tones](#2-pitch-bend--quarter-tones)
3. [Channel Mapping](#3-channel-mapping)
4. [CC Message Registry](#4-cc-message-registry)
5. [Dynamic → Velocity Mapping](#5-dynamic--velocity-mapping)
6. [MIDI File Format Conventions](#6-midi-file-format-conventions)
7. [System: Bartók Pizzicato](#7-system-bartók-pizzicato)
8. [System: Long Tone Glissando](#8-system-long-tone-glissando)
9. [System: Vibrato](#9-system-vibrato)
10. [System: Crescendo / Decrescendo](#10-system-crescendo--decrescendo)
11. [System: Z-Stem Pizzicato Tremolo](#11-system-z-stem-pizzicato-tremolo)
12. [Tools & Scripts](#12-tools--scripts)
13. [LilyPond Raw MIDI Characteristics](#13-lilypond-raw-midi-characteristics)
14. [Discoveries & Gotchas](#14-discoveries--gotchas)
15. [modify_midi.js Enhancement Roadmap](#15-modifymidijs-enhancement-roadmap)
16. [Notation → MIDI: State Tracker Strategy](#16-notation--midi-state-tracker-strategy)
17. [MIDI Tagging: Debugging & Testing Protocols](#17-midi-tagging-debugging--testing-protocols)
18. [Software Synth Settings: X-Sample Contemporary Solo Strings](#18-software-synth-settings-x-sample-contemporary-solo-strings)

---

## 1. Global Conventions

- **Ticks per beat:** 480 (programmatic MIDI builders) or 384 (LilyPond raw output)
- **Default tempo:** 60 BPM (1,000,000 µs/beat) — used as a "real-time clock" so 1 beat = 1 second
- **MIDI format:** Format 1, 2 tracks (track 0 = tempo, track 1 = note data)
- **Pitch input format:** Plain English — `C4`, `C#4`, `Bb4`, `C+4` (quarter sharp), `Cd4` (quarter flat)
- **Score has 4 tracks** (one per string quartet instrument), mapped 1:1 to MIDI channels

---

## 2. Pitch Bend & Quarter Tones

### Virtual Instrument Pitch Bend Range

**Critical discovery:** The project's virtual instruments are configured with **pitch bend range ±1 semitone** (not the typical ±2). This affects all pitch bend calculations.

| Context | Pitch Bend Range | Notes |
|---------|-----------------|-------|
| Virtual instruments (synths) | **±1 semitone** | User-confirmed default for all VIs in this project |
| Glissando system | ±2 semitones | Uses its own segmented approach with note changes |
| MIDI standard default | ±2 semitones | Not used in this project's VIs |

### Quarter-Tone Pitch Bend Values (±1 semitone range)

With ±1 semitone range, center = 8192, and 8192 = 1 semitone:

| Quarter Tone | Bend Value | Calculation | Suffix |
|-------------|------------|-------------|--------|
| Quarter sharp (+50 cents) | 12288 | 8192 + (0.5 × 8192) = 12288 | `+` |
| Natural (center) | 8192 | Center | — |
| Quarter flat (−50 cents) | 4096 | 8192 − (0.5 × 8192) = 4096 | `D` |

### Pitch Bend Byte Encoding

14-bit value split into LSB (bits 0–6) and MSB (bits 7–13):
```
LSB = bendValue & 0x7F
MSB = (bendValue >> 7) & 0x7F
```

### Pitch Bend Reset

Always reset pitch bend to center after note-off if bend was used:
```
0xE0, 0x00, 0x40  // bend = 8192 (center)
```

---

## 3. Channel Mapping

| System | Track 1 | Track 2 | Track 3 | Track 4 | Notes |
|--------|---------|---------|---------|---------|-------|
| **Bartók Pizzicato** | Ch 0 | Ch 1 | Ch 2 | Ch 3 | Shares with glissando (OK — discrete events) |
| **Glissando** | Ch 0 | Ch 1 | Ch 2 | Ch 3 | Shares with Bartók pizz |
| **Vibrato** | Ch 4 | Ch 5 | Ch 6 | Ch 7 | Offset +4 to avoid glissando conflicts |
| **Crescendo/Decresc** | Ch 0 | Ch 1 | Ch 2 | Ch 3 | Same as glissando (client-side events) |
| **Z-Stem Pizz Trem** | Ch 8 | Ch 9 | Ch 10 | Ch 11 | Offset +8; dedicated channels for CC7 volume ramp |

> Channel values are 0-indexed internally. Display as "MIDI ch N+1."
>
> Vibrato was moved to channels 5–8 (0-indexed: 4–7) in ASB-057 to avoid conflicts with sustained glissando notes.

---

## 4. CC Message Registry

CC0 (Bank Select / Articulation ID) is used as a **technique identifier** so the playback engine knows which virtual instrument patch or articulation to select.

| CC0 Value | Technique | System |
|-----------|-----------|--------|
| 69 | Regular pizzicato (quarter-tone enabled) | Two-Hand Pizz Grace Note Clusters |
| 71 | Pizzicato open string (one-shot) | Notation Fragments |
| 80 | Behind the bridge pizzicato (open strings) | Two-Hand Pizz Grace Note Clusters |
| 89 | Senza vibrato / arco (default sustained) | Vibrato, Glissando, Crescendo, Notation Fragments |
| 95 | Pizzicato | Z-Stem Pizz Trem, Notation Fragments |
| 97 | Bartók pizzicato (snap pizz, one-shot) | Bartók Pizzicato, Notation Fragments |

### Other CC Messages Used

| CC | Purpose | System | Notes |
|----|---------|--------|-------|
| CC0 | Articulation ID (see above) | All | Sent at tick 0 / start of note |
| CC4 | Vibrato intensity (0–127) | Vibrato | Follows curve Y shape |
| CC7 | Volume (0–127) | Crescendo/Decresc, Z-Stem Pizz Trem | Cresc/Decresc: curve Y; Pizz Trem: linear ramp (cres/decres/hp) |
| CC11 | Expression | Crescendo (commented out) | Was tested for secco cut, removed |
| CC120 | All Sound Off | Crescendo (commented out) | Synth doesn't respond |
| CC123 | All Notes Off | Crescendo (commented out) | Synth doesn't respond |
| Channel Pressure (0xD0) | Aftertouch intensity | Vibrato | Sent alongside CC4, same value |

---

## 5. Dynamic → Velocity Mapping

Used by Bartók Pizzicato system (`BartokPizzUI.dynamicToVelocity`):

| Dynamic | Velocity |
|---------|----------|
| ppp | 30 |
| pp | 45 |
| p | 60 |
| mp | 70 |
| mf | 85 |
| f | 95 |
| ff | 107 |
| fff | 120 |

Default fallback: 100

Other systems use direct velocity input (not dynamic-mapped):
- **Glissando:** default 64 (mp-ish)
- **Vibrato:** default 115 (UI input)
- **Crescendo:** UI input, default 100

---

## 6. MIDI File Format Conventions

All programmatically built MIDI files follow this structure:

```
MThd (header)
  Format: 1
  Tracks: 2
  Ticks/beat: 480

MTrk (track 0 — tempo)
  Tempo meta event: 60 BPM (1,000,000 µs/beat)
  End of track

MTrk (track 1 — note data)
  [CC0 articulation at delta 0]
  [Pitch bend at delta 0, if quarter-tone]
  [Note On at delta 0]
  [CC/pitch bend samples during note...]
  [Note Off at end]
  [Pitch bend reset, if used]
  End of track
```

### Helper Functions (repeated across builders)

| Function | Purpose |
|----------|---------|
| `writeVarInt(value)` | MIDI variable-length integer encoding |
| `writeInt(value, length)` | Fixed-length big-endian integer |
| `secondsToTicks(seconds)` | Convert seconds to MIDI ticks: `Math.round(seconds × TICKS_PER_BEAT × BPM / 60)` |

---

## 7. System: Bartók Pizzicato

**Character:** Single discrete attack — very short (snap pizz).

| Property | Value |
|----------|-------|
| Note duration | 95.4 ms (≈96 ticks at 384 TPB) |
| CC0 value | 97 |
| Velocity | Dynamic-mapped (see §5) |
| Pitch bend | Only if quarter-tone (±1 semitone range) |
| Channel | Track − 1 (0-indexed) |

**Event sequence:**
1. Pitch bend (if quarter-tone) — at impact time
2. CC0 = 97 — at impact time
3. Note On — at impact time
4. Note Off — at impact + 95.4ms
5. Pitch bend reset (if used) — at note off

**MIDI source:** LilyPond renders raw `.mid`, then `modify_midi.js` post-processes (channel rewrite + CC insertion). Also generated programmatically client-side via `BartokPizzUI.insertBartokMidi()`.

---

## 8. System: Long Tone Glissando

**Character:** Sustained note with continuous pitch bend following a curve shape.

| Property | Value |
|----------|-------|
| Pitch bend range | ±2 semitones (internal to glissando algorithm) |
| Pitch bend sample interval | 50 ms |
| CC0 value | 89 (first 2 segments only) |
| Velocity | UI input, default 64 |
| Segmentation | Splits into new MIDI note when pitch deviates > 2 semitones |

**Segmentation algorithm:**
- Walk curve samples; when accumulated pitch change exceeds `PITCH_BEND_RANGE` (2 semitones), start a new segment
- Each segment is a separate MIDI file with its own note + pitch bend envelope
- Gliss down: `midiNote = round(startPitch) - 1`, bend starts at MAX (16383)
- Gliss up: `midiNote = round(startPitch) + 1`, bend starts at MIN (0)

**Pitch bend values:**
- MIN = 0, MAX = 16383, CENTER = 8192
- `bendRangeUsed = pitchChange / PITCH_BEND_RANGE`
- Down: start at MAX, end at `MAX − (rangeUsed × (MAX − MIN))`
- Up: start at MIN, end at `MIN + (rangeUsed × (MAX − MIN))`

**Implementations:** Client-side `LongToneUI.generateGlissandoMidi()` and server-side `generateGlissandoSegments()` + `buildGlissandoSegmentMidi()`.

---

## 9. System: Vibrato

**Character:** Sustained note with CC4 + channel pressure envelope following curve Y.

| Property | Value |
|----------|-------|
| CC sample interval | 50 ms (20 messages/sec) |
| CC0 value | 89 |
| CC4 | Vibrato intensity (0–127, maps from curve Y 0–1) |
| Channel pressure (0xD0) | Same value as CC4, sent at same time |
| Velocity | UI input, default 115 |
| Channel | Track + 3 (0-indexed: ch 4–7) |
| Pitch bend | Only if quarter-tone start pitch |

**Event sequence:**
1. CC0 = 89 at tick 0
2. Pitch bend (if quarter-tone) at tick 0
3. Note On at tick 0
4. CC4 + Channel Pressure samples every 50ms following curve shape
5. Note Off at end
6. Pitch bend reset (if used)

**Implementations:** Client-side `VibratoUI.generateVibratoMidi()` and server-side `buildVibratoMidiFile()`.

---

## 10. System: Crescendo / Decrescendo

**Character:** Sustained note with CC7 volume envelope following curve shape.

| Property | Value |
|----------|-------|
| CC interval | 20 ms (50 messages/sec) |
| CC0 value | 89 |
| CC7 | Volume (startVol → endVol, mapped through curve shape) |
| Velocity | UI input, default 100 |
| Pitch bend | If glissando mode or quarter-tone start pitch |
| Secco mode | Kills sound immediately — CC7→0 before note-off, velocity 127 on note-off |

**Event ordering:**
1. CC0 = 89 at t=0ms
2. CC7 = startVol at t=1ms
3. Note On at t=2ms
4. Pitch bend (if quarter-tone) at t=2ms
5. CC7 volume samples every 20ms (+ pitch bend if glissando mode)
6. [Secco: CC7→0 at curve end + 7ms]
7. Note Off at curve end + 10ms (velocity 127 if secco, 0 if normal)
8. Pitch bend reset (if used)

**Secco discovery:** CC120 (All Sound Off) and CC123 (All Notes Off) were tested but the synth doesn't respond to them. CC7→0 works for immediate volume cut.

**Implementation:** Client-side only — `LongToneUI.generateCrescDecrescEvents()`. No server-side builder.

---

## 11. System: Z-Stem Pizzicato Tremolo

**Character:** Repeated rapid notes ("as fast as possible") — unmeasured tremolo.

| Property | Value | Notes |
|----------|-------|-------|
| CC0 value | **95** | Pizzicato velocity patch |
| Velocity | Dynamic-mapped (reuse §5 table) | Constant per snippet; CC7 shapes volume |
| Pitch bend | Only if quarter-tone | ±1 semitone range; reset at end |
| Channels | **8–11** (0-indexed) | Track 1→Ch 8, Track 2→Ch 9, etc. |
| Note pattern | Sampled from timing database | Human-played rhythmic feel |
| CC7 volume | Linear ramp (cres/decres/hp) | 20ms interval, 0–127 range |

### CC7 Volume Shapes

| Shape | Start | Mid | End | Description |
|-------|-------|-----|-----|-------------|
| `cres` | 50 | — | 127 | Linear ramp up over full duration |
| `decres` | 127 | — | 0 | Linear ramp down over full duration |
| `hp` | 50 | 127 | 0 | Ramp up to max at halfway, then ramp down to 0 |

> CC7 start volume = 50 for cres/hp. Decrescendo goes from 127 all the way to 0.

### MIDI File Generation

**Generator script:** `lilypond_code/generate_pizz_tremolo_midi.js`

```powershell
node generate_pizz_tremolo_midi.js --pitch "c'" --dynamic ff --track 1 --shape cres --duration 3
node generate_pizz_tremolo_midi.js --pitch "ftqs''" --dynamic ff --track 1 --shape hp --duration 3 --output myfile.mid
```

**Event sequence in generated MIDI:**
1. CC0 = 95 at tick 0 (patch select)
2. Pitch bend at tick 0 (if quarter-tone)
3. CC7 initial volume at tick 0
4. Rapid note-on/off events (sampled from timing DB, all at same velocity)
5. CC7 volume messages every 20ms (linear ramp per shape)
6. Pitch bend reset after last note-off (if quarter-tone was used)

### Timing Database

Timing and velocity data extracted from recorded tremolo performances. Pitch-agnostic — only onset/offset timing and velocity are stored.

- **Database:** `public/midi_files/pizz_tremolo_db.json`
- **Ingestion script:** `lilypond_code/ingest_pizz_tremolo.js`
- **Source:** `PizzTremeloMidiSampleforDB.mid` (378 notes, 9 segments)

| Stat | Value |
|------|-------|
| Avg note duration | 71.5 ms |
| Avg gap between notes | 45.3 ms |
| Avg velocity | 103 (range 75–127) |
| Avg inter-onset interval | ~117 ms |

**Ingestion commands:**
```powershell
# New database (create/overwrite)
node lilypond_code/ingest_pizz_tremolo.js <input.mid> --mode=new
# Append to existing
node lilypond_code/ingest_pizz_tremolo.js <input.mid> --mode=append --label="session 2"
```

### Workflow

See `docs/PIZZICATO_TREMOLO_WORKFLOW.md` for the full step-by-step process.

---

## 12. Tools & Scripts

### `lilypond_code/generate_pizz_tremolo_midi.js`

Standalone MIDI generator for Z-stem pizzicato tremolo. Samples timing DB, applies CC7 volume envelope, handles quarter-tone pitch bend.

```powershell
node generate_pizz_tremolo_midi.js --pitch <ly_pitch> --dynamic <dyn> --track <1-4> --shape <cres|decres|hp> --duration <seconds> [--output <path>]
```

- Builds Format 1 MIDI (2 tracks, 480 ticks/beat, 60 BPM)
- CC0=95 patch select, CC7 linear volume ramp, pitch bend for quarter-tones
- Channels 8–11 (track + 7)

### Custom Score-Derived MIDI Data Injection Pipeline (Bespoke Application Set)

The following tools form the **Custom Score-Derived MIDI Data Injection Pipeline** for notation fragments. They convert LilyPond notation (with embedded MIDI tags) into a fully post-processed MIDI file with per-note CC injections and velocity overrides.

| Tool | Location | Role |
|---|---|---|
| `midi-tags.ily` | `lilypond_code/` | LilyPond shorthand variables for `\set` MIDI context properties |
| `midi-logger.ily` | `lilypond_code/` | Scheme engraver — reads context properties, writes JSON event log |
| `state_tracker.js` | `lilypond_code/` | Node.js — converts event log → CC map JSON for `modify_midi.js` |
| `modify_midi.js` | `lilypond_code/` | Node.js — injects CC events + velocity overrides into MIDI |

**Pipeline flow:**
```
.ly file (with \midiXxx tags)
  → LilyPond render → raw .mid + event log (.json)
    → state_tracker.js → CC map (.json)
      → modify_midi.js → final -Mod.mid
```

See `docs/NOTATION_FRAGMENT_WORKFLOW.md` Step 4 for full usage instructions and expansion guide.

### `lilypond_code/state_tracker.js`

Converts a Scheme engraver event log into a CC map for `modify_midi.js`.

```powershell
node state_tracker.js <event-log.json> [--out <output.json>]
```

- Reads `midiCCZero` → emits `cc: [{num: 0, val: N}]`
- Reads `midiVelocity` → emits `vel: N`
- Console summary: input events, output events, CC count, velocity override count

### `lilypond_code/modify_midi.js`

General-purpose MIDI post-processor. Rewrites channel, inserts CC messages (tick 0 and/or per-note), overrides velocity.

```powershell
node modify_midi.js <input.mid> <output.mid> <channel> [--cc <num> <val>] ... [--map <file.json>]
```

- `channel` is 0-indexed
- `--cc` is repeatable; inserts at tick 0
- `--map` accepts JSON file with per-note CC insertion and velocity overrides
- JSON map `noteIndex` is 0-based note *groups* (chords at same tick = 1 group)
- Optional `"vel"` field overrides velocity for all notes in a group (e.g. sfz → 127)
- Preserves tempo track (track 0) unchanged
- Rewrites Note On/Off, CC, Program Change, Channel Pressure, Pitch Bend channels

### `lilypond_code/render_bartok_pizz.js`

Full pipeline for Bartók pizzicato (LilyPond → render → crop SVG → modify MIDI → output).

### Server-side MIDI Builders (in `server.js`)

| Function | System | Description |
|----------|--------|-------------|
| `buildVibratoMidiFile()` | Vibrato | Single note + CC4/pressure envelope |
| `buildGlissandoSegmentMidi()` | Glissando | Single segment with pitch bend envelope |
| `generateGlissandoSegments()` | Glissando | Splits curve into ≤2-semitone segments |
| `parseMidiToEvents()` | All | Parse MIDI bytes to event array for score insertion |
| `pitchToMidi()` | All | English pitch string → MIDI note number |
| `pitchToMidiFloat()` | Glissando | Pitch string → MIDI note + quarter-tone float |
| `midiNoteToPitchName()` | Glissando | MIDI note number → display string |

### Client-side MIDI Generators (in `public/index.html`)

| Function | System | Description |
|----------|--------|-------------|
| `LongToneUI.generateGlissandoMidi()` | Glissando | Curve → segments → MIDI files via server save |
| `VibratoUI.generateVibratoMidi()` | Vibrato | Curve → CC envelope → MIDI file via server save |
| `LongToneUI.generateCrescDecrescEvents()` | Crescendo | Curve → CC7 volume events (client-side only) |
| `BartokPizzUI.insertBartokMidi()` | Bartók Pizz | Single note + CC0=97 → MidiSnippetDatabase |
| `LongToneUI.noteNameToPitch()` | All | English pitch → {pitch, quarterTone} |
| `BartokPizzUI.dynamicToVelocity()` | Bartók Pizz | Dynamic string → velocity |
| `BartokPizzUI.englishToMidi()` | Bartók Pizz | English pitch → MIDI note number |
| `PizzTremUI.insertPizzTremMidi()` | Pizz Trem | Build rapid-note MIDI snippet from timing DB → MidiSnippetDatabase |
| `PizzTremUI.sampleNotes()` | Pizz Trem | Sample note timing from `pizz_tremolo_db.json` for requested duration |
| `PizzTremUI.generateCC7Ramp()` | Pizz Trem | Generate CC7 volume ramp events (cres/decres/hp) |
| `PizzTremUI.getTimingDb()` | Pizz Trem | Fetch + cache timing database |
| `PizzTremUI.englishToLilypond()` | Pizz Trem | English pitch → LilyPond notation |
| `PizzTremUI.englishToMidi()` | Pizz Trem | English pitch → MIDI note number |
| `PizzTremUI.dynamicToVelocity()` | Pizz Trem | Dynamic string → velocity |

---

## 13. LilyPond Raw MIDI Characteristics

When LilyPond renders a `.ly` file with `\midi{}`, it produces:

| Property | Value |
|----------|-------|
| Format | 1 |
| Tracks | 2 (tempo + data) |
| Ticks/beat | 384 |
| Tempo | 60 BPM (1,000,000 µs/beat) |
| Channel | 0 (default) |
| 16th note duration | 96 ticks |
| fff velocity | 107 |

This raw MIDI needs post-processing via `modify_midi.js` to:
1. Set the correct MIDI channel for the target track
2. Insert CC0 articulation identifier

---

## 14. Discoveries & Gotchas

### Pitch Bend

- **Virtual instruments use ±1 semitone range** — all quarter-tone bend calculations assume 8192 = 1 semitone
- **Glissando uses ±2 semitone segments internally** but relies on note changes for larger ranges
- **Always reset pitch bend** after note-off if any bend was applied
- **Pitch bend is per-channel**, not per-note — if two notes share a channel, bends will interfere

### Secco / Sound Cutoff

- CC120 (All Sound Off) — **synth doesn't respond**
- CC123 (All Notes Off) — **synth doesn't respond**
- **CC7→0 works** for immediate volume cut before note-off
- Note-off velocity 127 signals abrupt release intent (secco)

### Channel Conflicts

- Bartók pizz and glissando share channels 1–4 — acceptable because Bartók events are discrete single 16th notes
- Vibrato was moved to channels 5–8 (ASB-057) to avoid conflicts with sustained glissando notes
- If a 3rd sustained system needs channels, address potential conflicts

### MIDI State Reset Problem (open issue)

**Problem:** When a MIDI snippet uses continuous controllers (CC7 volume ramps, CC4/channel pressure for vibrato), the controller state persists after the snippet ends. The next snippet on the same channel inherits the final CC value — e.g., a volume ramp to zero means the next snippet starts silently, or a ramp to max means the next snippet starts at full volume.

**What doesn't work:**
- CC120 (All Sound Off) — synth doesn't respond
- CC123 (All Notes Off) — synth doesn't respond
- Sending CC7→0 immediately after note-off — sounds like a distinct cutoff; the tail disappears abruptly and then you hear the ramp-up of the next snippet. Unnatural.

**Current workaround:** Dedicate separate channel banks per modification type. Systems using CC7 volume or channel pressure get their own channel offset (e.g., vibrato → ch 4–7, pizz tremolo → ch 8–11). This way, consecutive snippets within the same system follow each other correctly because they share the same CC trajectory expectations.

**Channel pressure / vibrato:** May be simpler — after note-off, reset channel pressure to 0 (unity). Needs testing.

**Volume (CC7):** Harder — the audible artifact of instant reset is the core problem. Possible approaches to investigate:
1. **Micro-fade:** Brief CC7 ramp (e.g., 50ms) from end value to neutral before next snippet
2. **Inter-snippet gap:** Ensure enough silence between snippets that the reset isn't audible
3. **Channel rotation:** Alternate channels so each snippet gets a "clean" channel
4. **Accept the workaround:** Keep using dedicated channel banks (current approach works, just uses more channels)

**Channel limit:** MIDI supports 16 channels per port. Current usage: ch 0–3 (base), ch 4–7 (vibrato), ch 8–11 (pizz tremolo) = 12 of 16. To expand beyond 16, use **multiple MIDI ports** — each port provides a fresh set of 16 channels. Most modern DAWs support multi-port MIDI routing. Bank Select (CC0/CC32) does NOT expand the channel count — it only switches instrument patches.

### CC0 as Articulation ID

- Sent at tick 0 (or event start time) on the note's channel
- Value identifies the technique for the playback engine's patch selection
- Each technique gets a unique CC0 value

### MIDI File Builders

- `writeVarInt` / `writeInt` / `secondsToTicks` are duplicated across multiple builder functions (server + client)
- Consider extracting to a shared utility if more builders are added

---

## 15. modify_midi.js Enhancement Roadmap

A roadmap for building new MIDI manipulation capabilities into `modify_midi.js`. Each feature extends the JSON map format.

### Implemented

| Feature | JSON Field | Description | Added |
|---------|-----------|-------------|-------|
| Per-note CC injection | `cc: [{num, val}]` | Insert CC messages before Note On of targeted group | ASB-087 |
| Velocity override | `vel: 0-127` | Override velocity for all notes in a group (e.g. sfz→127) | ASB-089 |
| Glissando pitch bend ramp | `gliss: {semitones: N}` | 20-step linear pitch bend ramp across note duration, reset at Note Off. ±1 semitone range, fractional OK. Phase 2 post-processing. | ASB-091 |
| Tick-0 CC | `--cc` flag | Insert CC at tick 0 (backward compat) | Original |
| Channel rewrite | `<channel>` arg | Rewrite all channel voice events | Original |

### Planned / Future

| Feature | Proposed JSON Field | Use Case | Priority |
|---------|-------------------|----------|----------|
| Pitch bend at note | `"bend": 0-16383` | Quarter-tones, glissando start points | Medium |
| Channel pressure at note | `"pressure": 0-127` | Vibrato intensity, aftertouch effects | Low |
| Note duration override | `"durTicks": N` | Shorten/lengthen specific notes | Low |
| CC envelope (multi-point) | `"ccEnv": [{tick, num, val}]` | Volume shaping (CC7 ramps), vibrato (CC4) over time | Medium |
| Note transposition | `"transpose": ±N` | Shift pitch by N semitones | Low |
| Program Change at note | `"pc": 0-127` | Patch switch mid-stream | Low |

### Design Principles

1. **JSON map is the single interface** — all per-note modifications go through the `noteEvents` array
2. **One group = one notational event** — chords at same tick are one group, one `noteIndex`
3. **Additive, not destructive** — new fields are optional; omitting them preserves original MIDI data
4. **CC before Note On** — CC/bend/pressure injected immediately before the first Note On of the group
5. **Velocity applies to all notes in group** — a sfz chord gets all notes at vel 127

---

## 16. Notation → MIDI: State Tracker Strategy

When translating notation symbols to MIDI CC messages, some symbols set a **persistent mode** (stays until changed) while others are **one-shot** (apply once, then revert). This requires a state machine.

### State Machine Design

```
State: { currentMode: "pizz", currentCC0: 95 }

For each note group:
  1. Check for MODE CHANGERS (persistent):
     - "pizz." → set currentMode="pizz", currentCC0=95
     - "arco" → set currentMode="arco", currentCC0=89
     - \snappizzicato → set currentMode="bartok", currentCC0=97

  2. Check for MODIFIERS (one-shot):
     - "o" (open string) + currentMode="pizz" → use CC0=71 THIS NOTE ONLY
     - "o" (open string) + currentMode="arco" → no CC change (arco open string = same patch)

  3. Check for VELOCITY OVERRIDES (one-shot):
     - \sfz → vel=127 THIS NOTE ONLY
     - \fp → vel=127 THIS NOTE ONLY (with CC7 decay, future)

  4. Emit CC0 = resolved value (persistent or one-shot)
  5. After one-shot, revert to currentCC0 for next note
```

### Lookup Table

Persistent mappings and one-shot rules stored in `docs/cc_mapping_registry.json`:

| Symbol | Type | CC0 Value | Condition | State Rule |
|--------|------|-----------|-----------|------------|
| `"pizz."` | Mode changer | 95 | — | Persistent |
| `"arco"` | Mode changer | 89 | — | Persistent |
| `\snappizzicato` | One-shot | 97 | — | One-shot (consecutive: no revert needed) |
| `"o"` | Modifier | 71 | currentMode = pizz | One-shot |
| `\sfz` | Velocity override | — | — | One-shot, vel=127 |

### Implementation Path

| Phase | Approach | Who does analysis? | Status |
|-------|----------|--------------------|---------|
| **Completed** | AI reads `.ly`, applies state machine cognitively, produces JSON map | AI (Option A) | ✅ Proven (ASB-088/089) |
| **Active** | Custom Scheme MIDI Tagging: `\midiXxx` tags in `.ly` → Scheme engraver event log → `state_tracker.js` → `modify_midi.js` | Automated (Option E) | ✅ Proven (ASB-090/091) |
| **Fallback** | Node.js regex parser reads `.ly` directly; applies state machine + config lookup | Automated (Option D) | Backup |

See `docs/NOTATION_FRAGMENT_WORKFLOW.md` → Analysis Roadmap for full option descriptions.

> **Note:** The pipeline is now formally called the **Custom Score-Derived MIDI Data Injection Pipeline (Bespoke Application Set)**. See `NOTATION_FRAGMENT_WORKFLOW.md` Step 4 for full documentation including an expansion guide for adding new CC types, pitch bend, channel pressure, etc.

---

## 17. MIDI Tagging: Debugging & Testing Protocols

Verification procedures for the `\set` context property tagging system (`midi-tags.ily`).

### Overview

The MIDI tagging pipeline has three stages, each with its own verification point:

```
.ly file (\midiXxx tags) → Scheme engraver → event log (.json)
event log → Node.js state tracker → CC map (.json)
CC map → modify_midi.js → modified MIDI (.mid)
```

### Level 1: Scheme Event Log Inspection

**What it checks:** Did the Scheme engraver correctly read the `\set` properties at each timestep?

**How:** After LilyPond compilation, inspect the event log JSON file. Each entry shows:

```json
[
  {"moment": "0/1", "notes": ["fs'"], "midiCCZero": 95, "midiVelocity": null},
  {"moment": "1/20", "notes": ["a"], "midiCCZero": 95, "midiVelocity": null},
  {"moment": "1/10", "notes": ["af,"], "midiCCZero": 95, "midiVelocity": null},
  {"moment": "1/4", "notes": ["g'"], "midiCCZero": 95, "midiVelocity": null},
  {"moment": "11/24", "notes": ["c,"], "midiCCZero": 71, "midiVelocity": null},
  {"moment": "5/8", "notes": ["f'", "b", "fs"], "midiCCZero": 95, "midiVelocity": null},
  {"moment": "3/4", "notes": ["d'", "af", "e"], "midiCCZero": 95, "midiVelocity": null},
  {"moment": "27/32", "notes": ["bf", "fs", "b,"], "midiCCZero": 95, "midiVelocity": 127}
]
```

**Verify:**
- Every note group has a `midiCCZero` value (no nulls unless intentional)
- One-shot values (CC0=71, velocity) appear only where intended
- Values match the `\midiXxx` tags in the `.ly` source

### Level 2: JSON Map Comparison

**What it checks:** Did the Node.js state tracker correctly translate the event log into a CC map?

**How:** Compare the generated JSON map against a hand-verified expected map:

```powershell
node state_tracker.js event_log.json > actual_map.json
# Visual diff:
diff expected_map.json actual_map.json
```

**Expected map structure:**
```json
{
  "noteEvents": [
    { "noteIndex": 0, "cc": [{ "num": 0, "val": 95 }] },
    { "noteIndex": 4, "cc": [{ "num": 0, "val": 71 }] },
    { "noteIndex": 7, "cc": [{ "num": 0, "val": 95 }], "vel": 127 }
  ]
}
```

**Verify:**
- Correct `noteIndex` for each CC event
- Correct CC number and value pairs
- Velocity overrides only on intended note groups

### Level 3: MIDI Binary Verification

**What it checks:** Did `modify_midi.js` correctly inject CC events and velocity overrides into the MIDI file?

**How:** Use `modify_midi.js` console output (already logs CC injections and velocity overrides) or a MIDI dump script:

```powershell
node modify_midi.js input.mid output.mid 0 --map cc_map.json
```

**Console output shows:**
```
Note group CC injections:
  Group 0: CC0=95
  Group 4: CC0=71
  Group 7: CC0=95
Velocity overrides:
  Group 7: vel=127
```

**Verify:**
- CC injections at correct note groups
- Velocity overrides at correct note groups
- Total byte count is reasonable (original + injected CC bytes)

### Regression Testing

**Golden test case:** `NotationFragment001-Cello.ly`

This fragment has been manually verified and serves as the reference for pipeline testing:

| Note Group | Expected CC0 | Expected Velocity | Reason |
|---|---|---|---|
| 0 (fs') | 95 | default | First pizz note |
| 1 (a) | 95 | default | Continuing pizz |
| 2 (af,) | 95 | default | Continuing pizz |
| 3 (g') | 95 | default | Continuing pizz |
| 4 (c,) | 71 | default | Open string pizz (one-shot) |
| 5 (f' b fs) | 95 | default | Revert to pizz, chord |
| 6 (d' af e) | 95 | default | Continuing pizz, chord |
| 7 (bf fs b,) | 95 | 127 | sfz chord |

**After any toolchain change**, re-run the full pipeline on this fragment and compare output to the expected values above.

### Quick Verification Commands

```powershell
# Full pipeline — run from lilypond_code/ directory:
lilypond --svg -dbackend=svg -o "NotationFragment001-Cello" "NotationFragment001-Cello.ly"
node state_tracker.js NotationFragment001-Cello-midi-log.json --out fragment001_cc.json
node modify_midi.js NotationFragment001-Cello.mid NotationFragment001-Cello-Mod.mid 0 --map fragment001_cc.json
```

---

## 18. Software Synth Settings: X-Sample Contemporary Solo Strings

### Glissando Key Switches

Key switch approach for achieving glissando effects in the X-Sample Contemporary Solo Strings library:

| Key Switch | Function | Notes |
|------------|----------|-------|
| **B0** (high velocity) | Switch into glissando key switch mode | Must be sent before slide keys |
| **G#1** (between notes) | Slide **down** | Insert between the two sounding notes |
| **A1** (between notes) | Slide **up** | Insert between the two sounding notes |

### Legato Settings (TO INVESTIGATE)

Research and investigate legato behavior using the following CCs:

| CC | Function | Status |
|----|----------|--------|
| **CC68** | Legato on/off | Needs testing |
| **CC24** | Legato intensity | Needs testing |

---

*Document created: Feb 21, 2026*
*Source: Codebase scan of server.js, public/index.html, modify_midi.js, render_bartok_pizz.js, BARTOK_PIZZICATO_WORKFLOW.md*
