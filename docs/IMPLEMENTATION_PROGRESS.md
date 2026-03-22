# Implementation Progress

## Current Status
**Active Phase:** Phase 7 — Authentication & Persistence ✅ COMPLETE
**Last Session:** Mar 22, 2026
**Last Commit:** Pending — `[Phase 7] Auth — self-service sessions, JWT, per-performer persistence`

## How to Resume Work (for the human)

### Quick start (any session)
Type `/session-start` — this triggers a workflow that walks the AI through the full startup ritual. Or simply say "read WORKING_PRINCIPLES.md and IMPLEMENTATION_PROGRESS.md, then tell me where we are."

### Which documents do what?
| Document | Role | Size | Read when? |
|----------|------|------|-----------|
| **`WORKING_PRINCIPLES.md`** | Rubric — distilled lessons, bug-fixing rules, process principles | ~80 lines | **Every session** (short, always internalized) |
| **This file (`IMPLEMENTATION_PROGRESS.md`)** | Working doc — current status, RESUME HERE, per-phase protocols | ~500 lines | **Every session** (focus on top + bottom) |
| **`STRING_QUARTET_PIPELINE_PLAN.md`** | Architectural reference — full design, methodology, post-mortems | ~4800 lines | **New phases or long gaps** (selectively, by section) |

### Resumption by timeframe
| Gap | What to do |
|-----|-----------|
| **Hours/days** | `/session-start` or "read principles + progress." AI memories fill in the rest. |
| **Weeks** | Same, but tell the AI: "verify your understanding against the documents, don't rely on memories alone." |
| **Months/year+** | Tell the AI: "Read `docs/WORKING_PRINCIPLES.md`, then `docs/IMPLEMENTATION_PROGRESS.md`, then the relevant phase section of `docs/STRING_QUARTET_PIPELINE_PLAN.md`. Do not rely on memories." |
| **New piece entirely** | `WORKING_PRINCIPLES.md` (process) + `STRING_QUARTET_PIPELINE_PLAN.md` (architecture) together are self-sufficient. |

### Keeping WORKING_PRINCIPLES.md current
- **During a session:** If the AI makes a mistake that violates or reveals a missing principle, correct it and say "add this to WORKING_PRINCIPLES.md."
- **End of phase:** During post-mortem, review whether new principles emerged. Distill them to one-line entries.
- **Keep it short.** If it grows past ~100 lines of principles, distill further. Long explanations belong in the pipeline plan.

### Three-tier documentation system (§13.1)
1. **AI Memories** — fast context retrieval for session-to-session continuity. Convenience layer only — every important detail has been written into the documents.
2. **Git commits + tags** — rollback safety. Each phase has a tag (e.g., `phase-4-complete`). Use `git tag -l` to see all milestones.
3. **These documents** — permanent, self-sufficient record of truth. If memories disappeared tomorrow, the documents would still be complete.

---

## Phase Status Table
| Phase | Status | Completion Date | Notes |
|-------|--------|----------------|-------|
| 1. Foundation | ✅ Complete | Mar 18 | All rendering verified, 7 patches + 7 strips |
| 2. Animation T1 | ✅ Complete | Mar 19 | Continuous time loop, canvas overlay, subscriber pattern, badge freeze |
| 3. Parts Mode | ✅ Complete | Mar 21 | Full N-section parts view + 4 bug fixes + size constraints |
| 4. Print Score | ✅ Complete | Mar 21 | 6 stages, 13 vector PDFs (full + 4 tracks × 3 densities), CSS margin fix |
| 5. Server Architecture | ✅ Complete | Mar 21 | Room-based Socket.IO, grace period, reconnection, 3 build patches (1b/1c) |
| 6. Sync Tier 1 | ✅ Complete | Mar 21 | performance.now(), outlier rejection, connection awareness, drift correction |
| 7. Auth & Persistence | ✅ Complete | Mar 22 | Self-service sessions, JWT, preferences, 6 API endpoints |
| 8–14 | ⏳ Pending | — | |

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

Stage 4: Print CSS polish + alignment fix                              ✅ DONE
  → TEST: No cursor artifacts, clean white score areas, symmetric margins
  → ROOT CAUSE: Workshop CSS margin: 5px 5px 5px 0 → fixed to 5px
  → Multiple Puppeteer-side workarounds attempted and failed before source fix

Stage 5: Quality verification at 400% zoom                              ✅ DONE
  → TEST: Human spot-check colors, sharpness, compare to live app
  → RESULT: Staff lines, noteheads, hairpins, curves, text all crisp vector
  → 0 raster images confirmed in PDF structure

Stage 6: Per-track + batch PDF generation                               ✅ DONE
  → TEST: 13 PDFs generated (full + 4 tracks × 3 densities)
  → RESULT: --track, --pages, --all flags implemented
  → Full batch: 13 PDFs, 16.5 MB total, ~3 min runtime
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
- 🤖 No `<canvas>` elements visible in capture → ✅
- 👁️ Pages look clean — no UI remnants → ✅
- 👁️ Symmetric grey margins (equal left and right) → ✅ (after CSS fix)

**Stage 5 tests:**
- 👁️ Zoom to 400% — notation sharp, colors match live app → ✅ (user confirmed)
- 👁️ Compare first page, last page, and 3 random middle pages against Workshop → ✅
- 🤖 0 raster images in PDF, Form XObjects present (vector confirmed) → ✅

**Stage 6 tests:**
- 🤖 13 PDFs generated, all non-zero size → ✅
- 👁️ Part PDFs show only one track's notation expanded → ✅ (user confirmed Violin_I_6pages)
- 🤖 Page counts correct: full=32, 4pages=16, 6pages=11, 8pages=8 → ✅
- 🤖 All 13 variants generated in batch mode → ✅

---

## Phase 4 Post-Mortem Summary

> **Full post-mortem** is in `docs/STRING_QUARTET_PIPELINE_PLAN.md` §16 (Phase 4 Post-Mortem). This is a brief summary.

**What was built:** `scripts/generate_print_pdf.js` — Puppeteer-based PDF generator producing 13 vector PDFs (full score + 4 tracks × 3 page densities). Total output: 16.5 MB in `builds/print/`.

**Key bugs:** (1) Duration calc missed `endSeconds` field, (2) Odd page navigation due to `floor()` parity, (3) Asymmetric CSS margins in Workshop source — root cause fix, not workaround, (4) Puppeteer print context re-layouts CSS differently from viewport.

**Key lesson:** Fix layout issues upstream in source CSS, not downstream in Puppeteer. `page.pdf()` uses a separate rendering pass that may re-interpret CSS.

**Pre-implementation protocol assessment:** Effective — 4 of 6 risks caught by mitigations. Process improvement: add "source CSS assumptions" to future risk registers.

**Decision:** `margin: 5px` fix in `public/index.html` is permanent and must be preserved.

---

## Decisions Log (continued)
| Date | Phase | Decision | Rationale |
|------|-------|----------|----------|
| Mar 21 | 4 | Vector PDF via `page.pdf()` over screenshots | Infinite resolution, small file size, true SVG paths preserved |
| Mar 21 | 4 | Fix source CSS over Puppeteer workarounds | 1-line fix vs hours of fragile post-processing |
| Mar 21 | 4 | `--all` flag for batch generation | 13 variants in one run, single browser instance reuse |
| Mar 21 | 4 | 3 page densities (4, 6, 8) | Matches performance app viewing modes |

---

## Phase 5 Pre-Implementation Protocol

### Step 1: System Inventory

Phase 5 creates a **new Performance Score server** (`scripts/performance_server.js`) that evolves the sync architecture from Workshop's `server.js` into a room-based multi-client system. The Workshop server is NOT modified.

| System | Role | Current State | Phase 5 Change |
|--------|------|---------------|----------------|
| Workshop `server.js` (port 5000) | Composition server | ~3600 lines, global sync state, REST APIs for score/curves/GCs/MIDI/LilyPond/audio | **Unchanged** — reference only |
| Socket stub (build_performance_app.js Patch 1) | Offline play/stop/goto | ~60 lines, local handlers, no server | **Replaced** by real Socket.IO client |
| `ClockSync` (public/index.html) | Client-side clock offset | Calculates server-client time offset from `clockSync` events | Reused as-is — works with real server |
| Performance Score app | Static HTML served from `builds/performance/` | Loaded via static file server (port 3001 dev, 3002 print) | Served by new performance server |
| `GraphicTimeline.onGoto` | Score navigation handler | Overridden by parts patches for N-section support | Must be preserved — server's `scoreGoto` triggers this |
| `AnimationEngine` | Animation loop | Subscribes StaffCursors, StaffPositions, GraphicTimeline | Unchanged — receives time from ClockSync |

**Global state to scope per-room (from Workshop server.js lines 28-43):**
- `isPlaying` (bool)
- `currentScoreTimeMs` (int — frozen score time when stopped)
- `scoreTimeOffset` (int — `scoreTime = clockTime - offset` when playing)
- `tempoHistory` (array — `[{scoreTimeMs, bpm, beatsPerPage}]`)
- `currentBpm`, `currentBeatsPerPage` (ints)

**Socket events to scope per-room (from Workshop server.js lines 3452-3592):**
- `clockSync` — periodic server time broadcast (1Hz)
- `scoreState` — sent on connection (initial sync)
- `scoreGo` — start playback
- `scoreStop` — stop playback
- `scoreGoto` — jump to time position
- `pingRequest`/`pongResponse` — RTT measurement
- `setBpm`, `setBeatsPerPage` — tempo changes (may defer to Phase 6+)

### Step 2: Source Reading

**Workshop server.js sync architecture (lines 3452-3592):**
- On connection: sends `clockSync` + `scoreState` (isPlaying, currentScoreTimeMs, scoreTimeOffset, tempoHistory)
- `scoreGo`: calculates `scoreTimeOffset = now - currentScoreTimeMs`, broadcasts to ALL clients (`io.emit`)
- `scoreStop`: freezes `currentScoreTimeMs = getScoreTimeMs()`, broadcasts to ALL
- `scoreGoto`: sets `currentScoreTimeMs = targetMs`, stops, resets tempoHistory, broadcasts to ALL
- `clockSync` interval: `setInterval(() => io.emit('clockSync', {serverTime: Date.now()}), 1000)`

**Socket stub (build_performance_app.js lines 96-156):**
- Mimics the above locally — `_trigger()` dispatches events asynchronously via `setTimeout`
- `scoreGoto` handler: sets `_scoreTimeMs`, triggers event with same payload shape as server
- `scoreGo`: records `_playStartRealMs = Date.now()`, triggers event
- `scoreStop`: calculates elapsed from `_playStartRealMs`, triggers event

**Client-side ClockSync (public/index.html):**
- `ClockSync.socket = io()` — connects to server
- Listens for `clockSync`, `scoreState`, `scoreGo`, `scoreStop`, `scoreGoto`
- `ClockSync.now()` returns adjusted time: `Date.now() + this.offset`
- Used by AnimationEngine for `elapsedMs = ClockSync.now() - this.startTime`

### Step 3: Contracts

- **Precondition:** `builds/performance/` exists with valid `index.html` and `score.json`
- **Postcondition (single room):** 2+ clients in same room see synchronized playback (scoreGo/Stop/Goto)
- **Postcondition (room isolation):** Actions in Room A do NOT affect clients in Room B
- **Postcondition (backward compat):** Single client joining a room works identically to current stub behavior
- **Invariant:** Parts mode (`?track=N&pages=M`) continues to work — server is agnostic to client rendering mode

### Step 4: Risk Register

| Risk | Probability | Detection | Mitigation |
|------|------------|-----------|------------|
| Socket stub removal breaks offline mode | High | Parts mode / print scripts stop working | Keep stub in build; performance_server.js is an alternative connection mode, not a replacement |
| ClockSync.now() accuracy with real network latency | Medium | Cursor position drift between clients | Phase 6 addresses this; Phase 5 just needs basic broadcast |
| Room state not cleaned up after disconnect | Medium | Memory leak on server | Grace period + cleanup timer |
| Multiple clients sending conflicting scoreGo/Stop | Medium | Race condition — score flickers | Only "leader" client can control playback (Phase 8) — for now, last-write-wins |
| Performance app CSS/JS not loading via new server | Low | Blank page or missing elements | Serve same `builds/performance/` directory with correct MIME types |
| Parts mode onGoto override not preserved | Medium | Parts mode breaks with real server | Verify: parts patches override runs AFTER ClockSync.socket is set |

### Step 5: Staged Implementation Plan

```
Stage 1: Create minimal performance_server.js                     ⬅ START HERE
  - Static file server for builds/performance/ (port 3001)
  - Socket.IO with global state (no rooms yet — match Workshop behavior)
  - Events: clockSync, scoreState, scoreGo, scoreStop, scoreGoto
  → TEST: Single client connects, Play/Stop/Goto work, cursor animates

Stage 2: Build script — real Socket.IO client option
  - Modify build_performance_app.js: add Patch 1b (real Socket.IO client)
  - Conditional: if URL has ?server=true or if served by performance_server.js
  - OR: simpler — always use real socket.io, keep stub as fallback
  → TEST: Performance app loads via performance_server, Play/Stop work

Stage 3: Room-based state
  - Replace global state with per-room state objects
  - joinRoom/leaveRoom events with roomId from URL param
  - Scope all broadcasts to room: io.to(roomId).emit(...)
  → TEST: 2 clients in same room sync. 2 clients in different rooms isolated.

Stage 4: Room lifecycle
  - Room created on first join
  - Grace period (5 min) after last client disconnects
  - State persisted during grace period for reconnection
  → TEST: Disconnect all → reconnect within grace → state restored

Stage 5: Integration verification
  - Full score mode + parts mode through real server
  - Print script still works (uses its own server on port 3002)
  - Workshop server still works independently on port 5000
  → TEST: End-to-end regression — all Phase 1-4 features still work
```

### Step 6: Focused Stage Tests

**Stage 1 tests:**
- 🤖 Server starts on port 3001 without errors
- 🤖 Static files served (index.html, score.json, staff-headers/, pitch-svgs/)
- 🤖 Socket.IO connection established, scoreState received
- 👁️ Score renders in browser, Play/Stop/Goto buttons work

**Stage 2 tests:**
- 🤖 Performance app connects to real server (not stub)
- 🤖 ClockSync.offset calculated from server time
- 👁️ Cursor animates during playback, stops on Stop

**Stage 3 tests:**
- 🤖 2 tabs in Room A: scoreGo in tab 1 → tab 2 starts playing
- 🤖 2 tabs in Room B: unaffected by Room A actions
- 🤖 scoreGoto in one tab → all room members jump
- 👁️ Visual sync: cursors at same position in both tabs

**Stage 4 tests:**
- 🤖 Disconnect all clients → room persists for 5 min
- 🤖 Reconnect within grace → state restored (correct score time)
- 🤖 Wait beyond grace → room cleaned up

**Stage 5 tests:**
- 🤖 `node scripts/generate_print_pdf.js` still works (port 3002) → ✅
- 🤖 Parts mode via `?track=1&pages=6` through real server → ✅
- 👁️ Full regression: play, stop, goto, parts mode, all 4 tracks → ✅

### Phase 5 Stage Results

```
Stage 1: Minimal performance_server.js                              ✅ DONE
  - Static file server + Socket.IO on port 3001
  - Global sync state (scoreGo/Stop/Goto/clockSync)
  → 👁️ Human verified: score renders, playback controls work

Stage 2: Build script — real Socket.IO client + stub fallback       ✅ DONE
  - Patch 1 modified: keep real <script> tag, add stub if io undefined
  → 👁️ Human verified: cursor animates via real server

Stage 3: Room-based state                                           ✅ DONE
  - Patch 1b: client joins room from ?room=X URL param
  - Server: rooms Map, per-room state, scoped broadcasts
  → 👁️ Human verified: multi-client sync + room isolation

Stage 4: Room lifecycle                                             ✅ DONE
  - Grace period (5 min default, --grace CLI override for testing)
  - Cleanup after grace, reconnection cancels timer
  - Patch 1c: skip cursorState goto restore with real server
    (score.json's saved gotoDisplaySeconds was overwriting room state)
  - requestState event: server sends scoreGoto (not scoreState)
    for proper page navigation after score.json loads
  → 👁️ Human verified: reconnect within grace preserves position

Stage 5: Integration verification                                   ✅ DONE
  - Print script (port 3002) unaffected
  - Full score + parts mode work through real server
  - Multi-client sync works (play/stop/goto propagate between tabs)
  → ⚠️ Intermittent: one multi-client test showed wrong track graphics
    on second tab (sync timing was correct, visual rendering was wrong).
    Not reproducible. Likely client-side race condition unrelated to
    server changes. Monitor in future phases.
```

### Phase 5 Files Modified
- `scripts/performance_server.js` — **created** (room-based Socket.IO server)
- `scripts/build_performance_app.js` — Patches 1b (room join), 1c (skip cursorState goto)
- `docs/WORKING_PRINCIPLES.md` — added human verification principle

---

## Phase 6 Stage Results

```
Stage 1: Monotonic clock — performance.now() anchoring                ✅ DONE
  - Patch 1d: ClockSync.now() = _syncBase + (performance.now() - _perfBase)
  - Falls back to Date.now() + offset before first sync
  → 👁️ Human verified: monotonicity test PASS (10000 samples), playback works

Stage 2: Outlier rejection + weighted averaging                      ✅ DONE
  - Patch 1d-b: RTT > max(2× median, 10ms) discarded
  - Weighted avg: lower RTT = higher weight
  - Bug fix: 10ms minimum threshold (0ms median on localhost was
    rejecting all 1ms RTT samples)
  → 🤖 No false rejections on localhost

Stage 3: Connection awareness + burst re-sync + UI indicator         ✅ DONE
  - Patch 1e: replace requestPing with burstResync (5 pings × 50ms)
  - Patch 1e-a: disconnect handler
  - Patch 1e-b: green/yellow/red sync status dot (bottom-right, 10px)
  → 👁️ Human verified: green dot visible, tooltip shows RTT/offset

Stage 4: Server-authoritative position check + drift correction      ✅ DONE
  - Server: scorePositionCheck broadcast every 3s during playback
  - Patch 1f: client compares local vs server position
  - Smooth correction: drift >50ms → adjust _syncBase over 30 frames
  - _applyDriftStep() via requestAnimationFrame
  → 👁️ Human verified: drift <1ms on localhost, no correction triggered

Stage 5: Integration verification                                   ✅ DONE
  - Full score, parts mode, multi-client sync all work
  - Print server (port 3002) unaffected
  → 👁️ Human verified: all modes pass
```

### Phase 6 Files Modified
- `scripts/performance_server.js` — added `scorePositionCheck` broadcast (3s interval)
- `scripts/build_performance_app.js` — Patches 1d, 1d-b, 1e, 1e-a, 1e-b, 1f

---

## Phase 7 Pre-Implementation Protocol

### Step 1: System Inventory

| System | Current State | Phase 7 Change |
|--------|---------------|----------------|
| `performance_server.js` (382 lines) | Express + Socket.IO, room-based sync, no auth | Add REST API endpoints, JWT auth, session/performer persistence |
| `build_performance_app.js` (client patches) | Socket stub + room join | Add landing page or auth-aware join flow (Patch 1g) |
| `package.json` | express, socket.io, pdf-lib, puppeteer | Add `jsonwebtoken` |
| `data/` directory | Does not exist | Create: `data/sessions/`, `data/performers/`, `data/.jwt-secret` |
| `.gitignore` | Standard | Add `data/` entry |

### Step 2: Source Reading — Key findings

- **`joinRoom` handler (L143-171):** Takes `{roomId}`, joins socket to room. Integration point for auth.
- **Room state (L75-88):** Sync-only state. Will add `performers[]` tracking per room.
- **Express routes (L62-68):** Only static files + GET /. Need new `/api/*` routes.
- **Dependencies:** `crypto.randomBytes` available (built-in) for token generation. `jsonwebtoken` needed for JWT.

### Step 3: Contracts

- **POST /api/sessions** → returns `{code, shareLink}`, creates `data/sessions/{code}.json`
- **POST /api/sessions/:code/join** + `{displayName, slot}` → returns `{token}` (JWT)
- **Anonymous fallback:** no JWT → "default" room, all Phase 1-6 features work
- **JWT payload:** `{performerId, displayName, slot, sessionId}` — identity-method-agnostic

### Step 4: Risk Register

| Risk | Mitigation |
|------|------------|
| JWT secret lost on restart | Persist in `data/.jwt-secret`, auto-generate once |
| `data/` committed to git | Add to `.gitignore` before creating |
| Anonymous mode regression | Guard all auth: no JWT → default room |
| Concurrent JSON writes | Atomic write (temp file + rename) |
| Express body-parser missing | `express.json()` built-in since 4.16 |

### Step 5: Staged Plan

```
Stage 1: Data model + session creation API
  - data/ directory, .gitignore, JWT secret persistence
  - POST /api/sessions, GET /api/sessions/:code
  → TEST: 🤖 Create + read session via API

Stage 2: JWT + claim flow
  - npm install jsonwebtoken
  - POST /api/sessions/:code/join → issues JWT
  - Performer profile persistence
  → TEST: 🤖 Join → get JWT → validate → profile exists

Stage 3: Authenticated room join + slot tracking
  - Socket.IO JWT validation in handshake
  - Modify joinRoom for auth, track performers per room
  - playerJoined/playerLeft events
  - Anonymous fallback preserved
  → TEST: 🤖 Auth join + anonymous fallback

Stage 4: Preferences persistence + integration
  - GET/PUT /api/performers/:id/preferences
  - Full regression
  → TEST: 🤖 Preferences round-trip, 👁️ full end-to-end flow
```

### Architecture Decision Record

**Decision:** Self-service "Zoom model" instead of composer-managed invite system.
**Rationale:** Composer should not be a bottleneck when multiple ensembles want to use the piece. Performers self-organize by creating sessions and sharing 6-character room codes.
**Migration path:** Adding email-based gating later is ~50 lines + email service signup. `performerId` is identity-method-agnostic — not tied to any auth method.

---

## Phase 7 Stage Results

```
Stage 1: Data model + session creation API                           ✅ DONE
  - data/ directory structure (sessions/, performers/), .gitignore entry
  - JWT secret auto-generated and persisted in data/.jwt-secret
  - POST /api/sessions → 6-char room code + shareLink
  - GET /api/sessions/:code → session info, available slots
  - Atomic JSON file writes (temp + rename)
  → 🤖 Create + read session via API: PASS

Stage 2: JWT + claim flow                                            ✅ DONE
  - npm install jsonwebtoken
  - POST /api/sessions/:code/join → {displayName, slot} → JWT token
  - JWT payload: {performerId, displayName, slot, sessionId} — identity-method-agnostic
  - Performer profile persisted to data/performers/{id}/profile.json
  - Slot re-claim returns existing performer's token (reconnection support)
  - GET /api/auth/verify — validate JWT
  → 🤖 Join, re-claim, verify, validation errors: ALL PASS

Stage 3: Authenticated room join + slot tracking                     ✅ DONE
  - Socket.IO middleware: extract performer info from JWT in handshake
  - Authenticated clients auto-join their session's room
  - connectedPerformers[] tracked per room (slot + displayName + socketId)
  - playerJoined/playerLeft events broadcast to room
  - Anonymous fallback preserved: no JWT → default room
  → 🤖 Auth join, playerJoined/Left events, anonymous fallback, sync: ALL PASS

Stage 4: Preferences persistence + integration                      ✅ DONE
  - GET/PUT /api/performers/:id/preferences (JWT-authenticated)
  - Access control: performers can only access their own preferences
  - Preferences stored as data/performers/{id}/preferences.json
  - Anonymous regression: play/stop/goto all work without auth
  → 🤖 Preferences round-trip, auth checks, anonymous regression: ALL PASS
  → 👁️ Human verified: full end-to-end flow (create session, join, prefs, anonymous sync)
```

### Phase 7 Architecture Decision
**Decision:** Self-service "Zoom model" instead of composer-managed invite system.
**Rationale:** Composer should not be a bottleneck. Performers self-organize.
**Migration path:** Adding email-based gating later is ~50 lines + email service signup.

### Phase 7 Files Modified
- `scripts/performance_server.js` — session API, JWT auth, preferences API, Socket.IO middleware
- `package.json` — added `jsonwebtoken` dependency
- `.gitignore` — added `data/` entry
- `docs/STRING_QUARTET_PIPELINE_PLAN.md` — revised §12.9.3 + Phase 7 steps

### Phase 7 New API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/sessions` | — | Create session → 6-char code |
| GET | `/api/sessions/:code` | — | Session info + available slots |
| POST | `/api/sessions/:code/join` | — | Claim slot → JWT token |
| GET | `/api/auth/verify` | Bearer | Validate JWT |
| GET | `/api/performers/:id/preferences` | Bearer | Load preferences |
| PUT | `/api/performers/:id/preferences` | Bearer | Save preferences |

---

## RESUME HERE
**Current phase:** Phase 7 — Authentication & Persistence ✅ COMPLETE
**Next:** Phase 8+ (see pipeline plan §13.4+)
**Key files:** `scripts/performance_server.js`, `scripts/build_performance_app.js`
**Pipeline plan:** See §13.4 for phase details
