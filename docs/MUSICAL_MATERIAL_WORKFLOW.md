# Musical Material Workflow

A general process for creating multi-component musical objects and inserting them into the score. Each "musical material" consists of some combination of:

- **Notation** — SVG graphic of the musical notation (generated via LilyPond)
- **Graphic Object** — Visual score element (GC, curve, etc.) representing the gesture
- **MIDI** — Performance data (note events, CC messages, channel assignment)
- **Audio** — Sound file (future)
- **Animation** — Animated visual component (future, e.g., GC ball motion)

---

## Principle

Build each component's pipeline **off-score first** (scripts, templates, tooling), then integrate into the score via UI and/or AI prompt. The score is a place to **collect data** (inputs) and **trigger** (execute the pipeline). This separation means:

1. Pipelines can be tested independently
2. Batch generation is possible without the score running
3. The score UI stays lightweight — it gathers inputs and calls the pipeline

---

## Insertion Patterns (Evolution)

Three insertion patterns have been used, each an improvement over the last:

### Pattern 1: Console Script → Save → Reload (early materials)
Cascade generated JavaScript snippets that the user pasted into the browser console. These manipulated the in-memory databases (CurveDatabase, MidiSnippetDatabase, etc.). The user then saved the score to JSON and reloaded it. The reload triggered `reloadFromDatabase()` which rebuilt tracks and displays. **Two manual steps** after each insertion.

### Pattern 2: Programmatic API → Save → Reload (Crescendo, Glissando, Vibrato)
Same data flow, but triggered from UI buttons (`CrescendoUI.go()`, etc.) instead of pasted console code. Events were pushed directly into `MidiController.tracks[]`, but playback indices weren't always reset — so a save + reload was needed to guarantee playback worked.

### Pattern 3: Direct Live Insertion (Bartók Pizzicato — current preferred)
The UI Go button does everything in one shot, no save or reload needed:
1. Server pipeline renders files (SVG + MIDI)
2. GC/graphic object created and rendered into the live DOM
3. SVG notation placed into the live DOM via SVGElementManager
4. MIDI snippet added to `MidiSnippetDatabase`, then `MidiController.reloadFromDatabase()` called
5. `ScoreManager.markDirty()` triggers auto-save

The key: **`reloadFromDatabase()`** does a clean rebuild of all tracks from the database — the same code path that runs on score load. This guarantees playback indices and event arrays are correct without requiring a manual save/reload cycle.

**All new materials should use Pattern 3 at minimum, Pattern 4 when possible.**

### Pattern 4: AI Direct — Hands-Free (Bartók Pizzicato — ideal)
Cascade sends commands directly to the browser via an **AI Command Bridge** (REST → Socket.IO):
1. User describes the material in natural language to Cascade
2. Cascade calls `POST /api/ai/command` with the JS command
3. Server broadcasts to browser via Socket.IO `aiCommand` event
4. Browser receives, evaluates, and executes (e.g., `BartokPizzUI.go({...})`)
5. All components appear in the live score — no paste, no save, no reload

**No user interaction with the browser required.** The user talks to Cascade, the material appears in the score.

> **Vision:** This is the target workflow for all musical materials — the composer describes what they want in natural language, and it materializes in the score. Pattern 4 is built on Pattern 3 (Direct Live Insertion) with the addition of the AI Command Bridge.

**Fallback:** If the command bridge is unavailable (server not running, connection issues), Cascade provides copy-paste JS for the browser console (Pattern 3 workflow).

---

## General Workflow Pattern

### Phase 1: Pipeline Development (off-score)

1. **Define the musical material** — What notation, what MIDI behavior, what graphic object?
2. **Build the notation template** — LilyPond file with parameterized inputs (pitch, dynamic, clef, etc.)
3. **Build the rendering pipeline** — Script that generates .ly → renders SVG + MIDI → crops SVG → modifies MIDI
4. **Test offline** — Verify outputs (SVG looks correct, MIDI hex verified, naming convention works)
5. **Document** — Workflow doc, registry updates, slash command

### Phase 2: Score Integration (Direct Live Insertion — Pattern 3)

1. **Create UI section** — Input fields matching the pipeline's required inputs + a Go button
2. **Create server endpoint** — Runs the pipeline from a POST request, returns output paths
3. **Wire up the Go function** — On click:
   a. Gather inputs from UI
   b. Call server endpoint (runs pipeline → returns SVG + MIDI paths)
   c. Create graphic object (GC, curve, etc.) at the specified time/track — renders immediately
   d. Insert SVG notation into live DOM (via SVGElementManager)
   e. Add MIDI snippet to MidiSnippetDatabase, then call `MidiController.reloadFromDatabase()`
   f. Call `ScoreManager.markDirty()` — auto-save captures everything
4. **Test end-to-end** — Click Go in UI, verify all components appear and play immediately
5. **Document AI prompt** — So the same workflow can be triggered conversationally

### Phase 3: Refinement (ongoing)

- Batch mode support
- Adjustable parameters post-insertion
- Audio component integration
- Cross-system coordination (e.g., channel conflicts, timing alignment)

---

## Implemented Materials

### Bartók Pizzicato

**Status:** Complete — first material using Direct Live Insertion (Pattern 3)

**Components:**
- **Notation:** Single note with snap pizzicato + dynamic, custom short staff lines
- **Graphic Object:** GC (Gravitational Conductor) — fixed shape parameters
- **MIDI:** Single 16th note, CC0=97 (Bartók pizz identifier), channel = track - 1

**Pipeline:** `lilypond_code/render_bartok_pizz.js` (single + batch)
**Workflow Doc:** `docs/BARTOK_PIZZICATO_WORKFLOW.md`
**Slash Command:** `/bartok-pizz`

**UI Inputs:**
| Input | Type | Description |
|-------|------|-------------|
| Track | number 1–4 | Score track (also determines MIDI channel) |
| Clef | select | treble / alto / bass |
| Pitch | text | Plain English (e.g., C4, C#4, Bb3, C+4, Cd4) |
| Dynamic | select | fff, ff, f, mf, mp, p, pp, ppp |
| Time | number | Impact time in seconds |

**GC Parameters (fixed — from GC_20260117_204645):**
| Parameter | Value |
|-----------|-------|
| stiffness | 62 |
| damping | 100 |
| ictus | 90 |
| descentRatio | 60 |
| duration | 0.6 |
| color | neonMagenta |

**On Go:**
1. Server runs pipeline → returns SVG path + MIDI path
2. Create GC at impact time on the specified track
3. Insert notation SVG at impact time on the specified track
4. Insert MIDI events (CC0=97, Note On/Off) at impact time on the specified channel

### Crescendo / Decrescendo

**Status:** Complete

**Components:**
- **Notation:** Hairpin + glissando or single pitch (LilyPond)
- **Graphic Object:** Curve (CurveMaker)
- **MIDI:** Pitch bend segments + CC7 volume ramp, optional secco CC7 ramp-down

**Pipeline:** Server-side LilyPond render via `/api/lilypond/create-crescendo` + `/api/lilypond/render-glissando`
**UI:** Two-phase (1: Curve, 2: Generate)

### Glissando

**Status:** Complete

**Components:**
- **Notation:** Glissando line between two pitches (LilyPond)
- **Graphic Object:** Curve (CurveMaker)
- **MIDI:** Pitch bend ramp

### Vibrato

**Status:** Complete

**Components:**
- **Notation:** Vibrato wavy line (LilyPond Scheme stencil)
- **Graphic Object:** Curve (CurveMaker)
- **MIDI:** CC4 + channel pressure

### Pizzicato Tremolo (Z-Stem)

**Status:** Complete — Pattern 4 (AI Direct) + Pattern 3 (Direct Live Insertion)

**Components:**
- **Notation:** Z-stem note with "pizz." text + dynamic + hairpin (3 templates: cres, decres, hp). Z-stem uses calligraphic filled polygon (7 parameterized variables). LilyPond Scheme `stem-with-z` stencil override.
- **Graphic Object:** GC (Gravitational Conductor) — same fixed parameters as Bartók Pizzicato (stiffness=62, damping=100, ictus=90, descentRatio=60, duration=0.6, neonMagenta) + blue right-pointing direction arrow
- **MIDI:** Rapid repeated notes sampled from human performance timing database (`pizz_tremolo_db.json`), velocity shaped by dynamic shape envelope, CC0=95 (technique ID), CC7 linear volume ramp (cres/decres/hp), channels 8–11

**MIDI Timing Database:** `public/midi_files/pizz_tremolo_db.json` — 378 notes across 9 segments extracted from recorded performance via `lilypond_code/ingest_pizz_tremolo.js`. Pitch-agnostic (only timing + velocity stored). Supports append mode for future recordings.

**Pipeline:** `lilypond_code/render_pizz_tremolo.js` (single + batch mode)
**Server Endpoint:** `POST /api/pizz-tremolo/generate`
**Workflow Doc:** `docs/PIZZICATO_TREMOLO_WORKFLOW.md`
**Prompt Guide:** `docs/AI_PIZZ_TREMOLO_PROMPT_GUIDE.md`
**Slash Command:** `/bartok-pizz` (shared pattern)

**UI Inputs:**
| Input | Type | Description |
|-------|------|-------------|
| Track | number 1–4 | Score track (→ MIDI channel 8–11) |
| Clef | select | treble / alto / bass |
| Pitch | text | Plain English (e.g., C4, C#4, Bb3, C+4, Cd4) |
| Dynamic | select | ppp–fff (peak velocity) |
| Start | number | Score time in seconds |
| Duration | number | Tremolo duration in seconds (default 3) |
| Shape | radio | cres / decres / hp (hairpin shape + CC7 envelope) |
| Alignment | radio | pre (ends at start time) / post (begins at start time) |

**On Go:**
1. Server runs pipeline → returns SVG path + MIDI path
2. Create GC at start time on the specified track
3. Insert SVG notation + blue arrow with pre/post alignment positioning
4. Build MIDI snippet programmatically from timing DB (CC0=95, CC7 ramp, rapid notes)
5. Add to `MidiSnippetDatabase`, call `MidiController.reloadFromDatabase()`

**Key design differences from other materials:**
- MIDI is not derived from LilyPond's raw MIDI output. Instead, it is generated programmatically by sampling a timing database of human-played pizzicato tremolo, giving natural rhythmic feel.
- The notation SVG and MIDI are independent outputs from the same input parameters.
- Uses dedicated MIDI channels 8–11 (offset +8) to avoid conflicts with all other systems.
- Alignment parameter (pre/post) controls both SVG placement relative to the GC and MIDI snippet temporal positioning.

---

## Reusable Tools

These tools are shared across all material types:

| Tool | Location | Purpose |
|------|----------|---------|
| `modify_midi.js` | `lilypond_code/` | MIDI post-processing (channel rewrite, CC insertion) |
| `crop_svg.js` | `lilypond_code/` | Standalone SVG cropping |
| `render_pizz_tremolo.js` | `lilypond_code/` | Full pizz tremolo pipeline (LilyPond → SVG → MIDI, single + batch) |
| `generate_pizz_tremolo_midi.js` | `lilypond_code/` | Standalone tremolo MIDI generator (timing DB sampling + CC7 ramp) |
| `ingest_pizz_tremolo.js` | `lilypond_code/` | Parse recorded MIDI → JSON timing database (new/append modes) |
| `insertCrescendoSvg()` pattern | `index.html` | SVG insertion into score (anchor-based positioning) |
| `MidiSnippetDatabase.add()` + `MidiController.reloadFromDatabase()` | `index.html` | MIDI snippet insertion + track rebuild (Pattern 3) |
| `GCMaker.createGC()` | `index.html` | Programmatic GC creation |

---

## Open Questions / Work in Progress

- **Saved GCs disappeared** — GC library appears empty despite GCs existing in score save files. Needs investigation.
- **Audio component** — Future: attach audio files to materials
- **Batch score insertion** — Currently one-at-a-time via UI; batch insertion from JSON would be useful for large sections
- **Cross-system channel conflicts** — Bartók pizz and glissando share MIDI channels 1–4; vibrato uses 5–8; pizz tremolo uses 9–12. All currently non-conflicting. Monitor as more systems are added.
