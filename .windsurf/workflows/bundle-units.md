---
description: Bundle Unit System - unified drag/delete for grouped score components. Consult before implementing bundling for any system.
---

# Bundle Unit System

Use this workflow when implementing unified drag/delete behavior for grouped score components.
This was first implemented for Notation Fragments (ASB-105) and should be adapted for other systems.

## Architecture Overview

A "bundle" is a lightweight registry entry that links multiple score components (GC, SVG, MIDI snippet, visual indicators) so they move and delete as one unit. The SVG element serves as the drag handle.

### Core Pattern

```
BundleRegistry (on the system object, e.g. NotationFragmentSystem.bundles[])
  ├── bundle.id           — unique int
  ├── bundle.gcId         — GCMaker gc.id
  ├── bundle.svgId        — SVGElementManager element.id
  ├── bundle.midiSnippetId — MidiSnippetDatabase snippet.id
  ├── bundle.arrowEl      — DOM reference (optional visual indicator)
  ├── bundle.impactTime   — original impact time (anchor)
  └── bundle.track        — track number
```

### Drag Propagation Hook

The key mechanism: intercept `SVGElementManager.handleMouseMove` and `handleMouseUp`.

**During drag (handleMouseMove):**
1. Check if dragged SVG belongs to a bundle (lookup by svgId)
2. Compute time delta: `(dx * secondsPerPixel)` — same delta SVG already computes
3. Apply delta to bundle siblings:
   - **GC**: shift `startSeconds`, `endSeconds`, `impactSeconds` by delta
   - **MIDI snippet**: shift `startSeconds`, `endSeconds`, all event `timeMs` by `delta * 1000`
   - **Arrow line**: shift SVG x-attributes by `dx` pixels
4. Re-render GC: `GCMaker.rerenderAllGCs()`
5. Update live UI readout (e.g., impact time display in the system's panel)

**On drag end (handleMouseUp):**
1. `MidiController.reloadFromDatabase()` — refresh MIDI visual bars
2. `ScoreManager.markDirty()` — flag unsaved changes
3. Update `FlowchartConnector.updateAllConnectors()` if connectors exist

### Delete Handler

When deleting a bundle, remove ALL components:
1. GC: splice from `GCMaker.gcs[]`, re-render
2. SVG: remove wrapper DOM, splice from `SVGElementManager.elements[]`, update list
3. MIDI snippet: `MidiSnippetDatabase.remove(id)`
4. Arrow/visual indicators: remove DOM element
5. Bundle record: splice from registry
6. Reload affected systems (GCs, SVGs, MIDI)
7. `ScoreManager.markDirty()`

### Save/Load Persistence

Register with ScoreManager:
```js
ScoreManager.registerSource('databases.nfBundles',
    () => NotationFragmentSystem.exportBundles(),
    (data) => NotationFragmentSystem.importBundles(data)
);
```

Export only serializable data (IDs, times, track). On import, re-link to live objects by ID lookup.

### UI: Live Readout During Drag

Add a read-only field in the system's panel showing the current anchor time (e.g., GC impact time). Update this field on every drag frame from the bundle hook.

### Page Boundary Behavior

Left/right boundary crossing works automatically via `calcPixelPosition` — when `referenceSeconds + offsetSeconds` crosses a page boundary, the SVG (and GC) re-render on the correct page/section. Up/down cross-page drag deferred for now.

---

## Adapting to Other Systems

When implementing bundles for another system (e.g., Bartók Pizz, Long Tones, Vibrato):

### What Stays the Same
- Registry pattern (bundles[] array with component IDs)
- Drag propagation via SVGElementManager hook (check svgId → lookup bundle → shift siblings)
- Delete = remove all components
- ScoreManager persistence pattern
- Live UI readout pattern

### What Changes Per System
- **Component types**: Different systems may not have all of GC + SVG + MIDI. Some may have curves instead of GCs, or audio clips instead of MIDI snippets.
- **Anchor point**: The "reference time" may be different (impact time for NF, start time for curves, etc.)
- **Visual indicators**: Different systems may have different overlay elements (arrow lines, region highlights, etc.)
- **Drag constraints**: Some systems might restrict to X-only movement, others may allow Y (track change)

### Checklist for New Bundle Implementation
1. [ ] Identify which components belong to the bundle (what gets created together?)
2. [ ] Decide anchor point (what time value is the "handle"?)
3. [ ] Add `bundles[]` array to the system object
4. [ ] Add `registerBundle()` at insert time
5. [ ] Add `lookupBundleBySvgId()` for drag hook
6. [ ] Add `deleteBundle()` for full cleanup
7. [ ] Hook into `SVGElementManager.handleMouseMove` — add system-specific sibling shift logic
8. [ ] Hook into `SVGElementManager.handleMouseUp` — reload affected systems
9. [ ] Register with ScoreManager for save/load
10. [ ] Add live readout field to the system's UI panel
11. [ ] Test: drag within page, drag across page boundary, delete, save/load round-trip

### Systems Known to Need Bundling (Future)
- Bartók Pizzicato (SVG + MIDI + GC?)
- Long Tones (SVG + MIDI + curve?)
- Glissando fragments (SVG + MIDI + curve)
- Custom notation insertions

---

## Crescendo/Decrescendo Bundle System

**Status:** All 3 phases complete and working (ASB-105/106/107).
**Date:** Feb 25, 2026

### Component Inventory

| Component | System | ID Field | Notes |
|-----------|--------|----------|-------|
| Curve | `CurveDatabase` / `CurveMaker.curves[]` | `curve.id` | Primary visual; has `startSeconds`, `endSeconds`, slope, model, Y values |
| SVG notation | `SVGElementManager.elements[]` | `elementData.id` | Hairpin/dynamic markup; positioned at `curve.startSeconds` |
| MIDI snippets | `MidiSnippetDatabase` | `snippet.id` (multiple!) | One per segment for glissando model; one for single-pitch |
| MidiController events | `MidiController.tracks[].midiEvents` | Tagged `sourceCurve: curve.id` | Raw playback events |

### Key Differences from NF Bundle

| Aspect | NF Bundle | Crescendo Bundle |
|--------|-----------|------------------|
| Components | GC + SVG + 1 MIDI snippet + arrow | Curve + SVG + N MIDI snippets |
| Drag handle | SVG | SVG (consistent) |
| Anchor time | GC impactTime | curve.startSeconds |
| Edit capabilities | Move only | Move + duration change + slope change + MIDI regeneration |
| MIDI count | Single snippet | Array of snippetIds (glissando segments) |
| Multi-page | SVG page crossing | Curve already handles multi-page rendering |

### Bundle Record Shape

```js
{
    id,
    curveId,            // CurveDatabase curve.id
    svgId,              // SVGElementManager element.id
    midiSnippetIds: [], // Array — multiple for glissando
    startTime,          // curve.startSeconds (anchor)
    endTime,            // curve.endSeconds
    track,
    // Stored for MIDI regeneration:
    pitchModel,         // 'single' or 'glissando'
    pitchInfo,          // { pitch } or { startPitch, endPitch, lpStartPitch, lpEndPitch, glissOffset }
    dynamic1, dynamic2,
    clef,
    velocity,
    needsRegeneration: false  // flag set when shape/duration changes
}
```

### Phase 1: Basic Bundle (Move + Delete)

Apply the same pattern as NF bundles:
- `CrescendoUI.bundles[]` registry with CRUD (registerBundle, lookupBundleBySvgId, deleteBundle, exportBundles, importBundles)
- Register bundle at end of `step2()` after SVG + MIDI insertion
- Hook `SVGElementManager.handleMouseMove` — when dragging a crescendo bundle SVG, shift curve (startSeconds, endSeconds) and all MIDI snippets by same time delta
- Hook `SVGElementManager.handleMouseUp` — reload MIDI, mark dirty
- Delete removes: curve (from CurveDatabase + CurveMaker.curves[] + DOM), SVG element, all MIDI snippets, all tagged MidiController events
- Register with ScoreManager for persistence
- Live readout in Crescendo panel

**Drag propagation specifics:**
- Curve: shift `startSeconds` and `endSeconds` by timeDelta, recalculate `x1`/`x2`, re-render
- MIDI snippets: shift `startSeconds`, `endSeconds`, `startTimeMs` by timeDelta; shift all `event.timeMs` by `timeDelta * 1000`
- MidiController events: shift all events tagged `sourceCurve: curveId` by `timeDelta * 1000`
- SVG clamping: unaffected — offsetSeconds stays constant, referenceSeconds shifts (same pattern as NF)

### Phase 2: Curve Duration Drag (CurveMaker Enhancement — All Curves)

Add horizontal (X-axis) dragging to curve start/end endpoints. Currently only vertical (Y) drag exists.

**Changes to `handleCurveMouseDown`:**
- `case 'start'`: add X handling → changes `curve.startSeconds`, recalculates `curve.x1`
- `case 'end'`: add X handling → changes `curve.endSeconds`, recalculates `curve.x2`
- After X change: regenerate `curveData` samples via `generateCurveDataArray`
- Clamp to page boundary (no cross-page endpoint drag)
- For cross-page adjustments: use UI number inputs (start/end time)

**Save file safety:** Adding X-drag to endpoints is purely additive behavior. Saved curves store `startSeconds`/`endSeconds` which remain the same format. No existing save data is modified.

**Regeneration flag:** After any duration change, set `bundle.needsRegeneration = true` on the associated crescendo bundle (if one exists). This is also set on slope changes.

### Phase 3: MIDI Regeneration

When curve shape or duration changes, MIDI data becomes stale.

**UI:** "Regenerate MIDI" button in Crescendo panel (shown/enabled when `needsRegeneration` is true).

**Flow (safe ordering — generate before delete):**
1. Generate new MIDI first: `generateCrescendoMidi()` with stored params from bundle record
2. If generation succeeds: delete old MIDI snippets by `sourceCurve` (not by ID — robust against ID desync)
3. Remove old MidiController events: filter out events with `sourceCurve: curveId`
4. Insert new MIDI: `insertCrescendoMidi()` to create new snippets
5. Update `bundle.midiSnippetIds` with new IDs
6. Clear `needsRegeneration` flag
7. Reload MIDI display

**Triggers for regeneration:**
- Curve slope change (body drag)
- Curve Y endpoint change (start/end vertical drag)
- Curve duration change (start/end horizontal drag — Phase 2)
- UI time input changes

**SVG notation:** Does NOT need regeneration unless pitch or dynamics change (separate operation).

### SVG Clamping Analysis

Clamping in `calcPixelPosition` (line ~2897): prevents negative `offsetSeconds` from pulling SVG past page left edge. During bundle drag, `offsetSeconds` stays constant while `referenceSeconds` shifts — clamping behavior preserved. No changes needed.

Edge case: if curve starts very near page boundary, SVG's negative offset gets clamped to page edge. This is existing behavior, unrelated to bundling.

---

## Key Code Locations (Notation Fragment reference implementation)

### Notation Fragment (reference implementation)

| Component | Location in `public/index.html` |
|-----------|-------------------------------|
| Bundle registry | `NotationFragmentSystem.bundles[]` |
| Register bundle | `NotationFragmentSystem.registerBundle()` |
| Delete bundle | `NotationFragmentSystem.deleteBundle()` |
| Export/import bundles | `NotationFragmentSystem.exportBundles()` / `importBundles()` |
| Drag hook | `SVGElementManager.handleMouseMove` — bundle propagation block |
| MouseUp hook | `SVGElementManager.handleMouseUp` — bundle finalization block |
| Live readout | `#nfBundleTime` in NF panel HTML |
| ScoreManager registration | `registerBuiltInSources()` — `databases.nfBundles` |

### Crescendo/Decrescendo

| Component | Location in `public/index.html` |
|-----------|-------------------------------|
| Bundle registry + CRUD | `CrescendoUI.bundles[]`, `registerBundle()`, `lookupBundleByCurveId()`, `lookupBundleBySvgId()`, `deleteBundle()`, `exportBundles()`, `importBundles()` |
| Bundle drag | `CrescendoUI.startBundleDrag()` — shifts curve, SVG, MIDI snippets, MidiController events by cumulative timeDelta |
| MIDI regeneration | `CrescendoUI.regenerateMidi(bundle)` — deletes old MIDI, re-generates from stored bundle params, inserts new MIDI, clears flag |
| Regen button wiring | `CrescendoUI.initBundleUI()` — click handler + SVGElementManager.selectElement patch for show/hide |
| needsRegeneration trigger | `CurveMaker.syncCurveToDatabase()` — sets flag on associated bundle (guarded by `_isBundleDragging` to skip during bundle move) |
| Bundle row on curve select | `CurveMaker.selectCurve()` / `deselectCurve()` — shows/hides `#cdBundleRow` + regen button |
| Live readout | `#cdBundleTime` in Crescendo panel HTML |
| UI elements | `#cdBundleRow`, `#cdRegenMidiBtn`, `#cdDeleteBundleBtn` |
| ScoreManager registration | `registerBuiltInSources()` — `databases.cdBundles` |

---

## Potential Side Effects Checklist

| Concern | Mitigation |
|---------|-----------|
| GC re-render perf during drag | Throttle `rerenderAllGCs()` if needed (~50ms) |
| MIDI event shifting accuracy | Use same pattern as GroupManager.setObjectTime for midi |
| GroupManager conflict | Don't add bundle components to manual groups (or document risk) |
| FlowchartConnector | Call `updateAllConnectors()` in drag handler |
| ObjectSelector | Bundle selection coexists with ObjectSelector — just propagate drag |
| Save/load round-trip | Export only IDs + times; re-link on import |

---

## Lessons Learned (ASB-106/107 — CD Bundle Debugging)

### Critical Bug: Duplicate Bundles

**Problem:** Multiple bundles accumulated for the same component ID (e.g., `curveId: 239` had 3 bundles — one with `pitchModel: single`, two with `pitchModel: glissando`). This happened because:
1. `step2()` called `registerBundle()` without checking if a bundle already existed for that curveId
2. `importBundles()` loaded all saved bundles verbatim, including stale duplicates
3. `lookupBundleByCurveId()` used `.find()` which returns the **first** (oldest) match — often the wrong one

**Symptoms:**
- Regen button disappeared (old bundle had `needsRegeneration: false`)
- Regen used wrong pitchModel (`single` instead of `glissando`)
- Delete handler couldn't find the bundle

**Fixes (apply to ALL bundle systems):**
1. **Dedup at registration:** Before `registerBundle()`, remove any existing bundles for the same primary ID (curveId, gcId, etc.)
2. **Dedup at import:** Use `Map` keyed by primary component ID, keeping only highest bundle ID (most recent)
3. **Lookup returns latest:** If duplicates slip through, return `matches[matches.length - 1]` not `matches[0]`

### Critical Bug: Delete Handler Only Checked One Selection Source

**Problem:** Delete button and Delete key handler only checked `SVGElementManager.selectedElement`. When the user had the curve selected (not the SVG), the delete handler couldn't find the bundle.

**Fix:** Use dual-lookup pattern (same as regen button already used):
```js
let bundle = null;
if (primarySelection) bundle = lookupByPrimaryId(primarySelection.id);
if (!bundle && svgSelection) bundle = lookupBySvgId(svgSelection.id);
```

### Safe MIDI Regeneration Ordering

**Problem:** Original flow deleted old MIDI before generating new. If generation failed, the old MIDI was lost.

**Fix:** Generate new MIDI first → only delete old if generation succeeds → insert new.

### sourceCurve-Based Deletion (Robust)

**Problem:** Deleting MIDI snippets by `bundle.midiSnippetIds` array failed when IDs got out of sync (e.g., after regen created new IDs but old IDs weren't updated).

**Fix:** Delete by querying `MidiSnippetDatabase.getAll().filter(s => s.sourceCurve === bundle.curveId)`. This is robust because `sourceCurve` is set at snippet creation time and never changes.

### Browser Cache-Busting for Regenerated Files

**Problem:** When MIDI files are regenerated with the same filename, `fetch()` returns cached old version.

**Fix:** Append cache-buster: `fetch(file.path + '?t=' + Date.now())`

---

## Comparative Analysis: NF vs CD Bundle Systems

### Structural Comparison

| Feature | NF Bundle | CD Bundle | Notes |
|---------|-----------|-----------|-------|
| Primary component | GC (gravitational conductor) | Curve (CurveMaker) | Different drag handles |
| SVG notation | Yes (fragment SVG) | Yes (hairpin/dynamic) | Same SVGElementManager |
| MIDI | Single snippet ID | Array of snippet IDs | CD has multi-segment glissando |
| Visual indicator | Alignment arrow (DOM) | None | Arrow requires DOM recreation on import |
| Stored params | impactTime, track | pitchModel, pitchInfo, dynamic1/2, clef, velocity | CD stores much more for regen |
| Regeneration | None (MIDI is pre-computed) | Full MIDI regeneration | CD's unique Phase 3 |
| Edit capabilities | Move only | Move + resize + shape change + regen | CD much more complex |
| Drag initiation | GC mousedown | Shift+curve mousedown | Different trigger patterns |
| Dedup protection | **None currently** | ✅ step2 + importBundles + latest-ID lookup | **NF should add this** |
| Delete lookup | SVG only | Dual: curve + SVG | **NF could benefit from dual lookup** |

### What NF Bundle Could Adopt from CD

1. **Import dedup** — NF's `importBundles` does `data.bundles.map(b => ({...b}))` without dedup. If duplicate bundles for the same `gcId` accumulate in saved data, the same bug would occur. Low risk currently (NF inserts are less frequent), but the Map-based dedup pattern is a good safety net.

2. **Dual-lookup delete** — NF's Delete key handler checks `this.selectedBundleId`, which is set from SVG selection (`onSvgSelected`). If the user selects the GC instead of the SVG, delete won't work. A dual lookup (GC selection → `lookupBundleByGcId`, then SVG → `lookupBundleBySvgId`) would be more robust.

3. **Registration dedup** — NF's `registerBundle` blindly pushes to `bundles[]`. If `insert()` is called twice for the same GC, duplicates would accumulate. A pre-registration cleanup (like CD's `step2` dedup) would prevent this.

### What CD Bundle Already Has That NF Doesn't Need

- **MIDI regeneration** — NF uses pre-computed MIDI from timing DB; no need to regenerate
- **needsRegeneration flag** — NF components don't change shape
- **Multi-snippet arrays** — NF has exactly one MIDI snippet per bundle
- **Curve endpoint X-drag** — NF doesn't have curves

### Potential Impact of CD Changes on NF

**No breaking changes.** All CD fixes were scoped to `CrescendoUI` methods. The shared infrastructure (`SVGElementManager`, `MidiSnippetDatabase`, `MidiController`, `ScoreManager`) was only touched in one place: `MidiController.reloadFromDatabase()` got `sourceCurve` propagation (ASB-106 Bug 1). This change is additive — it adds a property to events that wasn't there before. NF MIDI events don't use `sourceCurve`, so they're unaffected.

---

## Blueprint: Adding Bundling to a New System

### Step-by-Step Implementation Guide

Based on the NF and CD implementations, here's the proven pattern:

#### Phase 0: Analysis
1. **Identify components** — What gets created together? (SVG? MIDI? Curve? GC? Arrow? Audio clip?)
2. **Identify primary component** — Which component is the "anchor"? (GC for NF, Curve for CD)
3. **Identify drag handle** — What does the user click to drag? (SVG for both currently)
4. **Identify stored params** — What parameters are needed for regeneration? (None for NF, many for CD)
5. **Identify lookup keys** — How will you find a bundle? (By svgId? curveId? gcId?)

#### Phase 1: Registry + Delete
1. Add `bundles: []` and `nextBundleId: 1` to the system object
2. Implement `registerBundle(componentIds..., params)` — include dedup:
   ```js
   // Remove existing bundles for same primary ID
   this.bundles = this.bundles.filter(b => b.primaryId !== newPrimaryId);
   const bundle = { id: this.nextBundleId++, ...componentIds, ...params };
   this.bundles.push(bundle);
   ```
3. Implement lookup methods: `lookupBySvgId(id)`, `lookupByPrimaryId(id)` — return **last** match
4. Implement `deleteBundle(bundleId)` — remove ALL components (DOM + arrays + databases)
5. Implement `exportBundles()` / `importBundles(data)` — import includes Map-based dedup
6. Register with ScoreManager: `registerSource('databases.XXBundles', export, import)`
7. Call `registerBundle()` at the end of the creation flow (after all components exist)
8. Wire Delete button + Delete key handler with **dual-lookup** pattern

#### Phase 2: Drag
1. Choose drag trigger: Shift+click on primary component, or direct mousedown on handle
2. Implement `startBundleDrag(bundle, e)` — cumulative delta pattern:
   - Capture originals at drag start
   - Each frame: compute `timeDelta` from pixel delta
   - Apply timeDelta to ALL sibling components from their original values
   - Never accumulate — always `original + currentDelta`
3. Wire mouseup: `reloadFromDatabase()`, `markDirty()`, clear drag state
4. Add live readout field to panel HTML (time display during drag)
5. Set `_isBundleDragging` flag to prevent regeneration triggers during drag

#### Phase 3: Regeneration (if applicable)
1. Add stored params to bundle record (pitchModel, dynamics, etc.)
2. Add `needsRegeneration: false` flag to bundle
3. Set flag in shape/duration change handlers (guarded by `_isBundleDragging`)
4. Add Regen button to panel + wire with **dual-lookup** pattern
5. Implement `regenerateMidi(bundle)` with **safe ordering** (generate → delete old → insert new)
6. Delete old snippets by `sourceCurve` tag (robust, not by ID array)
7. Use cache-buster on MIDI file fetch if files are regenerated with same filename

#### Phase 4: Testing Checklist
- [ ] Create bundle → verify all components linked
- [ ] Drag within page → all components move together
- [ ] Drag across page boundary → components re-render on correct page
- [ ] Delete via button → all components removed
- [ ] Delete via key → all components removed
- [ ] Save → reload → bundle persists, all components linked
- [ ] Duplicate creation → only one bundle per primary ID
- [ ] (If regen) Change shape → regen button appears → regen produces correct MIDI
- [ ] (If regen) Regen with different pitch model → verify correct branch taken

### Systems That Could Use Bundling

| System | Components | Primary | Regen Needed? | Priority |
|--------|------------|---------|---------------|----------|
| Long Tone Glissando | SVG + MIDI + Curve | Curve | Yes (same as CD) | High |
| Vibrato | SVG + MIDI + Curve | Curve | Yes (CC4 ramp) | High |
| Bartók Pizzicato | SVG + MIDI | SVG | No (discrete events) | Medium |
| Pizzicato Tremolo | SVG + MIDI + GC + Arrow | GC | Possible (timing DB) | Medium |
| Pizz Trem Glissando | SVG + MIDI + Curve | Curve | Yes (pitch bend) | Medium |
