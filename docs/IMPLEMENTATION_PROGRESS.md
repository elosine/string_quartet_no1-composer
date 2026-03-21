# Implementation Progress

## Current Status
**Active Phase:** Phase 3 — Parts Mode (Complete, post-mortem in progress)
**Last Session:** Mar 21, 2026
**Next Phase:** Phase 4 (Print Score) — pending user addition before Phase 4

## Phase Status Table
| Phase | Status | Completion Date | Notes |
|-------|--------|----------------|-------|
| 1. Foundation | ✅ Complete | Mar 18 | All rendering verified, 7 patches + 7 strips |
| 2. Animation T1 | ✅ Complete | Mar 19 | Continuous time loop, canvas overlay, subscriber pattern, badge freeze |
| 3. Parts Mode | ✅ Complete | Mar 21 | Full N-section parts view + 4 bug fixes + size constraints |
| 4. Print Score | ⏳ Pending | — | User wants to add something before this phase |
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

## RESUME HERE
**Next step:** User wants to add something before Phase 4. After that discussion, proceed to Phase 4 (Print Score — Puppeteer PDF Capture).
**Files modified in Phase 3:** `scripts/performance_parts_patches.js` (all parts mode code), `scripts/build_performance_app.js` (parts mode injection)
**Diagnostic logging still present** — must be removed before Phase 3 commit (Step G action items).
