---
description: String Quartet Pipeline Plan - consult the three-stage pipeline architecture (Workshop, Engraving, Performance)
---

# String Quartet Pipeline Plan

Consult this workflow when working on any pipeline-related task: build scripts, data export, engraving app, performance app, print output, or pipeline architecture decisions.

## Reference Document

**Primary:** `docs/STRING_QUARTET_PIPELINE_PLAN.md`

Read this document before any pipeline work. It contains:
- Three-stage architecture (Workshop → Engraving → Performance)
- Data audit results (bundled vs unbundled items, Score 2295)
- Conversion flow and repeatable pipeline design
- Engraving stage details (editing methodology, badge handling, print output)
- Build steps 1–6 with validation criteria
- Implementation phases 1–4
- Key decisions log (13 decisions)
- Practical workflow scenarios (A–D)

## Key Architecture

### Three Stages

| Stage | Purpose | Editing | Key Script |
|-------|---------|---------|------------|
| **Workshop** | Full composition system | Full | `public/index.html` + `server.js` |
| **Engraving** | Score refinement + print | Minimal (drag, resize, timing, SVG swap) | `scripts/build_engraving.js` (TBD) |
| **Performance** | Live playback for performers | None | `scripts/build_performance_app.js` |

### Pipeline Flow

```
Workshop ── build_engraving.js ──► Engraving ── build_performance.js ──► Performance
```

### Data Buckets (Engraving)

- **Bucket A:** Bundle data (JSON) — complete element recipes
- **Bucket B:** Vector graphics (SVG) — standalone SVG files + page composites
- **Bucket C:** Timeline/animation data — timing, scroll, cursor, curve animations

## Key Files

| File | Purpose |
|------|---------|
| `docs/STRING_QUARTET_PIPELINE_PLAN.md` | Architecture document (read first) |
| `scripts/build_performance_app.js` | Performance build script (Phase 3 — exists) |
| `scripts/performance_parts_patches.js` | Parts mode patches (Phase 3 — exists) |
| `scripts/performance_canvas_patches.js` | Canvas overlay patches (Phase 2 — exists) |
| `builds/performance/` | Performance build output |
| `scores/2295-FinalScore-preVersioning.json` | Primary score JSON |

## Build Steps (Engraving Pipeline)

1. **Data Extractor** — score JSON → unified `score_data.json` (Medium, ~1 session)
2. **SVG File Exporter** — base64 → standalone `.svg` files (Low, quick)
3. **Timeline Data Exporter** — element timing + scroll + curves → `timeline.json` (Medium, ~1 session)
4. **Page Compositor** — composite page SVGs for print (High, 2–3 sessions)
5. **PDF Generator** — SVG pages → multi-page PDF (Low, quick)
6. **Engraving App** — stripped-down display + edit HTML/JS (High, 2–3 sessions)

## Decision Log Reference

See §9 in `STRING_QUARTET_PIPELINE_PLAN.md` for all 13 key decisions. Key ones:
- **#4:** Minimal editing UI (select/drag/resize + inspector, no generation panels)
- **#7:** Badge animations → static SVG snapshot
- **#8:** Print output → SVG pages → PDF (vector, scalable)
- **#9:** No explicit grouping for unbundled items (flat export by time + track)

## When to Consult This Workflow

- Building or modifying any build script (`build_engraving.js`, `build_performance_app.js`)
- Working on parts mode or performance optimizations
- Discussing pipeline architecture or data flow
- Print/PDF output work
- Data export or audit tasks
