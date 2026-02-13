# Curve System & Curve Models

## Overview

The Curve System is a core feature of the String Quartet No.1 Composer that allows creating, editing, and displaying parametric curves on a musical score timeline. Curves represent continuous parameters (dynamics, pitch, tempo, etc.) that change over time across 4 instrument tracks (T1–T4) plus an "All" track (TA).

Curves are rendered as SVG paths on the score, support multi-page spanning, and generate sample arrays used for real-time playback (curve follower, MIDI generation, etc.).

---

## Architecture

### Data Flow

```
UI Inputs → createCurve() → CurveDatabase.add() → renderCurve() → updateVisibility()
                                    ↓
                          generateCurveDataArray()  ← computeYAtT(model, slope, y1, y2, t)
                                    ↓
                          generatePathFromModel()   ← computeYAtT(model, slope, y1, y2, t)
                                    ↓
                              SVG <path> elements
```

### Key Objects

| Object | Purpose |
|--------|---------|
| `CurveDatabase` | In-memory CRUD storage for curve data |
| `CurveMaker` | UI, rendering, editing, drag, selection, library I/O |
| `GTrackSystem` | Links curves to instrument tracks for playback |
| `ScrollingCursor` | Curve follower that reads curveData samples in real-time |
| `ScoreManager` | Save/load via `CurveDatabase.exportData()` / `importData()` |

---

## Curve Object Properties

When a curve is created or loaded, it contains:

### Core Parameters
| Property | Type | Description |
|----------|------|-------------|
| `id` | number | Auto-incremented unique ID from CurveDatabase |
| `name` | string | Auto-generated (e.g., `CRV_20260213_141500`) |
| `startSeconds` | number | Start time in score seconds (excludes lead-in) |
| `endSeconds` | number | End time in score seconds |
| `y1` | number | Start Y value, 0–10 scale (0 = bottom, 10 = top of track) |
| `y2` | number | End Y value, 0–10 scale |
| `gTrack` | string | Track: `"1"`, `"2"`, `"3"`, `"4"`, or `"A"` (all) |
| `color` | string | Color key (e.g., `"brightOrange"`, `"navyBlue"`) |
| `fillMode` | string | `"line"`, `"bottom"` (fill ↓), or `"top"` (fill ↑) |
| `tension` | number | Curve tension (legacy, currently 0) |
| `slope` | number | Horizontal apex shift, range ±3. Controls where the curve's inflection point sits along the X axis |
| `model` | string | Curve interpolation model: `"bezier"`, `"power"`, `"sigmoid"`, or `"exponential"` |

### Pixel/Rendering Properties
| Property | Type | Description |
|----------|------|-------------|
| `section` | string | `"top"` or `"bottom"` (which score half) |
| `page` | number | Page number where curve starts |
| `x1`, `x2` | number | X pixel positions on the score |
| `y1Pixel`, `y2Pixel` | number | Y pixel positions |
| `origY1Pixel`, `origY2Pixel` | number | Original Y pixels (for multi-page clipping restore) |
| `trackDims` | object | `{x, y, width, height}` of the track lane |

### Curve Data Array (`curveData`)
```javascript
{
    startTime: number,       // Same as startSeconds
    endTime: number,         // Same as endSeconds
    sampleInterval: 0.01,    // 10ms intervals → 100 samples/second
    samples: number[]        // Normalized Y values (0 = bottom, 1 = top)
}
```

**Access pattern:**
```javascript
const i = Math.floor((currentTime - curve.startSeconds) / curve.curveData.sampleInterval);
const normalizedY = curve.curveData.samples[Math.min(i, samples.length - 1)];
```

### DOM Elements (after rendering)
| Key | Element | Purpose |
|-----|---------|---------|
| `group` | `<g>` | Container for all curve SVG elements |
| `path` | `<path>` | Visible curve line/fill |
| `hitPath` | `<path>` | Invisible wider path for click detection |
| `boundingBox` | `<rect>` | Dotted selection rectangle (hidden by default) |
| `startPoint` | `<circle>` | Draggable start endpoint |
| `endPoint` | `<circle>` | Draggable end endpoint |
| `previewPath` | `<path>` | Dashed preview for multi-page curves |
| `previewHitPath` | `<path>` | Hit area for preview |
| `continuationGroupTop/Bottom` | `<g>` | Continuation segments on subsequent pages |

---

## Curve Models

### Overview

The curve model system provides 4 different mathematical interpolation functions that control the shape of the curve between its start point (y1) and end point (y2). All models are controlled by the **slope** parameter, which shifts the curve's inflection point along the horizontal axis.

The model is selected via a radio group in the Composition Panel UI (Bezier, Power, S-Curve, Exp) and is stored per-curve as `curve.model`.

### Model Descriptions

#### 1. Bezier (`"bezier"`)
**Quadratic bezier curve** — the default and most intuitive model.

- Uses a single control point positioned based on `slope`
- `slope = 0`: Symmetric S-shaped transition
- `slope > 0`: Control point shifts right → late curve (slow start, fast end)
- `slope < 0`: Control point shifts left → early curve (fast start, slow end)

**Math:** Standard quadratic bezier `B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2` where:
- `P0 = y1`, `P2 = y2`
- `P1.x = 0.5 * (1 + slope)` (horizontal control point)
- `P1.y` blends between y1 and y2 based on slope direction

#### 2. Power (`"power"`)
**Power/exponential curve** — creates convex or concave arcs.

- `slope = 0`: Linear (straight line)
- `slope > 0`: Concave up (slow start, accelerating)
- `slope < 0`: Convex (fast start, decelerating)

**Math:** `y = y1 + (y2 - y1) · t^exponent` where:
- `exponent = 1 + slope` (slope range ±3 gives exponent range -2 to 4)
- When exponent < 0, uses `1 - (1-t)^|exponent|` to avoid NaN

#### 3. Sigmoid (`"sigmoid"`)
**S-curve / logistic function** — smooth transitions with adjustable steepness.

- `slope = 0`: Gentle S-curve
- `slope > 0`: Steeper, more dramatic S-shape
- `slope < 0`: Flatter, approaching linear

**Math:** Uses logistic function centered at t=0.5:
- `steepness = 3 + slope * 4` (range -9 to 15)
- `sigmoid(t) = 1 / (1 + e^(-steepness * (t - 0.5)))`
- Normalized to map [0,1] → [0,1] then scaled to [y1, y2]

#### 4. Exponential (`"exponential"`)
**Peaking curve** — creates a hump or valley between the endpoints.

- `slope = 0`: Symmetric peak at midpoint
- `slope > 0`: Taller peak (up to 1.5× the y-range)
- `slope < 0`: Valley/dip below the endpoints

**Math:** Uses `sin(π·t)` envelope:
- `peakHeight = slope * 0.5 * |y2 - y1|` (or minimum 0.1 for flat curves)
- `y = lerp(y1, y2, t) + sin(π·t) · peakHeight`

### Slope Parameter

The `slope` parameter is shared across all models and has a range of **±3** (extended from the original ±1). It is adjusted by dragging the curve body or the preview curve horizontally.

| Slope Value | Effect |
|-------------|--------|
| `-3` | Maximum early/concave effect |
| `-1` | Moderate early effect |
| `0` | Neutral/symmetric |
| `+1` | Moderate late effect |
| `+3` | Maximum late/convex effect |

### Core Methods

#### `generatePathFromModel(curve)`
Generates SVG path data (`lineD` and optional `filledD`) by sampling the curve at each pixel column from `x1` to `x2`. Returns `{ lineD, filledD }`.

- Computes normalized `t` (0–1) for each X pixel
- Calls `computeYAtT()` to get the Y value at each sample point
- Builds SVG path string from the points array
- Optionally builds a closed fill path for `fillMode: "top"` or `"bottom"`

#### `computeYAtT(model, slope, y1, y2, t)`
Pure function that returns the interpolated Y value for a given `t` (0–1) using the specified model and slope. Used by both:
- **Rendering** (`generatePathFromModel`) — pixel-accurate SVG paths
- **Playback** (`generateCurveDataArray`) — 100Hz sample arrays for curve follower

---

## UI Controls

### Composition Panel — Curve Maker Section

| Control | ID/Name | Purpose |
|---------|---------|---------|
| Name (readonly) | `curveNameDisplay` | Auto-generated curve name |
| Start/End inputs | `curveStartInput`, `curveEndInput` | Time bounds in seconds |
| Y1/Y2 inputs | `curveY1Input`, `curveY2Input` | Normalized Y values (0–10) |
| Track radios | `curveGTrack` (T1–T4) | Which instrument track |
| **Model radios** | `curveModel` (Bezier, Power, S-Curve, Exp) | Interpolation model |
| Draw button | `curveDrawBtn` | Create new curve |
| Delete button | `curveDeleteBtn` | Remove selected curve |
| Save button | `curveSaveBtn` | Save to curve library |
| Fill mode | `curveFill` (Line, Fill ↓, Fill ↑) | Visual fill style |
| Color swatches | `.color-swatch` | 12 color options |

### Interaction

- **Click** a curve to select it
- **Drag endpoints** (circles) to adjust Y1/Y2
- **Drag curve body** horizontally to adjust slope
- **Change model radio** while curve is selected → immediate re-render
- **Shift+Ctrl+Alt+Click** opens ObjectSelector for overlapping objects

---

## Multi-Page Curves

Curves can span multiple score pages. The system handles this via:

1. **First segment**: Rendered normally, clipped to page edge
2. **Preview curve**: Dashed line showing full curve shape within first segment bounds (for editing)
3. **Continuation segments**: Read from pre-computed `curveData` samples, rendered pixel-accurately on subsequent pages
4. **Visibility management**: `updateVisibility()` shows/hides segments based on current page

---

## Persistence

### Score Save/Load
- `CurveDatabase.exportData()` serializes all curve objects (including `model`) as JSON
- `ScoreManager` registers CurveDatabase as a data source
- On load: `CurveDatabase.importData()` → `CurveMaker.reloadFromDatabase()`

### Curve Library (Server)
- **Save**: `POST /api/curve-library/save` — stores curve JSON with all parameters
- **List**: `GET /api/curve-library/list` — returns saved curve metadata
- **Load**: `GET /api/curve-library/load/:name` — returns full curve data
- **Delete**: `DELETE /api/curve-library/delete/:name`

### Segment Extraction
- `createSegment()` extracts a time slice from a selected curve
- Saves to library with interpolated Y values and model type preserved

---

## Event Flow

1. **Create**: Draw btn → `createCurve()` → `CurveDatabase.add()` → `renderCurve()` → `updateVisibility()`
2. **Select**: Click curve → `selectCurve()` → sync UI (model radio, fill radio, track radio, color, inputs)
3. **Edit**: Drag endpoint → `updateCurveRendering()` → `syncCurveToDatabase()` → `updateVisibility()`
4. **Model Change**: Radio change → `curve.model = newModel` → `updateCurveRendering()` → `syncCurveToDatabase()`
5. **Save**: Save btn → `saveCurveToLibrary()` → POST to server → `loadCurveLibrary()`
6. **Load Score**: ScoreManager → `CurveDatabase.importData()` → `CurveMaker.reloadFromDatabase()`
7. **Page Change**: GraphicTimeline → `updateGraphicObjectsVisibility()` → `CurveMaker.updateVisibility()`
8. **Resize**: Window resize → debounced `reloadFromDatabase()`

---

## Color Map

Curves use named colors mapped to CSS values via the `ColorMap` object:

| Key | Color |
|-----|-------|
| `brightOrange` | `rgba(240,75,0,1)` |
| `brightBlue` | `rgba(56,126,211,1)` |
| `mustard` | `rgba(244,182,0,1)` |
| `brightRed` | `rgba(229,42,25,1)` |
| `green` | `rgba(0,147,92,1)` |
| `limeGreen` | `rgb(153,255,0)` |
| `brightGreen` | `#31d196` |
| `navyBlue` | `rgba(28,72,121,1)` |
| `plum` | `rgba(82,44,85,1)` |
| `lavander` | `rgba(162,126,198,1)` |
| `yellow` | `rgba(254,213,0,1)` |
| `neonMagenta` | `rgb(255,21,160)` |

---

## Changes Made (Feb 13, 2026) — Curve Model System

### New Methods Added to CurveMaker
- **`generatePathFromModel(curve)`** — Unified SVG path generation supporting all 4 models
- **`computeYAtT(model, slope, y1, y2, t)`** — Unified Y interpolation for rendering + playback
- **`getCurveModel()`** / **`setCurveModel(model)`** — Read/set the curve model radio group

### Integration Points Modified
- **`createCurve()`** — Stores `model` from UI radio via `getCurveModel()`
- **`selectCurve()`** — Syncs model radio to `curve.model` via `setCurveModel()`
- **`syncCurveToDatabase()`** — Includes `model` in database update
- **`saveCurveToLibrary()`** — Includes `model` in library export
- **`insertRecalledCurve()`** — Restores `model` from library data
- **`createSegment()`** — Includes `model` in segment export
- **`updatePreviewCurve()`** — Replaced hardcoded bezier with `generatePathFromModel()`
- **`renderCurve()`** — Uses `generatePathFromModel()` (was already updated)
- **`updateCurveRendering()`** — Uses `generatePathFromModel()` (was already updated)
- **`generateCurveDataArray()`** — Uses `computeYAtT()` with model parameter

### UI Changes
- Added **curve model radio group** (`curveModelGroup`) with 4 options: Bezier, Power, S-Curve, Exp
- Added **event listeners** on model radios to re-render selected curve on change
- Styled using existing `.gtrack-radio-group` CSS class

### Slope Range Extension
- Extended from ±1 to **±3** across all models for deeper curve shaping

### Backward Compatibility
- All existing curves default to `"bezier"` when `model` is undefined (`curve.model || 'bezier'`)
