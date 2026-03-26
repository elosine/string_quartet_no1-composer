# Implementation Progress

## Current Status
**Active Phase:** Phase 14 complete. Next: Phase 15 (Composition & Performance Notes) or Phase 16 (Cleanup & Archive)
**Last Session:** Mar 26, 2026
**Last Commit:** `YouTube demo link + sync bar: hide solo, auto-fade in rooms`
**Production:** Live at `justinwenloyang.com` — Hetzner VPS with git sparse clone + PM2

### ▶ RESUME HERE (next session)

**Phase 14 complete.** See "Phase 14 Post-Mortem" section at end of this file for full details.

**Deferred (nice-to-have, not blocking):**
- Step 14.3: Admin panel (composer dashboard) — manage ensembles, invite links, status
- Step 14.6: Performance capture/logging — session analytics
- Multi-piece portfolio page at justinwenloyang.com (when second piece exists)

**Possible next tasks:**
- Phase 15: Composition & Performance Notes (program notes, composer commentary)
- Phase 16: Cleanup, Document & Archive (git management, pipeline docs, new piece template)

**Phase 13 delivered (Sync+Animation Tier 3):**
- Latency-compensated starts — `scheduledStartTime` in scoreGo, clients delay to synchronized moment
- Server heartbeat (500ms) + client watchdog (3s timeout) for lost-connection detection
- NTP-style offset calculation — best-quartile RTT selection, weighted averaging
- Speed control — local playback speed scaling (0.5x–2.0x) with anchored formula

**Speed control details (Step 8.8 / Phase 13 enhancement):**
- SpeedControl IIFE in `performance_rehearsal_patches.js` — overrides `ScoreTime.now()`
- Anchored formula: `speedTime = (origNow - refOrig) * speed + refScore`
- Fast path: zero overhead when speed never changed (`_everUsedSpeed`)
- `_hasOffset` flag derived from state at each play-start — tracks client divergence from server
- Stop wrapper saves speed-adjusted position; goto wrapper clears stale speed state
- Drift correction guard skips when `speed !== 1.0 || hasOffset`
- Speed button in ControlsOverlay with fade timer reset

**Speed control bugs fixed (4 iterations):**
1. Overlay fade timer hiding before user finishes cycling speeds → added `resetFadeTimer()` to speed button handler
2. Drift correction firing after returning to 1x from non-1x → added `SpeedControl.hasOffset` check to drift guard
3. `_hasOffset` cleared unconditionally at play-start (even when speed was 2x) → only clear when `_speed === 1.0`
4. After goto, stale `_speedStopPos` overrode goto position → goto wrapper clears `_speedStopPos` and `_hasOffset`
5. After goto at non-1x, `_hasOffset` not re-established → derive `_hasOffset = (_speed !== 1.0)` at every play-start

**Key lesson:** `_hasOffset` must be **derived from current state** at each play-start transition, not preserved across events. Events (goto, stop, speed change) can clear/set it independently, leading to stale values. Deriving it eliminates the entire class of synchronization bugs.

**Phase 12 delivered (Part View Enhancements):**
- `?goto=SECONDS` URL param, swipe-up Part↔Full toggle, track/pages/view buttons, gesture reference

**Phase 11 delivered (Performance Mode):**
- 8 stages: auto-stop, lockdown, readiness, countdown, emergency, tab recovery, wake lock, ceremony

**Phase 10 delivered (Sync & Animation — Tier 2):**
- MonotonicScoreClock, adaptive ping, sync quality UI, offline banner

**Priority for next session:**
1. Read `WORKING_PRINCIPLES.md` and this RESUME section
2. Proceed with Phase 14 = Website & Production

**Deferred items (not blocking):**
- SVG font fix: Option B (text-to-paths via opentype.js) recommended. See Font Analysis section below.
- Parts mode A/B server bug: only shows first 2 screens (low priority)
- Marker server persistence: upgrade from localStorage when client auth flow is wired

### Annotation Persistence — Future Options

Currently annotations persist via **localStorage** (auto-save) + **JSON export/import** (file download/upload). Two future upgrade paths are documented here for when the need arises:

**Option 2: Server-Side Storage (per-performer)**
- When a performer joins a room (authenticated via `socket.performer`), save/load annotations through the WebSocket connection
- Server writes to a JSON file per performer per score (e.g., `annotations/track1_violinI.json`)
- Annotations sync when the performer reconnects from any device
- Leverages existing room/auth infrastructure in `performance_server.js`
- Moderate complexity — requires new socket events (`saveAnnotations`, `loadAnnotations`) and server-side file I/O

**Option 3: Shared Annotations (conductor → performers)**
- Same as Option 2, but with broadcast mechanism
- Conductor can push annotations to all performers (e.g., "everyone add a ritardando at bar 47")
- Each performer has both a **private layer** (their own markings) and a **shared layer** (from conductor)
- Requires UI for layer visibility toggling and a permission model (who can broadcast)
- Most complex — needs layer architecture, broadcast events, and conflict resolution

### Verified this session (Mar 23)
- ✅ Swipe-down gesture working (30px threshold, 1.5× direction ratio)
- ✅ Marker records correct cursor position during playback
- ✅ Leader badge visible on offline stub and real server
- ✅ Leader transfer working between two anonymous tabs (port 3000)
- ✅ Full post-mortem protocol completed (Steps A-G)
- ✅ WORKING_PRINCIPLES.md updated with 5 new Multi-Client & Socket principles

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
| 8. Rehearsal Mode | ✅ Complete | Mar 23 | 7 systems, 12 bugs fixed, swipe-down markers, leader transfer, room-based looping |
| 9. Annotations | ✅ Complete | Mar 23 | Pen + stamp system, localStorage + JSON export/import, page visibility hooks |
| 10. Sync+Anim T2 | ✅ Complete | Mar 24 | MonotonicScoreClock, adaptive ping, sync quality UI, offline banner |
| 11. Performance Mode | ✅ Complete | Mar 24 | Auto-stop, lockdown, readiness, countdown, emergency, tab recovery, wake lock, ceremony |
| 12. Part View Enhancements | ✅ Complete | Mar 25 | goto param, swipe-up toggle, track/pages/view buttons, gesture reference |
| 13. Sync+Anim T3 | ✅ Complete | Mar 25 | Latency-compensated starts, heartbeat/watchdog, NTP offset, speed control (0.5x–2.0x) |
| 14. Website & Production | ⏳ Pending | — | |

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
| — | 8 | Parts mode shows only first 2 screens on A/B server | Medium | Open, unrelated to Phase 8 |
| — | 8 | `roomMembers` broadcasts socket IDs to all clients (privacy concern for production) | Low | Acceptable for dev; restrict before Phase 14 |
| — | 8 | Markers use localStorage (not server prefs) | Low | Upgrade when client auth flow is wired |

## Decisions Log
| Date | Phase | Decision | Rationale |
|------|-------|----------|-----------|
| Mar 19 | 3 | Merged Phase 3 + Phase 12 into single implementation | Parts mode required N-section layout to be useful; filtering alone (original Phase 3) was incomplete without the expanded view |
| Mar 21 | 3 | MAX_ELEMENT_PAGES = 5 (not 6) | 6-page equivalent was the max acceptable size, but 5-page gives slightly larger elements while still being constrained — user preferred this |
| Mar 21 | 3 | GCs bottom-justified (not centered) | User feedback: impact point should be at track bottom for visual consistency |
| Mar 21 | 3 | SVG z-order via DOM re-append (not CSS z-index) | SVG elements inside an SVG don't support CSS z-index; DOM order determines paint order |
| Mar 22 | 8 | Server-authoritative looping (not per-client) | Per-client looping conflicted with drift correction; user confirmed "I don't need individual loops in the same room" |
| Mar 23 | 8 | Swipe-down for marker add (not long press) | Long press triggers browser context menu on desktop/iPad; swipe-down is conflict-free |
| Mar 23 | 8 | Separate vertical swipe thresholds (30px/1.5×) | Horizontal swipe thresholds (50px/2×) were too aggressive for vertical gesture on iPad-height screens |
| Mar 23 | 8 | `roomMembers` event for anonymous Transfer UI | `connectedPerformers` only populated for JWT-auth clients; anonymous clients need to appear in Transfer list |
| Mar 23 | 8 | `localGoto()` centralization | 5 independent navigation paths all needed ScoreTime + TrackSystem + ControlsOverlay updates; single method prevents future inconsistencies |
| Mar 25 | 13 | Local-only speed control (Option A) | No server interaction needed for rehearsal speed changes; avoids sync complexity for ensemble speed control |
| Mar 25 | 13 | Anchored formula using `_origNow()` reference | Using original `ScoreTime.now()` as clock reference ensures consistency with system's time management (scoreTimeOffset, drift correction) |
| Mar 25 | 13 | `_hasOffset` derived at play-start (not preserved) | Multiple events can independently clear/set the flag; deriving from current state eliminates stale-value bugs |
| Mar 25 | 13 | Drift correction disabled when `hasOffset` true | Client intentionally diverges from server at non-1x speeds; drift correction would fight the speed offset causing oscillation |

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

Stage 6: Integration verification                                   ✅ DONE
  - Full regression: all Phase 1-7 features in anonymous mode
  - Parts mode + gestures test
  - Multi-client auth + leader test (two tabs, port 3000)
  - Room-based loop regression
  - 15-test testing protocol: ALL PASS
  - Swipe-down marker gesture confirmed on desktop
  - Leader transfer confirmed between two anonymous tabs
  → 👁️ Human verified: all modes pass
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
- `scripts/performance_rehearsal_patches.js` — **created** (~1830 lines: gesture system, controls overlay, markers, loop UI, mini-map, SyncMode + leader transfer UI)
- `scripts/performance_parts_patches.js` — page display off-by-one fix (P0→P1), loop page freeze, screen-flip page turns
- `scripts/performance_server.js` — room loop state, loop events, leader tracking, leader gating, setLeader, recallAll, `getRoomMembers()` for anonymous Transfer UI, `roomMembers` broadcast on join/leave
- `scripts/build_performance_app.js` — offline stub loop + leader support, `leaderId` in stub scoreState, `#cursorMenu` hidden via CSS
- `docs/IMPLEMENTATION_PROGRESS.md` — Phase 8 stage results + post-mortem

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
| `roomMembers` | server→client | — | All socket IDs in room (auth + anonymous) for Transfer UI |

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

## Phase 8 Post-Mortem

### Step A: Plan Audit — All 7 Steps

| Step | Plan Item | Status | Implementation |
|------|-----------|--------|---------------|
| 8.1 | Touch gestures: swipe L/R, tap center, long press, pinch zoom | ✅ PASS | `RehearsalGestures` IIFE: pointer event tracking, configurable thresholds, swipe/tap/pinch detection. Double-tap zoom reset. |
| 8.2 | Controls overlay: play/stop, page#, goto, markers, sync, fade | ✅ PASS | `ControlsOverlay` IIFE: 3s fade timer, center-tap toggle, calls existing CursorControls methods. |
| 8.3 | Custom markers: CRUD, list, jump, persist, gesture trigger | ✅ PASS | `MarkerSystem` IIFE: localStorage persist, color palette, MiniMap ticks. Swipe-down triggers add flow (plan said long press — changed due to browser context menu conflict). Server prefs deferred to client auth wiring. |
| 8.4 | Looping: A/B points, auto-jump, count | ✅ PASS | `LoopSystem` IIFE: room-synced via server (revised from per-client — drift conflict). |
| 8.5 | Synced vs Independent: auto-detach, re-sync | ✅ PASS | `SyncMode` IIFE: auto-detach on swipe, `localGoto()` centralized all 5 independent code paths. |
| 8.6 | Leader privileges: gated commands, recall, transfer | ✅ PASS | Server leader tracking + `setLeader`/`recallAll`. Transfer UI with `roomMembers` for anonymous support. |
| 8.7 | Mini-map: position bar, marker ticks, tap-to-jump | ✅ PASS | `MiniMap` IIFE: auto-hide, marker ticks, loop region, S#/P# badge. |

**Deviation:** 8.3 long press → swipe-down. Deliberate UX improvement (browser context menu conflict on iPad/desktop).

### Step B: AI Audit — Build Verification

12 automated checks on built `index.html`:
- ✅ HTML size: 1039 KB (within expected range)
- ✅ All 7 systems present: RehearsalGestures, ControlsOverlay, MarkerSystem, LoopSystem, SyncMode, MiniMap, InteractionBlocker
- ✅ `onSwipeDown` gesture handler present
- ✅ `sb-transfer` UI elements present
- ✅ `roomMembers` socket listener present
- ✅ `resolveSocketId` polling present
- ✅ `leaderId: "local-offline"` in stub scoreState
- ✅ `localGoto` with `keepPlaying` parameter present
- ✅ Build exits 0, all patches applied (one expected warning: O5 LW re-append)

### Step C: Tier 1 Memories — Capture

Memory created: `Phase 8 — Rehearsal Mode Complete` covering architecture (7 IIFEs), 12 bugs fixed, key decisions, and testing results.

### Step D: Future Impacts

1. **Phase 9 (Annotations):** Annotations will need a new interaction layer on top of the score. The `InteractionBlocker` captures mouse events on ScoreTop/ScoreBottom — annotations must use **pointer events** (separate event type) or a transparent overlay div, NOT mouse events on the score SVGs. The gesture system already demonstrates the pointer event approach.

2. **Phase 10 (Sync+Anim T2):** `SyncMode.localGoto()` is the canonical way to navigate in independent mode. Any new navigation features must go through it (not `GraphicTimeline.onGoto` directly) to keep ScoreTime, TrackSystem, and ControlsOverlay in sync.

3. **Phase 11 (Performance Mode):** Performance mode will need to override the server join reset-to-zero behavior (Option C). The `SyncMode` system provides the foundation — leader-gated playback is already built. Performance mode adds: no independent mode, locked page turns, enforced sync, and the grace-period resume for intermission breaks.

4. **Phase 14 (Website/Production):** The `roomMembers` event now broadcasts all socket IDs (auth + anonymous). On a production server, this could leak socket IDs to anonymous clients. Consider restricting `roomMembers` to display names only, or requiring auth for Transfer access.

5. **Client Auth Integration (deferred):** When the client auth flow is wired:
   - Markers: upgrade from localStorage to server prefs API (`PUT /api/performers/:id/preferences`)
   - Transfer UI: display actual performer names instead of "Anonymous"
   - Room join: use JWT token in socket handshake for authenticated room assignment

6. **`ScoreTime.now()` vs `ScoreTime.currentScoreTimeMs`:** Bug #7 (marker at zero) revealed that `currentScoreTimeMs` is stale during playback — it's only updated on stop. Any future feature reading the live position during playback must use `ScoreTime.now()`, not `currentScoreTimeMs`.

7. **Socket ID Timing:** Bug #5-6 revealed that `ClockSync.socket.id` is not available when rehearsal patches init (connect event already fired). Future code that depends on socket ID must use the `resolveSocketId()` polling pattern or hook into a socket event handler.

### Step E: Repeatability — Rebuild Instructions

**If Workshop source changes and Performance Score needs rebuilding:**

```bash
# 1. Rebuild performance app (applies all 29 patches + 12 strips)
node scripts/build_performance_app.js

# 2. Start real server (for multi-client testing)
node scripts/performance_server.js --port 3000

# 3. Start static server (for single-client/offline testing)
node -e "const h=require('http'),f=require('fs'),p=require('path'),d='builds/performance',m={'.html':'text/html','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.mid':'audio/midi'};h.createServer((q,r)=>{let u=q.url.split('?')[0];if(u==='/')u='/index.html';const fp=p.join(d,decodeURIComponent(u)),e=p.extname(fp);if(!f.existsSync(fp)){r.writeHead(404);r.end('Not found');return}r.writeHead(200,{'Content-Type':m[e]||'application/octet-stream'});f.createReadStream(fp).pipe(r)}).listen(3001,()=>console.log('http://localhost:3001'))"

# 4. Test URLs
# Offline (stub):       http://localhost:3001/?track=1&pages=6
# Real server (sync):   http://localhost:3000/?track=1&pages=6
# Full score:           http://localhost:3001/
# Multi-client:         Two tabs on port 3000 (same default room)
```

**Visual audit checklist:**
- [ ] ⭐ Leader badge visible (top-right sync bar) on first client
- [ ] Swipe down → marker add panel opens, name input focused
- [ ] Play → marker records correct live position (not zero)
- [ ] Two tabs on port 3000: 👑 Transfer button visible on leader tab
- [ ] Transfer → leadership moves, badge swaps
- [ ] Independent mode: swipe navigates locally, playback continues
- [ ] Re-sync snaps back to leader position
- [ ] Loop A/B → playback loops, all room members follow
- [ ] MiniMap shows position, markers, loop region
- [ ] Controls overlay fades after 3s, reappears on center tap
- [ ] Full score: all gestures work (swipe, tap, pinch, double-tap)
- [ ] Parts mode: screen-flip page turns, all 4 tracks render

**Known gotchas for rebuild:**
1. **Stub must include `leaderId`** — without `leaderId: "local-offline"` in the stub's scoreState trigger, the leader badge won't appear in offline mode. Check `build_performance_app.js` line ~518.
2. **`resolveSocketId` polling** — socket.id isn't available at init time. The 100ms poll + 5s timeout ensures it's captured. Don't remove.
3. **`roomMembers` vs `connectedPerformers`** — client prefers `roomMembers` (includes anonymous). If server changes, ensure `roomMembers` is still emitted on join/leave/disconnect.
4. **Swipe-down thresholds** — `SWIPE_DOWN_MIN_DISTANCE: 30px`, `SWIPE_DOWN_RATIO: 1.5`. These are tuned for iPad screens. Desktop mouse drag works but requires a deliberate vertical motion.
5. **Build order matters** — `performance_rehearsal_patches.js` is loaded by `build_performance_app.js` as raw text and injected. If the patches file has a syntax error (e.g., unterminated string), the built HTML will have a SyntaxError at runtime.

**Conditions requiring build script updates:**
- Workshop changes to `CursorControls.onScoreGo/Stop/Goto` → verify SyncMode handler wrapping still works
- Workshop changes to `GraphicTimeline.onGoto` → verify `localGoto()` call chain
- New score with different `leadInSeconds` → verify marker time display math
- New socket events added to server → may need stub updates for offline mode

### Step F: Troubleshooting Review

**Bug severity assessment compliance:**
All 12 bugs were correctly prioritized:
- Bugs #1-3 (independent mode navigation): HIGH — blocked core rehearsal workflow. Fixed at root cause.
- Bugs #5-6 (leader badge): MEDIUM — UI display issue, not blocking playback. Fixed at root cause (timing).
- Bug #7 (marker at zero): MEDIUM — data correctness issue. Fixed at root cause (`ScoreTime.now()` vs stale value).
- Bug #8 (long press conflict): LOW — UX preference. Resolved by gesture redesign.
- Bug #9 (transfer hidden): MEDIUM — feature not discoverable. Fixed at root cause (server data model).

**Root cause vs workaround:**
- All 12 fixes were root-cause fixes, no workarounds applied ✅
- Bug #1 (independent mode) spawned the `localGoto()` centralization — a design improvement, not just a bug fix
- Bug #8 (long press) led to the swipe-down gesture with tuned thresholds — a UX improvement

**Diagnostic logging effectiveness:**
- `[SyncMode]` prefixed logs were essential for debugging leader badge timing (bugs #5-6)
- `[RehearsalGestures]` logs confirmed gesture detection thresholds
- `console.log` in `resolveSocketId` with socket ID + leader ID was the key diagnostic for bug #6

**Process improvements identified:**
1. **Test offline AND real server** — Bugs #5-6 were only visible because the offline stub and real server have different socket ID timing. Future phases should test both modes.
2. **Include identity data in stub events** — The offline stub's scoreState lacked `leaderId`. Lesson: stub events should mirror the full server payload shape.
3. **Gesture testing on target device** — Long press conflict (#8) was only apparent on desktop browser. iPad testing would have caught it earlier (or confirmed it's acceptable there).

### Step G: Documentation & Commit

**Action items completed:**
1. ✅ Phase Status Table updated (Phase 8 → Complete, Mar 23)
2. ✅ Phase 8 Files Modified section updated
3. ✅ Phase 8 socket events table updated (added `roomMembers`)
4. ✅ Stage 6 marked DONE with human verification note
5. ✅ Post-mortem Steps A-F documented
6. ✅ Tier 1 memory created
7. ✅ RESUME HERE updated for Phase 9

**Commit:** `[Phase 8] Rehearsal mode complete — gestures, overlay, markers, looping, sync, leader`
**Tag:** `git tag phase-8-complete`

---

## RESUME HERE
**Current phase:** Phase 9 — Annotations (next)
**Last session:** Mar 23, 2026
**Status:** Phase 8 complete. All 7 systems implemented, 12 bugs fixed, testing protocol passed.

**Priority for next session:**
1. Read `WORKING_PRINCIPLES.md` and this RESUME section
2. Read Phase 9 plan in `STRING_QUARTET_PIPELINE_PLAN.md`
3. Run pre-implementation protocol (§13.2.7)
4. Begin Phase 9 staged implementation

**Key files from Phase 8:** `scripts/performance_rehearsal_patches.js` (~1830 lines), `scripts/performance_server.js` (~1010 lines)

**Known open issue:** Parts mode only shows first 2 screens on A/B server (unrelated to Phase 8, low priority)

---

## Phase 9 Pre-Implementation Protocol

### Step 1: System Inventory — What Are We Touching?

| System | What it does | Where it lives | State it reads | State it writes | Phase 9 interaction |
|--------|-------------|----------------|----------------|-----------------|---------------------|
| **RehearsalGestures** | Pointer event handler on `#ScoreContainer`. Tracks swipe, tap, pinch. | `rehearsal_patches.js` L28-397 | `pointers{}`, `pointerCount` | gesture callbacks | **Line 92: `if (e.pointerType === 'pen') return;`** — already reserves Apple Pencil for Phase 9. We hook pen events here. |
| **InteractionBlocker** | Capturing-phase `mousedown/click/dblclick` blockers on ScoreTop/ScoreBottom/SectionN. | `rehearsal_patches.js` L400-455 | Score section elements | `stopImmediatePropagation()` | Mouse events blocked; pointer events unaffected. Annotation uses pointer events → **no conflict**. |
| **ControlsOverlay** | Floating panel: play/stop/nav/jump/markers/loop. | `rehearsal_patches.js` L457-840 | `ScoreTime`, `GraphicTimeline` | overlay DOM, fade timer | Phase 9 adds an annotation toggle button to this overlay (🖊️). |
| **ScoreZoom** | CSS transform on `#ScoreContainer`: `translate(panX,panY) scale(zoom/100)`. | `public/index.html` L7068-7200 | `zoomLevel`, `panX`, `panY` | `ScoreContainer.style.transform` | Annotation SVG overlays must be INSIDE `#ScoreContainer` so they scale with zoom. Coordinate mapping must account for current zoom+pan when converting pointer events → SVG coords. |
| **ScoreContainer DOM** | `#ScoreContainer` > `.score-row` > `svg#ScoreTop` (+ canvas). Same for ScoreBottom. Parts mode adds N-2 more. | `public/index.html` L3126-3173 | — | — | Each `.score-row` gets an annotation SVG overlay (sibling of score SVG + canvas). |
| **PartsMode** | N-section layout. `PM.sections[i] = { el, row, canvas }`. | `performance_parts_patches.js` L40-109 | `PM.active`, `PM.sections[]`, `PM.sectionPages[]` | section DOMs, page state | Annotation overlay must create one SVG per section. `PM.sectionPages[i]` maps section → page for annotation visibility. |
| **`calcPixelPosition`** (SVGElementManager) | Maps `{referenceSeconds, track, offsetYFraction}` → `{x, y, page, section}`. | `public/index.html` L3743-3778 | `secondsPerPage`, `leadInSeconds`, track dims | — | **Reference for coordinate system.** Annotations use similar math: `scoreTimeMs → page`, `position.x/y` as fractions of section dimensions. |
| **`CompositionPanel.getTrackDimensions`** | Returns `{y, height}` for a given track on a given score SVG. | `public/index.html` L10773-10791 | `StaffPositions` | — | Used for track-aware annotation positioning (e.g., "this annotation is on the Violin I staff"). |
| **StaffCursors** (canvas overlays) | Draws cursor rectangles on canvas overlays. One canvas per score section. | `public/index.html` L6880-7052 | `ScoreTime.now()`, page state | canvas 2D draws | Canvas overlays are siblings of score SVGs in `.score-row`. Annotation SVGs will be a third sibling. Z-order: score SVG < GC canvas < annotation SVG < cursor canvas? Or annotation between? |
| **Phase 7 Preferences API** | `GET/PUT /api/performers/:id/preferences`. JWT auth. JSON file storage. | `performance_server.js` L285-320 | JWT token, performer ID | `data/performers/{id}/preferences.json` | Annotation persistence target (deferred — use localStorage first, like markers). |
| **`ClockSync.socket`** | Socket.IO connection to server. Events: scoreGo/Stop/Goto. | `public/index.html` L3178+ | server state | local sync state | Not directly used by annotation system. Annotations are per-performer, local-only. No room sync needed. |
| **`build_performance_app.js`** | Build script — 29 patches + 12 strips. Injects patches as `<script>` text. | `scripts/build_performance_app.js` | source HTML, patch files | `builds/performance/index.html` | Must add Phase 9 annotation patches file injection (like rehearsal patches). |

### Step 2: Source Reading — Key Findings

**2a. Apple Pencil passthrough in RehearsalGestures (L90-92):**
```javascript
onPointerDown: function(e) {
    // Reserve Apple Pencil for annotation (Phase 9)
    if (e.pointerType === 'pen') return;
    // ... finger/mouse gesture handling
}
```
This means pen events currently fall through to NOTHING — they're ignored by the gesture system and blocked on score SVGs by InteractionBlocker (for mouse events, but pointer events are different). So `pointerdown` with `pointerType === 'pen'` on `#ScoreContainer` will propagate normally. Phase 9 needs to:
1. Add a `pointerdown` listener on the annotation overlay (or ScoreContainer) that captures pen events
2. NOT interfere with existing finger/mouse gesture handling

**2b. DOM layering in `.score-row`:**
```
.score-row (position: relative)
  ├── svg#ScoreTop (the score notation)
  ├── canvas (position: absolute, pointer-events: none, z-index: 10) — cursor overlay
  └── [NEW] svg.annotation-layer (position: absolute, pointer-events: ???)
```
The annotation SVG must be:
- `position: absolute` within `.score-row` (same as canvas)
- Sized to match the score SVG (100% width, same height)
- Z-index between score SVG and cursor canvas (so annotations appear ON the score but UNDER the cursor)
- `pointer-events: none` by DEFAULT (so finger gestures pass through to ScoreContainer)
- `pointer-events: auto` ONLY when in annotation mode AND only for pen input

**2c. Coordinate mapping — pointer event → annotation position:**
When the user draws with Apple Pencil:
1. `e.clientX/clientY` is in viewport coordinates
2. ScoreZoom applies CSS transform on `#ScoreContainer`: `translate(panX, panY) scale(zoom/100)`
3. Need to reverse the transform to get coordinates relative to the score section SVG
4. Store as fractions (0-1) of section width/height for resilience to resize

**Reverse transform math:**
```javascript
// Get the annotation SVG's bounding rect (accounts for zoom+pan)
var rect = annotationSvg.getBoundingClientRect();
var x = (e.clientX - rect.left) / rect.width;   // 0-1 fraction
var y = (e.clientY - rect.top) / rect.height;    // 0-1 fraction
```
This is clean because `getBoundingClientRect()` already accounts for CSS transforms.

**2d. Page-based annotation visibility:**
Annotations are anchored to a **page number**. When the user navigates:
- Full score: ScoreTop shows even pages, ScoreBottom shows odd pages. `GraphicTimeline.currentTopPage` tracks this.
- Parts mode: `PM.sectionPages[i]` tracks which page each section shows.
- Annotations on page P are visible only when section S is showing page P.
- During page turns, annotations must show/hide like score elements do.

**2e. Annotation storage (per §12.12.4):**
```json
{
    "id": "a1",
    "type": "freehand|stamp|text",
    "page": 3,
    "position": { "x": 0.45, "y": 0.32 },
    "data": { ... type-specific ... }
}
```
The `scoreTimeMs` field from the spec is derivable from `page` and `position.x` via `secondsPerPage`, so we can compute it on demand rather than storing it redundantly. The `track` field is useful for parts mode filtering but optional for rendering (position.y handles placement).

### Step 3: Contracts

**Annotation Overlay:**
- **Precondition:** Score DOM is fully loaded. ScoreTop/ScoreBottom exist. PartsMode (if active) has populated `PM.sections[]`.
- **Postcondition:** One transparent SVG overlay exists per score section, sized to match, z-indexed above score SVG and below cursor canvas.
- **Invariant:** Annotation overlays resize when the window resizes. They scale with ScoreZoom.

**Freehand Drawing:**
- **Precondition:** Annotation mode is active. Pen pointer is down on an annotation overlay.
- **Postcondition:** An SVG `<path>` element exists in the overlay, with `d` attribute matching the pen stroke, stored in the annotation data model.
- **Invariant:** Path coordinates are stored as fractions (0-1) of section dimensions, not pixels. The visual rendering matches at any zoom level.

**Stamp Placement:**
- **Precondition:** A stamp is selected in the palette. User taps on the score.
- **Postcondition:** A stamp SVG element (text or symbol) appears at the tapped position. Stored in annotation data model.
- **Invariant:** Stamp size is proportional to section height (not pixels), so it scales with zoom and resize.

**Persistence:**
- **Precondition:** Annotations exist in memory.
- **Postcondition:** After debounced auto-save (2s inactivity), annotations are in localStorage keyed by score ID.
- **Invariant:** Reload restores all annotations exactly. No data loss on page turn, zoom, or resize.

**Undo/Redo:**
- **Precondition:** User has performed annotation actions.
- **Postcondition:** Undo removes the last action. Redo restores it. Stack depth: 50.
- **Invariant:** Undo/redo state is consistent with what's rendered. After undo, the annotation overlay matches the data model exactly.

**Page Visibility:**
- **Precondition:** Annotations are loaded. Score is displaying pages P, P+1 (full score) or P..P+N-1 (parts mode).
- **Postcondition:** Only annotations whose `page` matches a currently visible section page are rendered.
- **Invariant:** Annotations appear/disappear correctly on every page turn, goto, and loop rewind.

### Step 4: Risk Register

| Risk | Probability | Impact | Detection | Mitigation |
|------|------------|--------|-----------|------------|
| **Annotation overlay blocks finger gestures** | High | HIGH — swipe/tap/pinch stop working | 👁️ Touch score → nothing happens | Default `pointer-events: none` on overlay. Only capture `pen` events via a separate listener on ScoreContainer, then draw on the overlay. |
| **Zoom transform breaks coordinate mapping** | Medium | HIGH — annotations at wrong position | 👁️ Draw at zoom, zoom out → annotation shifted | Use `getBoundingClientRect()` which accounts for transforms. Store fractions, not pixels. Test at 100%, 200%, 400% zoom. |
| **Page turn doesn't update annotation visibility** | Medium | MEDIUM — stale annotations visible | 👁️ Page forward → old annotations still showing | Hook into same page-turn mechanism as score elements: listen for `onGoto` / `checkPageChange` and re-render visible annotations. |
| **Parts mode section mismatch** | Medium | MEDIUM — annotations on wrong section | 👁️ Parts mode annotation appears on wrong track | Use `PM.sectionPages[i]` to map section → page. Test thoroughly in parts mode. |
| **Apple Pencil not available for testing** | High | MEDIUM — can't verify primary input method | — | Implement mouse fallback for annotation mode (toggle via overlay button). Test with mouse, verify pen passthrough logic via `pointerType` check. |
| **Large number of path points degrades performance** | Low | MEDIUM — laggy drawing | 👁️ Drawing feels sluggish | Simplify paths: Douglas-Peucker algorithm or point sampling (every Nth point). Set max points per path (~500). |
| **Annotation data grows large in localStorage** | Low | LOW — storage quota exceeded | Console error on save | Estimate: 100 annotations × 500 bytes avg = 50 KB. Well within 5 MB localStorage limit. |
| **Undo/redo interacts badly with auto-save** | Medium | MEDIUM — undo then auto-save persists wrong state | Undo → wait 2s → reload → annotation back | Auto-save saves the current state (post-undo). This is correct — undo is an action like any other. |
| **Annotation file conflicts with future shared annotation feature** | Low | LOW — data model change needed later | — | Design data model with `createdBy` field now (empty for anonymous). §12.12.5 says "private by default." |
| **New patches file increases build complexity** | Low | LOW — build script modification needed | Build fails | Follow exact pattern from rehearsal patches: read file, inject as `<script>`. |

### Step 5: Staged Implementation Plan

```
Stage 1: Annotation overlay layer + pen capture
  - Create transparent SVG overlay per score section (ScoreTop, ScoreBottom, parts sections)
  - Overlay: position absolute, matches section dimensions, z-index 15 (above score, below cursor canvas z:10? — need to check; may need z:5)
  - Pen event listener on #ScoreContainer: pointerType === 'pen' → capture for drawing
  - Mouse fallback: annotation mode toggle button in ControlsOverlay (🖊️)
  - Coordinate mapping: clientX/Y → section-relative fractions via getBoundingClientRect
  - Data model: in-memory array of annotations per page
  - No rendering yet — just capture coordinates and log them
  → TEST: 🤖 Verify overlay SVGs exist in DOM, correct size, correct parent
  → TEST: 🤖 Verify pen pointerdown fires annotation handler (simulate with pointerType check)
  → TEST: 🤖 Verify finger/mouse gestures still work (swipe, tap, pinch)
  → TEST: 👁️ GUT CHECK: Enable annotation mode (click 🖊️), draw with mouse on score
         → coordinates logged to console in fraction format (0.xx, 0.yy)
         → Swipe/tap still works when annotation mode is OFF
  → STOP: Wait for human confirmation before proceeding

Stage 2: Freehand drawing — path rendering
  - Pen/mouse down → start path, move → extend path, up → end path
  - Render as SVG <path> in the annotation overlay for the correct section
  - Smooth path: use SVG cubic bezier (C commands) fitted to sampled points
  - Color picker: default red (#ff0000), 6-color palette
  - Stroke width: 2px default (in SVG viewBox coords, scales with zoom)
  - Path simplification: sample every 3rd point to reduce data size
  - Store in annotation data model: { id, type:'freehand', page, position, data:{paths:[{points, color, width}]} }
  → TEST: 🤖 Drawing creates SVG <path> element in correct overlay
  → TEST: 🤖 Path data stored in annotation model with correct page number
  → TEST: 🤖 Verify path coordinates are fractions (0-1), not pixels
  → TEST: 👁️ GUT CHECK: Draw several strokes on the score
         → Lines appear where the pen/mouse moves
         → Lines are smooth (not jagged/straight-line segments)
         → Lines scale correctly when zooming in/out
         → Drawing on different score sections works
  → TEST: 👁️ REGRESSION: Finger swipe still navigates pages
  → STOP: Wait for human confirmation before proceeding

Stage 3: Stamp palette
  - Floating palette UI: fingering (0-4), bowings (∏, V), dynamics, accents
  - Palette appears when annotation mode is active
  - Tap stamp in palette → next tap on score places it
  - Stamp rendered as SVG <text> or <use> element in annotation overlay
  - Store: { id, type:'stamp', page, position, data:{symbol, category} }
  - Stamp size: proportional to section height (e.g., 3% of section height)
  → TEST: 🤖 Stamp palette appears when annotation mode active
  → TEST: 🤖 Placed stamp has correct page, position in model
  → TEST: 👁️ GUT CHECK: Select fingering "2", tap on score → "2" appears at tap point
         → Stamp is readable at normal zoom
         → Stamp position is accurate (near where tapped)
         → Multiple stamps can be placed
  → TEST: 👁️ REGRESSION: Overlay play/stop still works, page turns still work
  → STOP: Wait for human confirmation before proceeding

Stage 4: Text annotations
  - Tap-to-place text: tap on score → text input popup
  - User types annotation text → placed at position
  - Rendered as SVG <text> with background rect for readability
  - Font: system sans-serif, size proportional to section height
  - Store: { id, type:'text', page, position, data:{text, fontSize} }
  → TEST: 🤖 Text annotation created with correct data
  → TEST: 👁️ GUT CHECK: Place text "watch intonation" on score
         → Text is readable, positioned correctly
         → Text has semi-transparent background for readability
  → STOP: Wait for human confirmation before proceeding

Stage 5: Page visibility + annotation rendering on page turn
  - On page turn (onGoto, checkPageChange): show annotations for visible pages, hide others
  - Full score: annotations on page P visible when GraphicTimeline shows that page
  - Parts mode: annotations on page P visible when PM.sectionPages[i] === P
  - Annotation rendering: on page change, clear overlays, re-render annotations for current pages
  - Handle loop rewind: annotations refresh on loop boundary
  → TEST: 🤖 Place annotations on pages 0, 1, 2. Navigate → only correct page's annotations show.
  → TEST: 🤖 Parts mode: annotations on page 6 visible only on section showing page 6
  → TEST: 👁️ GUT CHECK: Draw on page 0, navigate forward, come back → drawing still there
         → Navigate to page with no annotations → overlay is clean
         → Loop rewind → annotations reappear correctly
  → TEST: 👁️ REGRESSION: Score elements (notation, curves, GCs) render correctly during page turns
  → STOP: Wait for human confirmation before proceeding

Stage 6: Persistence — localStorage auto-save + load
  - Auto-save: debounced 2s after any annotation change
  - Storage key: 'annotations_' + (scoreId or 'default')
  - Load on app init: restore all annotations from localStorage
  - Re-render annotations for currently visible pages after load
  - Delete annotation: tap to select, delete button (or swipe-to-delete in list)
  → TEST: 🤖 Create annotations → wait 2s → check localStorage has data
  → TEST: 🤖 Reload page → annotations restored, visible on correct pages
  → TEST: 👁️ GUT CHECK: Draw several annotations, reload → all present
         → Delete one → save → reload → deleted one is gone
  → TEST: 👁️ REGRESSION: Markers (also localStorage) still work
  → STOP: Wait for human confirmation before proceeding

Stage 7: Undo/redo + visibility controls
  - Undo stack: last 50 actions (add, delete, move)
  - Ctrl+Z / undo button → undo last annotation action
  - Ctrl+Shift+Z / redo button → redo
  - Visibility: opacity slider (default 60%), show/hide toggle, category filters
  - Add controls to annotation panel in ControlsOverlay
  → TEST: 🤖 Add 3 annotations, undo → last removed, redo → restored
  → TEST: 🤖 Opacity change reflects in SVG overlay style
  → TEST: 👁️ GUT CHECK: Toggle annotations off → all hidden. On → all visible.
         → Opacity slider: 20% → faint. 100% → solid.
         → Category filter: show only fingerings → only stamps with category 'fingering' visible
  → STOP: Wait for human confirmation before proceeding

Stage 8: Integration verification
  - Full regression: all Phase 1-8 features in anonymous mode
  - Parts mode + annotations test (all 4 tracks, 4/6/8 pages)
  - Zoom test: draw at 100%, verify at 200% and 400%
  - Multi-page test: annotations on 5+ different pages, navigate through all
  - Performance test: 50+ annotations, verify no lag
  - Server mode test (port 3000): annotations persist locally while sync works
  → TEST: 🤖 Build succeeds with no errors
  → TEST: 🤖 All 7 annotation systems present in built HTML
  → TEST: 👁️ Full flow: enable annotation → draw → stamp → text → page turn → persist → reload → undo
  → TEST: 👁️ Parts mode: annotations work on individual track views
  → TEST: 👁️ Regression: gestures, overlay, markers, looping, sync, leader all work
```

### Step 6: Focused Stage Tests (detailed)

**Stage 1 tests — Overlay + Pen Capture:**
- 🤖 DOM check: `.annotation-layer` SVG exists as child of each `.score-row`
- 🤖 Overlay dimensions match score SVG dimensions (within 1px)
- 🤖 Overlay `pointer-events` is `none` by default
- 🤖 Pen event fires annotation handler (log test)
- 👁️ Score renders normally (annotation overlay is transparent)
- 👁️ Swipe left/right → page turns (gesture system unaffected)
- 👁️ Tap center → controls overlay (gesture system unaffected)
- 👁️ Click annotation toggle → mode activates (console log)

**Stage 2 tests — Freehand Drawing:**
- 🤖 SVG `<path>` element created in overlay after draw stroke
- 🤖 Path `d` attribute has valid SVG path commands
- 🤖 Annotation data model has entry with `type: 'freehand'`
- 🤖 Position coordinates are 0-1 fractions
- 👁️ Draw at 100% zoom → lines smooth and positioned correctly
- 👁️ Zoom to 200% → draw → lines still correct at that zoom
- 👁️ Zoom back to 100% → previous drawing looks correct (not shifted)
- 👁️ Draw on ScoreTop and ScoreBottom → both work

**Stage 3 tests — Stamp Palette:**
- 🤖 Palette DOM appears when annotation mode active
- 🤖 Stamp SVG element created in overlay after tap
- 🤖 Annotation data model has entry with `type: 'stamp'`
- 👁️ Fingering "2" placed near tapped position
- 👁️ Bowing "∏" renders correctly
- 👁️ Multiple stamps coexist on same page

**Stage 5 tests — Page Visibility (critical):**
- 🤖 Annotations on page 0: visible when page 0 shown, hidden when page 2 shown
- 🤖 After page turn, annotation SVG overlay for that section is cleared and re-rendered
- 🤖 Parts mode: PM.sectionPages mapping correctly used
- 👁️ Goto page 5 → only page 5 annotations visible
- 👁️ Return to page 0 → page 0 annotations back
- 👁️ Loop rewind → annotations refresh

### Architecture Decision Record

**Decision:** Create `scripts/performance_annotation_patches.js` as a new patches file (separate from rehearsal patches).
**Rationale:** Rehearsal patches are already ~1830 lines. Annotation is a distinct feature domain. Separate file follows the established pattern (parts patches, rehearsal patches) and keeps files maintainable.

**Decision:** Annotation SVG overlays are siblings of score SVGs inside `.score-row`, not children of the score SVGs.
**Rationale:** The score SVGs have a complex viewBox and coordinate system used by the Workshop. Adding annotation elements inside them would require matching that coordinate system exactly. A sibling SVG with `position: absolute` and its own simple 0-1 coordinate system is much cleaner. This is the same pattern used by canvas cursor overlays.

**Decision:** Coordinates stored as fractions (0-1) of section dimensions, not pixels or score time.
**Rationale:** Fractions survive zoom, resize, and window size changes. Score-time anchoring (§12.12.4) is a nice-to-have for layout changes, but this score's layout is fixed — fractions are sufficient and simpler.

**Decision:** `pointer-events: none` on overlay by default; pen events captured at ScoreContainer level.
**Rationale:** If the annotation SVG had `pointer-events: auto`, it would capture all touch/mouse events and break the gesture system underneath. Instead, we listen for pen events on `#ScoreContainer` (where gesture system already listens), check `pointerType === 'pen'`, and draw on the overlay programmatically. For mouse annotation mode, we add a conditional path where the annotation handler runs instead of gestures.

**Decision:** localStorage for persistence (not server prefs API yet).
**Rationale:** Same decision as markers (Phase 8): client auth flow is not wired yet. localStorage is immediate and works offline. When auth is wired, both markers and annotations can upgrade to server prefs in a single migration.

**Decision:** Mouse fallback for annotation mode (not pen-only).
**Rationale:** Not all users have an Apple Pencil. Not all development testing happens on iPad. A toggle button in the controls overlay enables annotation mode for mouse input. When annotation mode is active AND the user is using mouse/finger, annotation captures those events instead of the gesture system.

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

Parts Stage D3: Font Embedding — REVISED (see Font Analysis below)
  - Original plan: copy font files + inject @font-face CSS into built HTML
  - PROBLEM: This only makes fonts available to the PAGE, not to SVG <image>
    data URLs. SVGs rendered via <image href="data:..."> are sandboxed —
    they cannot access the parent page's CSS or fonts.
  - STATUS: Page-level @font-face was implemented (fonts copied, CSS injected),
    but this does NOT fix the actual problem. SVG text inside data URLs still
    falls back to generic serif on machines without Crimson Pro installed.
  - DECISION NEEDED: See "Font Analysis (Mar 23)" immediately below.
```

---

### Font Analysis (Mar 23, 2026)

**The problem:** Notation SVGs containing text labels (secco, pizz., Non-Vib, etc.)
are stored in score.json as data URLs and rendered via `<image href="data:image/svg+xml;base64,...">`.
The `<image>` element is sandboxed — it cannot access the parent page's CSS `@font-face` declarations
or load external font files. When the browser renders these SVGs, it looks for "Crimson Pro" inside
the sandboxed SVG, finds nothing, and falls back to a generic serif font. The fallback font has
different metrics, causing text to clip, overflow, or look wrong on devices without the font installed.

**Scan results** (from `scripts/_scan_svg_fonts.js`, Mar 23):
- Total SVG elements in score: **542**
- SVGs with `<text>` elements: **296** (not ~30 as previously estimated)
- Need italic font: **291**, need regular: **5**
- Font families found: `'Crimson Pro Light'`, `'Crimson Pro'`, `Crimson Pro Light`, `serif`
- Unique characters used across all text: **47** — `" (),-./1234568:FHLNPRVabcdefghijklmnoprstuvxyzé`
- Unique text labels: **32**

**Text label frequency:**
| Label | Count | Source |
|-------|-------|--------|
| Non-Vib | 142 | SVG assembly engine (`generateText`) |
| secco | 116 | SVG assembly engine |
| ricochet | 56 | LilyPond notation fragments |
| b.b. | 50 | LilyPond notation fragments |
| c.l.b. jeté | 37 | SVG assembly engine |
| R.H. | 36 | LilyPond notation fragments |
| pizz. / pizz | 62 | LilyPond notation fragments |
| col legno battuto | 28 | LilyPond notation fragments |
| L.H. | 28 | LilyPond notation fragments |
| delicato | 8 | LilyPond notation fragments |
| furioso | 4 | LilyPond notation fragments |
| Tuplets (5:4, 3:2, etc.) | ~19 | LilyPond notation fragments |
| col legno | 4 | SVG assembly engine |

**Two distinct sources of text SVGs:**
1. **Custom SVG assembly engine** (`assemble_svg.js` → `generateText()`): secco, Non-Vib,
   c.l.b. jeté, col legno. Uses `<text font-family="'Crimson Pro'"...>`. These are assembled
   by our custom engine, NOT by LilyPond.
2. **LilyPond-compiled notation fragments** (PizzTrem*.ly, NotationFragment*.ly, etc.):
   ricochet, b.b., pizz., R.H., L.H., col legno battuto, furioso, delicato, tuplet numbers.
   These were compiled by LilyPond into SVGs containing `<text>` elements, then stored in
   score.json via the Workshop.

**Note:** Dynamics (p, f, mf, fff, etc.) are already **vector paths** in the component library —
they do NOT use `<text>` and are NOT affected by this bug.

**Size impact of full font embedding (original Option A):**
- CrimsonPro-Light.ttf: 104 KB raw, 139 KB base64
- CrimsonPro-LightItalic.ttf: 107 KB raw, 142 KB base64
- Full font in all 296 SVGs: **41 MB added** — NOT VIABLE
- Subsetted font (47 chars, ~3-5 KB) in 296 SVGs: **~1.5 MB added** — acceptable

#### Option A: Font Subsetting (bridge fix)
- Create a subset of Crimson Pro containing only the 47 characters actually used
- Subset font: ~3-5 KB (vs 107 KB full). Base64: ~4-7 KB.
- Build script scans each SVG data URL in score.json → if `<text>` with Crimson Pro →
  inject `<defs><style>@font-face { ... src: url(data:font/truetype;base64,...) }</style></defs>`
  → re-encode data URL
- Total size impact: ~1.5 MB added to score.json (16 MB → 17.5 MB)
- Requires: `pyftsubset` (Python fonttools) for one-time subset generation, OR a Node.js
  font subsetting library
- **Pro:** Fast to implement, minimal risk, works for both assembly engine and LilyPond SVGs
- **Con:** Still embeds font data (adds 1.5 MB), font dependency still exists (just subsetted)

#### Option B: Text-to-Paths via opentype.js (permanent fix)
- Build-time post-processor scans all SVG data URLs in score.json
- For each `<text>` element with Crimson Pro: use opentype.js (pure JS TTF parser) to
  convert the text content to `<path d="...">` using the font's actual glyph outlines
- Works for BOTH assembly engine SVGs and LilyPond notation fragment SVGs
- No LilyPond recompilation needed — transforms already-stored SVG data URLs
- Zero size increase (paths are similar size to text elements)
- Eliminates font dependency permanently — text becomes geometry
- Requires: `opentype.js` npm dependency
- **Pro:** Zero runtime cost, zero size increase, permanent fix, no font dependency
- **Con:** More complex implementation (SVG parsing + path generation), must preserve
  exact positioning (font-size, transform, text-anchor attributes)
- **Implementation location:** New step in `build_performance_app.js` that processes
  score.json SVG data URLs before writing to `builds/performance/score.json`
- Does NOT require modifying `assemble_svg.js` `generateText()` — the build-time
  post-processor handles all SVGs uniformly regardless of origin

#### Option C: Defer to Phase 14
- Skip font fix entirely for now
- Accept that text labels clip/render wrong on devices without Crimson Pro installed
- Fix permanently in Phase 14 (SVG optimization pass)

#### Interaction between Option A and Option B
Option A does NOT complicate Option B. They are independent:
- Option A modifies score.json at build time (injects font)
- Option B modifies score.json at build time (converts text to paths)
- If Option A is implemented first, then Option B is implemented later, Option B's
  post-processor would find `<text>` elements, convert them to `<path>`, and the
  injected `@font-face` would become unused dead code that could be stripped.
  Or: Option B's scan simply wouldn't find `<text>` elements (already converted)
  and Option A's scan wouldn't find Crimson Pro text → both become no-ops.

#### Recommendation
**Option B (opentype.js)** is the best choice if we're going to fix this now — it's
the permanent solution, adds zero file size, and eliminates font dependency. The
implementation is medium complexity but well-scoped (single build step).
**Option C (defer)** is reasonable if font clipping is acceptable for now and we want
to focus on testing.

---

### Option B Pre-Implementation Protocol (Mar 23, 2026)

#### Step 1: System Inventory — What Are We Touching?

| System | What it does | What we read | What we write |
|--------|-------------|-------------|--------------|
| `scores/*.json` | Source score data with svgElements[].svgDataUrl | SVG data URLs (base64 or URL-encoded) | **NOTHING — source is read-only** |
| `build_performance_app.js` (L1061-1064) | Copies score JSON to `builds/performance/score.json` | scoreJsonPath | score.json (currently a plain copy) |
| `svgElements[].svgDataUrl` (in score JSON) | SVG markup embedded as data URLs, rendered via `<image href="...">` | `<text>` elements, font attributes, transforms | Modified `svgDataUrl` with `<text>` replaced by `<path>` |
| `public/index.html` — SVGElementManager | Creates `<image>` elements, sets `href` to svgDataUrl | svgDataUrl string | DOM `<image>` elements |
| `public/fonts/CrimsonPro-LightItalic.ttf` | Font file (107 KB) | Loaded by opentype.js to extract glyph outlines | Nothing |
| `public/fonts/CrimsonPro-Light.ttf` | Font file (104 KB) | Loaded by opentype.js for the 5 regular-weight SVGs | Nothing |

**What we are NOT touching:**
- `assemble_svg.js` / `generateText()` — upstream source stays unchanged
- LilyPond `.ly` files — no recompilation
- `public/index.html` — no changes to client rendering code
- `SVGElementManager`, `CurveMaker`, `LineWedgeMaker`, `GCMaker` — no changes
- Animation, playback, sync, gestures, overlay — completely unaffected
- `build_engraving.js`, `compose_pages.js`, `generate_print_pdf.js` — not touched

#### Step 2: Source Reading — SVG Text Element Formats

Three distinct `<text>` formats found in score.json (from scan of all 296 SVGs with text):

**Format A — Assembly engine SVGs** (secco, Non-Vib, c.l.b. jeté, col legno):
```xml
<g transform="translate(X, Y)">
<text font-family="'Crimson Pro'" font-weight="300" font-style="italic"
      font-size="0.9797" text-anchor="start" fill="currentColor">
<tspan>c.l.b. jeté</tspan>
</text>
</g>
```
- No `x`/`y` on `<text>` — position comes from parent `<g transform>`
- No inline `style` on `<tspan>`
- `font-family` is `'Crimson Pro'` or `Crimson Pro Light` (both = same font, weight 300)
- `font-size` in SVG viewBox units (mm-scale, typically 0.7-1.4)

**Format B — LilyPond simple text** (pizz., b.b., m.v.):
```xml
<g transform="translate(X, Y)">
<text font-family="Crimson Pro Light" font-style="italic"
      font-size="1.3860" text-anchor="start" fill="#000000">
<tspan>pizz.</tspan>
</text>
</g>
```
- Same structure as Format A, just different font-family string

**Format C — Inkscape-edited LilyPond SVGs** (ricochet, col legno battuto, furioso, etc.):
```xml
<text font-family="'Crimson Pro Light'" font-style="italic" font-size="1.7461px"
      text-anchor="start" fill="#000000" id="text2" style="font-size:1.40525px">
<tspan id="tspan2" style="font-style:italic;font-variant:normal;font-weight:300;
  font-stretch:normal;font-size:1.40525px;font-family:'Crimson Pro';
  -inkscape-font-specification:'Crimson Pro Light Italic'">ricochet</tspan>
</text>
```
- Has `x`/`y` attributes on `<text>` element
- Has `id` attributes on both `<text>` and `<tspan>`
- Has inline `style` on `<tspan>` that may override `<text>` font-size
- `font-size` may have `px` suffix (strip it)
- `<tspan>` style `font-size` overrides `<text>` font-size when present

**Format D — Serif text** (tuplets 5:4, 3:2, harmonics "o", parentheses):
```xml
<text font-family="serif" font-style="italic" font-size="1.2348"
      text-anchor="start" fill="#000000">
<tspan>5:4</tspan>
</text>
```
- Uses generic `serif` family — NOT Crimson Pro
- **SKIP these** — they render fine on any device. No font embedding needed.

#### Step 3: Contracts

**Preconditions:**
- `scores/*.json` exists with valid `svgElements[].svgDataUrl`
- `public/fonts/CrimsonPro-LightItalic.ttf` and `CrimsonPro-Light.ttf` exist
- `opentype.js` is installed (`npm install opentype.js`)

**Postconditions:**
- Every `<text>` element with Crimson Pro font-family in `svgDataUrl` is replaced
  with a `<path>` element that renders the same glyphs as vector outlines
- Non-Crimson-Pro text (`font-family="serif"`) is left unchanged
- The SVG viewBox, dimensions, and all non-text elements are unchanged
- `builds/performance/score.json` contains the modified data URLs
- Source `scores/*.json` is never modified

**Invariants:**
- Visual output is pixel-identical to current rendering (on machines with the font)
- Visual output is CORRECT on machines without the font (currently broken)
- No other elements in the SVG are affected
- Score loading, animation, playback, page turns — all unchanged
- File size of score.json changes by < 5% (paths ≈ same size as text)

#### Step 4: Risk Register

| Risk | Probability | Impact | Detection | Mitigation |
|------|------------|--------|-----------|------------|
| **Baseline alignment wrong** — opentype.js `y` parameter is baseline; SVG `<text>` `y` is also baseline. But if `<g transform>` shifts the coordinate system, the text may appear shifted. | Low | High (text in wrong position) | Visual: text labels visibly shifted up/down vs original | Stage 1 proof-of-concept compares side-by-side before/after for one known SVG |
| **Font-size scale mismatch** — SVG uses viewBox units (mm), opentype.js `fontSize` may interpret differently | Medium | High (text too large/small) | Visual: obvious at any zoom | Stage 1 catches this immediately. opentype.js fontSize is in the same coordinate units as the SVG viewBox. |
| **tspan style font-size override** — Format C SVGs have `font-size` in tspan style that overrides text element | Medium | Medium (some text wrong size) | Visual: ricochet/furioso/col legno battuto wrong size | Parser must check tspan style for font-size and use it when present |
| **fill="currentColor"** — Assembly engine SVGs use `currentColor`. Path must preserve this. | Low | Medium (text invisible or wrong color) | Visual: text disappears | Copy fill attribute from `<text>` to `<path>` |
| **px suffix on font-size** — Some SVGs have `font-size="1.7461px"`. parseFloat handles this, but verify. | Low | Low | `parseFloat("1.7461px")` = 1.7461 ✓ | Use parseFloat which strips trailing non-numeric chars |
| **Y-axis flip** — SVG Y goes down, font Y goes up. opentype.js `Path.toPathData()` has `flipY` option (default: true) | Medium | High (text upside down or wrong position) | Visual: obviously upside down | Test in Stage 1. May need `flipY: false` since we're already in SVG coordinate space, OR use `flipY: true` with correct flipYBase. |
| **Multi-text SVGs** — Some SVGs might have multiple `<text>` elements | Low | Medium (some text not converted) | Count-based: compare converted count vs scan count | Use global regex/replaceAll, not just first match |
| **Data URL re-encoding changes format** — original may be base64 or URL-encoded | Low | Low (no visual impact, possible size change) | Check: re-encoded URL still works | Always re-encode as base64 (simpler, consistent) |
| **Existing text bbox used for layout** — `svg_component_library.json` has text bboxes used by assembly engine for positioning. If paths have slightly different bounds, layout could shift. | Very Low | Low (sub-pixel shift) | Visual: requires careful side-by-side comparison | Post-processor only changes the *rendered output* in score.json. Assembly engine's layout math uses pre-computed bboxes and is unaffected. |
| **score.json corruption** — Bad regex or encoding could corrupt SVG data | Low | Critical (score won't load) | Immediate: score fails to load | Stage 2 writes to temp file, validates before replacing. Always keep source scores/ untouched. |

**Highest risks:** Y-axis flip and font-size scale. Both are caught immediately in Stage 1
(single SVG visual comparison). This is why Stage 1 exists before touching the full score.

#### Step 5: Staged Implementation Plan

```
Stage 1: Proof of Concept — Single SVG Visual Comparison
  - npm install opentype.js
  - Create scripts/_test_text_to_path.js (temporary, prefixed with _)
  - Load CrimsonPro-LightItalic.ttf via opentype.js
  - Pick one SVG from each format (secco=A, pizz.=B, ricochet=C)
  - Decode SVG data URL → find <text> → convert to <path> using font.getPath()
  - Write PAIRS of files to builds/_font_test/:
      original_secco.svg    vs  converted_secco.svg
      original_pizz.svg     vs  converted_pizz.svg
      original_ricochet.svg vs  converted_ricochet.svg
  - Handle: Y-axis flip, font-size, fill color, parent <g> transform preservation
  → 👁️ GUT CHECK (human): Open each pair in browser tabs at same zoom.
    Text label must be visually identical — same position, size, weight, style.
    If ANY pair looks wrong (shifted, flipped, scaled, clipped), STOP.
    Debug the single failing format before proceeding.
  → STOP HERE until human confirms all 3 pairs look correct.

Stage 2: Full Score Converter — Standalone Script
  - Create scripts/_convert_svg_text.js (temporary)
  - Load both font files (italic + regular)
  - Read source score.json, iterate all svgElements
  - For each SVG with Crimson Pro <text>:
    - Parse all <text> elements (handle Formats A, B, C)
    - Skip serif text (Format D)
    - Convert each <text>→<path> using opentype.js
    - Re-encode as base64 data URL
  - Write modified score to builds/performance/score.json (NOT source)
  - Report: SVGs scanned, SVGs modified, text elements converted, any errors
  → A/B COMPARISON SETUP:
    1. Keep current (unmodified) build on port 3001:
       node scripts/performance_server.js
    2. Serve the converted build on port 3002:
       node -e "...static server..." on builds/performance-test/
    3. Open BOTH in browser side by side at same pages
  → 👁️ GUT CHECK (human): Compare these specific pages:
    - Page 1 (notation SVGs — overall look)
    - A page with pizz./b.b. (LilyPond Format B)
    - A page with secco/Non-Vib (assembly engine Format A)
    - A page with ricochet/col legno battuto (Inkscape Format C)
    - A page with tuplet numbers (serif Format D — must be UNCHANGED)
    - Scroll through 5-10 random pages looking for anything off
    Must look IDENTICAL to current build. Any visible difference = STOP.
  → STOP HERE until human confirms converted build looks correct.

Stage 3: Integration — Add to Build Pipeline
  - Move conversion logic into build_performance_app.js
  - Insert between "Copy score JSON" and "Copy staff header SVGs"
    (L1061-1064 in current build script)
  - Instead of fs.copyFileSync, do: read → convert → write
  - Add opentype.js to package.json dependencies
  - Clean up: delete temporary scripts (_test_text_to_path.js, _convert_svg_text.js)
  → GUT CHECK: Full build from scratch:
    node scripts/build_performance_app.js
    Serve and verify same spot-checks as Stage 2
  → Regression: Full score play/stop/page-turn, parts mode, all modes
  → If all passes: commit
```

#### Revert Path

At ANY point, reverting is trivially clean:
```bash
# Source score JSON is NEVER modified. To revert:
node scripts/build_performance_app.js
# This copies untouched scores/2295-FinalScore-preVersioning.json
# → builds/performance/score.json. Done — score is exactly as before.
```
If Stage 3 (integration) is completed and later found to cause issues:
- Remove the text-to-paths step from `build_performance_app.js`
- Rebuild. The plain copy restores the original SVG data URLs.
- No source data, no client code, no other build steps are affected.

#### What This Does NOT Affect (Regression Safety)

This implementation is **extremely well-isolated**. It modifies ONE thing:
the `svgDataUrl` strings inside `builds/performance/score.json`.

- **Client rendering code**: Unchanged. `SVGElementManager` creates `<image>` elements
  and sets `href` to the data URL. It doesn't parse the SVG content. Whether the SVG
  contains `<text>` or `<path>`, the browser renders it identically from the client's
  perspective.
- **Score layout/positioning**: Unchanged. Element positions in the score (startSeconds,
  track, etc.) are separate fields in svgElements[]. The svgDataUrl is just the visual
  content.
- **Curves, LineWedges, GCs, Badges, Motives**: Completely separate data arrays.
  Not in svgElements. Not affected.
- **Animation, sync, gestures, overlay, MiniMap**: These systems don't read svgDataUrl
  at all. They work with time positions and page numbers.
- **Parts mode**: Parts filtering works on `el.track` field, not SVG content.
- **Print PDF generation**: Puppeteer screenshots the rendered page. If SVGs render
  correctly on screen, they render correctly in PDF.
- **Source score JSON**: Never modified. Only `builds/performance/score.json` changes.
  Workshop at :5000 is completely unaffected.

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

---

## Phase 10 Pre-Implementation Protocol

**Spec:** §13.4 Phase 10: Sync & Animation — Tier 2 (pipeline plan L3763-3816)
**Goal:** Production-ready sync for rehearsals with real performers. Monotonic clock with slewing, adaptive ping rate, quality metric UI, graceful offline degradation.

### Step 1: System Inventory — What Are We Touching?

| System | What it does | Where it lives | State reads | State writes | Phase 10 interaction |
|--------|-------------|----------------|-------------|--------------|---------------------|
| **ClockSync** | WebSocket-based time sync. Pings server, calculates offset, provides `now()`. | Workshop source (patched by `build_performance_app.js` Patches 1d–1f) | `syncSamples[]`, `_rttSamples[]`, `roundTripTime`, `clockOffset` | `_perfBase`, `_syncBase`, `clockOffset`, `connected` | **Primary target.** Add slewing to `now()`, adaptive ping interval, quality metric. |
| **ClockSync._updateSyncUI** | Green/yellow/red dot showing connection state. | Patch 1e-b (build L448-467) | `connected`, `_perfInitialized`, `roundTripTime`, `clockOffset` | DOM: `#syncStatusDot` | **Upgrade:** Replace 3-state dot with 4-level quality metric based on offset variance. |
| **ClockSync._burstResync** | Burst 5 pings at 50ms on connect/reconnect. | Patch 1e-b (build L424-435) | — | `requestPing()` calls | **Extend:** Also fires on reconnect after offline period. |
| **ClockSync._applyDriftStep** | Smooth drift correction via `_syncBase` adjustment over 30 frames. | Patch 1e-b (build L438-446) | `_driftCorrection.remaining`, `.perStep` | `_syncBase` | **Replace:** Integrate into MonotonicScoreClock slewing. |
| **ScoreTime** | Score playback clock. `now()` returns current score position in ms. | Workshop source | `isPlaying`, `scoreTimeOffset` | `scoreTimeOffset` | **Consumer** of ClockSync corrections. |
| **AnimationEngine** | rAF loop with subscriber pattern. | Patched in Phase 2 (AE1-AE3) | Subscribers array | Calls subscriber fns each frame | **No changes needed** — already uses subscriber pattern (Step 10.7 ✅). |
| **Canvas overlay** | Renders cursors, GC balls, followers on HTML5 canvas. | `performance_canvas_patches.js` | Section dimensions, cursor position | Canvas draw calls | **No changes needed** — already GPU-composited (Step 10.6 ✅). |

### Step 2: Source Reading — What Already Exists

**Already implemented (Phase 2/6):**
- ✅ **Step 10.5** (rAF dual-clock): `performance.now()` anchoring in `ClockSync.now()` (Patch 1d). `_perfBase` + `_syncBase` architecture already separates local clock from server verification.
- ✅ **Step 10.6** (CSS transforms/GPU): Canvas overlay renders all animated elements. Zero per-frame SVG mutations. `will-change` not needed since canvas is inherently composited.
- ✅ **Step 10.7** (Subscriber pattern): `AnimationEngine.subscribe(name, fn, priority)` already in place (Patches AE1, AE3a-c).

**Partially implemented:**
- 🔶 **Step 10.1** (MonotonicScoreClock): `performance.now()` is monotonic locally, but `_syncBase` can jump on each `calculateSync()` call. Spec requires slewing (rate adjustment) instead of jumps. Current `_applyDriftStep` does gradual correction for server drift checks but `calculateSync` re-anchors abruptly.
- 🔶 **Step 10.3** (Sync quality UI): Basic 3-state dot exists (green/yellow/red = synced/connecting/disconnected). Spec wants 4-level quality metric from offset variance (excellent/good/fair/poor) with RTT and drift tooltip.
- 🔶 **Step 10.4** (Graceful degradation): Disconnect handler exists, dot goes red. Missing: "OFFLINE — local clock" banner, auto-dismiss on reconnect.

**Not yet implemented:**
- ❌ **Step 10.2** (Adaptive sync rate): Pings are at fixed interval. Spec: variance < 5ms → slow to 10s; variance > 20ms → speed to 200ms.

### Step 3: Contracts

**MonotonicScoreClock.now():**
- **Precondition:** `_perfInitialized === true` (at least one sync completed)
- **Postcondition:** Return value ≥ any previous return value (strict monotonicity)
- **Invariant:** Corrections applied as rate slewing, never backward jumps. If server says we're 50ms ahead, clock slows down slightly over ~500ms rather than jumping back.

**Adaptive sync rate:**
- **Precondition:** At least 3 offset samples exist
- **Postcondition:** `_pingInterval` is between 200ms (unstable) and 10000ms (stable)
- **Invariant:** Variance computed from last N offset deltas. Transitions are smooth (not ping-ponging between rates).

**Sync quality metric:**
- **Postcondition:** Quality is one of: excellent (variance < 5ms), good (< 10ms), fair (< 20ms), poor (≥ 20ms)
- **Display:** Colored dot + tooltip with RTT, offset, variance, quality label

**Offline banner:**
- **Precondition:** `connected === false` for > 5 seconds
- **Postcondition:** Non-intrusive banner visible. Score continues on local clock.
- **On reconnect:** Banner disappears, burst resync fires, quality metric updates.

### Step 4: Risk Register

| Risk | Likelihood | Impact | Detection | Mitigation |
|------|-----------|--------|-----------|------------|
| Slewing makes clock inaccurate after large correction | Medium | Medium | Sync quality metric shows poor; position drift visible | Cap slew rate (max 2× or 0.5× speed). Large jumps (>500ms) override slewing with a hard reset. |
| Adaptive ping rate oscillates (variance crosses threshold repeatedly) | Low | Low | Console log shows rapid interval changes | Hysteresis: different thresholds for speeding up vs slowing down |
| Offline banner appears during brief network hiccups | Medium | Low | Banner flashing | 5-second debounce before showing banner |
| Performance regression from variance computation | Very Low | Low | Frame timing | Compute variance only on new sync sample, not every frame |

### Step 5: Staged Implementation Plan

```
Stage 1: MonotonicScoreClock — monotonicity guard ✅
  DECISION: Slewing (rate multiplier) was attempted and caused visible
  stutter — the rate persisted between sync samples, distorting playback
  speed for seconds at a time. Reverted to Phase 6 direct re-anchoring
  (which works well because weighted averaging keeps jumps to 1-5ms).
  Added _lastNow monotonicity guard: now() never returns a value less
  than its previous return. This satisfies the spec's core requirement
  (strict monotonicity) without the risk of rate-based distortion.
  Slewing could be revisited with a proper time-bounded decay if needed.
  → TEST: Human confirmed playback smooth after revert. ✅

Stage 2+3: Adaptive sync rate + sync quality UI ✅
  Combined into one stage (Stage 2 has no human-visible output).
  - Variance computed in calculateSync from recent offset samples.
  - Ping interval adjusts with hysteresis: stable→10s, unstable→200ms.
  - Replaced fixed setInterval(5000) with dynamic _schedulePing() (Patch 1g).
  - Sync dot upgraded: 4-level quality (excellent/good/fair/poor) with
    detailed tooltip (RTT, offset, variance, quality, ping interval).
  - Dot hidden in offline stub mode (window._OFFLINE_STUB flag).
  - NOTE: Dev-env edge case — dot appears on port 3001 when port 3000
    server is also running (browser caches Socket.IO client JS). Not a
    production issue; only happens with both servers on localhost.
  → TEST: Human confirmed dot + tooltip on port 3000. ✅

Stage 4: Graceful degradation — offline banner ✅
  - "OFFLINE — local clock" banner appears after 5s disconnect debounce.
  - Non-intrusive: black bar at top, yellow text, pointer-events:none.
  - Auto-dismisses on reconnect (fade out 300ms) + burst resync fires.
  - Score continues playing on local performance.now() clock during offline.
  - KNOWN: Server restart (fresh state) stops playback on reconnect.
    This is correct (server is authoritative). Wi-Fi drop with server
    still running would reconnect seamlessly. Server-crash recovery
    deferred to Phase 11 (Performance Mode / emergency recovery).
  → TEST: Human confirmed kill→banner→restart→dismiss cycle. ✅

Stage 5: Integration verification ✅
  All stages verified together on port 3000.
  → Playback smooth, page turns correct, no regressions.
  → Sync dot shows quality metric with tooltip.
  → Offline banner appears/dismisses correctly.
  → Phases 1-9 features unaffected.
```

### Step 6: Key Files

| File | Role | Changes needed |
|------|------|---------------|
| `scripts/build_performance_app.js` | Build patches for ClockSync | Modify Patches 1d, 1d-b, 1e-b for slewing, adaptive rate, quality metric, banner |
| `scripts/performance_server.js` | Server-side sync | May need `scorePositionCheck` interval adjustment |
| `builds/performance/index.html` | Built output | Rebuilt after each stage |

---

## Phase 11: Performance Mode — Pre-Implementation Protocol (§13.2.7)

### Step 1: System Inventory — What Are We Touching?

Phase 11 adds performance mode: complete touch lockdown, readiness check, countdown, auto-stop, emergency controls, tab recovery, Service Worker, Wake Lock, and end-of-performance ceremony. This touches or extends 8 existing systems and adds 6 new ones.

#### Existing Systems Modified

| System | File | What it does | State reads | State writes | Callers | Callees |
|--------|------|-------------|-------------|-------------|---------|---------|
| **RehearsalGestures** | `performance_rehearsal_patches.js:28-396` | Pointer event system: swipe, tap, pinch, long-press | `pointers`, `pointerCount`, `isPinching`, `container` | Same + DOM events | ScoreContainer pointer events | `nextPage`, `prevPage`, `togglePlayPause`, `ControlsOverlay.toggle`, `ScoreZoom.setZoom` |
| **ControlsOverlay** | `performance_rehearsal_patches.js:460-763` | Floating touch panel: play/stop, page nav, goto, zoom | `overlay` DOM element, fade timer, page info | DOM visibility, fade state | `RehearsalGestures.onCenterTap`, marker/loop systems | `CursorControls.toggleGoStop`, `GraphicTimeline.onGoto`, `RehearsalGestures.nextPage/prevPage` |
| **AnnotationSystem** | `performance_annotation_patches.js` | SVG overlay for freehand, stamps, text | `_annotMode`, pen/mouse state, annotation data | SVG overlay DOM, localStorage | Pen events, toolbar buttons | localStorage, SVG DOM |
| **performance_server.js** (room state) | `performance_server.js:322-392` | Room-based sync: isPlaying, scoreTime, leader, loop | `rooms` Map, room.isPlaying, room.leaderId, etc. | Same | Socket.IO events | `io.to(roomId).emit(...)`, `getRoomScoreTimeMs()` |
| **performance_server.js** (leader system) | `performance_server.js:393-435` | Leader election, transfer, gating | `room.leaderId`, socket.id | `room.leaderId` | `joinRoom`, `disconnect`, `scoreGo/Stop/Goto`, `setLeader` | `assignLeader`, `transferLeaderOnDisconnect`, `io.to().emit('leaderChange')` |
| **performance_server.js** (joinRoom reset) | `performance_server.js:552-560` | Reset to zero when first client joins empty room | `room.clientCount` | `room.currentScoreTimeMs`, `room.isPlaying` | `joinRoom` handler | — |
| **ClockSync** (client) | `build_performance_app.js` patches | Clock sync, adaptive ping, quality UI, offline banner | `clockOffset`, `_perfInitialized`, `connected`, `_offsetVariance` | Same + sync dot DOM, offline banner DOM | AnimationEngine (via `ClockSync.now()`), socket events | `requestPing`, `_updateSyncUI`, `_showOfflineBanner` |
| **GraphicTimeline** | `public/index.html:~5860-7800` | Page calculation, cursor positioning, page turns | `currentTopPage`, `currentBottomPage`, tempo vars | Same + SVG transforms | AnimationEngine subscriber, `onGoto` | `getSecondsPerPage()`, `calculateTotalPages()`, `checkPageChange()` |

#### New Systems Added

| System | Where | Purpose |
|--------|-------|---------|
| **PerformanceMode** | New IIFE in `performance_rehearsal_patches.js` or new file | Mode state machine: rehearsal ↔ performance. Lockdown flag, readiness tracking, countdown, ceremony |
| **Auto-stop timer** | `performance_server.js` | Server calculates total score duration, sets timer on `scoreGo`, emits `scoreStop` with `reason: 'end-of-score'` |
| **Emergency controls** | Client-side in PerformanceMode | Three-finger tap (leader menu), three-finger long-press 2s (all-performer emergency stop) |
| **Service Worker** | New `builds/performance/sw.js` | Cache index.html, score.json, SVGs for offline reload |
| **Wake Lock** | Client-side in PerformanceMode | `navigator.wakeLock.request('screen')` during performance |
| **Tab recovery** | Client-side in PerformanceMode | `visibilitychange` listener, burst re-sync, "Reconnecting..." overlay |

### Step 2: Source Reading — Understand Before Overriding

#### RehearsalGestures — Lockdown entry points

Every gesture goes through `onPointerDown` → `onPointerMove` → `onPointerUp`. The `onPointerUp` method (line 142) evaluates: tap vs swipe vs pinch. A single guard at the top of `onPointerDown` would block ALL gestures except emergency (3-finger).

Key observation: `pointerCount` tracks active fingers. We need 3-finger detection, which means we must let `onPointerDown` count to 3 before checking for emergency gestures. So the lockdown guard must be in `onPointerUp` (for taps/swipes) and `startPinch` (for zoom), NOT in `onPointerDown`.

Apple Pencil (`pointerType === 'pen'`) is already filtered at line 92. Performance mode must also block pen events (annotation disabled).

#### ControlsOverlay — Suppression

`ControlsOverlay.toggle()` is called by `RehearsalGestures.onCenterTap()`. In performance mode, center tap is blocked by the gesture lockdown. But the overlay can also be shown programmatically. The overlay DOM should be hidden (display: none) in performance mode as a second safety layer.

#### Server joinRoom reset — Performance mode bypass

Lines 552-560: when `room.clientCount === 0`, room resets to zero. The Phase 11 note in the spec explicitly says: "Performance mode must override this: when `?mode=performance` is active, the server should preserve the frozen score position during the full grace period." This means room state needs a `mode` field ('rehearsal' | 'performance'), and the reset logic checks it.

#### Score duration calculation

`GraphicTimeline.getSecondsPerPage()` = `(beatsPerPage / beatsPerMinute) * 60`. Default: `(8/60)*60 = 8` seconds/page. Total pages computed in `computeTotalPages()` (performance_rehearsal_patches.js:565-602) by scanning SVG elements for max endSeconds. Server needs this same computation OR the client sends total duration on readiness confirmation.

Simpler approach: client computes total duration client-side and reports it during readiness. Server uses leader's reported duration. This avoids duplicating score-parsing logic on the server.

### Step 3: Contract Documentation

#### PerformanceMode state machine

```
States: REHEARSAL → READINESS → STAGED → COUNTDOWN → PLAYING → CEREMONY
                                                          ↓
                                                    EMERGENCY_STOP → (leader resumes or exits)

Preconditions per transition:
  REHEARSAL → READINESS:  Leader activates performance mode (URL param or control)
  READINESS → STAGED:     All expected performers show ✅, leader taps "Begin Performance"
  STAGED → COUNTDOWN:     Server verifies all connected, broadcasts performanceGo
  COUNTDOWN → PLAYING:    Countdown reaches 0, latency-compensated start fires
  PLAYING → CEREMONY:     Auto-stop timer fires (end of score), OR leader manual stop
  PLAYING → EMERGENCY_STOP: Any performer 3-finger long-press 2s
  EMERGENCY_STOP → PLAYING: Leader taps "Resume" from emergency menu
  Any → REHEARSAL:        Leader exits performance mode
```

Invariants:
- `performanceLocked === true` in states COUNTDOWN, PLAYING, EMERGENCY_STOP, CEREMONY
- `performanceLocked === false` in states REHEARSAL, READINESS (partially — readiness panel interactive)
- All gesture handlers return immediately when `performanceLocked === true` EXCEPT 3-finger tap/hold
- Auto-stop timer is active ONLY in PLAYING state; cancelled on any stop/goto/emergency
- Wake Lock held from COUNTDOWN through CEREMONY
- Fullscreen entered on performer's "Ready" tap (requires user gesture)

#### Auto-stop contract

Preconditions: room.isPlaying === true, totalDurationMs > 0
Postconditions: room.isPlaying === false, all clients receive scoreStop with `reason: 'end-of-score'`
Invariant: timer cancelled on manual stop, emergency stop, scoreGoto, or disconnect-all

#### Emergency stop contract

Preconditions: performance mode active, any performer holds 3 fingers for 2s
Postconditions: ALL clients stop, red flash "EMERGENCY STOP at X:XX", score frozen
Invariant: emergency stop works regardless of leader status (any performer can trigger)

### Step 4: Risk Register

| Risk | Probability | Impact | Detection | Mitigation |
|------|------------|--------|-----------|------------|
| Gesture lockdown misses a code path | Medium | High — accidental page turn during concert | Immediate visual | Guard at `onPointerDown` level + `onPointerUp` level + `ControlsOverlay` hidden |
| Fullscreen API rejected (user gesture required) | High | Medium — performers see browser chrome | Visual — URL bar visible | Fullscreen on "Ready" tap (guaranteed user gesture); re-enter on `performanceGo` |
| Wake Lock not supported (older iOS) | Low | Low — screen dims but score continues | Visual — screen goes dark | Graceful degradation — log warning, no crash |
| Service Worker caching stale version | Medium | High — wrong score loaded | Hard to detect | Version hash in SW, `skipWaiting()`, cache-bust on build |
| Auto-stop timer drift on long pieces | Low | Medium — stops 100ms early/late | Timing check | Use server time (`Date.now()`) not setTimeout accuracy; verify with position check |
| 3-finger gesture conflicts with iPad gestures | Medium | High — triggers iOS app switcher | iPad-specific testing | CSS `touch-action: none` already set; may need `gesturestart` preventDefault |
| Server restart during performance | Low | Critical — all state lost | Red dot + offline banner | Phase 10 already handles; Phase 11 adds grace period bypass for performance mode |
| joinRoom reset during performer reconnect | Medium | High — position lost mid-concert | Score jumps to zero | Performance mode bypass: skip reset when `room.mode === 'performance'` |
| Countdown fires but not all clients received it | Low | High — some performers start late | Sync quality check | Server verifies all sockets in room received `performanceGo` before countdown |

### Step 5: Staged Implementation Plan

```
Stage 0: Auto-stop at end of score (§12.11.6)
  Server: calculate totalDurationMs from room tempo + client-reported page count.
  On scoreGo: set timer for (totalDurationMs - currentPositionMs).
  Timer fires → emit scoreStop({ reason: 'end-of-score' }).
  Client: show "End of Score" indicator on reason === 'end-of-score'.
  Cancel timer on manual stop, emergency stop, scoreGoto.
  → TEST: Play from near end → auto-stops. Manual stop → no double-stop.

Stage 1: Mode switching + complete lockdown (§12.11.1, §12.11.3)
  Add PerformanceMode object with state machine.
  URL param ?mode=performance activates.
  performanceLocked = true → ALL gesture handlers return (tap, swipe, pinch, long-press).
  ControlsOverlay disabled. Annotation pen disabled.
  3-finger tap (leader) → emergency menu.
  3-finger long-press 2s (anyone) → emergency stop.
  → TEST: In perf mode: tap/swipe/pinch → no response. 3-finger → works.

Stage 2: Pre-performance readiness check (§12.11.2)
  Leader readiness panel: performer slots, connection status, sync quality.
  Each performer taps "Ready" → triggers fullscreen on THEIR device.
  Server tracks performerReady per socket.
  Leader's "Begin Performance" enables when all green.
  → TEST: Ready tap → fullscreen. Panel shows status. Button disabled until all ready.

Stage 3: Go sequence + countdown (§12.11.2)
  Leader confirms → server broadcasts performanceGo.
  Client: lockdown on, re-enter fullscreen, show 5-4-3-2-1 countdown overlay.
  Score visible behind semi-transparent overlay.
  Latency-compensated start: schedule at ClockSync.now() + leadInMs.
  Leader can cancel during countdown.
  → TEST: Countdown on all clients. Score starts simultaneously. Cancel works.

Stage 4: Emergency controls (§12.11.3)
  Leader 3-finger tap → overlay with Stop, Restart, Jump, Resume.
  All-performer 3-finger long-press 2s → emergencyStop broadcast.
  Red flash "EMERGENCY STOP at X:XX" on all devices.
  Menu auto-closes after 10s.
  → TEST: Emergency stop broadcasts. Menu works. Non-leader can't open menu.

Stage 5: Tab recovery (§12.11.1b, §12.11.5)
  visibilitychange listener: on visible → burst re-sync, verify socket, verify fullscreen.
  "Reconnecting..." overlay clears when sync quality reaches "good".
  Handle staged/playing state on recovery.
  → TEST: Background 30s → foreground → recovers. Background 5min → same.

Stage 6: Service Worker + Wake Lock (§12.11.4)
  SW caches index.html, score.json, SVGs.
  Wake Lock acquired on performance start, released on end.
  localStorage session recovery: auto-rejoin on reload.
  → TEST: SW installed, cache works. Wake Lock prevents dimming.

Stage 7: End of performance ceremony (§12.11.7)
  After auto-stop: "Performance Complete" overlay after 2s delay.
  Shows duration, timestamp. Leader options: Return to Rehearsal, Start Again, Close.
  Performance log saved to server.
  Wake Lock released, fullscreen exits.
  → TEST: Auto-stop → ceremony. Leader options work. Log saved.
```

### Step 6: Key Files

| File | Role | Changes needed |
|------|------|---------------|
| `scripts/performance_rehearsal_patches.js` | Gesture system, controls overlay | Add lockdown guard to RehearsalGestures, PerformanceMode IIFE, emergency gestures, countdown/ceremony overlays |
| `scripts/performance_server.js` | Room state, events | Add performanceMode to room state, auto-stop timer, readiness tracking, performanceGo/emergencyStop events, grace period bypass |
| `scripts/build_performance_app.js` | Build pipeline | May need new patches for client-side perf mode init, or inject via rehearsal patches |
| `builds/performance/sw.js` | Service Worker | New file — cache strategy for offline reload |
| `docs/IMPLEMENTATION_PROGRESS.md` | Documentation | Stage-by-stage completion tracking |

### Step 7: Integration Verification

Phase 11 Completion Checkpoint (from pipeline plan):
- 🤖 Performance mode locks down ALL touches correctly
- 🤖 Readiness check, Go sequence, countdown, auto-stop, emergency stop/menu, tab recovery, Service Worker, Wake Lock all functional
- 🤖 Two scenarios tested: standard setup AND backgrounded-tab recovery
- 👁️ **Human verification (on tablet/iPad):** Performance mode feels completely safe — no accidental triggers. Countdown is clear. Emergency stop works from any device. Recovery from network loss and app switch is seamless. End-of-performance ceremony is clean.
- **Regression:** Rehearsal mode still works when not in performance mode. All Phases 1-10 features unaffected.

---

## Phase 13 Pre-Implementation Protocol

**Spec:** §13.4 Phase 13: Sync & Animation — Tier 3 (pipeline plan L3952-3994)
**Goal:** Incremental refinements for highest-quality live performance sync. NTP-style offset, server heartbeat, latency-compensated starts, predictive rendering, and (conditionally) compositor cursor.

**⚠️ CRITICAL CONTEXT — Phase 10 Slewing Failure:**
Phase 10 Stage 1 attempted slewing (rate multiplier) to gradually correct clock offsets. The rate persisted between sync samples, distorting playback speed for seconds at a time → visible stutter. Reverted to direct re-anchoring + `_lastNow` monotonicity guard. **Rule for Phase 13:** No changes that alter how time *flows*. Only changes that improve the *accuracy* of offset calculation or the *timing* of state transitions.

### Step 1: System Inventory — What Are We Touching?

| System | What it does | Where | State | Phase 13 interaction |
|--------|-------------|-------|-------|---------------------|
| **ClockSync.calculateSync()** | Offset calc with outlier rejection + weighted avg | `build_performance_app.js` Patch 1d-b (L301-369) | `syncSamples[]`, `_rttSamples[]`, `clockOffset`, `_perfBase`, `_syncBase` | **13.1:** Add NTP best-quartile selection before weighted avg |
| **ClockSync.now()** | Monotonic time via `performance.now()` anchoring | `build_performance_app.js` Patch 1d (L265-299) | `_perfBase`, `_syncBase`, `_lastNow` | **No changes.** Time flow mechanism stays exactly as-is. |
| **ClockSync._burstResync()** | 5 rapid pings on connect/reconnect | `build_performance_app.js` Patch 1e-b (L458-469) | — | **13.2:** Also fires after heartbeat loss recovery |
| **ClockSync._updateSyncUI()** | 4-level quality dot | `build_performance_app.js` Patch 1e-b (L519-554) | `_syncQuality`, `_offsetVariance` | **13.2:** Show heartbeat status in tooltip |
| **Server scoreGo handler** | Broadcasts `scoreGo` with `scoreTimeOffset`, `serverTime` | `performance_server.js` L764-788 | Room state | **13.3:** Add `scheduledStartTime` field |
| **Server scorePositionCheck** | Authoritative position every 3s during playback | `performance_server.js` L1133-1141 | Room state | **No changes.** |
| **Offline stub scoreGo** | Local stub mimicking server | `build_performance_app.js` L100-160 | `_scoreTimeMs`, `_isPlaying` | **13.3:** Add `scheduledStartTime` to stub output |
| **StaffCursors canvas** | Per-frame cursor/GC drawing on HTML5 Canvas | `performance_canvas_patches.js` O3b-O3c | Canvas context | **13.4:** See architectural conflict below |
| **AnimationEngine** | rAF loop, subscriber pattern | Workshop source (AE1-AE3) | Subscribers array | **13.5:** Frame budget offset in position calc |

### Step 2: Source Reading Summary

**ClockSync.calculateSync() (Patch 1d-b, L312-369):**
- Receives offset sample + RTT from ping/pong cycle
- Outlier rejection: discards RTT > 2× median (needs ≥3 samples)
- Adds to `syncSamples[]` and `_rttSamples[]` (capped at `maxSamples`)
- Weighted average: `weight = 1 / (1 + rtt)` — lower RTT = higher influence
- Re-anchors `_perfBase = performance.now()`, `_syncBase = clientReceiveTime + clockOffset`
- Computes `_offsetVariance` (stddev) for adaptive ping + quality UI
- Adjusts `_pingInterval` with hysteresis

**Server scoreGo (L764-788):**
- Leader-gated. Sets `room.scoreTimeOffset = now - room.currentScoreTimeMs`
- Broadcasts to room: `{ isPlaying, scoreTimeOffset, currentScoreTimeMs, serverTime }`
- `serverTime` already included — Step 13.3 just adds `scheduledStartTime`

**Performance mode countdown (L1035-1070):**
- Already uses scheduled start: `goTime = Date.now() + COUNTDOWN_SECONDS * 1000`
- Broadcasts `goTime` to clients, server fires `scoreGo` after timeout
- This is partially latency-compensated — clients show countdown, but `scoreGo` arrives at different times

**StaffCursors canvas (performance_canvas_patches.js):**
- Phase 2 moved ALL cursor rendering from SVG elements to HTML5 Canvas overlay
- `update()` subscriber clears canvas → draws cursor line → draws GC balls → draws followers
- Canvas is GPU-composited (CSS `will-change: transform`, parent has `contain: strict`)
- **No HTML element exists for the cursor** — it's a canvas draw call

### Step 3: Contracts

**NTP-style offset (13.1):**
- **Precondition:** ≥4 sync samples exist (need enough for best-quartile to be meaningful)
- **Postcondition:** `clockOffset` is tighter (lower variance) than current weighted-only approach
- **Invariant:** `ClockSync.now()` behavior unchanged. Only the offset VALUE changes, not how it's applied.

**Heartbeat (13.2):**
- **Precondition:** Connected to real server (not stub)
- **Postcondition:** Disconnect detected within 3s (vs Socket.IO's 25s default)
- **Invariant:** Does NOT fire in offline stub mode. Does NOT affect sync accuracy — only detection speed.

**Latency-compensated starts (13.3):**
- **Precondition:** `ClockSync.now()` returns accurate server time estimate
- **Postcondition:** All connected clients start playback within ~5ms of each other
- **Invariant:** Backward-compatible — if `scheduledStartTime` is missing, client starts immediately (current behavior)

**Predictive rendering (13.5):**
- **Precondition:** rAF callback provides high-resolution timestamp
- **Postcondition:** Cursor position accounts for frame budget (paint happens ~8ms after calc)
- **Invariant:** Page boundaries still trigger at correct time (no overshoot)

### Step 4: Risk Register

| Risk | Likelihood | Impact | Detection | Mitigation |
|------|-----------|--------|-----------|------------|
| NTP quartile selection makes offset WORSE with few samples | Medium | Low | Sync quality metric drops from "good" to "fair" | Fallback: if <8 samples, use current full-weighted average |
| Heartbeat overhead on server with many rooms | Low | Low | CPU usage increase | Heartbeat is a tiny event — ~100 bytes × 2/sec per room. Negligible. |
| Latency-compensated start fires too late (delay < 0) | Low | Medium | Score doesn't start | Fallback: if delay ≤ 0, start immediately (already in spec) |
| Latency-compensated start breaks offline stub | Medium | High | Play button doesn't work | Stub must also emit `scheduledStartTime` — test stub path |
| Predictive rendering overshoots page boundary | Low | Medium | Page turns slightly early | Clamp predicted position at page boundary |
| **Web Animations API conflicts with canvas cursor (13.4)** | **HIGH** | **HIGH** | Cursor disappears or doubles | **See architectural conflict below — DEFER** |
| Any change causes playback jitter (Phase 10 repeat) | Medium | HIGH | Stutter during playback | **Human gate after EVERY stage. Revert immediately if jitter appears.** |

### ⚠️ Architectural Conflict: Step 13.4 (Web Animations API Cursor)

**Problem:** Phase 2 moved the cursor to an HTML5 Canvas overlay. The Web Animations API requires an HTML/SVG element (it animates DOM elements via `element.animate()`). There is no DOM element for the cursor — it's a `ctx.fillRect()` call on a canvas.

**Options:**
a) Create a thin HTML `<div>` overlay for the cursor line, animated by Web Animations API. Canvas still draws GC balls, followers, pies. → Adds a DOM element back, partial regression from Phase 2.
b) Skip Step 13.4 entirely. Canvas rendering is already GPU-composited and immune to SVG mutations. The compositor benefit of Web Animations API is largely already achieved by the canvas approach.
c) Defer to real-world profiling. If main-thread jank is visible on performance devices, revisit.

**Recommendation: Option (b) — SKIP Step 13.4.** The canvas overlay already achieves the goal (compositor-thread rendering, no SVG mutations). The Phase 10 slewing failure teaches us not to change working rendering mechanisms without proven need. Steps 13.1-13.3 + 13.5 provide meaningful improvements without this risk.

### Step 5: Staged Implementation Plan

```
Stage 1: NTP-style offset calculation (LOW risk)                    ⬅ START HERE
  - In calculateSync(), sort samples by RTT, take best quartile
  - Only activate when ≥8 samples exist; fallback to full weighted avg otherwise
  - No change to ClockSync.now() — only offset accuracy improves
  → BUILD + SERVE
  → 🤖 AI: Verify sync quality metric still works, offset variance same or better
  → 👁️ HUMAN GATE: Load full score. Play for 30+ seconds. Cursor smooth?
    Page turns work? Stop/resume work? Compare to pre-change behavior.
    PASS = no visible difference or improvement. FAIL = any stutter or regression.

Stage 2: Server heartbeat/watchdog (LOW risk)
  - Server: emit 'heartbeat' every 500ms with seq + serverTime
  - Client: track lastHeartbeat, detect 3s gap → show warning, trigger burstResync
  - Skip in offline stub mode (no real server to heartbeat)
  - Update sync UI tooltip to show heartbeat status
  → BUILD + SERVE
  → 🤖 AI: Verify heartbeat events flowing, no errors
  → 👁️ HUMAN GATE: Play score normally — identical to Stage 1 behavior?
    Kill the server mid-playback — offline banner appears within ~5s (existing)
    but heartbeat detection should trigger sooner. Restart server — recovery.
    PASS = normal playback unaffected, faster disconnect detection.

Stage 3: Latency-compensated starts (MEDIUM risk)
  - Server scoreGo: add scheduledStartTime = now + 150ms
  - Client scoreGo handler: setTimeout to start at scheduledStartTime
  - Offline stub: also include scheduledStartTime in scoreGo trigger
  - Backward-compat: if scheduledStartTime missing, start immediately
  - Performance mode countdown: already has scheduled mechanism, verify no conflict
  → BUILD + SERVE
  → 🤖 AI: Verify stub path still works (Play/Stop via offline)
  → 👁️ HUMAN GATE #1 (offline): Load at localhost:3001 (stub mode).
    Play/Stop multiple times. Goto + Play. Loop + Play. All smooth?
    PASS = identical to pre-change behavior.
  → 👁️ HUMAN GATE #2 (server, 2 devices): Load on 2 devices via server.
    Press Play — both cursors start simultaneously (from first frame).
    PASS = visually simultaneous start. Pre-change: slight offset visible.

Stage 4: Predictive rendering (LOW risk)
  - In AnimationEngine subscriber or StaffCursors.update():
    add +8ms (half frame at 60Hz) to position calculation
  - Clamp at page boundaries to prevent overshoot
  - This is a ~4-8ms position nudge — subtle, may not be visible
  → BUILD + SERVE
  → 🤖 AI: Verify no page boundary overshoot, position calc correct
  → 👁️ HUMAN GATE: Play full score. Cursor smooth? Page turns correct?
    If any doubt, A/B compare by reverting the +8ms offset.
    PASS = no regression. FAIL = any visible jitter or early page turns.

Step 13.4 (Web Animations API cursor): DEFERRED
  - Canvas overlay already provides compositor-level rendering
  - Architectural conflict with Phase 2 canvas migration
  - Revisit only if profiling on performance devices shows main-thread jank
```

### Step 6: Files Modified

| File | Role | Changes needed |
|------|------|---------------|
| `scripts/build_performance_app.js` | Build patches for ClockSync | Stage 1: modify Patch 1d-b for NTP quartile. Stage 4: position offset in animation loop. |
| `scripts/performance_server.js` | Server-side sync | Stage 2: heartbeat interval. Stage 3: scheduledStartTime in scoreGo. |
| `scripts/performance_rehearsal_patches.js` | Client-side handlers | Stage 3: scheduledStartTime handling in toggleGoStop / scoreGo listener |
| `builds/performance/index.html` | Built output | Rebuilt after each stage |
| `docs/IMPLEMENTATION_PROGRESS.md` | Documentation | Stage-by-stage completion tracking |

### Step 7: Integration Verification

Phase 13 Completion Checkpoint (from pipeline plan, adapted):
- 🤖 NTP offset variance tighter than Tier 2
- 🤖 Heartbeat detection within 3s of server loss
- 🤖 Latency-compensated starts: <5ms difference between clients
- 🤖 Predictive rendering: no page boundary overshoot
- 👁️ **Human verification:** Play on 2+ devices. Cursors are visually aligned. Starts are simultaneous. Normal playback is AT LEAST as smooth as before Phase 13. Nothing is worse.
- **Regression:** All Phase 1-12 features unaffected. Offline stub mode works. Parts mode works. Performance mode works.

---

## Phase 13: Sync & Animation Tier 3 — Implementation Complete

**Date:** Mar 25, 2026

### What Was Built

**Stage 1: NTP-style offset calculation** (LOW risk) ✅
- Best-quartile RTT selection: when ≥8 sync samples exist, sort by RTT, take lowest 25% (most symmetric latency), weighted-average only those
- When <8 samples: falls back to Phase 6 full weighted average
- File: `scripts/build_performance_app.js` (Patch 1d-b replacement)
- **Human gate passed:** Play 30s+, cursor smooth, page turns, stop/resume all correct

**Stage 2: Server heartbeat + watchdog** (LOW risk) ✅
- Server emits `heartbeat` event every 500ms with sequence number and `serverTime`
- Client tracks `_lastHeartbeat` via `performance.now()`, watchdog interval checks every 1s for 3s gap
- Sync dot shows orange "heartbeat lost" if gap detected; tooltip shows heartbeat age
- Heartbeat is a safety net for network-level issues (half-open TCP); Socket.IO disconnect fires first on clean server kill
- Files: `scripts/performance_server.js`, `scripts/build_performance_app.js` (Patch 1e-b)
- **Human gate passed:** Normal playback unaffected; red dot on server kill (Socket.IO disconnect fires before heartbeat gap)

**Stage 3: Latency-compensated starts** (MEDIUM risk) ✅
- Server adds `scheduledStartTime = now + 150ms` to all `scoreGo` emissions (rehearsal play + performance go)
- Client wraps `CursorControls.onScoreGo` — delays start until `scheduledStartTime` (translated via `ClockSync.now()`)
- Safety: if delay is negative (already past) or >5s (stale), falls through immediately
- Offline stub includes `scheduledStartTime = now + 10ms` for compatibility
- Files: `scripts/performance_server.js`, `scripts/performance_rehearsal_patches.js`, `scripts/build_performance_app.js`
- **Human gate passed:** Offline stub play/stop/goto work; 2-tab simultaneous start works; all playback smooth

**Stage 4: Predictive rendering** (LOW risk) ✅
- `StaffCursors.update()` and `GCMaker.update()` add +8ms lookahead to `ScoreTime.now()` during playback
- Compensates for delay between position calculation and browser paint (~half a frame at 60fps)
- Disabled when stopped (exact position)
- File: `scripts/performance_canvas_patches.js`
- **Human gate passed:** Cursor smooth, page turns correct, GC balls track correctly

**Step 13.4 (Web Animations API for cursor): DEFERRED — architectural conflict**
- Phase 2 moved cursor to HTML5 Canvas (no DOM element). Web Animations API requires a DOM element.
- Canvas is already GPU-composited, so the compositor-thread benefit is already achieved.

### Key Design Decision
> **No changes that alter how time *flows*.** Only changes that improve the *accuracy* of offset calculation or the *timing* of state transitions. `ClockSync.now()` was never modified.

### Known Limitations Noted During Testing
- **Loop toggle in independent mode:** Start-loop button requires server; doesn't work when server is dead and client is in independent mode. Pre-existing limitation.
- **Part score reload in offline mode:** Part ↔ Full toggle reloads page; can't fetch if server is dead. Expected behavior.
- **Server restart resets client playback:** In-memory room state lost on server restart. Risk assessed as negligible for AWS deployment (~0.0001% during any concert). Accepted limitation.

### Files Modified
- `scripts/build_performance_app.js` — NTP best-quartile (Patch 1d-b), heartbeat listener + watchdog, heartbeat properties + UI
- `scripts/performance_server.js` — heartbeat interval, `scheduledStartTime` in scoreGo emissions
- `scripts/performance_rehearsal_patches.js` — latency-compensated start wrapper on `CursorControls.onScoreGo`
- `scripts/performance_canvas_patches.js` — predictive rendering (+8ms lookahead)

### Resume Point
Phase 13 complete. Next: speed control (user request), then Phase 14.

---

## Phase 14: Website & Production — Post-Mortem

**Date:** Mar 26, 2026
**Tag:** `phase-14-complete` (pending)
**Scope:** Landing page, documentation, security audit, cloud deployment, production infrastructure
**Workshop impact:** None — `public/index.html` unchanged

---

### Step A: Audit — What Was Planned vs What Was Built

| Step | Plan | Status | Notes |
|------|------|--------|-------|
| 14.0 | Technical Manual (performer guide) | ✅ Done | `docs/technical_manual/index.html` |
| 14.0a | Music Performance Instructions (notation) | ✅ Done | `docs/notation_instructions/index.html` + SVG capture pipeline |
| 14.1 | Hosting infrastructure (VPS, Node.js, PM2) | ✅ Done | Hetzner CPX11, PM2 `sq1-server` |
| 14.2 | Domain & SSL (nginx, Let's Encrypt) | ✅ Done | justinwenloyang.com, HTTPS, auto-renew |
| 14.2a | Security audit | ✅ Done | Commits `272205c3`, `e57d47e9` — helmet, rate limiting, input validation |
| 14.3 | Admin panel (composer dashboard) | ❌ Descoped | Landing page handles room creation; no immediate need |
| 14.4 | Session management UI (performer dashboard) | ✅ Fulfilled | Landing page serves this role: name, instrument, pages, room create/join, rejoin |
| 14.5 | SVG text-to-paths (Crimson Pro font fix) | ✅ Done | Build script converts text→paths via opentype.js (614 converted, 292 SVGs modified) |
| 14.6 | Performance capture/logging | ❌ Descoped | Analytics nice-to-have; zero functional impact |

**Descoped items (14.3 and 14.6)** are documented in the pipeline plan for future revisiting. Neither affects performers or the core product.

---

### Step B: Production Server — Current State (as of Mar 26, 2026)

#### Infrastructure

| Property | Value |
|----------|-------|
| **Provider** | Hetzner Cloud |
| **Plan** | CPX11 (2 vCPU, 2GB RAM, 40GB SSD) |
| **Location** | Ashburn, US East |
| **IP** | 5.161.233.35 |
| **Server name** | sq1-server |
| **OS** | Ubuntu (Debian-based) |
| **Node.js** | v20.20.0 |
| **Domain** | justinwenloyang.com (Cloudflare Registrar) |
| **SSL** | Let's Encrypt via Certbot (auto-renew) |

#### Access

| Method | Command |
|--------|---------|
| **SSH (from Windows)** | `ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35` |
| **SSH key** | `C:\Users\jwloy\.ssh\id_ed25519` (ed25519) |
| **Users** | `root` (SSH login), `deploy` (runs the app) |

#### Server Directory Structure

```
/home/deploy/sq1/                    ← Git sparse clone of elosine/string_quartet_no1-composer
├── .git/                            ← Shallow sparse clone (--depth 1)
├── scripts/
│   ├── performance_server.js        ← Express + Socket.IO server (the ONLY server script)
│   ├── build_performance_app.js     ← Build script (strips Workshop → Performance)
│   ├── performance_canvas_patches.js
│   ├── performance_parts_patches.js
│   ├── performance_rehearsal_patches.js
│   ├── performance_annotation_patches.js
│   └── generate_doc_pdfs.js
├── public/
│   ├── index.html                   ← Workshop source (BUILD INPUT — never served to users)
│   ├── fonts/                       ← CrimsonPro TTF files (for text-to-paths conversion)
│   └── pitchesSVGs/                 ← Pitch SVGs (copied into build output)
├── scores/
│   └── 2295-FinalScore-preVersioning.json  ← Score data (BUILD INPUT — 16 MB)
├── builds/                          ← BUILD OUTPUT (gitignored, rebuilt on server)
│   ├── performance/
│   │   ├── index.html               ← The Performance Score app (~1.2 MB, served at /score)
│   │   ├── score.json               ← Score data with text→paths applied (~14 MB)
│   │   ├── fonts/                   ← Font files (fallback)
│   │   ├── pitchesSVGs/             ← Pitch SVGs
│   │   └── lilypond_code/           ← Staff header SVGs
│   └── print/                       ← Print score PDFs (served at /print/)
├── landing/
│   ├── index.html                   ← Landing page (served at /)
│   └── landing.css
├── docs/
│   ├── notation_instructions/       ← Served at /docs/notation-instructions/
│   └── technical_manual/            ← Served at /docs/technical-manual/
├── lilypond_code/                   ← Staff SVGs + component library (BUILD INPUT)
├── data/                            ← NOT in git — persistent runtime data
│   ├── .jwt-secret                  ← Auto-generated JWT signing key
│   ├── performers/                  ← Per-performer preferences + annotations
│   └── sessions/                    ← Active room session files
├── package.json
├── package-lock.json
└── node_modules/                    ← npm install --production
```

#### What Express Serves (and ONLY what it serves)

| URL Pattern | Server Directory | Content |
|-------------|-----------------|---------|
| `/` | `landing/index.html` | Landing page |
| `/landing/*` | `landing/` | Landing page CSS |
| `/score` | `builds/performance/index.html` | The score app |
| `/*` (static fallback) | `builds/performance/` | score.json, fonts, SVGs |
| `/docs/notation-instructions/*` | `docs/notation_instructions/` | Notation guide |
| `/docs/technical-manual/*` | `docs/technical_manual/` | Technical manual |
| `/print/*` | `builds/print/` | Print score PDFs |
| `/api/sessions/*` | (API routes) | Room create/join/leave |

**Security:** `public/`, `scripts/`, `scores/`, `data/`, `node_modules/` are NOT served. Only `builds/`, `landing/`, `docs/` directories are mounted by Express.

#### Process Management

| Property | Value |
|----------|-------|
| **Process manager** | PM2 |
| **Process name** | `sq1-server` |
| **Systemd service** | `pm2-deploy.service` (auto-start on reboot) |
| **Runs as user** | `deploy` |
| **Port** | 3001 (internal; nginx proxies 443 → 3001) |
| **Auto-restart on crash** | Yes (PM2 built-in) |
| **PM2 commands** | `su - deploy -c 'pm2 list'`, `pm2 logs sq1-server`, `pm2 restart sq1-server` |

#### Nginx Configuration

```
server {
    server_name justinwenloyang.com www.justinwenloyang.com;
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;        ← WebSocket support
        proxy_set_header Connection "upgrade";          ← Required for Socket.IO
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    listen 443 ssl;                                     ← Let's Encrypt cert
}
```

#### Git Sparse Checkout — What's On the Server

The server clone uses `git sparse-checkout` with `--depth 1` (shallow) to avoid downloading the full 30+ GB repo. Only production-relevant directories are checked out:

**Included:** `scripts/`, `landing/`, `docs/`, `lilypond_code/`, `public/index.html`, `public/fonts/`, `public/pitchesSVGs/`, `scores/2295-FinalScore-preVersioning.json`, `package.json`, `package-lock.json`

**Excluded (saves ~30 GB):**
- `StrQtrNo1-AudioRender-2026-03-16/` — 648 MB audio WAVs
- `scoresBackUp/` — ~1.3 GB old score versions
- `scores/*` (all except the one score file) — ~28 GB
- `public/audio_files/` — 1 GB
- All other dev directories: `Diagonistic/`, `JY_oldCode/`, `Reaper/`, `SVG_drafts/`, `SVG_graphics/`, `ai files/`, `curve_library/`, `gc_library/`, `midi files/`, `midi_exports/`, `misc/`, `motive_library/`, `old_archived/`, `tools/`, `fonts/`, `svg_compositions/`, `server.js`, `index.js`

---

### Step C: Key Decisions Made During Phase 14

1. **Subtractive architecture confirmed.** The performance app is built by stripping the Workshop source, not by maintaining a separate codebase. `build_performance_app.js` reads `public/index.html`, applies patches/strips, and outputs `builds/performance/index.html`. This means Workshop edits flow through automatically on rebuild.

2. **Sparse clone over full clone.** The repo is ~30+ GB due to audio, score backups, and accumulated development files. A full clone would consume most of the 40 GB SSD. Sparse checkout limits the server to ~45 MB of source + whatever npm installs.

3. **Build on server, not locally.** The build script runs on the server after `git pull`. This avoids SCP'ing the 1.2 MB built HTML each time and ensures the server always has a build matching its source.

4. **Landing page fulfills session management UI (14.4).** No separate "performer dashboard" was needed — the landing page handles name, instrument, pages, room management, and returning performer detection.

5. **Text-to-paths in build script (14.5).** Using `opentype.js` to convert `<text>` elements to `<path>` outlines at build time. Eliminates runtime font dependency for 614 text elements across 292 SVGs.

6. **Descoped admin panel (14.3) and logging (14.6).** Neither has user-facing impact. Can be added later without architectural changes.

7. **PM2 over raw node.** Provides auto-restart on crash, auto-start on reboot, log management. Already set up by initial deployment.

---

### Step D: Bugs and Issues Encountered

1. **Initial deployment used SCP, not git clone.** The previous AI session attempted deployment but likely hit issues with the 30+ GB repo size. It pivoted to manually SCP'ing individual files to the server. This worked but left the server with no git connection — updates required SCP'ing each changed file individually. **Fix:** Replaced with git sparse clone (this session).

2. **PowerShell ↔ SSH quoting conflicts.** Running complex bash commands via SSH from PowerShell mangles `$()`, nested quotes, and special characters. **Fix:** Write commands to a `.sh` script, SCP it to the server, then execute it remotely.

3. **PM2 auto-restart during migration.** When stopping the node process to replace files, PM2 kept respawning it. **Fix:** Use `pm2 stop sq1-server` instead of `kill`.

4. **`builds/` is gitignored.** The performance app lives in `builds/performance/` which is in `.gitignore`. This means `git pull` alone won't update the served app — must also run the build script. This is by design (build outputs shouldn't be in git).

---

### Step E: Repeatability — How to Deploy Changes

#### Scenario 1: Code/UI Change (landing page, sync bar, patches, etc.)

```
LOCAL MACHINE:
1. Edit the source files (landing/index.html, scripts/*.js, etc.)
2. Rebuild locally to test: node scripts/build_performance_app.js
3. Test at http://localhost:3000 (start server with: node scripts/performance_server.js)
4. git add . && git commit -m "Description" && git push

DEPLOY TO SERVER (one command from local PowerShell):
ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35 "su - deploy -c 'cd /home/deploy/sq1 && git pull && node scripts/build_performance_app.js'"

If performance_server.js changed, also restart PM2:
ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35 "su - deploy -c 'pm2 restart sq1-server'"
```

#### Scenario 2: Score Revision (changed notes, timing, SVGs in Workshop)

```
LOCAL MACHINE:
1. Make changes in the Workshop (public/index.html running via server.js)
2. Save the score (writes to scores/ directory)
3. Rebuild: node scripts/build_performance_app.js
4. Test locally
5. git add . && git commit -m "Score revision: [description]" && git push

DEPLOY:
Same one-liner as Scenario 1 — git pull gets the new score JSON, build script bakes it in.
```

#### Scenario 3: Major Score Change (new SVGs, new notation, structural changes)

Same as Scenario 2, but also:
- If new notation types were added → update `docs/notation_instructions/`
- If page layout changed → re-capture print score PDFs
- If new LilyPond elements → regenerate SVGs via the notation fragment pipeline
- After deploy, verify on a real device (iPad) that rendering is correct

#### Scenario 4: Server Infrastructure Change (nginx, SSL, Node.js update)

```
SSH into server:
ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35

Common tasks:
- View logs:         su - deploy -c 'pm2 logs sq1-server --lines 50'
- Restart server:    su - deploy -c 'pm2 restart sq1-server'
- Check status:      su - deploy -c 'pm2 list'
- Renew SSL:         certbot renew (auto-renewal should handle this)
- Update Node.js:    apt update && apt upgrade (or nvm if installed)
- Check disk:        df -h
- Check memory:      free -h
```

#### Scenario 5: New Piece — Full Production Pipeline from Scratch

This is the "if you write a new piece in 6 months" scenario:

```
1. COMPOSE in Workshop
   - Create/modify score in the Workshop (public/index.html + server.js)
   - All musical material, SVGs, timing, etc. in the Workshop environment
   - Save score JSON to scores/ directory

2. BUILD Performance Score
   - node scripts/build_performance_app.js [score_json_path] [output_dir]
   - Build script: reads Workshop HTML → strips editing UI → applies patches → outputs standalone app
   - If new notation types exist, may need new patch files or updates to existing ones

3. CREATE Documentation
   - Music Performance Instructions: docs/notation_instructions/ (notation guide for performers)
   - Technical Manual: docs/technical_manual/ (web app usage guide)
   - SVG capture pipeline for notation examples (see Step 14.0a in pipeline plan)

4. CREATE Landing Page
   - landing/index.html — performer entry point
   - Instrument list, room management, score links
   - Update for new piece title, instruments, etc.

5. CONFIGURE Server
   - performance_server.js — Express routes, Socket.IO, auth
   - If reusing same server: update routes, maybe add path prefix (e.g., /new-piece/)
   - If new server: provision VPS, install Node.js, nginx, PM2, SSL (see §13.9 in pipeline plan)

6. DEPLOY
   - Push to GitHub
   - Clone (sparse) on server
   - npm install, build, start PM2

7. VERIFY
   - Landing page loads, room creation works
   - Score renders correctly on iPad
   - Multi-device sync works
   - Performance mode: readiness check, countdown, auto-stop, emergency controls all function
```

**Key files to study for a new piece:**
- `docs/STRING_QUARTET_PIPELINE_PLAN.md` — the complete architecture reference
- `scripts/build_performance_app.js` — how the Workshop→Performance transformation works
- `scripts/performance_rehearsal_patches.js` — all rehearsal/performance mode features
- `scripts/performance_server.js` — server architecture, routes, Socket.IO events

---

### Step F: Future Impacts — Lessons Learned

1. **Large binary files in git are problematic for deployment.** The repo grew to 30+ GB from audio WAVs, score backups, and accumulated files. For a new piece, consider using `.gitignore` or Git LFS for audio files and score backups from the start.

2. **Sparse checkout works but is fragile.** The sparse-checkout set must be updated if the build script starts reading new directories. If a future phase adds a new dependency (e.g., a new font directory, a new patch file), the sparse-checkout list on the server must be updated too. Document this when adding new build inputs.

3. **The deployment was initially opaque.** The SCP-based deployment left no audit trail. Git sparse clone fixes this — every change on the server is traceable via `git log`. For future projects, establish the git-based deployment from day one.

4. **PM2 should be set up at infrastructure creation time.** The raw `node` process worked but had no auto-restart or logging. PM2 was already installed but the initial deployment didn't use it properly.

5. **PowerShell + SSH is awkward.** Complex remote commands break due to quoting. Best practice: write multi-step operations to a `.sh` script, SCP + execute. Or keep a set of one-liner deploy commands documented (as above).

6. **Multi-piece architecture consideration.** Currently the root URL serves String Quartet No. 1 directly. When a second piece exists, the recommended approach is path-based routing: move SQ1 under `/string-quartet-no1/`, add a portfolio page at `/`. This is a ~30-minute change. See deferred item in RESUME HERE section.

7. **The `builds/` directory is gitignored.** This is correct — build outputs shouldn't be in version control. But it means every deploy requires a rebuild on the server. The rebuild takes ~5 seconds, so this is fine.

---

### Step G: Files Modified/Created in Phase 14

| File | Action | Purpose |
|------|--------|---------|
| `landing/index.html` | **New** | Landing page: name, instrument, pages, room management |
| `landing/landing.css` | **New** | Landing page styles |
| `docs/technical_manual/index.html` | **New** | Technical manual (performer guide) |
| `docs/technical_manual/styles.css` | **New** | Technical manual styles |
| `docs/technical_manual/Technical_Manual.pdf` | **New** | PDF version |
| `docs/notation_instructions/index.html` | **New** | Music performance instructions (notation guide) |
| `docs/notation_instructions/styles.css` | **New** | Notation instructions styles |
| `docs/notation_instructions/Music_Performance_Instructions.pdf` | **New** | PDF version |
| `scripts/generate_doc_pdfs.js` | **New** | Puppeteer PDF generation for docs |
| `scripts/performance_server.js` | Modified | Routing restructure, doc routes, print route, security (helmet, rate limiting) |
| `scripts/performance_rehearsal_patches.js` | Modified | Home button, sync bar solo-hide + auto-fade |
| `docs/STRING_QUARTET_PIPELINE_PLAN.md` | Modified | Step 14.2a, Phase 16 placeholder, deployment docs |
| `docs/IMPLEMENTATION_PROGRESS.md` | Modified | Phase 14 post-mortem (this document) |

### Key Commits

| Commit | Description |
|--------|-------------|
| `cf4724c8` | Landing page, doc PDFs, performer detection, home nav, technical manual |
| `0930c1b4` | Performance Mode button, Full Score room code fix, technical manual update |
| `272205c3` | Security audit — hardening for cloud deployment |
| `e57d47e9` | Security round 2 + Phase 16 maintenance tasks |
| `d2501322` | npm audit dependency updates |
| `3d4dffa4` | YouTube demo link + sync bar: hide solo, auto-fade in rooms |
