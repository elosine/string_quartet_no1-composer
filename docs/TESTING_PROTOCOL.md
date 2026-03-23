# Performance Score — Testing Protocol

**Created:** Mar 23, 2026  
**Updated:** Mar 23, 2026  
**Scope:** Phase 8 integration verification + Parts Mode (P1–P3, D1–D3) + bug fixes + font embedding  
**Goal:** Systematic coverage of state transitions and multi-client interactions without exhaustive permutation testing.

---

## Principle: Test State Transitions, Not Just Steady States

Bugs hide where modes change — play/stop, sync/independent, loop on/off, page boundaries. Focus testing time on transitions between states rather than verifying static behavior.

---

## Setup

- **Server:** `node scripts/performance_server.js` (restart between test groups for clean room state)
- **Full score URL:** `http://localhost:3001/`
- **Parts URL:** `http://localhost:3001/?track=2&pages=6` (adjust track/pages as needed)
- **Multi-client:** Open multiple browser tabs/windows, or use laptop + desktop

---

## Tier 1: Single-Client Parts Mode (~10 min)

*Must all pass before moving to multi-client testing.*

### Test 1.1 — Play Through Screen Boundary
1. Load parts: `?track=2&pages=6`
2. Right-click, Go to 0
3. Play
4. Watch cursor move through page tracks 1, 2, 3, 4, 5, 6
5. When cursor exits page track 6, it wraps to page track 1
6. **Check:** Page track 1 now shows Screen 2 content. All 6 page tracks updated (no stale leftover).
7. **Check:** MiniMap shows correct S#/P# (e.g., S2/11 P7/64). Overlay matches.

### Test 1.2 — Swipe to Independent, Then Re-Sync
1. Load parts, Play from zero
2. Let cursor reach around page track 3
3. Swipe left to advance one screen
4. **Check:** Toast "Independent mode" appears. Score jumps ahead. Cursor moves at normal speed.
5. Let it play 3–5 seconds in independent mode
6. Tap the sync toggle (upper-right) to re-sync
7. **Check:** Toast "Re-synced to room". Score snaps to server position.
8. **Check:** ALL 6 page tracks show correct content — no stale pages from independent screen.
9. **Check:** Cursor at normal speed — no speed-ahead/catchup behavior.

### Test 1.3 — Right-Click Goto (Synced + Independent)
**Part A — Synced:**
1. Load parts, don't play
2. Right-click somewhere around second 200
3. **Check:** Score jumps to correct page. Overlay shows correct S#/P#.
4. Play
5. **Check:** Cursor starts on correct page track, advances normally.

**Part B — Independent:**
6. While playing, swipe left to go independent
7. Right-click somewhere different (e.g., second 400)
8. **Check:** Score jumps to correct page. No visual corruption — all page tracks correct.

### Test 1.4 — Loop: Enable, Play, Disable While Playing
1. Load parts, set a loop region (e.g., 30s–60s)
2. Enable Loop, then Play
3. **Check:** Pages frozen (no screen rotation during loop). Cursor stays within loop region.
4. Let it loop at least once (cursor wraps back to loop start)
5. While still playing, tap Loop toggle to disable loop
6. **Check:** Cursor continues forward past old loop end. All page tracks refresh. No stale sections.
7. Stop, then Play again
8. **Check:** Resumes from current position. No ghost loop behavior. All sections correct.

### Test 1.5 — Page Count Check
*Quick 30-second verification.*
1. Load parts (`?track=2&pages=6`), scrub to very end
2. **Check:** Total pages = 64, total screens = ceil(64/6) = 11
3. Switch to full score (remove query params, reload), scrub to end
4. **Check:** S#/32 P#/64 — full score always 2 pages/screen = 32 screens

---

## Tier 2: Multi-Client Parts Mode (~8 min)

*Restart server if you want a clean slate, or continue from Tier 1.*

### Test 2.1 — Two Clients, Synced Playback
1. Tab A: `?track=1&pages=6` (violin 1)
2. Tab B: `?track=3&pages=6` (viola)
3. From Tab A, Play from zero
4. **Check:** Both scroll in sync. Each shows their OWN track's notation.
5. Let it cross at least one screen boundary
6. **Check:** Both handle page turns correctly.

### Test 2.2 — One Client Swipes, Other Unaffected
1. Both tabs playing synced (from 2.1)
2. Tab B swipes left — goes independent
3. **Check:** Tab B shows independent toast. Tab A keeps playing synced, totally unaffected.
4. Tab B taps sync toggle to re-sync
5. **Check:** Tab B snaps to server position. Tab A unaffected. No speed-ahead on either.

### Test 2.3 — Leader Sets Loop, Both Clients Loop
1. Both tabs synced and playing
2. Tab A sets a loop region and enables loop
3. **Check:** Both tabs receive loop state. Both freeze page rotation.
4. Let loop execute at least once on both
5. Tab A disables loop while playing
6. **Check:** Both resume forward playback. All sections refresh on both — no stale pages.

### Test 2.4 — Disconnect and Reconnect
1. Both tabs playing synced mid-score
2. Close Tab B
3. **Check:** Tab A continues unaffected.
4. Reopen Tab B with same URL
5. **Check:** Tab B joins at current server position and plays in sync.

### Test 2.5 — Zero Reset (Quick Sanity)
*Pre-verified Mar 23. Just confirm it still works:*
1. Close ALL tabs
2. Reopen one tab
3. **Check:** Starts at position zero, not mid-score. (10 seconds, done.)

---

## Tier 3: Full Score + Cross-Mode (~4 min)

### Test 3.1 — Full Score Playback
1. Load full score (no query params)
2. Play from zero, let it cross at least one screen boundary
3. **Check:** Top and bottom pages advance correctly. No stale content.

### Test 3.2 — Full Score Swipe + Re-Sync
1. Full score, playing
2. Swipe to advance, then re-sync
3. **Check:** Both top and bottom pages refresh. No stale content.

### Test 3.3 — Full Score Page Display
1. Full score, scrub around
2. **Check:** Overlay shows `S# of 32 | P#`. MiniMap shows `S#/32 P#/64`.

### Test 3.4 — Full Score + Parts in Same Room
1. Tab A: full score (no params)
2. Tab B: `?track=2&pages=6`
3. Play from Tab A
4. **Check:** Both receive server events. Both display correctly for their own mode. No cross-contamination.

---

## Tier 4: Edge Cases (~4 min)

### Test 4.1 — Jump to Last Page
1. Parts score
2. Right-click near the very end (second 490+)
3. Play
4. **Check:** Cursor reaches end without crash. Pages don't overflow or go blank.

### Test 4.2 — Rapid Swipes
1. Parts score, playing
2. Swipe left 3+ times quickly
3. **Check:** No page turn stacking or visual glitches. Score settles to correct position.

### Test 4.3 — Loop Across Screen Boundary
1. Parts score (`pages=6`)
2. Set a loop that spans a screen boundary — loop start on page track 5 of one screen, loop end on page track 2 of next screen
3. Enable loop, play
4. **Check:** Loop handles the boundary correctly. Pages show correct content when cursor wraps.

### Test 4.4 — Font Rendering (Verify Text-to-Paths Fix)
1. Load the score on a device where Crimson Pro is NOT installed locally
2. Look for text labels: secco, furioso, delicato, pizz., ricochet
3. **Check:** Text renders correctly as vector outlines — no serif fallback, no clipping. (Fixed Mar 23 via opentype.js text-to-paths in build_performance_app.js.)

---

## Summary

| Tier | Tests | Time | What It Catches |
|------|-------|------|-----------------|
| 1 | 1.1–1.5 | ~10 min | Page turns, swipe/sync, goto, loop, page count |
| 2 | 2.1–2.5 | ~8 min | Multi-client sync, broadcast isolation, disconnect |
| 3 | 3.1–3.4 | ~4 min | Full score basics, cross-mode in same room |
| 4 | 4.1–4.4 | ~4 min | Overflow, rapid input, boundary loops, fonts |
| **Total** | **15** | **~25 min** | |

---

## Results Log

| Test | Date | Result | Notes |
|------|------|--------|-------|
| 1.1 | Mar 23 | PASS | Screen boundary, page turns, S#/P# display |
| 1.2 | Mar 23 | PASS | Swipe → independent → re-sync, no stale pages |
| 1.3 | Mar 23 | PASS | Goto synced + independent, no corruption |
| 1.4 | Mar 23 | PASS | Loop enable/disable while playing, no ghost loop |
| 1.5 | Mar 23 | PASS | Page count: 64 pages, 11 screens (parts), 32 screens (full) |
| 2.1 | Mar 23 | PASS | Two clients synced, correct tracks |
| 2.2 | Mar 23 | PASS | One swipes, other unaffected |
| 2.3 | Mar 23 | PASS | Leader loop, both clients loop/resume |
| 2.4 | Mar 23 | PASS | Disconnect/reconnect |
| 2.5 | Mar 23 | PASS | Zero reset (Option C) verified |
| 3.1 | Mar 23 | PASS | Full score playback through boundary |
| 3.2 | Mar 23 | PASS | Full score swipe + re-sync |
| 3.3 | Mar 23 | PASS | Full score S#/32 P#/64 display |
| 3.4 | Mar 23 | PASS | Full score + parts in same room |
| 4.1 | Mar 23 | PASS | Jump to last page, no overflow |
| 4.2 | Mar 23 | PASS | Rapid swipes, no stacking |
| 4.3 | Mar 23 | PASS | Loop across screen boundary |
| 4.4 | Mar 23 | PASS | Font rendering — text-to-paths verified |

---

## Known Issues / Future Items

- **Performance mode grace period:** Phase 11 should override zero-reset with full grace-period resume so performers can reconnect mid-performance without losing position.
- **SVG optimization:** Phase 14 — minify SVGs, strip editor metadata, consider pre-inlining.
- **Parts mode 2-screen limit:** Observed Mar 23 on standalone A/B test server (no performance_server.js). Needs investigation — may be related to missing server events or static-only serving.
