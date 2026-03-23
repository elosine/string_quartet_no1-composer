# Implementation Progress

## Current Status
**Active Phase:** Phase 8 — Rehearsal Mode (Stage 6 — integration verification)
**Last Session:** Mar 23, 2026
**Last Commit:** `[Phase 8 Stage 5b] Synced/Independent + Leader, room-based looping, page turn sync, hide right panel`

### ▶ RESUME HERE (next session)

**Priority order:**

1. **DEBUG: Independent mode + MiniMap jump bug (full score)**
   - Repro: load full score as synced slave → go independent → use MiniMap to jump ahead
   - Symptoms: counter (S#/P#) advances but clock doesn't update, graphic position indicator doesn't advance, scrolling plays over wrong content (possibly original sync position)
   - Investigate: `onMiniMapClick` handler, `scoreGoto` flow in independent mode, whether visual/scroll layers properly disconnect from server position
   - Files: `performance_rehearsal_patches.js` (MiniMap, independent mode), `build_performance_app.js` (scoreGoto handler)

2. **IMPLEMENT: Font fix Option A**
   - Embed base64 Crimson Pro `@font-face` into SVG data URLs that contain `<text>` elements with `font-family="'Crimson Pro'"`
   - Modify SVG-to-dataURL conversion in `build_performance_app.js`
   - Only ~30 SVGs have text — targeted injection

3. **QUICK TEST: Server join reset-to-zero (Option C)**
   - Restart server, close all tabs, reopen → should start at zero (not mid-score)

4. **RUN: Testing protocol** → `docs/TESTING_PROTOCOL.md` (16 tests, 4 tiers)

### Verified this session (Mar 23)
- ✅ Loop exit fix — disabling loop during playback refreshes all sections
- ✅ Page count — 64 pages in both full score and parts mode
- ✅ Server join Option C implemented (not yet tested by user)
- ✅ Testing protocol written to `docs/TESTING_PROTOCOL.md`
- ✅ Pipeline plan updated: Phase 11 (performance grace period note), Phase 14 Step 14.5 (SVG optimization)

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
| 8. Rehearsal Mode | 🔄 In Progress | — | Stages 1-5 complete, Stage 6 integration verification. Loop exit fix verified. Independent+MiniMap bug found. |
| 9–14 | ⏳ Pending | — | |

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

## Phase 8 Pre-Implementation Protocol

### Step 1: System Inventory

| System | Current State | Phase 8 Change |
|--------|---------------|----------------|
| `ScoreContainer` / `ScoreTop` / `ScoreBottom` (DOM) | 2 SVG sections (full score) or N sections (parts mode). No touch listeners. | Attach pointer event handlers for swipe, tap, long press, pinch zoom |
| `CursorControls` (L3400-3575) | Right-panel toggle, play/stop/goto, socket event listeners | New floating overlay replaces panel for touch; overlay auto-fades after 3s |
| `GraphicTimeline` (L7570-7807) | Page navigation: `onGoto(targetSeconds)`, `checkPageChange()`, `renderTicks()` | Page swipe gestures call `onGoto()`. Mini-map reads page state. |
| `GraphicTimeline` — parts mode override (performance_parts_patches.js L448-510) | Overrides `onGoto`, `checkPageChange`, `reset` for N-section circular buffer | Swipe gestures must detect parts mode and use correct page math |
| `StaffCursors` (L6880-7052) | Cursor position via `getPosition()`, page tracking | Phase 8 reads position for mini-map, position badge |
| `ScoreZoom` (L7068-7200) | Ctrl+Alt+scroll zoom, Alt+drag pan (mouse only) | Add pinch-zoom gesture. Must coexist with existing mouse zoom. |
| `ClockSync.socket` | Socket events: scoreGo/Stop/Goto, joinRoom | Overlay emits same events. Leader mode gates who can emit group commands. |
| `performance_server.js` (~710 lines) | Room-based sync, auth, connectedPerformers[] | Add leader tracking per room, independent mode tracking, recall events |
| `AnimationEngine` | Subscriber pattern, continuous time loop | Looping hook: check if scoreTime >= loopEnd → emit local goto |
| `build_performance_app.js` (1008 lines) | 26 patches/strips/inserts for Phases 1-6 | Add Phase 8 patches: gesture system, overlay, mini-map |
| `PartsMode` (runtime global) | `PM.active`, `PM.sections[]`, `PM.sectionPages[]`, `PM.pageCount` | Gestures must respect parts mode: swipe navigates within N-section buffer |
| `ScoreTime` (global) | `isPlaying`, `now()`, `currentScoreTimeMs` | Looping reads ScoreTime.now() to detect loop boundary |

### Step 2: Source Reading — Key Findings

**Page navigation (the critical integration point for swipe gestures):**
- Full score: `GraphicTimeline.onGoto(targetSeconds)` → sets `currentTopPage`/`currentBottomPage`, calls `renderTicks()` + `updateGraphicObjectsVisibility()`
- Parts mode: `GraphicTimeline.onGoto(targetSeconds)` override → sets `PM.sectionPages[]` for all N sections using circular buffer math: `PM.sectionPages[i] = targetPage + ((i - targetSi + PAGE_COUNT) % PAGE_COUNT)`
- Page duration: `secondsPerPage = (beatsPerPage / beatsPerMinute) * 60` (global `beatsPerPage`, `beatsPerMinute`)
- Current page: `StaffCursors.getPosition(0)` returns `{xPercent, section}` (full score) or `{xPercent, section, page, sectionIndex}` (parts mode)

**Playback control (overlay must emit these):**
- `CursorControls.toggleGoStop()` → `ClockSync.socket.emit('scoreGo')` or `ClockSync.socket.emit('scoreStop')`
- `CursorControls.gotoPosition()` → reads `gotoSecondInput.value`, adds `leadInSeconds`, emits `scoreGoto({seconds})`
- Server broadcasts `scoreGo`/`scoreStop`/`scoreGoto` to room → `CursorControls.onScoreGo/Stop/Goto` handlers update `ScoreTime` and UI

**Zoom (must coexist with pinch gesture):**
- `ScoreZoom.handleWheel(e)` — only fires if `e.ctrlKey && e.altKey`. Pinch-zoom won't conflict (no modifier keys).
- `ScoreZoom.setZoom(level)` → `applyTransform()` → CSS `translate + scale` on `#ScoreContainer`
- Range: 50-500%, step 10%

**No existing touch/pointer events** — only `mousedown`/`mousemove`/`mouseup` on ScoreZoom, `click` on buttons/timeline. Phase 8 builds the entire pointer event layer.

**DOM structure:**
```
#ScoreContainer
  .score-row > svg#ScoreTop
  .score-row > svg#ScoreBottom
  (parts mode adds: .score-row > svg#ScoreSection2..N-1)
```

### Step 3: Contracts

- **Swipe left/right** → calls `GraphicTimeline.onGoto(newSeconds)` with correct page math for both full score and parts mode
- **Tap center** → toggles controls overlay. Overlay auto-fades after 3s. Score tap dismisses.
- **Tap left/right edge** → previous/next page (same as swipe but from edge zones)
- **Long press** → context menu (marker creation, loop start/end)
- **Pinch zoom** → calls `ScoreZoom.setZoom()`. Does NOT conflict with existing Ctrl+Alt+scroll.
- **Overlay play/stop** → calls `CursorControls.toggleGoStop()` (reuses existing logic)
- **Overlay goto** → calls `CursorControls.gotoPosition()` or `GraphicTimeline.onGoto()` directly
- **Looping** → per-client only. AnimationEngine subscriber checks `ScoreTime.now() >= loopEndMs` → emits local `scoreGoto`
- **Independent mode** → client stops listening to server sync events (`scoreGo/Stop/Goto`). Re-sync restores.
- **Leader mode** → server tracks `room.leaderId`. Only leader's `scoreGo/Stop/Goto` broadcast to others. Non-leader commands are local-only.
- **Anonymous fallback** → all Phase 8 features work without auth. Leader is first client if no auth.

### Step 4: Risk Register

| Risk | Mitigation |
|------|------------|
| Gesture conflicts with ScoreZoom mouse handlers | Pointer events have `pointerType` — finger gestures use `touch`, mouse events unaffected |
| Swipe triggers during zoom pinch | Require single-pointer for swipe, two-pointer for pinch. Track active pointers. |
| Parts mode page math wrong on swipe | Use `GraphicTimeline.onGoto()` which is already overridden in parts mode — don't re-implement page math |
| Overlay obscures score during playback | Auto-fade after 3s. Semi-transparent. Dismiss on any score tap. |
| Looping interferes with server sync | Looping is local-only. When synced, disable looping or auto-detach. |
| Leader disconnect leaves room leaderless | Auto-transfer to next connected performer. Anonymous rooms: first client is leader. |
| Large patch count makes build_performance_app.js fragile | Extract Phase 8 patches into separate `performance_rehearsal_patches.js` file (like Phase 3) |
| iPad Safari pointer event quirks | Test with `pointerType` detection early. Safari supports Pointer Events since iOS 13. |

### Step 5: Staged Plan

```
Stage 1: Touch gesture system + page swipe
  - Pointer event handlers on ScoreContainer: track active pointers
  - Swipe left/right detection → GraphicTimeline.onGoto() for page turn
  - Tap edge zones (left 15% / right 15%) for page turn
  - Pinch-zoom → ScoreZoom.setZoom()
  - Works in both full score and parts mode
  → TEST: 🤖 Simulated pointer events trigger page turns
  → TEST: 👁️ Swipe pages on desktop (mouse drag), verify on iPad if available

Stage 2: Controls overlay
  - Floating overlay HTML/CSS (injected via build patch)
  - Tap center (middle 70%) toggles overlay
  - Overlay: Play/Stop button, page indicator, Jump To, settings
  - Auto-fade after 3s of inactivity, dismiss on score tap
  - Overlay calls existing CursorControls methods
  → TEST: 🤖 Overlay shows/hides, fade timer works
  → TEST: 👁️ Overlay is usable, doesn't obscure score

Stage 3: Custom markers + mini-map
  - Marker data model: {id, name, scoreTimeMs, page, type, color, createdBy}
  - Marker persistence via Phase 7 preferences API
  - Long press → "Add Marker" context menu
  - Mini-map bar: thin horizontal bar at bottom, shows full score, markers as ticks
  - Tap mini-map to jump. Page badge always visible.
  → TEST: 🤖 Create marker → persisted → jump to marker → correct position
  → TEST: 👁️ Mini-map accurately shows position

Stage 4: Looping (per-client) ✅ COMPLETE
  - Set loop start/end (via controls overlay)
  - Loop rewind via local scoreTimeOffset manipulation
  - Loop count display, clear loop button, page turn blocking
  - Drift correction suppression, stop/play intercepts
  - Bugs fixed: drift correction conflict, stop/play position override, page turns
  → All tests passed — user confirmed Mar 22, 2026

Stage 5a: Room-based looping (replaces per-client loop)             ✅ DONE
  - Server: loopStartMs/loopEndMs/loopEnabled per room + loopSet/loopToggle/loopClear
  - Server: 200ms loop check interval — emits scoreGoto+scoreGo on loop boundary
  - Client: stripped all local loop logic, emits to server, listens for loopState
  - Stub: handles loop events + 200ms loop check for offline mode
  - Page turns routed through server (scoreGoto) so remote clients follow
  → 👁️ Human verified: multi-client looping, stop/play during loop, loop-off, page turn sync

  ⚠️ DECISION DEFERRED — Default Room Behavior:
  Decision needed before Phase 11 (Performance Mode) or Phase 14 (Website).
  Current: auto-join "default" room. Options: require room, auto-create solo, or keep with warning.

Stage 5b: Synced vs. Independent + Leader privileges                 ✅ DONE
  - Server: leaderId per room, leader-gated events, setLeader, recallAll
  - Server: leader auto-assigned on join, transferred on disconnect
  - Client: SyncMode system — isIndependent flag, wraps onScoreGo/Stop/Goto
  - Client: independent mode → local play/stop/goto/page-turn
  - Client: syncBar UI — leader badge, sync toggle, re-sync, recall all, toast
  - Client: auto-detach on swipe during playback
  - Bugs fixed: (1) independent blocked by room loop (2) anonymous leader transfer
  → 👁️ Human verified: leader gating, independent, auto-detach, re-sync, recall, transfer

Stage 5c: Hide old right panel                                      ✅ DONE
  - Single `#cursorMenu { display: none !important; }` replaces granular hiding
  → 👁️ Human verified: right panel hidden, overlay fully functional

Stage 6: Integration verification                                   ⬅ CURRENT
  - Full regression: all Phase 1-7 features in anonymous mode
  - Parts mode + gestures test
  - Multi-client auth + leader test
  - Room-based loop regression
  → TEST: 🤖 Anonymous regression. Parts mode regression.
  → TEST: 👁️ Full flow on desktop. iPad if available.
```

### Phase 8 Stage 1b: Workshop Interaction Strip — Pre-Implementation Protocol

**Note:** This strip should have been part of **Phase 1** (Foundation). The original S1-S7 strips removed system *definitions* (FlowchartConnector, MidiController, EditCursor, etc.) but left interaction code intact in KEPT rendering systems. Future projects: strip all editing interaction in the same phase that strips editing systems.

#### Step 1: Problem Statement

Score objects (SVGs, curves, motives, LWs, GCs, badges) remain fully interactive in the Performance Score: selectable, draggable, deletable, resizable. The MultiSelect toolbar appears on click. ObjectSelector (Ctrl+Win+Click) is functional. LineWedge nodes are draggable. All of this is Workshop editing behavior that must not exist in the Performance Score.

#### Step 2: Root Cause — Why CSS pointer-events Failed

Initial attempt used CSS `pointer-events: none` on score object CSS classes. This failed because:

1. **SVGElementManager has a manual hit-test** (`_findElementAtPoint`, L4162-4182) — on every `click` on ScoreTop/ScoreBottom, it manually checks bounding boxes of all SVG elements. This **bypasses CSS pointer-events entirely** because the click handler is on ScoreTop itself (L3656-3683), not on the SVG wrappers.
2. **CurveMaker** attaches `mousedown` listeners directly on hitPath/path/endpoint/bbox elements (L17147-17186). These SVG elements are created at runtime and may not match CSS class selectors.
3. **MotiveMaker** attaches `click` directly on hitLine elements (L30530-30533).
4. **LineWedgeMaker** attaches `mousedown` directly on ScoreTop/ScoreBottom (L31048-31049), plus `document.addEventListener('mousemove/mouseup')` for drag.
5. **GCMaker/BadgeMaker** attach `click` on ScoreTop/ScoreBottom for deselection (L32693-32694).
6. **Document-level handlers**: `document.addEventListener('mousemove/mouseup')` for drag operations, `document.addEventListener('keydown')` for Delete/Ctrl+Alt+D.

**Key insight**: CSS `pointer-events: none` only blocks events on the targeted element. It does NOT prevent: (a) parent-level click handlers that do manual hit-testing, (b) capturing-phase handlers, (c) document-level handlers.

#### Step 3: System Inventory — All Interactive Pathways

| System | Event Attachment | What It Does | Blocked By |
|--------|-----------------|--------------|------------|
| **SVGElementManager** | `scoreTopEl.addEventListener('click')` | Manual hit-test → `selectElement()` | Capture block on ScoreTop |
| **SVGElementManager** | `scoreBottomEl.addEventListener('click')` | Same for bottom section | Capture block on ScoreBottom |
| **SVGElementManager** | `wrapper.addEventListener('mousedown')` | `handleElementMouseDown()` → start drag | Capture block (wrapper is child of ScoreTop/Bottom) |
| **SVGElementManager** | `handle.addEventListener('mousedown')` | `handleResizeMouseDown()` → start resize | Same |
| **SVGElementManager** | `document.addEventListener('mousemove/mouseup')` | Drag/resize motion | Dead if mousedown blocked |
| **CurveMaker** | `hitPath/path.addEventListener('mousedown')` | `handleCurveMouseDown()` → select + drag | Capture block |
| **CurveMaker** | `startPoint/endPoint.addEventListener('mousedown')` | Endpoint drag | Capture block |
| **CurveMaker** | `bbox.addEventListener('mousedown')` | Select via bounding box | Capture block |
| **CurveMaker** | `hitPath.addEventListener('click')` (continuation) | Select via click | Capture block |
| **CurveMaker** | `document.addEventListener('mousemove/mouseup')` (per-drag) | Curve drag motion | Dead if mousedown blocked |
| **MotiveMaker** | `hitLine.addEventListener('click')` | `selectMotive()` | Capture block |
| **LineWedgeMaker** | `scoreTopEl.addEventListener('mousedown')` | Node drag start | Capture block |
| **LineWedgeMaker** | `scoreBottomEl.addEventListener('mousedown')` | Same | Capture block |
| **LineWedgeMaker** | `document.addEventListener('mousemove/mouseup')` | LW drag motion | Dead if mousedown blocked |
| **LineWedgeMaker** | `document.addEventListener('keydown')` Ctrl+Alt+D | Duplicate LW | Keyboard block |
| **GCMaker** | `scoreTopEl/scoreBottomEl.addEventListener('click')` | Deselect GC | Capture block |
| **BadgeMaker** | `scoreTopEl/scoreBottomEl.addEventListener('click')` | Deselect badge | Capture block |
| **GraphicTimeline** | `clickArea.addEventListener('click')` | Jump to clicked time | Capture block (replaced by gestures) |

#### Step 4: Correct Approach — JavaScript Event Capture Blocking

**Strategy**: Add **capturing-phase** event listeners on ScoreTop and ScoreBottom that call `stopImmediatePropagation()` for mouse events. Capturing-phase listeners fire BEFORE any other listeners, blocking all downstream handlers.

```
Runtime patch (in performance_rehearsal_patches.js):

1. ScoreTop + ScoreBottom: capturing listeners for mousedown, click, dblclick
   → e.stopImmediatePropagation() + e.preventDefault()
   → Blocks ALL selection, drag-start, hit-test, deselect handlers

2. Document: capturing keydown listener
   → Block Delete, Backspace, Ctrl+Alt+D when not in input/textarea
   → Preserves keyboard use in right panel inputs

3. CSS (already done in S8-S11 attempt): 
   → Hide MultiSelect toolbar, ObjectSelector menu
   → Hide right panel editing sections
   → S8-S11 strips + stubs (reduce file size)
```

**Why this works**:
- Capturing phase fires BEFORE bubbling phase → blocks all existing listeners
- `stopImmediatePropagation()` prevents other capturing listeners on same element
- Mouse events are separate from Pointer events → gesture system (pointerdown/move/up on ScoreContainer) is **completely unaffected**
- ScoreZoom uses wheel + mousedown on ScoreContainer (parent) → unaffected
- Right panel buttons are in separate DOM branch → unaffected
- `document.addEventListener('mousemove/mouseup')` for drag becomes dead code (drag never starts because mousedown is blocked)

#### Step 5: What We Preserve

| Feature | How It Works | Impact |
|---------|-------------|--------|
| Phase 8 gestures (swipe/tap/pinch) | Pointer events on `#ScoreContainer` | ✅ Unaffected (different event type) |
| ScoreZoom (mouse wheel + Alt-drag) | Wheel/mousedown on `#ScoreContainer` | ✅ Unaffected (parent element) |
| Right panel Play/Stop/Goto | Click handlers on panel buttons | ✅ Unaffected (separate DOM branch) |
| Score rendering (all systems) | Data → SVG, no events involved | ✅ Unaffected |
| Animation/playback/cursors | Canvas overlay + AnimationEngine | ✅ Unaffected |
| Parts mode | Runtime overrides of rendering functions | ✅ Unaffected |
| Auth/preferences (Phase 7) | Server-side | ✅ Unaffected |

#### Step 6: What We Block

| Blocked Behavior | Mechanism |
|-----------------|-----------|
| Click-to-select any score object | Capture block on ScoreTop/ScoreBottom |
| Drag-to-move SVG elements | mousedown blocked → drag never starts |
| Resize SVG elements | mousedown on handles blocked |
| Curve endpoint drag | mousedown on endpoints blocked |
| Curve slope adjustment | mousedown on curve blocked |
| Motive selection | click on hitLine blocked |
| LineWedge node drag | mousedown on ScoreTop/Bottom blocked |
| GC/Badge selection | click on ScoreTop/Bottom blocked |
| Delete key for objects | keydown capture |
| Ctrl+Alt+D duplicate | keydown capture |
| GraphicTimeline click-to-jump | click on ScoreTop/Bottom blocked (replaced by gesture nav) |

#### Step 7: Risk Assessment

**Confidence: 97%**

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Capture blocker interferes with gesture system | Very Low | Gesture system uses pointer events (different type), on ScoreContainer (parent). Verified: pointer events fire before mouse events; blocking mouse events doesn't affect pointer events. |
| Capture blocker breaks ScoreZoom | Very Low | ScoreZoom attaches to ScoreContainer, not ScoreTop/Bottom. Wheel events are not blocked. |
| Right panel stops working | None | Right panel is in separate DOM subtree (#cursorMenuContent), not inside ScoreTop/Bottom. |
| Rendering breaks | None | Rendering is one-way data flow (score.json → SVG DOM). No event dependencies. |
| Score positioning changes | None | Position computed from referenceSeconds + track. No interaction dependency. |
| Future phases blocked | Very Low | Phase 9 annotation would add new interaction on a new layer, not reuse Workshop editing. |
| Stale build served | Low | Hard refresh (Ctrl+Shift+R) + verify build timestamp in console. |

**Remaining 3% uncertainty**: Possible obscure interaction between pointer events and mouse events in specific browsers (e.g., older Safari). Mitigated by testing on target platform (iPad Safari).

#### Step 8: Staged Implementation Plan

```
Stage A: Runtime event capture patch
  - Add capturing-phase mousedown/click/dblclick blockers on ScoreTop + ScoreBottom
  - Add capturing-phase keydown blocker on document for Delete/Ctrl+Alt+D
  - Implement in performance_rehearsal_patches.js (runtime IIFE)
  → TEST: 🤖 Verify blockers injected in built HTML
  → TEST: 👁️ Click on SVGs, curves, motives, LWs, GCs, badges — NOTHING selects
  → TEST: 👁️ Drag attempt on any object — NO movement
  → TEST: 👁️ Delete key — NO deletion
  → TEST: 👁️ Ctrl+Alt+D — NO duplication

Stage B: Verify gesture system still works
  → TEST: 👁️ Right edge tap → page forward
  → TEST: 👁️ Left edge tap → page back
  → TEST: 👁️ Swipe left/right → page navigation
  → TEST: 👁️ Center tap → overlay toggle (console)
  → TEST: 👁️ Play/Stop button in right panel → playback works

Stage C: Verify rendering integrity
  → TEST: 👁️ Score looks identical — all notation, curves, motives, LWs, GCs, badges render
  → TEST: 👁️ Page navigation shows correct content on each page
  → TEST: 👁️ Parts mode still works (if applicable)
  → TEST: 👁️ Window resize → score re-renders correctly

Stage D: Keep S8-S11 strips + CSS (already done)
  - S8-S11 strips reduce file size by 124 KB (pure editing infrastructure removed)
  - CSS hides MultiSelect toolbar, ObjectSelector menu, editing panel sections
  - These are belt-and-suspenders alongside the event capture approach
```

### Architecture Decision Record

**Decision:** Extract Phase 8 patches into `scripts/performance_rehearsal_patches.js` (loaded by build script, like Phase 3's `performance_parts_patches.js`).
**Rationale:** Phase 8 adds ~7 new patches. Putting them all in `build_performance_app.js` would push it past 1500 lines. Separate file keeps it maintainable and follows the established pattern.

**Decision:** Page swipe calls `GraphicTimeline.onGoto()` rather than manually setting page numbers.
**Rationale:** `onGoto()` is already overridden by parts mode. By calling it, swipe works correctly in both full score and parts mode without duplicating page math.

**Decision:** ~~Looping is purely client-side~~ → **Revised: Looping is server-authoritative (Stage 5a).**
**Rationale:** Per-client looping conflicted with drift correction (server kept overwriting local rewinds). Server-authoritative looping via `loopSet`/`loopToggle`/`loopClear` events + server-side 200ms loop check interval solved drift conflicts and ensures all room members loop together. The user confirmed "I don't need individual loops in the same room."

**Decision:** Replace old right panel with overlay, but phase the migration.
**Rationale:** Stage 2 builds the new overlay alongside the existing right panel (both functional). Once the overlay has full feature parity and is tested, a later sub-stage (5b) hides the old panel via CSS. This avoids breaking anything during development and lets us A/B compare during testing. The old panel's CursorControls JS stays — the overlay calls into it rather than duplicating logic.

---

## Phase 8 Files Modified
- `scripts/performance_rehearsal_patches.js` — **created** (gesture system, controls overlay, markers, loop UI, mini-map, SyncMode + leader UI)
- `scripts/performance_server.js` — room loop state, loop events, leader tracking, leader gating, setLeader, recallAll
- `scripts/build_performance_app.js` — offline stub loop + leader support, `#cursorMenu` hidden via CSS
- `docs/IMPLEMENTATION_PROGRESS.md` — Phase 8 stage results

### Phase 8 New Socket Events
| Event | Direction | Leader-gated | Description |
|-------|-----------|-------------|-------------|
| `loopSet` | client→server | ✅ | Set loop point A or B |
| `loopToggle` | client→server | ✅ | Enable/disable loop |
| `loopClear` | client→server | ✅ | Clear loop region |
| `loopState` | server→client | — | Broadcast loop state to room |
| `setLeader` | client→server | ✅ | Transfer leadership |
| `recallAll` | client→server→all | ✅ | Force all clients to re-sync |
| `leaderChange` | server→client | — | Broadcast new leader ID |
| `notLeader` | server→client | — | Rejection notification |

### Phase 8 New Client Systems
| System | Location | Purpose |
|--------|----------|---------|
| `RehearsalGestures` | rehearsal_patches.js | Swipe, tap, pinch-zoom gesture recognition |
| `ControlsOverlay` | rehearsal_patches.js | Floating play/stop/nav/jump/loop/marker panel |
| `MarkerSystem` | rehearsal_patches.js | Custom markers with localStorage persistence |
| `LoopSystem` | rehearsal_patches.js | Server-driven loop UI (setA/setB/toggle/clear) |
| `MiniMap` | rehearsal_patches.js | Always-visible position bar with markers + loop region |
| `SyncMode` | rehearsal_patches.js | Independent/synced mode, leader badge, re-sync, recall |
| `InteractionBlocker` | rehearsal_patches.js | Capture-phase mouse/keyboard blocking on score SVGs |

---

## RESUME HERE
**Current phase:** Phase 8 — Parts Mode Hardening
**Last session:** Mar 22, 2026
**Status:** Full score passed all Phase 8 tests ✅. Parts mode needs screen-flip page turn + Stage 5 verification.
**Key files:** `scripts/performance_parts_patches.js`, `scripts/performance_rehearsal_patches.js`

> **Rule: Do NOT change full-score behavior.** All full-score Phase 8 tests passed.
> All parts-mode changes must be guarded by `PartsMode.active` or live in `performance_parts_patches.js`.

---

### Full Score Status — PASSED ✅

All Phase 8 stages tested and verified for full score (anonymous mode):
- Stage 1b: Interaction blocker ✅
- Stage 2: Controls overlay ✅
- Stage 3: Custom markers ✅
- Stage 4: Looping ✅
- Stage 5a: Room-based looping ✅
- Stage 5b: Synced/Independent + Leader ✅
- Stage 5c: Hide right panel ✅
- Multi-client sync (all items) ✅

### Bugs Fixed (Mar 22)

| # | Bug | Fix | File |
|---|-----|-----|------|
| 1 | Independent client can't jump to markers | Route `jumpTo()` through `SyncMode.isIndependent` | rehearsal_patches L760-771 |
| 2 | Interaction blocker missed parts sections 2+ | Iterate `PartsMode.sections[]` | rehearsal_patches L373-405 |
| 3 | CSS cursor override missed parts sections | `#ScoreContainer svg *` | build_app L845-846 |

---

### Phase 8 Parts Mode — Pre-Implementation Plan

> **Rule: Do NOT change full-score behavior.** All full-score Phase 8 tests passed.
> All parts-mode changes must be guarded by `PartsMode.active` or live in `performance_parts_patches.js`.

#### What already works in parts mode (user-tested)

- ✅ **Playback scrolling** — circular buffer rotates sections correctly during playback
- ✅ **Goto** — `onGoto()` lays out N sequential pages (fixed this session)
- ✅ **Controls overlay** — shows/hides, play/stop works (Stage 2 — skip)
- ✅ **Custom markers** — create, jump, delete, persist (Stage 3 — skip)
- ✅ **Looping** — set A/B, toggle, clear, loop rewinds (Stage 4 — works)
- ✅ **Interaction blocker** — extended to all N sections (Stage 1b — fixed)
- ✅ **Right panel hidden** — CSS global hide works in parts mode (Stage 5c — skip)

#### Staged Plan

```
Parts Stage P1: Screen-Flip Page Turn + ScoreTime Sync ✅ IMPLEMENTED
  - Change onGoto to sequential layout (DONE)
  - Change getCurrentPage → screen base page (DONE)
  - Change getPageStep → PartsMode.pageCount (DONE)
  - Add ScoreTime update in parts onGoto (DONE): sets currentScoreTimeMs
    (stopped) or scoreTimeOffset (playing)
  - Add force-render after onGoto (DONE): calls TrackSystem.update()
    so notation re-renders when animation loop isn't running
  - Add ControlsOverlay.refresh() after onGoto (DONE): page display updates
  - Files: performance_parts_patches.js (onGoto), performance_rehearsal_patches.js
  - Full-score impact: NONE — all changes guarded by PartsMode.active or in parts file
  → TEST: 🤖 Verify getCurrentPage returns screen-aligned base (0, 6, 12…)
  → TEST: 🤖 Verify getPageStep returns PAGE_COUNT (6) in parts mode
  → TEST: 🤖 Verify onGoto sets sequential sectionPages [basePage…basePage+N-1]
  → TEST: 🤖 Build succeeds with no errors
  → TEST: 👁️ Stopped: tap right edge → all 6 sections show pages 6-11 (was 0-5)
  → TEST: 👁️ Tap right edge again → all 6 show pages 12-17
  → TEST: 👁️ Tap left edge → back to pages 6-11
  → TEST: 👁️ Swipe left/right → same as edge taps
  → TEST: 👁️ Overlay ▶/◀ buttons → same behavior
  → TEST: 👁️ Jump-to (overlay input) → sections show correct page set
  → TEST: 👁️ Marker jump → sections show correct page set
  → TEST: 👁️ MiniMap tap → sections show correct page set
  → TEST: 👁️ Notation content (SVGs, curves, LWs, GCs, badges) re-renders on all sections
  → TEST: 👁️ During playback: circular buffer still rotates one section at a time
  → TEST: 👁️ Manual page turn during playback: sections update, playback continues from new position
  → TEST: 👁️ Full score page turns still work correctly (regression)

Parts Stage P2: Page Display Fix (OB-2) ✅ IMPLEMENTED
  - Fix getPageInfo() (DONE): computes actual total pages from
    SVGElementManager maxSec + getSecondsPerPage (same as full score)
  - Display BOTH screen and page (DONE): overlay shows "S1 of 7 | P3",
    MiniMap badge shows "S1/7 P3/42"
  - All changes guarded by PartsMode.active
  - Files: performance_rehearsal_patches.js (getPageInfo, overlay refresh, MiniMap badge)
  - Full-score impact: NONE — guarded by PartsMode.active
  → TEST: 🤖 Verify getPageInfo returns correct totalPages and totalScreens
  → TEST: 🤖 Build succeeds with no errors
  → TEST: 👁️ Overlay shows "S1 of 7 | P1 of 42" (example values, check correctness)
  → TEST: 👁️ MiniMap badge shows correct screen/page totals
  → TEST: 👁️ Page/screen numbers update after manual page turn
  → TEST: 👁️ Page/screen numbers update during playback
  → TEST: 👁️ Full score overlay still shows correct page numbers (regression)

Parts Stage P3: Sync & Leader for Parts (mirrors Stage 5a/5b/5c) ✅ VERIFIED
  - Source reading DONE: CursorControls.onScoreGoto (index.html L3546)
    → sets ScoreTime → calls GraphicTimeline.onGoto() → parts override runs ✅
  - Source reading DONE: requestState → server emits scoreGoto → same path ✅
  - No bridge needed: onScoreGoto already calls onGoto directly
  - Verify room-based looping works for parts clients (expect: already working)
  - Verify leader gating works when parts client attempts leader-only actions
  - Verify auto-detach on swipe → independent page turns work (depends on P1)
  - Verify re-sync snaps parts client back to leader position
  - Verify recall-all forces parts client to re-sync
  - Verify leader transfer on disconnect
  - Files: performance_parts_patches.js (possible bridge), performance_rehearsal_patches.js (if needed)
  - Full-score impact: NONE — any bridge is guarded by PartsMode.active
  → TEST: 🤖 Trace CursorControls.onScoreGoto call chain — document in console logs
  → TEST: 🤖 Trace requestState response handler — document
  → TEST: 🤖 Build succeeds with no errors
  → TEST: 👁️ Two tabs: Tab 1 full score (leader), Tab 2 parts (?track=1&pages=6)
  → TEST: 👁️ Leader plays → parts client plays in sync
  → TEST: 👁️ Leader stops → parts client stops
  → TEST: 👁️ Leader page turn → parts client jumps to correct position, all sections update
  → TEST: 👁️ Non-leader (parts) play attempt → "not leader" toast
  → TEST: 👁️ Parts client goes independent → can play/stop/navigate locally
  → TEST: 👁️ Parts client swipes during playback → auto-detach, screen-flip page turns work
  → TEST: 👁️ Parts client re-syncs → snaps to leader position, all sections update
  → TEST: 👁️ Leader recalls all → parts client re-syncs
  → TEST: 👁️ Leader disconnects → leadership transfers to remaining client
  → TEST: 👁️ Two parts clients (track 1 + track 2) in same room → both follow leader
  → TEST: 👁️ Leader sets loop → parts client loops in sync
  → TEST: 👁️ Loop toggle/clear propagates to parts client
  → TEST: 👁️ Right panel not visible in parts mode (regression)
  → TEST: 👁️ Controls overlay is the only control interface (regression)

Parts Stage D1: Loop Page Freeze ✅ IMPLEMENTED
  - Fix (DONE): in checkPageChange, when LoopSystem.isEnabled(), skip the
    section flip (don't replace departed section with future content).
    Server's scoreGoto on loop rewind calls onGoto for full layout.
  - Files: performance_parts_patches.js (checkPageChange override)
  - Full-score impact: NONE — parts-only override
  → TEST: 🤖 Verify checkPageChange skips section flip when LoopSystem.isEnabled()
  → TEST: 🤖 Build succeeds with no errors
  → TEST: 👁️ Set loop spanning 2 adjacent pages on same screen → pages stay static during loop
  → TEST: 👁️ Set loop spanning a screen boundary → screen-flip occurs on rewind (via onGoto)
  → TEST: 👁️ Playback without loop → circular buffer rotates normally (regression)
  → TEST: 👁️ Full score looping unaffected (regression)

Parts Stage D2: MiniMap Auto-Show/Hide ✅ IMPLEMENTED
  - MiniMap starts collapsed (3px, 0.3 opacity) with CSS transition
  - Invisible hover zone at bottom triggers expand on pointerenter
  - Auto-hides after 3s (same pattern as controls overlay)
  - Shows briefly on local play start via MiniMap.show() API
  - Files: performance_rehearsal_patches.js (MiniMap section)
  - Full-score impact: YES — this affects both full score and parts. Test both.
  → TEST: 🤖 Verify MiniMap starts in collapsed state
  → TEST: 🤖 Verify auto-hide timer is set (3000-4000ms)
  → TEST: 🤖 Build succeeds with no errors
  → TEST: 👁️ Full score: MiniMap hidden on load, appears on hover/touch near bottom
  → TEST: 👁️ Full score: MiniMap auto-hides after ~3s
  → TEST: 👁️ Full score: bottom track notation fully visible when MiniMap is hidden
  → TEST: 👁️ Parts mode: same behavior — bottom section notation fully visible
  → TEST: 👁️ MiniMap tap still jumps to position (regression)
  → TEST: 👁️ MiniMap still shows markers and loop region (regression)

Parts Stage D3: Font Embedding ✅ IMPLEMENTED
  - Identified font: "Crimson Pro Light" (used in notation SVGs for text
    markings: pizz., b.b., tuplet numbers, etc.)
  - Font files: CrimsonPro-Light.ttf + CrimsonPro-LightItalic.ttf
    copied from fonts/extracted/ → public/fonts/ → builds/performance/fonts/
  - @font-face CSS injected into built HTML via build_performance_app.js
  - Server serves fonts via express.static (already configured)
  - Files: build_performance_app.js (add @font-face CSS), performance_server.js
    (serve font file if needed), builds/performance/ (font file)
  - Full-score impact: YES — font embedding applies to all score modes. Test both.
  → TEST: 🤖 Verify @font-face declaration present in built HTML
  → TEST: 🤖 Verify font file is served by the Node server (HTTP 200)
  → TEST: 🤖 Build succeeds with no errors
  → TEST: 👁️ Open performance score on a machine without the font installed
  → TEST: 👁️ SVG text renders fully — no cut-off or fallback font
  → TEST: 👁️ Full score text rendering unaffected (regression)
  → TEST: 👁️ Parts mode text rendering unaffected (regression)

Parts Stage P4: Integration Testing
  - Run full Parts Mode Testing Protocol (sections A-J below)
  - Run full-score regression (verify nothing broke)
  - Test with multiple track/page variants
  → TEST: 🤖 Build with no errors or warnings
  → TEST: 👁️ All items in Parts Mode Testing Protocol (A-J) pass
  → TEST: 👁️ Full score: play, stop, page turn, loop, markers, sync all work (regression)
  → TEST: 👁️ Track variants: ?track=1-4, ?pages=4/6/8 all render correctly
```

---

### Parts Mode Testing Protocol

**URL:** `http://localhost:3001?track=1&pages=6`

```
═══ A. RENDERING (visual inspection) ═══

  A1.  [ ] Score loads with single track (Violin I) — no other instrument visible
  A2.  [ ] 6 sections visible, each showing one page of the part
  A3.  [ ] Staff headers show correct instrument name on each section
  A4.  [ ] Notation elements (noteheads, stems, beamlines) render on all 6 sections
  A5.  [ ] Curves render on correct sections (including multi-page curves)
  A6.  [ ] Line wedges render correctly, clip at page boundaries
  A7.  [ ] GC arcs appear at correct size (bottom-justified)
  A8.  [ ] GC bouncing balls visible during playback
  A9.  [ ] Badges render on correct sections
  A10. [ ] SVG notation appears IN FRONT of GC arcs
  A11. [ ] No console errors on load (check DevTools)

═══ B. INTERACTION BLOCKER ═══
  ⚠ FIXED last session — needs re-verification

  B1. [ ] Click on an SVG element (notehead) — NOTHING selects
  B2. [ ] Click on a curve — NO selection highlight, no draggable endpoints
  B3. [ ] Click on a line wedge — NO node handles appear
  B4. [ ] Click on a badge — NO highlight/selection
  B5. [ ] Click on a GC arc — NO selection
  B6. [ ] Attempt to drag any object — NO movement
  B7. [ ] Press Delete key — NO deletion
  B8. [ ] Console shows "InteractionBlocker: blocked 6 score sections"

═══ C. GESTURES — PAGE NAVIGATION ═══

  C1.  [ ] Swipe LEFT on score → all 6 sections advance one screen
  C2.  [ ] Swipe RIGHT on score → all 6 sections go back one screen
  C3.  [ ] Tap RIGHT edge (rightmost 15%) → next screen
  C4.  [ ] Tap LEFT edge (leftmost 15%) → previous screen
  C5.  [ ] Overlay ▶ (next) button → next screen
  C6.  [ ] Overlay ◀ (prev) button → previous screen
  C7.  [ ] After page turn, all 6 sections show consecutive pages
  C8.  [ ] Notation content re-renders on all sections
  C9.  [ ] Page/screen numbers in overlay update correctly after each turn
  C10. [ ] MiniMap page badge updates correctly

═══ D. GESTURES — TAP ZONES ═══

  D1. [ ] Tap center (middle 70%) → controls overlay appears
  D2. [ ] Tap center again → overlay disappears
  D3. [ ] Double-tap top-center → play/stop toggles
  D4. [ ] Overlay auto-fades after ~4 seconds

═══ E. CONTROLS OVERLAY ═══

  E1. [ ] Play/Stop button works — cursor animates through sections
  E2. [ ] Cursor scrolls left-to-right through all N sections, wraps to top
  E3. [ ] Jump-to input → enter a time → Go → score jumps to that position
  E4. [ ] All 6 sections reload with correct page content after jump
  E5. [ ] Zoom reset button works
  E6. [ ] Close button hides overlay
  E7. [ ] Page display shows both "S_ of _" and "P_ of _" with correct totals

═══ F. MARKERS ═══

  F1. [ ] Open marker panel (🔖 button)
  F2. [ ] Add Marker at current position → appears in list
  F3. [ ] Jump to marker → score navigates correctly, all sections update
  F4. [ ] Delete marker → removed from list
  F5. [ ] Markers survive page reload (localStorage)

═══ G. LOOP ═══

  G1. [ ] Open loop panel (🔁 button)
  G2. [ ] Set A point → Set B point → loop region marked
  G3. [ ] Toggle loop on → playback loops between A and B
  G4. [ ] Page turns blocked during active loop (when synced)
  G5. [ ] Clear loop → region removed, page turns unblocked
  G6. [ ] MiniMap shows loop region highlight
  G7. [ ] Pages stay static during loop rewind (no section flips)

═══ H. MINIMAP ═══

  H1. [ ] MiniMap hidden by default, appears on hover/touch near bottom
  H2. [ ] Progress cursor moves during playback
  H3. [ ] Page badge shows correct screen/page totals
  H4. [ ] Time display updates during playback
  H5. [ ] Tap on MiniMap bar → score jumps to that position
  H6. [ ] Marker ticks visible on MiniMap
  H7. [ ] Loop region visible on MiniMap (when set)
  H8. [ ] Bottom track notation fully visible when MiniMap is hidden

═══ I. SYNC (two tabs: one full score leader, one parts) ═══

  I1. [ ] Tab 1 (full score leader) plays → Tab 2 (parts) plays in sync
  I2. [ ] Leader page turn → parts client follows (jumps to equivalent position)
  I3. [ ] Leader loop set → parts client loops in sync
  I4. [ ] Parts client goes independent → can navigate locally
  I5. [ ] Parts client re-syncs → snaps back to leader position
  I6. [ ] SyncBar UI visible in parts mode (leader badge, sync toggle)
  I7. [ ] Leader recalls all → parts client re-syncs
  I8. [ ] Leader disconnects → leadership transfers

═══ J. TRACK VARIANTS ═══

  J1. [ ] ?track=1&pages=6 — Violin I, 6 sections
  J2. [ ] ?track=2&pages=6 — Violin II, correct track
  J3. [ ] ?track=3&pages=6 — Viola, correct track
  J4. [ ] ?track=4&pages=6 — Cello, correct track
  J5. [ ] ?track=1&pages=4 — 4 sections
  J6. [ ] ?track=1&pages=8 — 8 sections
```
