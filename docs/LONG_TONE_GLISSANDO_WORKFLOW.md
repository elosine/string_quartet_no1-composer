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

### Step 2: Attach Glissando
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

### Step 4: Insert MIDI Files
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
