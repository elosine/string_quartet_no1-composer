# String Quartet No. 1 — Pipeline Plan

**Status:** Draft — In Discussion  
**Created:** Mar 16, 2026  
**Last Updated:** Mar 16, 2026

---

## 1. Overview

Two parallel goals:

1. **Preserve the Composition System** — Clone the current repo as a frozen snapshot. This becomes the starting point for future pieces (Quartet No. 2, etc.). Leave it alone until a new piece begins, then develop the system further from there.

2. **Build a String Quartet Pipeline** — In the current repo, implement a three-stage pipeline for the piece itself: Workshop → Engraving → Performance.

### Repository Strategy

| Repo | Purpose | State |
|------|---------|-------|
| `string_quartet_no1-composer` (current) | **Workshop stage** — full composition system + piece. Also houses the Engraving and Performance build pipelines. | Active development |
| `composition-system-v1` (new clone) | Frozen snapshot of the full system as of the String Quartet completion. Starting point for future pieces. | Frozen (archived) |

**Action:** Clone current repo → create new GitHub repo `composition-system-v1` (or similar name) → push. Then continue working in the current repo for the pipeline.

**Status:** ✅ Decided — will execute when ready.

---

## 2. The Three Stages

### Stage 1: Workshop (Current System)

**What it is:** The full composition environment as it exists now — all UI panels, MIDI generation, audio playback, SVG assembly, curve system, bundle system, etc.

**Role in pipeline:** This is where major creative changes happen. If a section needs to be deleted, added, reorganized, or substantially reworked, it happens here.

**Status:** Essentially complete for the String Quartet. May need bug fixes but no major feature additions for this piece.

**When to use:** Only when major revisions are needed to the piece.

---

### Stage 2: Engraving

**What it is:** A score-focused environment stripped of generation tools. No MIDI, no audio. Graphics only. Supports limited editing (timing adjustments, SVG replacement, curve parameter tweaks, sizing, positioning).

**Role in pipeline:** This is the "fixed score" — the version you iterate on for print output, visual refinement, and preparation for performance. Performer feedback (enharmonic changes, size adjustments, timing tweaks) gets applied here.

**Content — Three Data Buckets:**

#### Bucket A: Bundle Data (JSON)
Complete, self-contained data descriptions of every score element. Each bundle captures:
- **SVG data** — the notation graphic (as data URL or file reference)
- **Positioning** — referenceSeconds, offsetSeconds, offsetYFraction, track, scale, anchorOffsetX_mm
- **Curve data** (if applicable) — model, slope, y1, y2, sample array, startTime, endTime
- **Musical metadata** — pitch, clef, dynamic(s), articulation type
- **Bundle type** — which system created it (crescendo, bartók pizz, notation fragment, etc.)
- **All UI-visible parameters** — everything that appears in the UI panel for that bundle type, plus any additional computed data needed for re-rendering

**Goal:** Each bundle is a complete recipe — given the JSON, you could recreate the visual element from scratch in JavaScript without needing the Workshop's generation tools.

#### Bucket B: Vector Graphics (SVG)
All notation elements captured as standalone SVG files:
- Every notation graphic exported as a named, standalone SVG file
- Page-level composite SVGs (for print — one SVG per "page" of the score)
- Print-ready format — high-quality vector output, colors preserved
- SVG → PDF conversion for scalable print output (any paper size, no quality loss)

#### Bucket C: Timeline / Animation Data
All time-based information needed for playback:
- Element appearance/disappearance times
- Scroll positions and timing
- Curve animation paths (the Y-value arrays over time)
- Staff cursor positions and movement
- Badge snapshots (static image captures — see §3.2)
- Essentially everything `GraphicTimeline` and `StaffCursors` need to animate the score

**What's stripped out:**
- All MIDI generation and playback systems
- All audio systems
- All generation UI panels (CrescendoUI, BartokPizzUI, AccelDecelUI, etc.)
- Server-side SVG assembly endpoints
- MIDI model system
- Audio file handling

**What's kept or added:**
- Score display (ScoreTop, ScoreBottom, SVG containers)
- Timeline and scroll system
- Lightweight editing capabilities (see §3)
- SVG element positioning and display
- Curve display (visual only, no generation)

---

### Stage 3: Performance

**What it is:** A stripped-down, optimized playback engine. No editing at all. Designed for live performance and rehearsal — "like a video game."

**Role in pipeline:** This is what performers interact with. Served from a server, highly synchronized, optimized for smooth animation.

**Key characteristics:**
- All assets pre-loaded and optimized
- No editing capabilities
- Optimized animation loop (requestAnimationFrame, minimal DOM operations)
- Network sync capability (WebSocket) for ensemble playback
- Minimal UI — playback controls only
- Fast load time, no generation code
- *(Details TBD — to be planned after Stage 2 is solid)*

---

## 3. Engraving Stage — Details

### 3.1 Editing Methodology

**Approach: Minimal Editing UI (Option 2)** ✅ Decided

Strip out all generation panels. Keep:
- **SVGElementManager's select/drag/resize** — visual mouse-based movement of elements
- **SVG Elements panel** — position X/Y inputs, scale slider, timing input, track selector
- **Element Inspector** — read-only display of bundle/element metadata, with editable key fields

No generation tools, no MIDI, no audio. For anything beyond light edits → go back to Workshop (Stage 1), make changes, re-run the pipeline.

### Supported Edit Operations

| Operation | Method | Notes |
|-----------|--------|-------|
| Move an element | Mouse drag, or edit X/Y in inspector | Visual or numeric |
| Replace an SVG | Load new SVG file, assign to element | New notation graphic |
| Adjust timing | Edit referenceSeconds/offsetSeconds | Move element earlier/later |
| Change element size | Scale slider or numeric input | Make notation larger/smaller |
| Adjust curve shape | Edit slope, y1, y2 in inspector | Steeper/flatter curve |
| Change curve length | Edit startTime/endTime | Longer/shorter curve |
| Swap enharmonic | Replace SVG with enharmonic variant | e.g., C# → Db |

### 3.2 Badge Handling

**Approach: Static Capture** ✅ Decided

Badge animations (Boids/SMIL murmuration) will not be carried into Engraving as live animations. Instead:
- Run the badge animation algorithm once during the build
- Capture a single static SVG frame (a representative snapshot)
- Use the static SVG in Engraving and Performance
- If the badge animation is needed in Performance, it can be reconsidered in Phase 3

### 3.3 Print Output

**Approach: SVG → PDF** ✅ Decided

- Composite each score "page" as a full SVG (all elements positioned, colors preserved)
- Convert SVG pages to PDF for print output
- Vector format = infinite scalability (any paper size, no quality loss)
- Colors preserved in PDF
- Implementation: likely a Node.js script using a headless browser (Puppeteer) or SVG-to-PDF library

---

## 4. Data Audit — Bundled vs. Unbundled Items

### Score 2295 Analysis

Data audit of `scores/2295-FinalScore-preVersioning.json`:

| Category | Bundled | Unbundled | Total |
|----------|---------|-----------|-------|
| SVG Elements | 271 | 271 | 542 |
| Curves | 178 | 47 | 225 |
| GCs | 193 | 55 | 248 |

**The bundle system was developed partway through composition**, so roughly half of all score elements were inserted before bundles existed. These earlier items are standalone SVGs, curves, and GCs with no formal link between them.

### Unbundled Item Characteristics

**Unbundled SVGs (271 items):**
- Distributed across all 4 tracks: Track 1 (67), Track 2 (77), Track 3 (63), Track 4 (64)
- Time range: ~4s to ~493s
- Many share identical timestamps across tracks (same musical moment on different instruments)
- Names show copy-chain provenance (e.g., "walking on a carpet of twigs motive new_copy_copy_copy")
- Each carries complete positioning data: referenceSeconds, offsetSeconds, offsetYFraction, track, scale, svgDataUrl

**Unbundled Curves (47 items):**
- All have undefined track and zero start/end times
- These are likely orphaned or template curves, not active score elements
- Can be safely excluded from the Engraving export

**Unbundled GCs (55 items):**
- Need further audit, but likely include orphans and standalone GC objects

### Grouping Strategy

**Decision: No explicit grouping needed.** ✅ Decided

The unbundled items are fully self-contained — each SVG element carries its own timing, track, position, scale, and embedded SVG data. The score's spatial/temporal layout *is* the grouping:
- Items at the same timestamp on different tracks = same musical moment
- Visual proximity on the timeline defines what "belongs together"

For the Engraving export, all items (bundled and unbundled) are exported flat, indexed by **time + track**. No manual grouping step required.

---

## 5. Conversion Flow & Repeatable Pipeline

```
Workshop ──── build_engraving.js ────► Engraving ──── build_performance.js ────► Performance
    ▲                                      ▲
    │ (major revisions)                    │ (minor revisions: timing, sizing, SVG swap)
    │                                      │
    └──────────────────────────────────────┘
         re-run build script(s) after edits
```

### Pipeline Principle: Re-runnable, Not One-Shot

Every conversion step is a **script you can run again**. If you make changes in Workshop, you re-run `build_engraving.js` to get a fresh Engraving. If you make changes in Engraving, you re-run `build_performance.js` to get a fresh Performance build.

### 5.1 Workshop → Engraving (`build_engraving.js`)

**Input:** Score JSON file (e.g., `scores/2295-FinalScore-preVersioning.json`)

**Step-by-step process:**

```
Step 1: Parse & Extract
├── Read score JSON
├── Extract all 10 bundle sources (nfBundles, cdBundles, adBundles, bpBundles,
│   bopBundles, clbBundles, ptBundles, ptgBundles, vibBundles + svgElements)
├── Extract CurveDatabase (filter out orphans: skip curves with no track or zero times)
├── Extract GCMaker data (filter out orphans)
├── Extract MotiveDatabase, LineWedgeDatabase, GroupDatabase
├── Extract BadgeDatabase
└── Extract timeline config (beatsPerMinute, beatsPerPage, secondsPerPage)

Step 2: Unify into Engraving Data Model
├── Create unified element list: every visual item gets a record with:
│   ├── id, type (bundle type or "standalone"), track, section (top/bottom)
│   ├── time (referenceSeconds + offsetSeconds → absolute time)
│   ├── position (offsetYFraction, anchorOffsetX_mm)
│   ├── display (scale, heightFraction, width, height)
│   ├── svgRef (filename reference to exported SVG file)
│   ├── curveRef (if applicable: curveId → inline curve data with samples)
│   ├── gcRef (if applicable: gcId → inline GC data)
│   └── metadata (pitch, clef, dynamics, articulation, bundle-specific params)
├── For bundled items: merge bundle record + SVG element + curve/GC data into one record
├── For unbundled items: SVG element data is the record (no bundle metadata)
└── Sort everything by time + track

Step 3: Export SVGs (Bucket B)
├── For each SVG element: decode base64 svgDataUrl → write as standalone .svg file
├── Filename convention: Track{N}_{time}s_{id}.svg (e.g., Track1_7.3s_649.svg)
├── Export badge snapshots: run badge algorithm → capture static SVG frame
└── Generate page composite SVGs (for print):
    ├── Determine page boundaries (secondsPerPage)
    ├── For each page: composite all elements that fall within that time range
    ├── Position elements using the same layout math as the live app
    └── Output: page_001.svg, page_002.svg, etc.

Step 4: Export Timeline Data (Bucket C)
├── Element timeline: list of {elementId, appearTime, disappearTime, track, section}
├── Scroll mapping: seconds → X position formula/lookup
├── Curve animations: for each curve, the sample array + timing
├── Staff cursor data: positions and movement rules
└── Score config: total duration, page count, beats/tempo info

Step 5: Generate Print PDFs
├── Read page composite SVGs
├── Convert to PDF (Puppeteer or svg-to-pdf library)
├── Preserve colors, vector quality
└── Output: score_print.pdf (multi-page)

Step 6: Generate Engraving App
├── Copy/generate stripped-down index.html with:
│   ├── Score display (ScoreTop, ScoreBottom layout)
│   ├── SVGElementManager (select, drag, resize only — no generation)
│   ├── Element Inspector panel (metadata display, editable fields)
│   ├── Timeline + scroll system
│   ├── Curve display (render from sample arrays, no CurveMaker generation)
│   └── Playback controls (timeline scrub, play/pause for animation preview)
├── Load score_data.json + timeline.json + SVG files
└── No server needed — static files, can open directly in browser
```

**Output directory structure:**
```
builds/engraving/
├── index.html              — Engraving app (lightweight display + edit)
├── score_data.json         — Unified element data (Bucket A)
├── timeline.json           — Animation/timing data (Bucket C)
├── svgs/                   — Individual SVG files (Bucket B)
│   ├── Track1_7.3s_649.svg
│   ├── Track1_11.2s_658.svg
│   └── ...
├── pages/                  — Page composite SVGs (for print)
│   ├── page_001.svg
│   ├── page_002.svg
│   └── ...
├── print/                  — PDF output
│   └── score_print.pdf
└── badges/                 — Static badge snapshots
    └── badge_1.svg
```

### 5.2 Engraving → Performance (`build_performance.js`)

**Input:** `builds/engraving/` directory

*(Detailed steps TBD — to be planned after Stage 2 is solid)*

**High-level process:**
1. Read `score_data.json` + `timeline.json`
2. Inline all SVGs (no file loading at runtime)
3. Pre-compute animation keyframes
4. Generate optimized playback-only HTML/JS
5. Add WebSocket sync layer for ensemble playback
6. Output: `builds/performance/` — self-contained, deployable

### 5.3 Handling Engraving Edits in the Pipeline

**Scenario A: Major changes needed → Workshop**
1. Make changes in Workshop (full composition system)
2. Save score JSON
3. Re-run `build_engraving.js` — fresh Engraving output
4. Re-run `build_performance.js` — fresh Performance output
5. Any previous Engraving-only edits are overwritten (this is expected)

**Scenario B: Minor changes from rehearsal → Engraving**
1. Make changes in Engraving app (drag elements, adjust timing, swap SVGs)
2. Engraving app saves changes back to `score_data.json`
3. Re-run `build_performance.js` — fresh Performance output from updated Engraving data
4. Workshop is NOT updated (these are Engraving-level tweaks)

**Important:** If you later go back to Workshop and re-run `build_engraving.js`, Engraving-only edits will be lost. To preserve them, either:
- Apply the same edits in Workshop before re-exporting, or
- Keep a changelog of Engraving edits that can be re-applied (stretch goal)

---

## 6. Current Data Architecture (Reference)

### What the save file already captures

The score JSON (e.g., `scores/2295-FinalScore-preVersioning.json`) already stores:

| Source Key | System | Data Captured |
|-----------|--------|---------------|
| `svgElements` | SVGElementManager | id, name, referenceSeconds, offsetSeconds, offsetYFraction, width, height, scale, heightFraction, track, svgDataUrl (base64) |
| `databases.curves` | CurveDatabase | curves array (model, slope, y1, y2, startTime, endTime, track, section, samples, etc.), nextId |
| `databases.gcs` | GCMaker | GC objects (id, startTime, track, type, params, color, etc.) |
| `databases.motives` | MotiveDatabase | motives array |
| `databases.lineWedges` | LineWedgeDatabase | lineWedges array |
| `databases.badges` | BadgeDatabase | badges array |
| `databases.motiveGroups` | GroupDatabase | groups array |
| `databases.midiSnippets` | MidiSnippetDatabase | snippets array (events, trackIndex, timeMs, etc.) |
| `databases.audioClips` | AudioClipDatabase | clips (without audioBuffer/audioData) |
| `nfBundles` | NotationFragmentSystem | bundles (id, gcId, svgId, midiSnippetId, ...) |
| `cdBundles` | CrescendoUI | bundles (curveId, svgId, midiSnippetIds, pitchModel, dynamics, volumeMode, ...) |
| `adBundles` | AccelDecelUI | bundles (curveId, svgId, midiSnippetId, ...) |
| `bpBundles` | BartokPizzUI | bundles (gcId, svgId, midiSnippetId, pitch, dynamic, ...) |
| `bopBundles` | BowOverpressureUI | bundles (gcId, svgId, midiSnippetId, ...) |
| `clbBundles` | ColLegnoBattutoUI | bundles (gcId, svgId, midiSnippetId, pitch, dynamic, ...) |
| `ptBundles` | PizzTremUI | bundles (gcId, svgId, midiSnippetId, ...) |
| `ptgBundles` | PizzTremGlissUI | bundles (curveId, svgId, midiSnippetId, pitches, dynamics, ...) |
| `vibBundles` | VibratoUI | bundles (curveId, svgId, midiSnippetId, ...) |
| `musicalMaterials` | MusicalMaterialSystem | materials catalog |
| `connectors` | FlowchartConnector | connector lines between objects |
| `databases.notation` | NotationManager | notation data |

### Missing Data Capture Strategy

Three categories of "missing" data, each with a different approach:

#### Category 1: Curve Sample Arrays — Join at Build Time ✅

Bundles store `curveId`; the actual curve data (model, slope, y1, y2, samples, timing) lives in `CurveDatabase`. **No Workshop code changes needed.** During Step 2 of `build_engraving.js`, the script looks up each bundle's `curveId` in `CurveDatabase` and inlines the full curve record into the unified element. This is a simple data join.

#### Category 2: SVG Assembly Parameters — Metadata, Not Required for Display ✅

SVG assembly parameters (staff position, accidental, notehead type, dynamic) were the *inputs* that generated the SVG. The SVG itself is already rendered and stored as base64 in the save file. **The Engraving stage displays the already-rendered SVG — it does not regenerate it.**

These parameters are useful as descriptive metadata ("this is a C#4 in treble clef, bow overpressure accent at sfz") but not required for display or editing.

**Practical approach:**
- Some bundle types already capture this (CrescendoUI has pitchModel, pitchInfo, clef, dynamics; BartokPizzUI has pitch, dynamic, instrument)
- During Phase 1 audit: identify what each bundle type captures, enrich where easy
- The 271 unbundled SVGs have no assembly metadata — they're "opaque SVGs with positioning" and that's fine
- If regeneration is ever needed → go back to Workshop

#### Category 3: Computed Display Properties — Derived at Render Time ✅

Final pixel scale, effective heightFraction, etc. are computed at render time from stored values (scale, heightFraction, width, height, staffHeight_mm metadata) + the viewport/track dimensions. **Nothing to capture** — the Engraving app derives these the same way the Workshop does. This is a non-issue.

---

## 7. Practical Workflow Scenarios

### Scenario A: Major Edit — Delete a Section

*Example: Delete seconds 200–230, tighten the piece by 30 seconds.*

| Step | Where | What You Do |
|------|-------|-------------|
| 1 | **Workshop** | Open the full composition app, load score JSON |
| 2 | **Workshop** | Select and delete all elements in 200–230s range (SVGs, curves, GCs, bundles) |
| 3 | **Workshop** | Select everything after 230s → shift backward by 30s |
| 4 | **Workshop** | Adjust any transitions at the edit points, verify it looks right |
| 5 | **Workshop** | Save → produces `scores/2300-PostEdit.json` |
| 6 | **Terminal** | `node scripts/build_engraving.js scores/2300-PostEdit.json` |
| 7 | **Browser** | Open `builds/engraving/index.html` → verify the Engraving looks correct |
| 8 | **Browser** | Check `builds/engraving/print/score_print.pdf` → verify print output |
| 9 | **Terminal** | *(Later)* `node scripts/build_performance.js` → rebuild Performance |

**Total time for steps 6–8:** Minutes. The pipeline handles everything automatically.

### Scenario B: Minor Edit from Rehearsal Feedback

*Example: Performer says "Make this notation bigger, I can't read it" and "This entrance is 0.5s too early."*

| Step | Where | What You Do |
|------|-------|-------------|
| 1 | **Engraving app** | Open `builds/engraving/index.html` |
| 2 | **Engraving app** | Find the element → drag scale slider to make it bigger |
| 3 | **Engraving app** | Find the entrance → adjust timing by +0.5s in inspector |
| 4 | **Engraving app** | Save (updates `score_data.json`) |
| 5 | **Terminal** | `node scripts/build_performance.js` → rebuild Performance |

**Workshop is never touched.** These are Engraving-level tweaks.

### Scenario C: Swap an SVG (Enharmonic Change)

*Example: Change a C#4 notation to Db4.*

| Step | Where | What You Do |
|------|-------|-------------|
| 1 | **Workshop or external tool** | Generate the new Db4 SVG (if not already available) |
| 2 | **Engraving app** | Select the element → "Replace SVG" → load new file |
| 3 | **Engraving app** | Save |
| 4 | **Terminal** | `node scripts/build_performance.js` |

### Scenario D: Major Edit → Full Pipeline Rebuild

*Example: You went back to Workshop, made big changes, now want fresh everything.*

```
1. Make changes in Workshop → save score JSON
2. node scripts/build_engraving.js scores/latest.json    ← rebuilds Engraving from scratch
3. (Verify Engraving)
4. node scripts/build_performance.js                      ← rebuilds Performance from Engraving
5. (Verify Performance)
```

**Note:** Any Engraving-only edits from Scenario B/C are overwritten. This is expected — major changes in Workshop take precedence.

---

## 8. Pipeline Building Process — How We Build and Test This

### Strategy: Incremental, One Step at a Time

We build the pipeline in 6 discrete steps. Each step has a clear input and output that we can inspect and validate before moving to the next.

### Build Steps

#### Build Step 1: Data Extractor (core of `build_engraving.js`)
**What:** Read score JSON → extract and unify all bundles + unbundled elements + curves + GCs → output `score_data.json`
**Validate:**
- Count check: "542 SVG elements found" — must match Workshop
- Every bundled item has its curve/GC data inlined
- Every element has an svgRef
- Spot-check: pick 5 random elements, print their full unified records, visually verify against Workshop
**Complexity:** Medium (data wrangling, ~1 session)

#### Build Step 2: SVG File Exporter
**What:** Decode base64 `svgDataUrl` from each element → write as standalone `.svg` file
**Validate:**
- File count: 542 SVG files produced
- Open 10 random files in browser — do they render correctly?
- File sizes: no zero-byte files
**Complexity:** Low (quick)

#### Build Step 3: Timeline Data Exporter
**What:** Extract element timing, scroll mapping, curve animation data → output `timeline.json`
**Validate:**
- Total duration matches Workshop
- Element appear/disappear times are plausible
- Curve sample arrays have the expected number of points
**Complexity:** Medium (~1 session, need to understand GraphicTimeline)

#### Build Step 4: Page Compositor
**What:** Generate page-level SVGs for print — composite all elements within each page's time range
**Validate:**
- Open page SVGs in browser → compare visually to Workshop pages
- Check: element positions, track layout, colors, scaling
- Check: page boundaries align correctly
**This is the hardest step** — it must replicate the Workshop's layout math (seconds → X position, track → Y position, element scaling)
**Complexity:** High (2–3 sessions)

#### Build Step 5: PDF Generator
**What:** SVG pages → multi-page PDF
**Validate:**
- Open PDF, check quality, colors
- Zoom to 400% — still crisp (vector)?
- Test print to paper
**Complexity:** Low (library call — Puppeteer or svg-to-pdf)

#### Build Step 6: Engraving App
**What:** Stripped-down HTML/JS that loads score_data.json + SVGs + timeline
**Validate:**
- Open in browser — does it display the score correctly?
- Test: select element, drag it, change timing, save, reload → change persists?
- Compare visually to Workshop — does it match?
**Complexity:** High (2–3 sessions — stripped-down version of the Workshop display)

### Debugging Strategy

- **Every step outputs inspectable files** — JSON you can read, SVGs you can view, PDFs you can open
- **Logging:** Build script prints progress and counts at each stage
- **Comparison tool:** Quick script that compares element positions between Workshop and Engraving output
- **Isolation:** If Step 4 has issues, Steps 1–3 are still valid — fix Step 4 without redoing earlier work
- **Incremental testing:** After each step, we run validation before building the next step

### Estimated Effort Summary

| Step | Complexity | Est. Sessions |
|------|-----------|---------------|
| 1. Data extractor | Medium | 1 |
| 2. SVG exporter | Low | Quick (part of Step 1 session) |
| 3. Timeline exporter | Medium | 1 |
| 4. Page compositor | High | 2–3 |
| 5. PDF generator | Low | Quick (part of Step 4 session) |
| 6. Engraving app | High | 2–3 |
| **Total** | | **~6–8 sessions** |

---

## 9. Key Decisions Log

| # | Decision | Status | Notes |
|---|----------|--------|-------|
| 1 | **Repo strategy:** Clone current → freeze as composition-system-v1. Continue in current repo for pipeline. | ✅ Decided | Execute when ready |
| 2 | **Engraving content:** No MIDI, no audio. Graphics + timeline only. | ✅ Decided | |
| 3 | **Bundle data completeness:** Capture all UI-visible params + computed data for re-renderability | ✅ Decided (concept) | Needs Phase 1 audit |
| 4 | **Engraving editing method:** Minimal UI (Option 2) — keep select/drag/resize + Element Inspector, strip generation panels | ✅ Decided | |
| 5 | **Engraving iteration:** Pipeline is repeatable (re-run scripts), but expect to iterate on the pipeline itself | ✅ Noted | Build incrementally |
| 6 | **Performance stage details:** Sync model, delivery method, UI | ⏳ Deferred | Plan after Stage 2 is solid |
| 7 | **Badge animations:** Capture as static SVG snapshot in Engraving/Performance | ✅ Decided | |
| 8 | **Print output:** SVG pages → PDF. Vector, scalable, colors preserved. | ✅ Decided | |
| 9 | **Unbundled items grouping:** No explicit grouping needed. Export flat, indexed by time + track. Layout = grouping. | ✅ Decided | Based on data audit |
| 10 | **Orphaned curves:** 47 curves with no track/zero times — exclude from Engraving export | ✅ Decided | |
| 11 | **Curve data capture:** Join curve samples at build time from CurveDatabase. No Workshop changes needed. | ✅ Decided | |
| 12 | **SVG assembly params:** Nice-to-have metadata, not required for display. Enrich where easy during audit. | ✅ Decided | |
| 13 | **Computed display props:** Derived at render time, not stored. Non-issue. | ✅ Decided | |

---

## 10. Implementation Phases

### Phase 1: Data Export & Audit
- Audit each bundle system's `exportBundles()` — identify metadata gaps
- Audit curve data: which bundle types reference curves?
- Build Step 1 (data extractor) + Step 2 (SVG exporter)
- Validate: counts, spot-checks, SVG rendering

### Phase 2: Engraving Build
- Build Steps 3–6 (timeline, page compositor, PDF, Engraving app)
- Build `build_engraving.js` as the unified pipeline script
- Test round-trip: Workshop → Engraving → verify visual accuracy
- Test editing: drag, resize, timing adjust, SVG replace, save/reload

### Phase 3: Performance Build
- Design performance playback engine
- Build `build_performance.js`
- Implement WebSocket sync for ensemble
- Optimize for smooth animation
- *(Plan details after Phase 2 is complete)*

### Phase 4: Conversion Testing
- Full Workshop → Engraving → Performance pipeline test
- Verify that Workshop edits can be re-exported cleanly
- Verify that Engraving edits persist through Performance rebuild
- Test print PDF output quality
- Test Scenario A (major edit) and Scenario B (minor edit) end-to-end
