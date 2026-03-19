---
description: Build and serve the Performance Score app (stripped Workshop HTML)
---

# Build Performance Score

Builds a standalone Performance Score app by stripping composition UI, MIDI/audio systems, and server-dependent features from the Workshop's `public/index.html`.

## Prerequisites
- Workshop `public/index.html` exists (the monolithic source)
- Score JSON exists (default: `scores/2295-FinalScore-preVersioning.json`)
- Staff header SVGs exist in `lilypond_code/`

## Build Steps

1. Kill any running Node servers to free ports
```powershell
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
```

// turbo
2. Run the build script
```powershell
node scripts/build_performance_app.js scores/2295-FinalScore-preVersioning.json builds/performance
```

3. Verify all patches applied (check output for ✓ on every line, no ⚠ warnings)

// turbo
4. Serve the Performance Score on port 3001
```powershell
node -e "const h=require('http'),f=require('fs'),p=require('path'),d='builds/performance',m={'.html':'text/html','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};h.createServer((q,r)=>{let u=q.url.split('?')[0];if(u==='/')u='/index.html';const fp=p.join(d,decodeURIComponent(u)),e=p.extname(fp);if(!f.existsSync(fp)){r.writeHead(404);r.end('Not found');return}r.writeHead(200,{'Content-Type':m[e]||'application/octet-stream'});f.createReadStream(fp).pipe(r)}).listen(3001,()=>console.log('http://localhost:3001'))"
```

5. Open http://localhost:3001 in browser

## Testing Checklist (👁️ Human)
- [ ] Score renders on first page — all notation elements visible
- [ ] Staff header instrument labels appear (violin I, violin II, viola, cello)
- [ ] Play button works (cursor moves)
- [ ] Stop button works (cursor stops)
- [ ] Jump To works (enter seconds → Go)
- [ ] Composition panel toggle is HIDDEN (left side)
- [ ] No console errors (F12 → Console)
- [ ] Curves, GCs, motives, badges, lineWedges all render correctly
- [ ] Colors match Workshop (compare side-by-side at :5000 if needed)

## What the Build Does

### Patches (modify behavior)
| # | Patch | Purpose |
|---|-------|---------|
| 1 | socket.io stub | Local Play/Stop/GoTo without server |
| 2 | Static score load | `fetch('score.json')` instead of server auto-load |
| 3 | Save as download | Browser file download instead of server POST |
| P4 | Curve library guard | Skip fetch if server unavailable |
| P5 | GC library guard | Skip fetch if server unavailable |
| P6 | Score list guard | Skip fetch if server unavailable |

### Strips (remove code)
| # | Strip | ~Size |
|---|-------|-------|
| S1 | FlowchartConnector | 52 KB |
| S2 | FlowchartConnector init | <1 KB |
| S3 | MidiController + AudioController | 127 KB |
| S4 | EditCursor | 10 KB |
| S5 | MidiSnippetDB → MidiModelSystem → AudioClipDB | 213 KB |
| S6 | NotationManager | 20 KB |
| S7 | Generation Panels (ScoreAutomation → PanelSectionManager) | 541 KB |

### Stubs (no-op replacements)
19 stub objects for stripped systems, preventing ReferenceErrors from kept code.

### Assets Copied
- `score.json` — score data
- `lilypond_code/*.cropped.svg` — 4 staff header instrument label SVGs

## Debugging
If the build reports ⚠ warnings, a marker string changed in the Workshop HTML. Compare the marker text in `build_performance_app.js` against the current `public/index.html` to find the mismatch.

Reference: `docs/STRING_QUARTET_PIPELINE_PLAN.md` §13 (Implementation Plan, Modularity Assessment)
