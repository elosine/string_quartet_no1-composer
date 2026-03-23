# Performance Score — Testing Protocol

**Created:** Mar 23, 2026  
**Scope:** Phase 8 integration verification + Parts Mode (P1–P3, D1–D3) + bug fixes  
**Goal:** Systematic coverage of state transitions and multi-client interactions without exhaustive permutation testing.

---

## Principle: Test State Transitions, Not Just Steady States

Bugs hide where modes change — play↔stop, sync↔independent, loop on↔off, page boundaries. Focus testing time on transitions between states rather than verifying static behavior.

---

## Setup

- **Server:** `node scripts/performance_server.js` (restart between test groups to get clean room state)
- **Full score URL:** `http://localhost:3001/`
- **Parts URL:** `http://localhost:3001/?track=2&pages=6` (adjust track/pages as needed)
- **Multi-client:** Open multiple browser tabs/windows, or use laptop + desktop

---

## Tier 1: Single-Client Parts Mode (Critical Path)

These must all pass before moving to multi-client testing.

### Test 1.1 — Basic Playback Through Screen Boundary
1. Load parts score (?track=2&pages=6)
2. Go to zero (right-click → Go to 0)
3. Play
4. Watch cursor scroll through page track 1 → page track 2 → ... → page track 6
5. When cursor leaves page track 6, it should wrap to page track 1
6. **Verify:** Page track 1 now shows screen 2 content. All 6 page tracks update correctly as cursor advances.
7. **Verify:** MiniMap and overlay both show correct S#/P# numbers.

### Test 1.2 — Swipe Auto-Detach and Re-Sync
1. Load parts score, play from zero
2. Let cursor reach ~page track 3
3. Swipe left to advance screen
4. **Verify:** Toast "Independent mode" appears. Cursor jumps to new screen.
5. Let it play for a few seconds in independent mode
6. Tap the sync toggle to re-sync
7. **Verify:** Toast "Re-synced to room" appears. Score snaps to server position.
8. **Verify:** ALL page tracks show correct content for the server's current position — no stale sections.
9. **Verify:** Cursor resumes at normal speed, no speed-ahead behavior.

### Test 1.3 — Right-Click Goto Mid-Score
1. Load parts score
2. Right-click somewhere mid-score (e.g., second 200)
3. **Verify:** Score jumps to the correct page. Overlay shows correct S#/P#.
4. Play
5. **Verify:** Cursor starts on the correct page track, advances normally.

### Test 1.4 — Loop On → Play → Disable Loop While Playing
1. Load parts score, set a loop region (e.g., 30s–60s)
2. Enable loop, then play
3. **Verify:** Pages freeze (don't rotate) during loop playback. Cursor stays within loop region.
4. Let it loop at least once (cursor wraps back to loop start)
5. While still playing, disable loop (tap loop toggle)
6. **Verify:** Cursor continues forward past the old loop end. All page tracks refresh to show correct forward-playing content. No stale sections from the loop.

### Test 1.5 — Loop On → Stop → Disable Loop → Play
1. Load parts score, set a loop region
2. Enable loop, play, let it loop once
3. Stop playback
4. Disable loop
5. Play again
6. **Verify:** Playback resumes from current position, all sections correct.

### Test 1.6 — Page Count Verification
1. Load parts score
2. Click/scrub to the very end of the score
3. **Verify:** Total pages shows 64. Total screens = ceil(64 / pagesPerScreen).
4. Switch to full score (no query params)
5. **Verify:** Total pages shows 64, total screens shows 32. Format is S#/32 P#/64.

---

## Tier 2: Multi-Client Parts Mode (Highest Real-World Risk)

### Test 2.1 — Two Clients, Different Parts, Synced Playback
1. Open Client A: `?track=1&pages=6` (violin)
2. Open Client B: `?track=3&pages=6` (viola) — same room
3. From Client A (leader), play from zero
4. **Verify:** Both clients scroll in sync. Each shows their own track's notation.
5. Let it play through at least one screen boundary
6. **Verify:** Both clients handle page turns correctly and independently.

### Test 2.2 — One Client Swipes, Other Stays Synced
1. Setup: two clients as above, both playing synced
2. Client B swipes left (auto-detach to independent)
3. **Verify:** Client B goes independent, Client A is unaffected and keeps playing synced.
4. Client B re-syncs (tap sync toggle)
5. **Verify:** Client B snaps back to server position. Client A unaffected. No speed-ahead on either.

### Test 2.3 — Leader Sets Loop, Both Clients Loop
1. Setup: two clients, synced playback
2. Leader (Client A) sets a loop and enables it
3. **Verify:** Both clients receive loop state. Both freeze page rotation during loop.
4. Let loop execute at least once on both clients
5. Leader disables loop while playing
6. **Verify:** Both clients resume forward playback. All sections refresh on both.

### Test 2.4 — Client Disconnect and Reconnect
1. Setup: two clients playing synced
2. Close Client B's tab
3. **Verify:** Client A continues unaffected.
4. Reopen Client B with same URL
5. **Verify:** Client B joins at the current server position (or zero if Client A also left).

### Test 2.5 — Both Clients Leave, Fresh Rejoin
1. Setup: two clients playing mid-score
2. Close both tabs
3. Reopen one tab
4. **Verify:** Client joins at position zero (Option C behavior). Not mid-score.

---

## Tier 3: Full Score + Cross-Mode

### Test 3.1 — Full Score Basic Playback
1. Load full score (no query params)
2. Play from zero
3. **Verify:** Top/bottom pages advance correctly through screen boundaries.

### Test 3.2 — Full Score Swipe and Re-Sync
1. Load full score, play, swipe to advance
2. Re-sync
3. **Verify:** Both pages refresh. No stale content.

### Test 3.3 — Full Score Page Display
1. Load full score
2. **Verify:** Overlay shows `S# of 32 | P#` format.
3. **Verify:** MiniMap shows `S#/32 P#/64` format.
4. Scrub to end
5. **Verify:** Numbers are correct at extremes.

### Test 3.4 — Full Score + Parts Client in Same Room
1. Open full score in one tab
2. Open parts score in another tab (same room)
3. Play from one
4. **Verify:** Both receive server events. Both display correctly for their mode.

---

## Tier 4: Edge Cases

### Test 4.1 — Jump to Last Page
1. Load parts score
2. Right-click to jump near the end (e.g., second 490+)
3. Play
4. **Verify:** Cursor reaches end without crash. Pages don't overflow.

### Test 4.2 — Rapid Swipes
1. Load parts score, play
2. Swipe left 3+ times quickly
3. **Verify:** No page turn stacking. Score settles to correct position.

### Test 4.3 — Loop Across Screen Boundary
1. Load parts score (6 pages per screen)
2. Set a loop that spans a screen boundary (e.g., starts on page track 5, ends on next screen's page track 2)
3. Enable loop, play
4. **Verify:** Loop handles the screen boundary correctly. Pages show correct content.

### Test 4.4 — Font Rendering (Laptop-Specific)
1. Load the score on a device where Crimson Pro is NOT installed locally
2. Look for large text labels: "secco", "furioso", "delicato"
3. **Verify status:** Currently expected to be clipped (known issue — Option A fix pending).

---

## Results Log

| Test | Date | Result | Notes |
|------|------|--------|-------|
| | | | |

---

## Known Issues / Future Items

- **Performance mode grace period:** Phase 11 should override the zero-reset behavior with full grace-period resume so performers can reconnect mid-performance without losing position.
- **SVG text-to-paths (Option B):** Phase 14 — recompile LilyPond SVGs with text rendered as paths. Eliminates font dependency inside `<image>` data URLs.
- **SVG optimization:** Phase 14 — minify SVGs, strip editor metadata, consider pre-inlining.
