---
description: Performance Score development - startup, build, serve, and debug the Performance Score app (parts mode curve issues, etc.)
---

# Performance Score Development

Use `/perf-score` at the start of any session working on the Performance Score app.

## 👤 For User

**To start a session:** Just type `/perf-score` and describe what you want to work on. Cascade will read all required docs, build, serve, and orient itself automatically.

**Quick start examples:**
- `/perf-score` — "Let's continue debugging curves in parts mode"
- `/perf-score` — "I want to test the full score view on 3001"
- `/perf-score` — "Let's work on a new parts mode feature"

---

## ⚡ Session Startup (Cascade does this automatically)

### 1. Read These Documents
| Document | Why |
|----------|-----|
| This file (`perf-score.md`) | Orientation + checklist |
| `docs/STRING_QUARTET_PIPELINE_PLAN.md` | Pipeline architecture context |
| `scripts/performance_parts_patches.js` | Parts mode overrides (Phase 3) — the main file we edit |
| `scripts/build_performance_app.js` | Build script — how Workshop HTML becomes Performance HTML |
| `scripts/performance_canvas_patches.js` | Canvas overlay patches (Phase 2) |
| `docs/AI_SCORE_BUILDING_PROGRESS.md` | Open threads, ASB numbering, session state |

### 2. Understand the Architecture
- **Workshop** = `public/index.html` + `server.js` on port **5000**. Full composition system. **DO NOT MODIFY** for Performance Score work.
- **Performance Score** = `builds/performance/index.html` on port **3001**. Built by running `build_performance_app.js` which takes Workshop HTML and applies patches/strips.
- **Parts Mode** = activated by `?track=N&pages=M` (e.g., `localhost:3001?track=1&pages=6`). Code lives in `performance_parts_patches.js`.

### 3. Build & Serve
// turbo
1. Kill any existing servers
```powershell
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
```

// turbo
2. Build the Performance Score
```powershell
node scripts/build_performance_app.js scores/2295-FinalScore-preVersioning.json builds/performance
```

3. Verify build output: all ✓, no ⚠ warnings (except O5 which is known harmless)

// turbo
4. Serve on port 3001
```powershell
node -e "const h=require('http'),f=require('fs'),p=require('path'),d='builds/performance',m={'.html':'text/html','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};h.createServer((q,r)=>{let u=q.url.split('?')[0];if(u==='/')u='/index.html';const fp=p.join(d,decodeURIComponent(u)),e=p.extname(fp);if(!f.existsSync(fp)){r.writeHead(404);r.end('Not found');return}r.writeHead(200,{'Content-Type':m[e]||'application/octet-stream'});f.createReadStream(fp).pipe(r)}).listen(3001,()=>console.log('http://localhost:3001'))"
```

5. Report ready: URLs, current state of any active debugging

### 4. After Any Code Change
All edits go in these files ONLY:
- `scripts/performance_parts_patches.js` — Parts mode logic
- `scripts/performance_canvas_patches.js` — Canvas/drawing logic
- `scripts/build_performance_app.js` — Build pipeline patches

**NEVER edit `public/index.html` for Performance Score work.**

After editing, rebuild + re-serve:
```
Kill server → rebuild → serve again
```

---

## 🔧 Key Systems in Parts Mode

| System | What It Does | Override Location (performance_parts_patches.js) |
|--------|-------------|--------------------------------------------------|
| **DOM** | Creates N score-row sections (default 6) | Lines ~55-130 |
| **Canvas** | One canvas overlay per section | Lines ~100-130 |
| **StaffCursors.update** | Single cursor on active section | (performance_canvas_patches.js) |
| **GraphicTimeline** | Circular buffer page turns, onGoto, reset, ticks | Lines ~350-510 |
| **StaffPositions** | 1 track fills full height | Lines ~530-547 |
| **SVGElementManager** | N containers, calcPixelPosition, updateVisibility | Lines ~550-650 |
| **CurveMaker** | updateVisibility + continuation support | Lines ~686-748 |
| **MotiveMaker** | updateVisibility | Lines ~772-807 |
| **LineWedgeMaker** | updateVisibility + continuation support | Lines ~810-900 |
| **BadgeMaker** | updateVisibility | Lines ~900-960 |
| **GCMaker** | Arc rendering + canvas ball drawing | Lines ~960-1200 |
| **ScoreManager.distributeData** | Filter all data by track | Lines ~1400+ |

## ✅ FIXED: Curve Misplacement in Parts Mode (ASB-190)

**Root cause:** `clipCurveToPageEnd()` in Workshop source uses `page % 2` to pick top/bottom container, then re-appends the curve. For odd-page curves in parts mode, this put them back into `bottomCurveGroup` immediately after `updateVisibility` correctly placed them.

**Fix:** Swap both `scoreBottomEl`/`bottomCurveGroup` AND `scoreTopEl`/`topCurveGroup` to the correct section SVG before calling `clipCurveToPageEnd`. Lines 729-745 in `performance_parts_patches.js`.

## 🐛 Active Bug: Goto/Jump Page Track Loading

**Symptom:** In `?track=1&pages=6`, jumping to a second (e.g., 125) places the cursor on the correct page track, but the other page tracks show stale/wrong content. Normal scrolling refreshes them incrementally, but goto skips those refreshes.

**Current `onGoto` logic (lines 472-487):** Calculates `basePage = targetPage - (targetPage % PAGE_COUNT)` and assigns `sectionPages[i] = basePage + i`. This gives consecutive pages, but doesn't match what the circular buffer would have built up during normal playback.

---

## 📋 Testing Checklist (Full Score — no parts mode)
- [ ] Score renders — all notation elements visible
- [ ] Staff headers appear
- [ ] Play/Stop/Jump To work
- [ ] Curves, GCs, motives, badges, lineWedges render
- [ ] No console errors

## 📋 Testing Checklist (Parts Mode)
- [ ] `?track=1&pages=6` — 6 sections appear with correct track
- [ ] Page ticks show correct page numbers
- [ ] Play — cursor advances, circular buffer page turns work
- [ ] Goto — jumps to correct page, cursor on correct section
- [ ] Curves appear on correct sections (THE BUG)
- [ ] Multi-page curves show continuations on adjacent sections
- [ ] GC arcs render on correct sections
- [ ] SVG notation elements on correct sections
