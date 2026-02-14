# Curve System Complete Architecture Analysis

## Overview
The Curve System is a comprehensive feature for creating, editing, and displaying bezier curves on a musical score timeline. It consists of multiple interconnected components.

---

## 1. HTML UI Components (`index.html`)

### Curve Segments Section
- **X1/X2 Buttons**: Grab edit cursor position for segment extraction
- **X1/X2 Inputs**: Manual time entry for segment bounds
- **Segment/Clear Buttons**: Create new curve from segment, clear markers

### Curve Maker Section
- **Name Display**: Read-only, auto-generated (CRV_YYYYMMDD_HHMMSS format)
- **Start/End Inputs**: Time in seconds for curve bounds
- **Y1/Y2 Inputs**: Normalized values 0-10 (bottom to top of track)
- **Draw Button**: Creates new curve at specified parameters
- **Delete Button**: Removes selected curve
- **Save Button**: Saves selected curve to library
- **Description Textarea**: User notes for curve
- **Recall Dropdown**: Custom dropdown listing saved curves from library
- **Insert at Edit Line Button**: Inserts recalled curve at edit cursor position
- **Fill Mode Radio Group**: Line / Fill Down / Fill Up
- **Color Swatches**: 12 colors (brightOrange, brightBlue, mustard, brightRed, green, limeGreen, brightGreen, navyBlue, plum, lavander, yellow, neonMagenta)

### G-Track Selection
- Radio group: G1, G2, G3, G4, GA (All)
- Determines which track the curve is placed on

---

## 2. CurveDatabase Object

Simple in-memory storage with CRUD operations:
- **curves**: Array of curve objects
- **nextId**: Auto-incrementing ID counter
- **add(curveData)**: Creates curve with ID and timestamp
- **get(id)**: Retrieves curve by ID
- **update(id, updates)**: Modifies curve properties
- **remove(id)**: Deletes curve
- **getAll()**: Returns all curves
- **exportData()**: Returns {curves, nextId} for saving
- **importData(data)**: Restores from saved data

---

## 3. CurveMaker Object

### Properties
- **scoreTopEl/scoreBottomEl**: SVG containers for top/bottom pages
- **topCurveGroup/bottomCurveGroup**: SVG groups for curve elements
- **curves**: Array of rendered curve objects with DOM elements
- **selectedCurve**: Currently selected curve
- **curveCounter**: For naming
- **isDragging/dragTarget/dragStartX/dragStartY**: Drag state
- **segmentX1Line/segmentX2Line**: Segment marker lines
- **segmentX1Seconds/segmentX2Seconds**: Segment time bounds

### Key Methods

#### Initialization
- **init()**: Sets up UI references, event handlers, creates curve groups, loads library

#### Curve Creation
- **generateCurveName()**: Returns `CRV_YYYYMMDD_HHMMSS`
- **createCurve()**: Main creation method - calculates positions, creates data object, adds to database, renders, registers with GTrackSystem
- **renderCurve(curve, curveGroup, scoreEl)**: Creates SVG elements (path, hitPath, startPoint, endPoint, boundingBox)

#### Curve Data Array Generation
- **generateCurveDataArray(curve)**: Creates time-indexed sample array
  - Sample rate: 100 samples/second (10ms intervals)
  - Returns: {startTime, endTime, sampleInterval, samples[]}
  - samples[] contains normalized Y values (0-1)
  - Uses quadratic bezier math with slope parameter

#### Selection & Editing
- **selectCurve(curve)**: Shows bounding box, endpoints, updates UI
- **deselectCurve()**: Hides controls, clears selection
- **handleCurveMouseDown(e, curve, target)**: Initiates drag for 'start', 'end', 'curve', 'bbox'
- **updateSelectedFromInputs()**: Updates curve from UI input changes
- **updateCurveRendering(curve)**: Re-renders path with current parameters
- **updateBoundingBox(curve)**: Updates dotted selection rectangle
- **syncCurveToDatabase(curve)**: Saves changes to CurveDatabase

#### Multi-Page Support
- **updateVisibility()**: Shows/hides curves based on current page
  - Handles single-page curves (simple show/hide)
  - Handles multi-page curves (clips to page, shows continuation segments)
- **clipCurveToPageEnd(curve, page, ...)**: Clips curve at page boundary
- **showContinuationSegment(curve, page, ..., sectionHint)**: Creates continuation on subsequent pages
  - Uses separate groups for top/bottom: continuationGroupTop, continuationGroupBottom
- **generatePathFromCurveData(curve, startSec, endSec, ...)**: Pixel-accurate path from samples
- **restoreOriginalRendering(curve)**: Restores full curve when returning to original page

#### Resize Handling
- **reloadFromDatabase()**: Clears and recreates all curves from CurveDatabase
- **reRenderAllCurves()**: Updates positions without recreating elements

#### Library Operations
- **saveCurveToLibrary()**: POST to /api/curve-library/save
- **loadCurveLibrary()**: GET /api/curve-library/list, populates dropdown
- **selectRecallOption(value, displayText)**: Updates dropdown selection
- **insertRecalledCurve()**: Loads curve from library, inserts at edit cursor

#### Segment Extraction
- **setSegmentX1()/setSegmentX2()**: Grab edit cursor position
- **renderSegmentLine(which, seconds)**: Draws yellow dotted marker line
- **clearSegmentLines()**: Removes markers
- **createSegment()**: Extracts portion of curve, saves to library

---

## 4. Curve Follower System

Located in ScrollingCursor object:
- **curveFollowerTop/curveFollowerBottom**: Rectangles that fill based on curve value
- **meterOutlineTop/meterOutlineBottom**: Empty rectangles showing full track height
- **updateCurveFollower(cursor, staffIndex, xPixel, xPercent, section, currentTimeSec)**:
  - O(1) lookup using time-indexed samples
  - Finds curve containing current time
  - Calculates fill height based on normalizedY and fillMode
  - Updates follower rectangle position, height, and color

---

## 5. Server Endpoints (`server.js`)

### Directory
- **CURVE_LIBRARY_DIR**: `./curve_library/`

### Endpoints
- **POST /api/curve-library/save**: Saves curve JSON with timestamp
- **GET /api/curve-library/list**: Returns array of {name, filename, description, savedAt, gTrack, duration}
- **GET /api/curve-library/load/:name**: Returns full curve data
- **DELETE /api/curve-library/delete/:name**: Removes curve file

---

## 6. ScoreManager Integration

CurveDatabase is registered as a data source:
```javascript
this.registerSource('databases.curves',
    () => CurveDatabase.exportData(),
    (data) => {
        CurveDatabase.importData(data);
        if (window.CurveMaker) CurveMaker.reloadFromDatabase();
    }
);
```

---

## 7. Key Data Structures

### Curve Object
```javascript
{
    id: number,
    name: string,
    startSeconds: number,
    endSeconds: number,
    y1: number (0-10),
    y2: number (0-10),
    gTrack: string ('1'-'4' or 'A'),
    color: string (color name),
    fillMode: string ('line', 'top', 'bottom'),
    section: string ('top' or 'bottom'),
    page: number,
    x1: number (pixels),
    x2: number (pixels),
    y1Pixel: number,
    y2Pixel: number,
    origY1Pixel: number,
    origY2Pixel: number,
    tension: number,
    slope: number (-1 to +1),
    trackDims: {x, y, width, height},
    curveData: {startTime, endTime, sampleInterval, samples[]},
    glissando: {clef, startPitch, endPitch, startIndex, endIndex}, // optional
    elements: {group, path, hitPath, startPoint, endPoint, boundingBox, ...}
}
```

### curveData Array Structure
```javascript
{
    startTime: number (seconds),
    endTime: number (seconds),
    sampleInterval: 0.01 (10ms),
    samples: number[] (normalized Y values 0-1)
}
```

---

## 8. Visual Elements

### Selection Indicator
- Dotted bounding box rectangle matching curve color
- Draggable endpoint circles at start/end
- Preview curve (dashed) for multi-page curves showing full shape

### Curve Rendering
- Quadratic bezier path: `M x1 y1 Q ctrlX ctrlY, x2 y2`
- Slope parameter controls control point X position
- Fill modes add closed path to track top or bottom

---

## 9. Event Flow

1. **Create**: Draw button → createCurve() → CurveDatabase.add() → renderCurve() → updateVisibility()
2. **Select**: Click curve → handleCurveMouseDown() → selectCurve() → update UI
3. **Edit**: Drag endpoint → updateCurveRendering() → syncCurveToDatabase() → updateVisibility()
4. **Save**: Save button → saveCurveToLibrary() → POST to server → loadCurveLibrary()
5. **Load Score**: ScoreManager → CurveDatabase.importData() → CurveMaker.reloadFromDatabase()
6. **Page Change**: GraphicTimeline → updateGraphicObjectsVisibility() → CurveMaker.updateVisibility()
7. **Resize**: window resize → debounced reloadFromDatabase()

---

## 10. GlissandoSystem Integration

When a curve has a glissando attached:
- **glissando property**: `{clef, startPitch, endPitch, startIndex, endIndex}`
- **Static pitch markers**: Rendered along curve showing pitch change points
- **Scrolling pitch display**: Updates during playback showing current pitch SVG
- **Important**: When reloading curves, glissando must be included in GTrackSystem.addGraphicItem() call
