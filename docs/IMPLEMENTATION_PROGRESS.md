# Implementation Progress

## Current Status
**Active Phase:** Phase 4 — Print Score (Puppeteer PDF Capture)
**Last Session:** Mar 21, 2026
**Last Commit:** `ed86d027` — `[Phase 3] Parts mode complete` + tag `phase-3-complete`

## Phase Status Table
| Phase | Status | Completion Date | Notes |
|-------|--------|----------------|-------|
| 1. Foundation | ✅ Complete | Mar 18 | All rendering verified, 7 patches + 7 strips |
| 2. Animation T1 | ✅ Complete | Mar 19 | Continuous time loop, canvas overlay, subscriber pattern, badge freeze |
| 3. Parts Mode | ✅ Complete | Mar 21 | Full N-section parts view + 4 bug fixes + size constraints |
| 4. Print Score | 🔄 In Progress | — | Pre-implementation protocol complete, Stage 1 starting |
| 5–14 | ⏳ Pending | — | |

---

## Phase 3 Post-Mortem

### Step A: Plan Audit — Point by Point

**Original Phase 3 scope** (§13.4 lines 3132-3171): "Parts Extraction — Runtime Track Filtering"
**Actual Phase 3 scope**: Full multi-page parts view (merged original Phases 3 + 12)

| Plan Item | Status | Implementation |
|-----------|--------|---------------|
| 3.1: Track filter on SVG element loading | ✅ | `ScoreManager.distributeData` wrapper, filters `el.track === TRACK` |
| 3.2: Filter curves, GCs, lineWedges, badges | ✅ | `matchTrack()` helper normalizes string/int, preserves "A" tracks |
| 3.3: Part view Option 1 (same layout) | ⏭ Skipped | Jumped to Option 2 (expanded single track) per user preference |
| 3.4: Test each track individually | ✅ | Tested track=1-4 with pages=4/6/8 |
| Completion: element counts correct | ✅ | User confirmed |
| Completion: "Track A" curves visible | ✅ | matchTrack handles "A" |
| Completion: no console errors | ✅ | Clean except diagnostic logging (to be removed) |
| Completion: regression (full score renders) | ✅ | Full score still works at default URL |

**Beyond-plan items completed (originally Phase 12):**

| Item | Status | Implementation |
|------|--------|---------------|
| N-section DOM layout | ✅ | Dynamic creation of N score-row sections with SVGs + canvases |
| Circular buffer page turns | ✅ | `checkPageChange` rotates sections, cursor wraps top-to-bottom |
| `onGoto` N-section alignment | ✅ | Circular distribution formula (ASB-191 fix) |
| StaffPositions override (1 track = full height) | ✅ | `staffHeight = availableHeight` for all 4 staves |
| SVGElementManager N-section | ✅ | N containers, calcPixelPosition + updateVisibility for N sections |
| CurveMaker N-section | ✅ | updateVisibility override with ASB-190 bottom-ref swap |
| LineWedgeMaker N-section | ✅ | updateVisibility + clipToPageEnd bottom-ref swap |
| GCMaker N-section | ✅ | calculateBallPositionForPage, renderGC, update on correct canvas |
| BadgeMaker N-section | ✅ | reloadFromDatabase wrapper for N containers |
| MotiveMaker N-section | ✅ | updateVisibility override |
| GlissandoSystem N-section | ✅ | 5 method overrides (ASB-192) |
| TrackSystem N-section | ✅ | N containers per track, timelineHeight=8 fix |
| Staff headers per section | ✅ | SVG instrument labels copied to builds |
| Canvas overlays per section | ✅ | N canvases, resizeAllCanvases, cursor draws on active canvas |
| MAX_ELEMENT_PAGES size cap | ✅ | Constant=5, applied to SVGElementManager + all 4 GC code paths |
| GC bottom-justified | ✅ | Impact point at track bottom, arc extends upward only |
| SVG z-order (in front of GC arcs) | ✅ | Re-append SVG containers after GC groups in each section |

### Step B: AI Audit

**Automated checks performed:**

1. **Diagnostic logging present** — 6 `console.debug` and ~12 `console.log` statements still in `performance_parts_patches.js`. These include:
   - `[CurveDiag]` and `[CurveVis]` logging (lines 821-822)
   - `[PartsMode DIAG]` DOM state inspection timeout (lines 1885-1930)
   - GCMaker reload logging (lines 1145-1149)
   - Track filter count logging (lines 1644, 1651)
   - Init confirmation logging (lines 44, 1883)
   - **Action needed:** Remove diagnostic logging before commit (Step G)

2. **Build script runs clean** — `build_performance_app.js` exits 0, all patches applied
   - One expected warning: `⚠ O5: LW re-append cleanup: target not found` (pre-existing)

3. **No unguarded references** — All maker overrides check `window.X` before patching

4. **Section container references verified:**
   - `PM.sections[i].el` — SVG elements for each section
   - `PM.sections[i].canvas` — Canvas overlays
   - `PM.sections[i].row` — Row div containers
   - `PM.gcGroups[i]` — GC arc containers per section
   - `SVGElementManager._sectionContainers[i]` — SVG element containers per section

### Step C: Tier 1 Memories — Capture

See memories created separately. Key items:
- **ASB-190**: Curve misplacement (page%2 → bottom-ref swap)
- **ASB-191**: onGoto circular page distribution
- **ASB-192**: GlissandoSystem 5-method override
- **ASB-193**: Continuation triple-ref save/restore
- **Parts mode architecture**: 10-system override summary
- **MAX_ELEMENT_PAGES**: Size constraint + bottom-justified GCs
- **SVG z-order**: Re-append after GC groups

### Step D: Future Impacts

1. **Phase 4 (Print)**: Puppeteer capture must handle `?track=N&pages=M` URL params. Parts mode sections are dynamically created — Puppeteer needs to wait for DOM setup (~1s after load). The `MAX_ELEMENT_PAGES` cap means 4-page mode prints with slightly smaller elements than track height — this is intentional and matches screen.

2. **Phase 5 (Server)**: The socket stub's `scoreGoto` handler was modified for N-section alignment. When replacing the stub with real Socket.IO, the `onGoto` override in parts patches must be preserved — it overrides `GraphicTimeline.onGoto` which the server's `scoreGoto` event triggers.

3. **Phase 10 (Sync+Anim T2)**: The canvas overlay architecture (N canvases) means sync corrections must be aware of which canvas the cursor is on. `StaffCursors.update()` already handles this via `sectionIndex = totalPagesTraveled % PAGE_COUNT`.

4. **Phase 12 (Part Views)**: Already substantially complete. Remaining items:
   - Configurable pages UI toggle (currently URL-only)
   - "My Part" vs "Full Score" runtime switch (would need to toggle track filter + rebuild sections)
   - Part view with 2 tracks visible (Option 3 from §12.13.4)

5. **Workshop source stability**: All 4 bug fixes (ASB-190 through 193) are in the patches file, NOT in `public/index.html`. If the Workshop source changes, the patches still apply correctly as long as the injection point (`</script>`) exists. However, if Workshop's `clipCurveToPageEnd` or `showContinuationSegment` change their internal logic, the patches may need updating.

6. **`page % 2` pattern**: The Workshop source uses `page % 2` in at least 4 places (CurveMaker, LineWedgeMaker, SVGElementManager, GCMaker) to choose between top/bottom. All 4 are overridden in parts patches. Any NEW maker system added to the Workshop that uses this pattern will need a similar override.

### Step E: Repeatability

**Rebuild instructions:**
```bash
# 1. Build the performance app (includes parts mode patches)
node scripts/build_performance_app.js

# 2. Serve locally for testing
node -e "const h=require('http'),f=require('fs'),p=require('path'),d='builds/performance',m={'.html':'text/html','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};h.createServer((q,r)=>{let u=q.url.split('?')[0];if(u==='/')u='/index.html';const fp=p.join(d,decodeURIComponent(u)),e=p.extname(fp);if(!f.existsSync(fp)){r.writeHead(404);r.end('Not found');return}r.writeHead(200,{'Content-Type':m[e]||'application/octet-stream'});f.createReadStream(fp).pipe(r)}).listen(3001,()=>console.log('http://localhost:3001'))"

# 3. Test URLs
# Full score:     http://localhost:3001
# Parts mode:     http://localhost:3001?track=1&pages=6  (default)
# 4-page mode:    http://localhost:3001?track=4&pages=4  (tests MAX_ELEMENT_PAGES cap)
# 8-page mode:    http://localhost:3001?track=2&pages=8  (maximum look-ahead)
```

**Visual audit checklist:**
- [ ] Each track (1-4) loads with correct elements only
- [ ] Cursor scrolls left-to-right through all N sections, wraps to top
- [ ] Page content rotates via circular buffer (section just left reloads with future page)
- [ ] Curves render on correct sections, including multi-page curves with continuations
- [ ] GC arcs appear at correct size (capped in 4-page mode, normal in 6+)
- [ ] GC bouncing balls track the arc correctly
- [ ] SVG notation elements appear in front of GC arcs
- [ ] Line wedges render on correct sections with correct clipping
- [ ] Goto/jump loads all sections with correct circular page distribution
- [ ] Staff headers show correct instrument name
- [ ] No console errors (after diagnostic removal)

**Known gotchas:**
1. `PM.sectionHeight` depends on `resizeSections()` running after DOM layout. If tested too early (before CSS applies), heights may be wrong. The 200ms delay in `scoreState` handler accounts for this.
2. `window.innerHeight / MAX_ELEMENT_PAGES` for the size cap assumes full-screen or near-full-screen browser. If the browser window is very small, the cap may produce very small elements.
3. `gTrack` is a STRING ("1"-"4" or "A"), `track` is an INTEGER (1-4). The `matchTrack` helper normalizes both.

**Conditions requiring build script updates:**
- New score JSON with different track count → update TRACK_NAMES array
- Workshop source changes to CurveMaker/LineWedgeMaker internals → verify patches still apply
- New maker system using `page % 2` pattern → add override in patches

### Step F: Troubleshooting Review

**Bug severity assessment compliance:**
- ASB-190 (curves on wrong sections): HIGH, blocked visual correctness → fixed immediately ✅
- ASB-191 (goto page alignment): HIGH, blocked navigation → fixed immediately ✅
- ASB-192 (GlissandoSystem wrong sections): HIGH, blocked pitch display → fixed immediately ✅
- ASB-193 (continuation cross-contamination): HIGH, blocked multi-page rendering → fixed immediately ✅
- All fixes were at root cause, not workarounds ✅

**Diagnostic logging effectiveness:**
- `[CurveDiag ORDER]` / `[CurveDiag MOVE]` / `[CurveDiag AUDIT]` logs were **critical** for identifying ASB-190. They showed curves being moved to correct sections then immediately put back by `clipCurveToPageEnd`. Without these, the bug would have taken much longer to find.
- `[PartsMode DIAG]` timeout was useful for verifying GC rendering dimensions and DOM state.
- **Process improvement**: The diagnostic logging pattern (targeted console.debug with prefixed tags) worked well. Consider making it a standard pattern: `[SystemName Action]` format for future debugging.

**Root cause vs. workaround assessment:**
- All 4 bugs were fixed at root cause
- ASB-190: The fundamental issue was `page % 2` in Workshop code assuming 2 sections. Fix: swap both top AND bottom refs before calling Workshop methods.
- ASB-191: The issue was linear page assignment instead of circular. Fix: modular arithmetic for circular distribution.
- ASB-192: The issue was hardcoded 2-section GlissandoSystem. Fix: N-section overrides.
- ASB-193: The issue was incomplete save/restore of shared element references. Fix: save/restore all 3 refs.
- MAX_ELEMENT_PAGES: Applied at trajectory computation level (upstream), not just at rendering (downstream). This is the correct approach — generates smaller trajectories rather than scaling large ones.

### Step G: Documentation & Commit

**Action items before commit:**
1. Remove all diagnostic `console.debug` and diagnostic `console.log` statements
2. Remove the `[PartsMode DIAG]` setTimeout block (lines 1885-1930)
3. Keep the init confirmation log (`[PartsMode] Initialized...`) and track filter logs as they're informational
4. Rebuild and verify
5. Commit: `[Phase 3] Parts mode — N-section layout, track filtering, 4 bug fixes, size constraints`
6. Tag: `git tag phase-3-complete`

---

## Known Issues
| ID | Phase | Description | Severity | Status |
|----|-------|-------------|----------|--------|
| — | 3 | `⚠ O5: LW re-append cleanup: target not found` build warning | Low | Pre-existing, cosmetic |
| — | 3 | Very small browser windows may produce odd sizing with MAX_ELEMENT_PAGES cap | Low | Edge case, acceptable |

## Decisions Log
| Date | Phase | Decision | Rationale |
|------|-------|----------|-----------|
| Mar 19 | 3 | Merged Phase 3 + Phase 12 into single implementation | Parts mode required N-section layout to be useful; filtering alone (original Phase 3) was incomplete without the expanded view |
| Mar 21 | 3 | MAX_ELEMENT_PAGES = 5 (not 6) | 6-page equivalent was the max acceptable size, but 5-page gives slightly larger elements while still being constrained — user preferred this |
| Mar 21 | 3 | GCs bottom-justified (not centered) | User feedback: impact point should be at track bottom for visual consistency |
| Mar 21 | 3 | SVG z-order via DOM re-append (not CSS z-index) | SVG elements inside an SVG don't support CSS z-index; DOM order determines paint order |

---

## Phase 4 Pre-Implementation Protocol

### Step 1: System Inventory

Phase 4 is a **new standalone script** (`scripts/generate_print_pdf.js`), not a monkey-patch. It interacts with existing systems only as a consumer:

| System | Role | State it reads | State it writes |
|--------|------|----------------|-----------------|
| Puppeteer (new dep) | Headless browser | — | Browser instance |
| Local HTTP server | Serves `builds/performance/` | Filesystem | HTTP responses |
| Socket stub `scoreGoto` | Page navigation | `_scoreTimeMs` | Triggers `scoreGoto` event → app repositions |
| Performance app DOM | `#ScoreContainer`, ScoreTop/Bottom | Score JSON | Rendered SVGs, curves, GCs |
| Score timing | bpm=60, beatsPerPage=8, leadIn=2s | `score.json` `tempoHistory[0]` | — |
| Parts mode patches | N-section layout via `?track=N&pages=M` | URL params | Dynamic section SVGs |

**Calculated values:**
- `secondsPerPage = (60 / 60) × 8 = 8 seconds`
- Pages come in pairs for full score (ScoreTop=even, ScoreBottom=odd)
- `maxSeconds = 508.1s` (from `curves[153].endSeconds` — must scan `endSeconds` not just `startSeconds + durationSeconds`)
- `totalPages = ceil((508.1 + 2) / 8)` = **64 pages** (0–63)
- **32 page pairs** for full score PDF

### Step 2: Source Reading

Since we're not overriding Workshop functions, this step is light:

- **Socket stub `scoreGoto`** (`build_performance_app.js:112-122`): Takes `{ seconds: N }`, sets `_scoreTimeMs`, triggers event via `ClockSync.socket.emit()`. The app's `GraphicTimeline.onGoto` handler repositions all elements.
- **Parts mode `onGoto`** — already overridden in `performance_parts_patches.js`, uses circular buffer distribution. Works correctly (ASB-191 fixed).
- **`#ScoreContainer` CSS** — 4:3 aspect ratio, `max-width: calc((100vh - 10px) * 4 / 3)`. For Puppeteer, set viewport to 1600×1200 so ScoreContainer fills it.

### Step 3: Contracts

- **Precondition:** `builds/performance/` exists with valid `index.html` and `score.json` (run `build_performance_app.js` first)
- **Postcondition (full score):** PDF has `ceil(totalPages / 2)` = 32 pages, each showing ScoreTop + ScoreBottom with correct notation, no UI artifacts
- **Postcondition (parts):** PDF has `totalPages / pagesParam` pages, each showing single-track expanded view
- **Invariant:** Every page in the PDF matches exactly what a human would see in the browser at that navigation point

### Step 4: Risk Register

| Risk | Probability | Detection | Mitigation |
|------|------------|-----------|------------|
| App not fully loaded when capture starts | High | Blank or partial pages | Wait for `SVGElementManager.elements.length > 0` |
| Parts mode DOM not created in time | Medium | Missing sections | Wait for `PM.sections` array populated |
| Cursor visible in capture | High | Colored rectangle in PDF | Inject CSS: `canvas { display: none }` |
| Playback UI drawer visible | High | Thin blue/purple rectangle | Inject CSS: `#compositionPanel, #cursorMenu { display: none }` |
| ScoreContainer doesn't fill viewport | Medium | Margins in PDF | Set viewport to exact 4:3 (1600×1200) |
| scoreGoto race condition | Medium | Elements from wrong page | Wait + verify `GraphicTimeline.currentTopPage` matches |

### Step 5: Staged Implementation Plan

```
Stage 1: Puppeteer skeleton + server startup + first screenshot        ✅ DONE
  → TEST: Screenshot exists, shows score's first page pair
  → RESULT: 188 KB, 542 elements, 225 curves, 248 GCs, container 1587×1190
  → FIX: Added print CSS to hide #compositionPanel, #cursorMenu, canvas overlays
  → FIX: Duration calculation now scans endSeconds (not just start+duration)
         curves[153].endSeconds=508.05 was the true max → 64 pages, 32 pairs

Stage 2: Page navigation (scoreGoto, boundary + consecutive tests)     ✅ DONE
  → TEST: Each pair shows correct (2N, 2N+1) pages; consecutive pairs advance by +2
  → RESULT: 7/7 tests pass — boundary (0, 16, 31) + consecutive (5, 6, 7, 8)
  → FIX: Navigation bug — must NOT subtract leadInSeconds from target.
         GraphicTimeline.onGoto calculates targetPage = floor(seconds / spp).
         Even targetPage → top=page, bottom=page+1 (correct pair).
         Odd targetPage → bottom=page, top=page+1 (WRONG — shows mixed pair).
         Fix: targetSeconds = pairIndex * 2 * secondsPerPage (always lands on even page).

Stage 3: Full vector PDF assembly (page.pdf() + pdf-lib merge)         ✅ DONE
  → TEST: PDF has 32 pages, vector format, pages progress through score
  → RESULT: full_score.pdf — 32 pages, 3.0 MB, true vector (SVG paths preserved)
  → Used page.pdf() with emulateMediaType('screen') for vector output
  → pdf-lib merges 32 single-page PDFs into one multi-page document

Stage 4: Print CSS polish (hide cursor, clean margins)                 ⬅ CURRENT
  → TEST: No cursor artifacts, clean white score areas, blueGrey border

Stage 5: Quality verification at 400% zoom
  → TEST: Human spot-check colors, sharpness, compare to live app

Stage 6: Per-track PDF generation (--track flag)
  → TEST: 4 separate PDFs, each showing only one track's notation
```

### Step 6: Focused Stage Tests

**Stage 1 tests:**
- 🤖 Screenshot file exists, size > 0 → ✅ 188 KB
- 🤖 No Puppeteer errors in console → ✅
- 👁️ Score visible in screenshot → ✅ (user confirmed)
- 👁️ No UI artifacts → ✅ Fixed: CSS hides panels + canvases

**Stage 2 tests:**
- 🤖 Boundary pairs (0, 16, 31) all show correct (2N, 2N+1) pages → ✅
- 🤖 Consecutive pairs (5, 6, 7, 8) advance by exactly +2 pages → ✅
- 👁️ First pair (0/1) shows beginning of score → ✅ (user confirmed)
- 👁️ Last pair (62/63) shows end of score (~sec 496-512) → ✅ (user confirmed)
- 👁️ Consecutive pairs show advancing, non-repeating content → ✅ (user confirmed)

**Stage 3 tests:**
- 🤖 PDF file exists, page count = 32 → ✅
- 🤖 File size reasonable → ✅ 3.0 MB vector
- 👁️ Open PDF, scroll through — pages progress through score → ✅ (user confirmed)
- 👁️ Zoom to 400% — sharp at any zoom (vector) → ✅ (user confirmed on test page)

**Stage 4 tests:**
- 🤖 No `<canvas>` elements visible in capture
- 👁️ Pages look clean — no UI remnants

**Stage 5 tests:**
- 👁️ Zoom to 400% — notation sharp, colors match live app
- 👁️ Compare first page, last page, and 3 random middle pages against Workshop

**Stage 6 tests:**
- 🤖 4 PDFs generated, all non-zero size
- 👁️ Each PDF shows only one track's notation expanded

## RESUME HERE
**Current stage:** Phase 4 Stage 4 — Print CSS polish
**Files:** `scripts/generate_print_pdf.js` (main script), `package.json` (puppeteer + pdf-lib added)
**Output:** `builds/print/full_score.pdf` — 32-page vector PDF, 3.0 MB
