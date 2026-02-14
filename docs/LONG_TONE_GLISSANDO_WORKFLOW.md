# Long Tone Glissando Workflow

**Goal:** Create a single-button workflow that generates a complete glissando gesture with all associated elements.

**Status:** In Development  
**Last Updated:** Feb 14, 2026

---

## Workflow Overview

**Input Parameters:**
- Time position (seconds)
- Duration (seconds)
- Track (1-4)
- Start pitch (e.g., C4)
- End pitch (e.g., G5)
- Clef (treble/alto/bass)
- Curve shape parameters (y1, y2, slope)
- Color
- Fill mode

**Output:**
- Curve on score at specified position
- Glissando attached with pitch markers
- MIDI files generated (optional)
- MIDI files inserted at same time point (optional)
- SVG notation added (optional)

---

## Steps

### Step 1: Create Curve
**Status:** ✅ Implemented (ASB-001)  
**Function:** `CurveMaker.createCurve(params)`  
**Code Location:** `public/index.html` lines 12782-12918

**Required Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| startSeconds | number | Start time in seconds |
| endSeconds | number | End time in seconds (or use duration) |
| y1 | number | Start intensity (0-10 scale) |
| y2 | number | End intensity (0-10 scale) |
| gTrack | string | Track '1'-'4' |
| slope | number | Curve coefficient (-3 to +3), controls shape intensity |

**Optional Parameters (with defaults):**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| model | string | 'logarithmic' | Curve model: logarithmic, exponential, power, sigmoid, bezier |
| color | string | 'limeGreen' | Color name from ColorMap |
| fillMode | string | 'bottom' | 'line', 'top', 'bottom' |

**Slope Values (for logarithmic model):**
| Slope | Behavior |
|-------|----------|
| 0 | Linear (straight line) |
| -1 | ~46% of transition in first 10% (steep start, long tail) |
| -2 | ~76% of transition in first 10% |
| -3 | ~91% of transition in first 10% (very front-loaded) |
| +1 to +3 | Long lead-in, steep end |

**Computed (auto-generated):**
| Param | Description |
|-------|-------------|
| id | Auto-incremented integer |
| name | Timestamp-based CRV_YYYYMMDD_HHMMSS |
| duration | endSeconds - startSeconds |
| page | Calculated from startSeconds |
| section | 'top' or 'bottom' based on page |

**Example Console Output:**
```json
{
  "id": 169,
  "name": "CRV_20260214_163325",
  "startSeconds": 219,
  "endSeconds": 229,
  "duration": 10,
  "y1": 10,
  "y2": 0,
  "gTrack": "1",
  "model": "logarithmic",
  "slope": -1,
  "color": "limeGreen",
  "fillMode": "bottom",
  "page": 27,
  "section": "bottom"
}
```

**UI Location:** Long Tone Workflow section (below cursor time input)

**AI Prompt Command (paste in browser console):**
```javascript
CurveMaker.createCurve({
    startSeconds: 220,
    endSeconds: 230,
    y1: 10,
    y2: 0,
    gTrack: '1',
    model: 'logarithmic',
    slope: -1
})
```

**Revisions:**
| Date | Change | Reason |
|------|--------|--------|
| Feb 14, 2026 | Added params object support | Enable programmatic creation |
| Feb 14, 2026 | Added console.debug logging | Visibility for automation |
| Feb 14, 2026 | Return curve object | Enable chaining |
| Feb 14, 2026 | Fixed y2=0 falsy bug | 0 was being treated as falsy, defaulting to 10 |
| Feb 14, 2026 | Changed default color to limeGreen | User preference |
| Feb 14, 2026 | Documented parameter categories | Real-time testing revealed required vs optional vs computed |
| Feb 14, 2026 | Added model and slope parameters | Enable curve shape control (default: logarithmic, slope: -1) |
| Feb 14, 2026 | Created Long Tone Workflow UI | Prototype UI below cursor time for manual entry |
| Feb 14, 2026 | Created LongToneUI handler | JavaScript to wire up Create Curve button |

---

### Step 2: Attach Notation (Glissando SVG)

This step has multiple sub-steps:
- **Step 2a:** Generate LilyPond code from template
- **Step 2b:** Compile LilyPond to SVG
- **Step 2c:** Insert SVG into score at curve position

---

#### Step 2a: Generate LilyPond Code
**Status:** 🔧 In Progress  
**Template:** `lilypond_code/GlissandoNotationTemplate.ly`

**Variables to Replace:**
| Variable | Type | Values | Description |
|----------|------|--------|-------------|
| CLEF | string | treble, cClef, bass | Staff clef (cClef = alto in LilyPond) |
| START_PITCH | string | LilyPond pitch | Left note (e.g., a4, cs5, bf3) |
| END_PITCH | string | LilyPond pitch | Right note (e.g., af4, d5, g3) |
| GLISS_Y_OFFSET | number | 0 or 0.3 | Gliss line vertical adjustment |

**Gliss Line Offset Rule:**
| Condition | GLISS_Y_OFFSET |
|-----------|----------------|
| Start and end pitch on **same staff line** | 0.3 (move line up) |
| Start and end pitch on **different staff lines/spaces** | 0 (default) |

**Pitch Nomenclature:**
| Accidental | User Input | LilyPond | Example |
|------------|------------|----------|---------|
| Natural | C4 | c4 | C4 → c4 |
| Sharp | C#4 | cs4 | C#4 → cs4 |
| Flat | Bb3 | bf3 | Bb3 → bf3 |
| Quarter sharp | C+4 | cih4 | C+4 → cih4 |
| Quarter flat | Cd4 | ceh4 | Cd4 → ceh4 |
| 3/4 sharp | C#+4 | csih4 | C#+4 → csih4 |
| 3/4 flat | Cbd4 | cfeh4 | Cbd4 → cfeh4 |

**File Naming Convention:**
- Format: `Gliss-{clef}-{startPitch}-{endPitch}.ly`
- Example: `Gliss-alto-A4-Aqf4.ly` (A4 to A quarter-flat 4)
- Pitch normalization: `#` → `s`, `+` → `q`, `d` → `qf`
- Files stored in: `lilypond_code/`

**File Existence Check:**
- Server endpoint: `GET /api/lilypond/exists/:filename`
- Client function: `LongToneUI.checkLilyPondFileExists(filename)`
- Workflow: Generate filename → check if exists → skip creation if found
- Console output: "File already exists, skipping creation: [filename]"

**⚠️ BOOKMARK: Steps to Skip When File Exists**
When the LilyPond file already exists:
- Skip Step 2a (file creation) ✅ Implemented
- Skip Step 2b (LilyPond compilation) - TODO: check for existing SVG
- Proceed directly to Step 2c (insert existing SVG into score)
*This optimization avoids redundant work when reusing glissando notation.*

**File Creation Endpoint:**
- Server endpoint: `POST /api/lilypond/create-glissando`
- Parameters: `{ filename, clef, startPitch, endPitch, glissOffset }`
- Reads `GlissandoNotationTemplate.ly`, substitutes variables, saves new file

**Two Ways to Execute Workflow:**

**1. UI Method:**
- Fill in Long Tone Workflow section inputs (start/end time, y1/y2, track, slope, model, clef, pitches)
- Click **GO** button
- Workflow executes all steps

**2. AI Prompt Method (paste in browser console):**
```javascript
LongToneUI.go({
    startSeconds: 220,
    endSeconds: 230,
    y1: 10,
    y2: 0,
    gTrack: '1',
    model: 'logarithmic',
    slope: -1,
    clef: 'cClef',
    startPitch: 'C4',
    endPitch: 'G4'
})
```
- All parameters optional (falls back to UI values)
- AI can generate this command from natural language request

**Revisions:**
| Date | Change | Reason |
|------|--------|--------|
| Feb 14, 2026 | Created GlissandoNotationTemplate.ly | Clean template with marked variables |
| Feb 14, 2026 | Documented variable substitution rules | Enable programmatic generation |
| Feb 14, 2026 | Added pitch nomenclature table | User input → LilyPond conversion |
| Feb 14, 2026 | Added file naming convention | Consistent naming for reuse |
| Feb 14, 2026 | Consolidated to single GO button | One-stop workflow execution |
| Feb 14, 2026 | Added file existence check | Avoid recreating existing LilyPond files |
| Feb 14, 2026 | Implemented file creation from template | Server endpoint creates .ly file with variable substitution |
| Feb 14, 2026 | Added AI prompt method | Parallel execution via LongToneUI.go(params) |

---

#### Step 2b: Compile LilyPond to SVG
**Status:** ✅ Implemented  
**Function:** `LongToneUI.renderGlissandoSvg(filename)`  
**Server Endpoint:** `POST /api/lilypond/render-glissando`  
**PowerShell Script:** `lilypond_code/render_glissando.ps1`

**Process:**
1. Server receives filename (e.g., `Gliss-alto-C4-G4.ly`)
2. Checks if SVG already exists in `public/SVG_graphics/` → skip if found
3. Executes PowerShell script which:
   - Runs LilyPond to generate SVG in `lilypond_code/`
   - Runs Inkscape to crop SVG to content bounds
   - Moves cropped SVG to `public/SVG_graphics/`
   - Cleans up uncropped SVG

**File Locations:**
- Input: `lilypond_code/{filename}.ly`
- Output: `public/SVG_graphics/{filename}.svg`

**Skip Logic:**
- If LilyPond file already existed (Step 2a skipped), Step 2b also skipped
- Server also checks if SVG exists before rendering

**Revisions:**
| Date | Change | Reason |
|------|--------|--------|
| Feb 14, 2026 | Created render_glissando.ps1 | Single-file rendering with Inkscape crop |
| Feb 14, 2026 | Added /api/lilypond/render-glissando endpoint | Server-side script execution |
| Feb 14, 2026 | Integrated into go() workflow | Automatic SVG generation with skip logic |

---

#### Step 2c: Insert SVG into Score
**Status:** ✅ Implemented  
**Function:** `LongToneUI.insertGlissandoSvg(svgPath, curve)`  
**Code Location:** `public/index.html`

**Process:**
1. Fetch SVG content from `svgPath`
2. Parse SVG to get original dimensions (handles mm units)
3. Calculate track dimensions:
   - `timelineHeight = 16px`
   - `trackHeight = (scoreHeight - timelineHeight) / 4`
4. Calculate scale: `targetHeight (90% of track) / svgHeight`
5. Calculate X position:
   - Convert `curve.startSeconds` to pixel position
   - Offset left by `scaledWidth + 5px gap`
6. Calculate Y position: center in track
7. Create element via SVGElementManager

**Scaling Logic:**
- Notation scaled to fit 90% of track height
- Accounts for varying notation heights (ledger lines, etc.)
- Scale factor stored for persistence

**Positioning Logic:**
- SVG right edge positioned 5px before curve start
- Vertically centered in the curve's track
- Section (top/bottom) determined by page index

**Revisions:**
| Date | Change | Reason |
|------|--------|--------|
| Feb 14, 2026 | Created insertGlissandoSvg function | Automated scaling and positioning |
| Feb 14, 2026 | Integrated into go() workflow | Complete Step 2 automation |

---

### Step 2 (Legacy): Attach Glissando Markers
**Status:** ✅ Implemented (ASB-001)  
**Function:** `GlissandoSystem.attachGlissandoToCurve(params)`  
**Code Location:** `public/index.html` lines 14934-14982

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| curve | object | selectedCurve | Target curve object |
| clef | string | UI | 'treble', 'alto', 'bass' |
| startPitch | string | UI | e.g., 'C4' |
| endPitch | string | UI | e.g., 'G5' |

**Revisions:**
| Date | Change | Reason |
|------|--------|--------|
| Feb 14, 2026 | Added params object support | Enable programmatic creation |
| Feb 14, 2026 | Added console.debug logging | Visibility for automation |
| Feb 14, 2026 | Return curve object | Enable chaining |

---

### Step 3: Generate MIDI Files
**Status:** ✅ Implemented  
**Function:** `LongToneUI.generateGlissandoMidi(curve, startPitch, endPitch, params)`  
**Server Endpoint:** `POST /api/midi/save`  
**Code Location:** `public/index.html`

**Process:**
1. Convert pitch strings to MIDI (supports quarter tones: +, d)
2. Map curve Y values to pitch range (high Y = high pitch)
3. Walk through samples, create new segment when pitch deviates > 2 semitones
4. For each segment:
   - Calculate MIDI note (offset by 1 semitone based on direction)
   - Calculate pitch bend start/end values
   - Generate pitch bend samples at 50ms intervals
   - Add CC0 articulation for first 2 segments only
5. Build MIDI file (Format 1, 480 ticks/beat)
6. Save via server to `public/midi_files/`

**Segment Logic:**
- Pitch bend range = 2 semitones max per segment
- Gliss down: MIDI note = startPitch - 1, bend starts at MAX (16383)
- Gliss up: MIDI note = startPitch + 1, bend starts at MIN (0)
- CC0 (articulation) only on segments 0 and 1

**File Naming:**
`{curveName}_seg{NN}_{pitchName}_{direction}.mid`
- Example: `CRV_20260214_173000_seg01_C4_dn.mid`

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| curve | Object | required | Curve object with curveData.samples |
| startPitch | String | required | Start pitch (e.g., "C4", "C#4", "Cd4") |
| endPitch | String | required | End pitch |
| params.velocity | Number | 64 | MIDI velocity (mp) |
| params.articulation | Number | 89 | CC0 value (senza vibrato) |

**Future Placeholders:**
- Additional dynamics (crescendo, etc.)
- Additional articulations (different CC0 values)

**Revisions:**
| Date | Change | Reason |
|------|--------|--------|
| Feb 14, 2026 | Created generateGlissandoMidi function | Automated MIDI segment generation |
| Feb 14, 2026 | Added /api/midi/save server endpoint | Save MIDI files to public/midi_files/ |
| Feb 14, 2026 | Integrated into go() workflow | Complete Step 3 automation |

---

### Step 4: Insert MIDI Files
**Status:** ✅ Implemented  
**Function:** `LongToneUI.insertGlissandoMidi(midiResult, curve)`  
**Helper:** `LongToneUI.parseMidiFileToEvents(midiData, baseTimeMs)`  
**Code Location:** `public/index.html`

**Process:**
1. First segment inserted at curve start time
2. Subsequent segments: start 5ms before previous note ends (overlap)
3. Fetch each MIDI file from `public/midi_files/`
4. Parse MIDI to extract events (CC0, pitch bend, note on/off)
5. Add to MidiSnippetDatabase for visualization
6. Add events to MidiController track for playback
7. Store snippet IDs on curve for cleanup/persistence

**Overlap Logic:**
- `OVERLAP_MS = 5` milliseconds
- Segment N+1 starts at: `segment_N_start + segment_N_duration - 5ms`
- Ensures seamless glissando without gaps

**Track Assignment:**
- Uses `curve.gTrack` (1-4) → `trackIndex` (0-3)
- MIDI events go to correct channel
- Graphics display on correct track

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| midiResult | Object | required | Result from generateGlissandoMidi |
| curve | Object | required | Curve object with gTrack, startSeconds |

**Data Stored on Curve:**
```javascript
curve.glissandoMidiSnippets = [
    { segment: 1, snippetId: 5, eventIds: [...], startTimeMs: 10000, durationMs: 2500 },
    { segment: 2, snippetId: 6, eventIds: [...], startTimeMs: 12495, durationMs: 2500 },
    ...
]
```

**Revisions:**
| Date | Change | Reason |
|------|--------|--------|
| Feb 14, 2026 | Created insertGlissandoMidi function | Automated MIDI insertion with overlap |
| Feb 14, 2026 | Created parseMidiFileToEvents helper | Parse saved MIDI files for insertion |
| Feb 14, 2026 | Integrated into go() workflow | Complete Step 4 automation |

---

### Step 5: Add SVG Notation
**Status:** 🔲 Not Started  
**Function:** TBD  
**Code Location:** TBD

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| TBD | | | |

**Revisions:**
| Date | Change | Reason |
|------|--------|--------|

---

## Combined Workflow Function

**Status:** 🔶 Partial (Steps 1-2 only)  
**Function:** `ScoreAutomation.createGlissandoGesture(params)`  
**Code Location:** `public/index.html` lines 15404-15493

**Current Capabilities:**
- ✅ Create curve
- ✅ Attach glissando
- 🔲 Generate MIDI
- 🔲 Insert MIDI
- 🔲 Add notation

---

## Downstream Impact Tracking

When revising a step, check these downstream dependencies:

| If you change... | Check impact on... |
|------------------|-------------------|
| Step 1 (Curve) | Step 2 (glissando attachment), Step 3 (MIDI timing) |
| Step 2 (Glissando) | Step 3 (pitch data for MIDI), Step 5 (notation pitches) |
| Step 3 (MIDI Gen) | Step 4 (MIDI insertion) |
| Curve data structure | All steps that read curve properties |

---

## Testing Checklist

### Step 1 Test
- [ ] Create curve programmatically
- [ ] Verify curve appears at correct position
- [ ] Verify console.debug output shows all parameters

### Step 2 Test
- [ ] Attach glissando to curve programmatically
- [ ] Verify pitch markers appear
- [ ] Verify console.debug output shows all parameters

### Step 3 Test
- [ ] (TBD)

### Step 4 Test
- [ ] (TBD)

### Step 5 Test
- [ ] (TBD)

### Combined Workflow Test
- [ ] Run ScoreAutomation.createGlissandoGesture with all parameters
- [ ] Verify all steps execute in sequence
- [ ] Verify final result matches manual creation

---

## Notes

*(Add observations, issues, and ideas here as development progresses)*

---
