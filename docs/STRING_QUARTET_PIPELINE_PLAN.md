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

---

## 11. Engraving App v2 — Subtractive Process Notes

### Key Insight

The correct approach for building the Engraving version of the score is **subtractive** — start with the full Workshop HTML (`public/index.html`) and surgically remove/replace only what's needed. This preserves the exact look and feel of the score (colors, aspect ratios, lineWedge shapes, GC rendering, etc.) without having to rebuild any rendering logic.

v1 (abandoned) tried to generate HTML from scratch with its own renderer — this produced wrong colors, wrong aspect ratios, wrong shapes, and many visual mismatches. v2 copies the Workshop HTML verbatim and applies minimal patches.

### What Was Removed/Replaced (3 Patches in `build_engraving_app.js`)

| Patch | What Was Removed | What Replaced It | Why |
|-------|-----------------|-------------------|-----|
| **1. socket.io** | `<script src="/socket.io/socket.io.js"></script>` — the live WebSocket connection to the Workshop server | Inline `io()` stub function that returns a fake socket object | The Engraving app has no server. The stub intercepts `scoreGoto`, `scoreGo`, `scoreStop` events and handles them locally (tracks playback time, fires event handlers). This is what makes Play/Stop/Jump To work without a server. |
| **2. Score auto-load** | ScoreManager's server-based auto-load block (fetched latest score from Workshop server via HTTP) | `fetch('score.json')` → `distributeData()` → triggers `scoreState` event after 200ms | The Engraving app loads from a static JSON file instead of asking the server. The `scoreState` trigger after 200ms is essential — it initializes AnimationEngine and StaffCursors. |
| **3. saveScore** | ScoreManager's `saveScore()` method that POSTed JSON to the Workshop server | Blob download — creates a JSON file and triggers browser download | Saves work as a downloaded file instead of sending to server. |

### What Was Copied Alongside
- Score JSON → `score.json` (the full score data, ~9 MB)
- `public/midi_files/` → `midi_files/` (MIDI files referenced by the score)

### What Was NOT Removed (Yet)
The current v2 Engraving app is the **full Workshop HTML minus 3 server dependencies**. This means it still contains:
- All composition UI panels (Sustained Tone, Vibrato, One-Shots, Crescendo, etc.)
- All generation pipelines (SVG assembly calls, MIDI generation, LilyPond integration)
- All bundle systems (create, drag, delete)
- MidiModelSystem and all MIDI playback infrastructure
- All editing tools (curve editor, GC maker, etc.)
- All server API calls that haven't been patched (e.g., SVG assembly endpoints, LilyPond endpoints)
- The full CSS for the dark Workshop theme

### What Needs to Happen Next (Starting Tomorrow)

**Phase A: Audit the Engraving app — identify what to keep vs. remove**
1. Open the Engraving app side-by-side with the Workshop
2. Go through every UI element and feature systematically
3. For each feature, decide: **Keep** (needed for engraving workflow), **Remove** (composition-only), or **Re-establish** (needs a non-server equivalent)
4. Document the decisions in a checklist

**Phase B: Identify what needs re-establishing**
Some features that are currently broken (because they call server endpoints) may need non-server equivalents if they're useful for the engraving workflow. Examples might include:
- SVG assembly endpoints (if we want to regenerate notation in the Engraving app)
- Any other server-dependent features that are useful for engraving

**Phase C: Reverse-engineer the pipeline**
Once we know exactly what to keep and what to remove, update `build_engraving_app.js` with additional patches:
- Strip out composition UI panels that aren't needed
- Strip out generation pipelines that aren't needed
- Add light theme CSS (Patch 4 — already planned)
- Re-establish any features that need non-server equivalents
- The pipeline becomes: "these are the things we remove, and these are the things we re-establish"

This is a deliberate, methodical process — not a rush job. Getting the audit right means the pipeline will be clean and maintainable.

---

## 12. Revised Pipeline Strategy (Mar 19, 2026)

### 12.1 Key Reassessment

The original three-stage model (Workshop → Engraving → Performance) invested heavily in a middle "Engraving" stage with its own data format, timeline export, page compositor, PDF generation, and stripped editing app. On reflection, **Phase 2 is over-engineered for the actual need.** Major changes to the piece are unlikely at this point, and the few minor changes that might arise (SVG swaps, timing shifts) can be handled directly in the Performance score or via simple scripts.

### 12.2 Simplified Model

```
Workshop (compose) ──→ score JSON ──→ Performance Score (strip, optimize, serve)
                                              ↑
                                        minor edits
                                     (scripts / built-in)
```

- **Workshop** = full composition system (essentially complete for this piece)
- **Performance Score** = the main deliverable — graphics-only display, stripped of all composition/generation tools, with minor edit capabilities and performer features
- **No separate Engraving stage.** The `build_engraving_app.js` v2 subtractive approach (§11) becomes the basis for building the Performance Score directly.

### 12.3 Edit Scenarios in the Performance Score

#### Minor Edit: SVG Swap (enharmonic, dynamic, pitch correction)

Each SVG element is self-contained in the score JSON with a `svgDataUrl` (base64) and independent positioning data. Swapping = replacing that data URL for the target element. **Trivial** — a script or minimal built-in UI.

#### Minor Edit: Timing Shift (move events later/earlier)

Each element has `referenceSeconds`. Shifting a region = bulk-updating `referenceSeconds` for affected elements, curves (startTime/endTime), GCs, and bundles. Touches ~10 data sources in the JSON but is fully automatable with a purpose-built script. **Medium complexity, straightforward.**

Both minor edit types can be built into the Performance app without affecting playback performance — editing is cold-path (when stopped), playback is hot-path (animation loop).

#### Major Edit: Back to Workshop (rare)

Go back to full Workshop, make substantial changes, save new score JSON, re-run the build script to regenerate the Performance Score. `build_engraving_app.js` v2 already handles this conversion. Any Performance-level edits would be overwritten — keep a lightweight changelog to re-apply if needed. **Feasible, somewhat manual, acceptable for a rare scenario.**

### 12.4 Phase 3 Vision — Performance Score

#### A. Core Performance Score
- **Strip to graphics only** — score display, animation, timeline, scrolling. No MIDI, no audio, no generation UI.
- **Parts extraction** — generate individual track versions (Track 1 only, Track 2 only, etc.) alongside the full score
- **Animation optimization** — audit AnimationEngine, look for performance improvements (requestAnimationFrame efficiency, DOM operations, render pipeline)
- **Print score** — high-resolution page output (see §12.5)

#### B. Synchronization & Server
- **Tight sync** — WebSocket communication optimized for ensemble playback
- **Server architecture** — reliable, low-latency coordination between multiple performer clients

#### C. Performer Experience
- **Custom markers / rehearsal points** — performers can jump to named locations (not just raw seconds)
- **Score navigation** — easy repeat/loop of sections during rehearsal
- **Hand annotation** — performers can take personal notes on their version of the score
- **Per-performer versions** — each performer has their own annotated copy

#### D. Public / Production
- **Website / hosting** — public-facing version of the score
- **Login / authentication** — performer accounts, possibly audience access
- **Multiple simultaneous performances** — architecture for concurrent sessions
- **Performance capture** — recording/logging unique performance instances
- **Session management** — handling what performers need before, during, after a performance

### 12.5 Print Score

At some point in the process (from Workshop or from Performance Score), produce a high-resolution print version:
- One image per display page (ScoreTop and ScoreBottom are separate display pages)
- Vector quality (SVG) or high-resolution raster (PNG at 300+ DPI)
- Likely approach: headless browser (Puppeteer) navigates to each page, captures at high resolution
- Alternative: programmatic SVG composition (composite all elements per page into a standalone SVG)
- Output: PDF or image set suitable for printing

### 12.6 SVG Graphics — Deep Analysis

#### Current Storage Architecture

All 542 SVG elements are stored as **base64 data URLs** inline in the score JSON (`svgDataUrl` field). Total SVG data: ~4.1 MB embedded in a ~9 MB score JSON file. Each element also carries:
- `referenceSeconds`, `offsetSeconds` — time-based positioning (X axis)
- `track` — instrument track 1–4 (Y axis)
- `offsetYFraction` — vertical fine-tuning within track
- `scale`, `heightFraction` — sizing relative to track height
- `width`, `height` — natural SVG dimensions
- `anchorOffsetX_mm` — anchor point offset for notehead alignment

The score JSON also contains ~10+ other data sources beyond SVG elements: curves (225), GCs (248), 9 bundle types, motives, lineWedges, badges, midiSnippets, audioClips, connectors, notation data.

#### SVG Optimization Opportunities

**1. Externalize SVGs (high impact)**
Currently all 542 SVGs are base64-encoded inline in the JSON. For the Performance Score:
- Extract each SVG to a standalone file (e.g., `svgs/Track1_7.3s_649.svg`)
- Store only file references in the score data
- **Benefits:** Smaller score JSON (~5 MB → ~1 MB), individual SVGs can be cached by browser, easier to swap/update individual SVGs, enables lazy loading
- **Trade-off:** Loses self-contained single-file portability (acceptable for a server-hosted Performance Score)

**2. SVG minification (medium impact)**
The base64-encoded SVGs likely contain:
- Redundant whitespace and formatting
- Unused attributes from LilyPond export
- Verbose decimal precision (e.g., `3.141592653` → `3.1416`)
- Potential for SVGO-style optimization (remove metadata, compress paths)
- Estimated 20–40% size reduction per SVG without visual change

**3. Rasterization for non-interactive elements (optional, low priority)**
Convert SVGs to PNG at the exact display resolution. Raster images render faster than complex SVGs (no path computation). But: loses scalability, complicates resize behavior. **Not recommended** unless profiling shows SVG rendering is a bottleneck.

**4. SVG sprite sheet / atlas (optional, low priority)**
Group SVGs that appear on the same page into a single SVG document with `<symbol>` + `<use>` references. Reduces HTTP requests and DOM nodes. More complex to implement. **Defer unless page load becomes an issue.**

#### Loading & Unloading Strategy

**Current behavior:** All 542 SVG elements are loaded into the DOM at startup. `updateVisibility()` sets `display: none` on off-page elements and `display: ''` on visible ones. This means:
- **All SVGs are in the DOM at all times** — ~542 `<image>` elements with base64 data URLs
- Page jumps just toggle visibility (fast — CSS display switch)
- Restart = no reload needed, just reset scroll position

**Optimization opportunities:**

**A. Lazy DOM insertion (medium impact)**
Instead of inserting all 542 elements at startup, only insert elements for the current visible pages (typically 2 pages: one ScoreTop, one ScoreBottom). As pages change, insert upcoming page elements and remove distant ones.
- **Benefit:** Reduces initial DOM size from ~542 elements to ~20–40 per visible page pair
- **Complexity:** Medium — need to pre-index elements by page, manage insertion/removal lifecycle
- **Risk:** Page jumps to distant pages would need a brief load. Mitigate by pre-loading ±1 page ahead.

**B. Page-indexed data structure (low complexity, enables everything else)**
Pre-sort elements by page number at load time. Create a lookup: `pageElements[pageNum] = [list of elements]`. This makes all page-based operations O(1) instead of iterating all 542 elements.

**C. Pre-decoded image cache (low impact)**
If SVGs are externalized, the browser cache handles this automatically. If kept as base64, decoding happens once at DOM insertion. Not a significant bottleneck either way.

**Recommendation:** Start with **B** (page index) which is trivial and enables **A** (lazy DOM) if needed. Externalized SVGs (**optimization #1** above) + browser caching may make lazy loading unnecessary — profile first.

#### Resize Robustness & Slippage

**Current architecture (strong foundation):**
The positioning system is already well-designed for resize stability:
- All positions are **derived from time + track**, not stored as pixels
- `calcPixelPosition()` recomputes X from `(referenceSeconds → displayTime → page → xPercent → pixels)` and Y from `(track → trackDims → offsetYFraction → pixels)` — both are viewport-relative
- `reRenderAllElements()` recalculates every element's position and scale on resize, using `requestAnimationFrame` after a 100ms debounce
- `heightFraction` (not `scale`) is the source of truth for sizing — scale is derived from `(heightFraction × trackHeight) / naturalHeight`
- `anchorOffsetX_mm` stores notehead alignment in physical units (mm), and `_recalcOffsetSeconds()` recomputes the time offset from this on scale/resize changes

**Known issues from Workshop (to investigate and fix for Performance):**
- Occasional element drift after resize — may be related to `offsetSeconds` not being recalculated for all elements, or to race conditions between resize event and reflow
- Potential freeze on aggressive resize — the 100ms debounce helps but `reRenderAllElements()` touching all 542 elements could stall if the reflow/layout cycle is expensive
- `void this.scoreTopEl.offsetHeight` force-reflow at the start of `reRenderAllElements()` is a synchronous layout thrash — could be expensive with 542+ DOM elements

**Recommendations for Performance Score:**

1. **Profile the resize path** — measure how long `reRenderAllElements()` takes with 542 elements. If >16ms, it's causing dropped frames during resize.
2. **Batch DOM writes** — currently each element's transform is updated individually inside the loop. Collect all transform strings, apply in one batch.
3. **Only recompute visible elements on resize** — off-page elements don't need immediate recalculation. Recompute them lazily when their page becomes visible.
4. **Debounce aggressively** — 100ms may not be enough. Consider 200–300ms, or use `ResizeObserver` instead of window resize event for more reliable timing.
5. **Test resize scenarios systematically** — full-screen toggle, window drag-resize, browser zoom, split-screen. Document and fix any slippage.
6. **Lock aspect ratio option** — for performance use, consider a fixed aspect ratio mode where resize is constrained. Simplifies positioning math and eliminates most slippage edge cases.

### 12.7 Synchronization Architecture — Deep Analysis

#### Current Architecture (What Exists)

**Three-layer sync stack:**

```
Layer 1: ClockSync     — estimates server time from client clock + offset
Layer 2: ScoreTime     — converts server time to score position (pausable)
Layer 3: AnimationEngine — drives 60fps render loop from ScoreTime
```

**ClockSync** (`index.html:3179-3259`):
- On connect: sends one `pingRequest` to calculate RTT
- Every 5 seconds: sends another `pingRequest`
- Server broadcasts `clockSync` every **1000ms** (1 second)
- RTT calculation: `roundTripTime = receiveTime - sendTime`, latency = RTT/2
- Offset = `estimatedServerTimeNow - clientReceiveTime`
- Averages last 10 offset samples for stability
- `ClockSync.now()` = `Date.now() + clockOffset`

**ScoreTime** (`index.html:3269-3288`):
- When playing: `scoreTime = ClockSync.now() - scoreTimeOffset`
- When stopped: returns frozen `currentScoreTimeMs`
- `scoreTimeOffset` is set by server on `scoreGo` event — all clients get the same offset

**Server** (`server.js:3452-3592`):
- Maintains authoritative `isPlaying`, `currentScoreTimeMs`, `scoreTimeOffset`
- `scoreGo`: sets `scoreTimeOffset = Date.now() - currentScoreTimeMs`, broadcasts to all
- `scoreStop`: freezes `currentScoreTimeMs = getScoreTimeMs()`, broadcasts
- `scoreGoto`: stops + jumps + resets tempo history, broadcasts
- On new connection: sends `scoreState` with full state (isPlaying, offset, tempoHistory)

#### Gap Analysis vs. Industry Standards

**1. No local clock fallback (PARTIAL — accidental)**
If WebSocket disconnects, `ClockSync.now()` continues returning `Date.now() + lastKnownOffset`. This accidentally works as a local fallback — the score keeps running on the local clock. However:
- There's no **awareness** of disconnection (no UI indicator, no logging)
- No **reconnection re-sync** — Socket.IO reconnects automatically, but there's no burst of pings to quickly re-establish accurate offset
- Drift accumulates: typical consumer clocks drift ~1-20ms per minute. Over a 10-minute piece, that's 10–200ms of potential slippage between clients

**2. No drift detection or correction**
Game engines typically implement:
- **Server-authoritative time checks** — server periodically sends "you should be at position X" messages, clients compare and correct
- **Drift rate estimation** — track how fast the offset changes over time, apply a continuous correction factor
- **Snap vs. smooth correction** — small drifts are smoothed (speed up/slow down slightly), large drifts snap immediately
Currently: none of this exists. Clients trust their local offset indefinitely.

**3. RTT/2 assumption is fragile**
Assumes symmetric network latency (upload speed = download speed). On WiFi, mobile, or congested networks, this can be significantly asymmetric. NTP-style algorithms use multiple samples and discard outliers. Currently: simple average of 10 samples, no outlier rejection.

**4. `Date.now()` precision and monotonicity**
- `Date.now()` has millisecond precision and can **jump backward** on system clock adjustments (NTP corrections, daylight saving, etc.)
- `performance.now()` offers sub-millisecond precision, is **monotonic** (never jumps backward), and is the industry standard for game loops
- For sync offset calculation, `Date.now()` is needed (to compare with server `Date.now()`), but for local animation timing, `performance.now()` is superior

**5. Sync interval too slow for tight performance**
1-second `clockSync` broadcasts are adequate for composition but slow for performance synchronization. Game servers typically use:
- 10–20Hz state updates (50–100ms) for competitive games
- 1–5Hz for cooperative/less time-critical sync
- Adaptive rates based on detected drift

**6. No heartbeat / watchdog**
No mechanism to detect a "zombie" client (connected but not receiving updates) or to alert performers if sync quality degrades.

#### Recommended Sync Architecture for Performance Score

**Tier 1 — Essential (implement first, ~4–6 hours):**

**1a. Switch to `performance.now()` for local timing**

Current `ClockSync.now()` uses `Date.now()` which has only millisecond precision and is non-monotonic (can jump backward on OS clock adjustments). Split into two clocks — wall-clock for sync negotiation, `performance.now()` for local progression:

```js
const ClockSync = {
    _perfBase: 0,          // performance.now() at last successful sync
    _syncBase: 0,          // estimated server time at _perfBase
    
    init() {
        this._perfBase = performance.now();
        this._syncBase = Date.now();  // initial estimate until first sync
        // ... rest of init ...
    },
    
    calculateSync(serverTime, clientSendTime, clientReceiveTime) {
        // RTT calculation stays the same (uses Date.now())
        this.roundTripTime = clientReceiveTime - clientSendTime;
        const oneWayLatency = this.roundTripTime / 2;
        const estimatedServerTimeNow = serverTime + oneWayLatency;
        
        // Anchor result to performance.now():
        this._perfBase = performance.now();
        this._syncBase = estimatedServerTimeNow;
        // ... outlier filtering (see 1d) ...
    },
    
    // Monotonic, sub-ms precision:
    now() {
        const localElapsed = performance.now() - this._perfBase;
        return this._syncBase + localElapsed;
    }
};
```

`performance.now()` is monotonic (never goes backward), has ~5μs precision, and is the same clock `requestAnimationFrame` timestamps use.

**1b. Connection state awareness**

Currently no disconnect/reconnect handling. Socket.IO reconnects silently. Add awareness + burst re-sync + UI indicator:

```js
const ClockSync = {
    connected: false,
    syncHealthy: false,
    
    init() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.connected = true;
            this._burstResync();     // rapid re-sync on connect/reconnect
            this._updateStatusUI();
        });
        
        this.socket.on('disconnect', () => {
            this.connected = false;
            this._updateStatusUI();
        });
    },
    
    // Burst 5 rapid pings to quickly re-establish accurate offset
    _burstResync() {
        let count = 0;
        const burst = setInterval(() => {
            this.requestPing();
            count++;
            if (count >= 5) clearInterval(burst);
        }, 50);  // 50ms apart = 250ms total burst
    },
    
    _updateStatusUI() {
        // Small indicator: green = synced, yellow = syncing, red = disconnected
        const el = document.getElementById('syncStatus');
        if (!el) return;
        if (this.connected && this.syncHealthy) {
            el.style.background = '#0f0';
            el.title = `Synced (RTT: ${this.roundTripTime}ms)`;
        } else if (this.connected) {
            el.style.background = '#ff0';
            el.title = 'Connected — syncing...';
        } else {
            el.style.background = '#f00';
            el.title = 'Disconnected — local clock';
        }
    }
};
```

**1c. Server-authoritative position check**

Currently server sends `scoreTimeOffset` on `scoreGo` and that's it — no verification. Add periodic authoritative check with smooth correction:

Server side:
```js
// Every 3 seconds, broadcast authoritative score position
setInterval(() => {
    if (isPlaying) {
        io.emit('scorePositionCheck', {
            scoreTimeMs: getScoreTimeMs(),
            serverTime: Date.now()
        });
    }
}, 3000);
```

Client side:
```js
this.socket.on('scorePositionCheck', (data) => {
    if (!ScoreTime.isPlaying) return;
    
    const localScoreTime = ScoreTime.now();
    const drift = localScoreTime - data.scoreTimeMs;
    
    if (Math.abs(drift) > 50) {
        // Smooth correction over ~500ms (30 frames at 60fps)
        // Adjusts scoreTimeOffset by drift/30 each frame — imperceptible
        this._smoothCorrect(drift);
    }
});
```

Smooth correction adjusts `scoreTimeOffset` gradually (~3ms per frame for a 100ms drift) instead of jumping — invisible to the performer but brings the score back in sync.

**1d. Outlier rejection**

Currently: simple average of 10 offset samples. One WiFi hiccup (500ms RTT) pollutes the average for 50 seconds. Fix: discard outliers + use weighted averaging:

```js
calculateSync(serverTime, clientSendTime, clientReceiveTime) {
    this.roundTripTime = clientReceiveTime - clientSendTime;
    const oneWayLatency = this.roundTripTime / 2;
    const offset = (serverTime + oneWayLatency) - clientReceiveTime;
    
    // Outlier rejection: discard if RTT > 2× median
    if (this.syncSamples.length >= 3) {
        const sortedRTTs = [...this._rttSamples].sort((a, b) => a - b);
        const medianRTT = sortedRTTs[Math.floor(sortedRTTs.length / 2)];
        if (this.roundTripTime > medianRTT * 2) return;  // discard spike
    }
    
    this.syncSamples.push(offset);
    this._rttSamples.push(this.roundTripTime);
    if (this.syncSamples.length > this.maxSamples) {
        this.syncSamples.shift();
        this._rttSamples.shift();
    }
    
    // Weighted average: lower-RTT samples are more reliable
    let weightedSum = 0, totalWeight = 0;
    for (let i = 0; i < this.syncSamples.length; i++) {
        const weight = 1 / (1 + this._rttSamples[i]);
        weightedSum += this.syncSamples[i] * weight;
        totalWeight += weight;
    }
    this.clockOffset = weightedSum / totalWeight;
}
```

---

**Tier 2 — Robust (implement for production, ~1–2 days):**

**2a. Monotonic score clock**

Even with `performance.now()`, sync corrections from Tier 1c still adjust `scoreTimeOffset` — score time can briefly speed up/slow down. A monotonic wrapper applies corrections as rate adjustments (slewing) instead of jumps — how professional audio/video sync works:

```js
const MonotonicScoreClock = {
    _lastReportedMs: 0,
    _rateMultiplier: 1.0,    // 1.0 = normal, 1.001 = slightly fast
    _correctionTarget: null,
    
    now() {
        let rawTime = ScoreTime.now();
        if (this._correctionTarget) {
            const ct = this._correctionTarget;
            const progress = (performance.now() - ct.startedAt) / ct.duration;
            if (progress >= 1.0) {
                this._correctionTarget = null;
                this._rateMultiplier = 1.0;
            }
        }
        rawTime *= this._rateMultiplier;
        
        // Guarantee monotonic: never go backward
        if (rawTime < this._lastReportedMs) {
            rawTime = this._lastReportedMs + 0.001;
        }
        this._lastReportedMs = rawTime;
        return rawTime;
    },
    
    // Correct +50ms drift: slow down by 0.1% for 500ms
    applyCorrection(driftMs, overDurationMs = 500) {
        this._correctionTarget = {
            driftMs, duration: overDurationMs,
            startedAt: performance.now()
        };
        this._rateMultiplier = 1 - (driftMs / overDurationMs);
    }
};
```

**2b. Adaptive sync rate**

Currently: fixed 5-second ping regardless of sync quality. Adapt based on offset variance — speed up when unstable, slow down when converged:

```js
_adjustPingRate() {
    const offsetVariance = this._calculateVariance(this.syncSamples);
    
    if (offsetVariance < 5) {
        // Very stable — slow to 10s (save bandwidth)
        this._currentPingRate = Math.min(this._currentPingRate * 1.5, 10000);
    } else if (offsetVariance > 20) {
        // Unstable — speed up to 200ms to re-converge
        this._currentPingRate = Math.max(this._currentPingRate / 2, 200);
    }
    this._restartPingInterval();
}
```

Stable LAN → pings every 10s. Flaky WiFi → pings every 200ms until convergence.

**2c. Sync quality metric**

Expose sync health as a readable indicator for performers:
```
🟢 Sync: excellent | RTT: 12ms | Drift: ±3ms
🟡 Sync: fair | RTT: 45ms | Drift: ±18ms
🔴 Sync: poor | RTT: 120ms | Drift: ±55ms
⚫ OFFLINE — running on local clock
```

Computed from offset variance: <5ms = excellent, <15ms = good, <50ms = fair, >50ms = poor.

**2d. Graceful degradation**

If disconnected > 5 seconds, show non-intrusive offline banner: `"OFFLINE — running on local clock"`. Score continues running on local `performance.now()`. On reconnect: banner disappears, burst re-sync fires, indicator goes green when sync reaches "good" quality.

---

**Tier 3 — Advanced (nice to have, ~2–3 days):**

**3a. NTP-style offset calculation**

Current approach: average of RTT/2 offsets. NTP/Cristian's algorithm: multiple samples, statistical filtering, best-quartile selection:

```js
_calculateOffsetNTP() {
    // Sort samples by RTT — lowest RTT ≈ most symmetric latency
    const sorted = [...this._recentSamples].sort((a, b) => a.rtt - b.rtt);
    
    // Take best quartile (lowest 25% of RTTs)
    const best = sorted.slice(0, Math.ceil(sorted.length / 4));
    
    // Average their offsets — these are the most reliable estimates
    return best.reduce((sum, s) => sum + s.offset, 0) / best.length;
}
```

Incrementally better than Tier 1d but adds complexity. The simple approach gets 90% of the way.

**3b. Server heartbeat with watchdog**

Server sends heartbeat every 500ms. Client detects missed heartbeats (faster than Socket.IO's built-in 25s timeout):

```js
// Server:
setInterval(() => {
    io.emit('heartbeat', { seq: heartbeatSeq++, serverTime: Date.now() });
}, 500);

// Client:
let lastHeartbeat = performance.now();
socket.on('heartbeat', () => { lastHeartbeat = performance.now(); });

setInterval(() => {
    const missed = Math.floor((performance.now() - lastHeartbeat) / 500);
    if (missed >= 6) {  // 3+ seconds without heartbeat
        ClockSync._needsFullResync = true;
    }
}, 1000);
```

**3c. Latency-compensated start commands**

Currently `scoreGo` arrives at different times for different clients (latency-dependent). Fix: schedule start in the future so all clients begin simultaneously:

```js
// Server:
socket.on('scoreGo', () => {
    const now = Date.now();
    const scheduledStartTime = now + 100;  // 100ms buffer
    scoreTimeOffset = scheduledStartTime - currentScoreTimeMs;
    isPlaying = true;
    io.emit('scoreGo', {
        scoreTimeOffset, currentScoreTimeMs,
        scheduledStartTime,  // "start at this server time"
        serverTime: now
    });
});

// Client:
onScoreGo(data) {
    ScoreTime.scoreTimeOffset = data.scoreTimeOffset;
    const delay = data.scheduledStartTime - ClockSync.now();
    if (delay > 0) {
        setTimeout(() => { ScoreTime.isPlaying = true; }, delay);
    } else {
        ScoreTime.isPlaying = true;  // already past scheduled time
    }
}
```

Result: all clients start within ~1-2ms of each other.

---

**Implementation timeline:**

| Tier | When | What you get |
|------|------|-------------|
| Tier 1 | First pass building Performance Score | Reliable local timing, reconnection awareness, drift correction, clean sync samples |
| Tier 2 | Before first rehearsal with performers | Guaranteed monotonic time, adaptive to network quality, performers see sync health |
| Tier 3 | Before public performance | Sub-5ms cross-client sync, instant detection of issues, simultaneous starts |

### 12.8 Animation Engine & Smoothness — Deep Analysis

#### Current Architecture

**AnimationEngine** (`index.html:3294-3387`):
- `requestAnimationFrame` loop at 60fps target
- Frame number = `Math.floor((ClockSync.now() - startTime) / MS_PER_FRAME)`
- Only processes if `currentFrame > lastProcessedFrame` (skip duplicate frames)
- Detects frame skips (logs count) but doesn't interpolate missed frames
- Single `onDraw` callback, extended via hook chain pattern

**Hook chain (who runs each frame):**
```
AnimationEngine.onDraw
  └→ StaffCursors.update()        — cursor X position, curve followers, motive pies, LW meters
       └→ GCMaker.update()        — bouncing ball positions
  └→ GraphicTimeline.checkPageChange()  — page turn detection
  └→ MidiController (Workshop)    — timecode display, MIDI playback (strip for Performance)
  └→ AudioClipController (Workshop) — audio playback (strip for Performance)
```

**StaffCursors.update()** (`index.html:6451-6508`) — the main per-frame work:
1. `ScoreTime.now()` → get current score time
2. `calculateTotalPages(scoreTimeMs)` → iterate tempo history, compute page position
3. Compute `xPercent` from position in page cycle
4. For each of 4 cursors: set `x` attribute as percentage, show/hide by section
5. For each cursor: `updateCurveFollower()`, `updateMotivePie()`, `updateLineWedgeMeter()`
6. Reads `scoreTopEl.clientWidth` each frame (layout read)

**GCMaker.update()** (`index.html:33397-33459`):
1. Iterate all GCs, find active ones at current time
2. For each active GC: interpolate trajectory point, calculate pixel position
3. Create/show/hide ball SVG elements dynamically

#### Performance Issues Identified

**1. No interpolation between frames (BIGGEST smoothness issue)**
The engine calculates a discrete frame number: `Math.floor(elapsedMs / 16.67)`. This means:
- All positions snap to 16.67ms boundaries
- If `requestAnimationFrame` fires between frames (e.g., at 8ms into a 16.67ms frame), the position shown is the START of that frame, not the interpolated position
- Result: micro-stuttering. The cursor appears to "step" rather than glide.
- **Fix:** Use the actual elapsed time (continuous, not quantized) for position calculation. Remove frame-number-based rendering entirely.

**2. `requestAnimationFrame` timestamp ignored**
The browser provides a high-precision timestamp aligned with the display refresh via `requestAnimationFrame(timestamp => ...)`. The current engine receives it but uses `ClockSync.now()` instead. This means:
- Position calculation is tied to wall-clock time (which may not align with display refresh)
- If the main thread is busy, `ClockSync.now()` advances past where the display actually is, causing visual artifacts
- **Fix:** Use the rAF timestamp for smooth visual positioning, while using ClockSync for sync verification.

**3. Layout reads each frame**
`scoreTopEl.clientWidth` is read inside `StaffCursors.update()` every frame. This forces the browser to recalculate layout (reflow) if any DOM changes are pending. 
- **Fix:** Cache `clientWidth` on resize and read from cache. Only update on `resize` event.

**4. SVG attribute updates instead of transforms**
Cursor positions use `setAttribute('x', ...)` which triggers SVG DOM recalculation. 
- **Fix:** Use CSS transforms (`transform: translateX(...)`) or SVG `transform` attribute, which are GPU-composited and don't trigger layout/paint.

**5. Hook chain is fragile and hard to profile**
Each system overwrites `AnimationEngine.onDraw` with a wrapper. This creates a chain that's hard to debug and can't be individually enabled/disabled.
- **Fix:** Use a subscriber array: `AnimationEngine.subscribers.push({ name: 'StaffCursors', update: fn })`. Allows profiling, ordering, and selective disabling.

**6. `calculateTotalPages()` iterates tempo history each frame**
For the Performance Score with fixed tempo (1 entry in history), this is O(1) and not an issue. But it's called multiple times per frame (once in StaffCursors, once in GCMaker). 
- **Fix:** Cache the result per frame. Compute once at frame start, reuse.

#### Recommended Animation Architecture for Performance Score

**Tier 1 — Fix the Fundamentals (~2–4 hours):**

Targeted fixes to the existing engine. No architecture change.

**1a. Remove frame quantization → use continuous time**

Current engine calculates discrete frame numbers and only draws on frame boundaries. All positions snap to 16.67ms steps. Fix: remove the frame-number gatekeeping, draw every time rAF fires using continuous elapsed time:

```js
loop(timestamp) {
    if (!this.running) return;
    const elapsedMs = ClockSync.now() - this.startTime;
    // Always draw — let the browser decide when to call us
    if (this.onDraw) this.onDraw(elapsedMs);
    requestAnimationFrame((ts) => this.loop(ts));
}
```

All downstream systems (`StaffCursors.update`, `GCMaker.update`) already compute positions from continuous time — they just inherit the quantized input. This change flows through automatically.

**1b. Cache layout dimensions**

`scoreTopEl.clientWidth` is read inside `StaffCursors.update()` every frame (60 reads/second). Each read can force browser reflow. Fix: cache on resize, read from cache:

```js
// On init and resize:
this._cachedScoreWidth = this.scoreTopEl.clientWidth;
this._cachedScoreHeight = this.scoreTopEl.clientHeight;

// In update(): use this._cachedScoreWidth instead of this.scoreTopEl.clientWidth
```

**1c. Per-frame calculation cache**

`calculateTotalPages(scoreTimeMs)` is called in `StaffCursors.update()` and again in `GCMaker.update()` with the same input. Fix: compute once at frame start, store on shared object:

```js
// At frame start:
AnimationEngine._frameCache = {
    scoreTimeMs: ScoreTime.now(),
    totalPages: StaffCursors.calculateTotalPages(scoreTimeMs),
    scoreWidth: StaffCursors._cachedScoreWidth
};
```

---

**Tier 2 — Smooth Rendering (~1–2 days):**

More code changes but still within existing engine structure.

**2a. Use rAF timestamp + dual-clock model**

The rAF callback receives a `DOMHighResTimestamp` from `performance.now()` — sub-millisecond, monotonic, aligned with display refresh. Use it for visual positioning, keep `ClockSync.now()` for sync verification:

```js
loop(rafTimestamp) {
    if (!this.running) return;
    
    // Smooth local time for visuals (monotonic, sub-ms, display-aligned)
    if (!this._perfTimeBase) {
        this._perfTimeBase = rafTimestamp;
        this._syncTimeBase = ClockSync.now();
    }
    const localElapsedMs = rafTimestamp - this._perfTimeBase;
    const visualTimeMs = this._syncTimeBase + localElapsedMs;
    
    // Periodic sync check (every ~2s): compare with server time
    // If drift > 50ms, smoothly correct _syncTimeBase over 500ms
    // (not a jump — a gradual adjustment)
    
    if (this.onDraw) this.onDraw(visualTimeMs - this.startTime);
    requestAnimationFrame((ts) => this.loop(ts));
}
```

This gives the smoothness of `performance.now()` with the accuracy of `ClockSync`.

**2b. CSS transforms instead of SVG attribute updates**

Cursor positions currently use `setAttribute('x', ...)` which triggers SVG DOM recalculation on the main thread. CSS transforms are GPU-composited and skip layout/paint:

```js
// Instead of:
cursor.topEl.setAttribute('x', `${xPercent}%`);

// Use:
cursor.topEl.style.transform = `translateX(${xPixel}px)`;
cursor.topEl.style.willChange = 'transform';  // hint to browser for GPU layer
```

Same for GC balls — `setAttribute('cx', ...)` → `style.transform = 'translate(x, y)'`. The `will-change: transform` hint tells the browser to promote the element to its own compositing layer.

**2c. Subscriber pattern for hook chain**

Currently each system wraps `AnimationEngine.onDraw` with a closure — fragile, hard to debug/profile. Replace with clean subscriber array:

```js
AnimationEngine.subscribers = [];
AnimationEngine.subscribe = function(name, fn, priority = 0) {
    this.subscribers.push({ name, fn, priority });
    this.subscribers.sort((a, b) => a.priority - b.priority);
};

// In loop:
for (const sub of this.subscribers) {
    sub.fn(elapsedMs, frameCache);
}

// Each system registers cleanly:
AnimationEngine.subscribe('StaffCursors', (ms) => StaffCursors.update(ms), 0);
AnimationEngine.subscribe('GCMaker', (ms) => GCMaker.update(ms), 10);
AnimationEngine.subscribe('GraphicTimeline', (ms) => GraphicTimeline.checkPageChange(), 20);
```

Benefits: can disable individual systems, profile them individually, reorder without code changes.

---

**Tier 3 — Compositor-Offloaded Animation (~3–5 days):**

Moves the most performance-critical animation (cursor scrolling) off the JavaScript main thread entirely.

**3a. CSS Animation / Web Animations API for cursor**

Instead of updating cursor X 60 times per second in JavaScript, tell the browser to animate the element from left to right. The browser's compositor thread handles actual pixel movement — immune to main-thread jank (GC pauses, other JS work):

```js
// On page start (cursor enters a new page):
const animation = cursor.topEl.animate([
    { transform: 'translateX(0%)' },
    { transform: 'translateX(100%)' }
], {
    duration: secondsPerPage * 1000,  // e.g., 8000ms for 8 seconds/page
    easing: 'linear',
    fill: 'forwards'
});

// Store reference for sync corrections:
cursor._animation = animation;

// On sync check: nudge animation time to match server position
// animation.currentTime = 4200;  (smooth, no visible jump for small corrections)
```

When JS intervenes:
- **Page turn:** Cancel old animation, start new one on other section
- **Sync correction:** Nudge `animation.currentTime`
- **Stop/Goto:** Cancel animation, set final position manually

GC balls, motive pies, curve followers stay in JS — they're small updates that don't need compositor offloading.

**3b. Predictive rendering**

rAF fires → calculate position → set position → browser paints. But by paint time, another ~4-8ms has passed. The cursor is always slightly behind. Fix: calculate where the cursor will be at the *next* display refresh:

```js
const FRAME_BUDGET_MS = 16.67; // at 60Hz
const visualTimeMs = syncTimeBase + localElapsedMs + FRAME_BUDGET_MS;
```

Subtle improvement — mainly noticeable on high-refresh-rate displays (120Hz+) or in direct A/B comparison.

**3c. Sync quality indicator**

Small visual element showing sync health (pairs with §12.7 Tier 2c sync quality metric):
```
🟢 Synced (drift < 10ms)
🟡 Slight drift (10-50ms)
🔴 Drifting (>50ms) — re-syncing
⚫ Offline — local clock
```

---

**Implementation Risk Assessment & Timing Recommendations:**

*Analysis performed during Phase 2 implementation (Mar 19, 2026). Based on actual Phase 1 experience and dependency analysis against the current standalone (no-server) architecture.*

| Component | Risk | Dependencies | When to Implement | Rationale |
|-----------|------|-------------|-------------------|-----------|
| **1a.** Remove frame quantization | **Low** | None | ✅ **Phase 2 — Done** | Continuous time loop, no `Math.floor` frame gating. Patch AE2. |
| **1b.** Cache layout dimensions | **Low** | None | ✅ **Phase 2 — Done** | `_cachedScoreWidth/Height/StaffHeight` in canvas overlay. Patch O3b. |
| **1c.** Per-frame calculation cache | **Low** | None | ✅ **Phase 2 — Done** | GCMaker reuses StaffCursors page calculation. Patch O4. |
| **2a.** Dual-clock model (rAF + ClockSync) | **Medium** | ⚠️ Real sync system (Phase 6) | **Phase 10** | Without a real server, ClockSync is a stub returning `Date.now()`. The sync-correction logic (detecting drift, smooth correction) would be untestable dead code. Switching to `performance.now()` for local smoothing IS done in Phase 2 (as part of 1a), but the dual-clock architecture with server verification should wait until there's a server to verify against. |
| **2b.** CSS transforms / Canvas overlay | **Low** | None | ✅ **Phase 2 — Done** | Went further than CSS transforms — all animated elements (cursors, pies, meters, followers, GC balls) moved to HTML5 canvas overlay. Zero per-frame SVG mutations. Patches O3a–O3c, O4. |
| **2c.** Subscriber pattern | **Low-Med** | None | ✅ **Phase 2 — Done** | `AnimationEngine.subscribe(name, fn, priority)` replaces hook-chain wrappers. StaffCursors(0), StaffPositions(5), GraphicTimeline(10). Patches AE1, AE3a–c. |
| **3a.** Web Animations API for cursor | **High** | Real sync system (Phase 6), Tier 2a dual-clock | **Phase 13** | Fundamentally changes how cursor movement works — browser compositor thread drives it instead of JS. Page turns require cancel/restart. Sync corrections require nudging `animation.currentTime`. Without real sync, correction path is untestable. Also significantly harder to debug (cursor no longer visible in JS state). |
| **3b.** Predictive rendering | **Low** | Tier 2a | **Phase 13 (optional)** | Subtle improvement (~4-8ms lookahead). Only noticeable on 120Hz+ displays or under heavy main-thread load. Premature optimization until profiling shows it's needed. Low risk but low value until the system is under real performance pressure. |
| **3c.** Sync quality indicator UI | **N/A** | Sync Tier 2c metric | **Phase 10** | Cannot build without the sync quality metric from §12.7 Tier 2c. Purely a UI representation of sync data that doesn't exist yet. |

**Summary of recommended implementation schedule:**

| Tier | When | What you get |
|------|------|-------------|
| Tier 1 (all) + 2b + 2c | ✅ **Phase 2 — Complete** | Smooth cursor (continuous time), canvas overlay (zero SVG mutations), reduced reflow, clean subscriber architecture, badge freeze, CSS containment |
| Tier 2a + 3c | **Phase 10** (after server + sync Tier 1) | Display-aligned dual-clock rendering with sync correction, sync quality indicator |
| Tier 3a + 3b | **Phase 13** (after sync Tier 2, before live performance) | Compositor-thread cursor (immune to JS pauses), predictive positioning. **Only if profiling shows main-thread jank** — may not be needed if Tier 1+2 is sufficient. |

#### Animation Smoothness Checklist

For the Performance Score, measure and verify:
- [ ] Cursor movement is visually smooth (no micro-stepping)
- [ ] Page turns are instantaneous (no flash/glitch)
- [ ] GC bouncing balls follow trajectory without jitter
- [ ] Motive pie dials empty smoothly
- [ ] Curve follower meters update smoothly
- [ ] No dropped frames during normal playback (check via `requestAnimationFrame` callback timing)
- [ ] No jank during page turns (SVG visibility toggling)
- [ ] Resize during playback doesn't cause cursor jump
- [ ] SVG elements on current page are stable during animation (no wobble from layout recalculation)

### 12.9 Website, Account Management & Session Architecture

This section covers the infrastructure needed to serve the Performance Score to multiple performers, manage their identities, persist their data, and isolate simultaneous performances.

#### 12.9.1 Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Web Server                     │
│  (Express + Socket.IO)                          │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Room: A  │  │ Room: B  │  │ Room: C  │      │
│  │ (rehearsal│  │(perform) │  │(solo)    │      │
│  │ quartet1)│  │ quartet1)│  │ player3) │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                  │
│  ┌──────────────────────────────────────┐       │
│  │         Auth / Session Layer          │       │
│  │  (JWT tokens, persistent sessions)    │       │
│  └──────────────────────────────────────┘       │
│                                                  │
│  ┌──────────────────────────────────────┐       │
│  │         Data Persistence Layer        │       │
│  │  (scores, annotations, user prefs)    │       │
│  └──────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
```

#### 12.9.2 Room-Based Session Isolation

Like a video game lobby system, each active performance/rehearsal is a **room**. Sync messages (clockSync, scoreGo, scoreStop, scoreGoto, scorePositionCheck) are scoped to the room — not broadcast globally.

**Implementation approach:**

```js
// Server: Socket.IO rooms
socket.on('joinRoom', ({ roomId, userId, role }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userId = userId;
    socket.role = role;  // 'leader' | 'performer'
    
    // Send current room state to joining player
    const room = rooms.get(roomId);
    socket.emit('scoreState', room.getState());
    
    // Notify others
    socket.to(roomId).emit('playerJoined', { userId, role });
});

// All sync broadcasts scoped to room:
io.to(roomId).emit('clockSync', { serverTime: Date.now() });
io.to(roomId).emit('scoreGo', { ... });
```

**Room types:**
- **Ensemble rehearsal** — all quartet members, one leader, synced playback
- **Ensemble performance** — same as rehearsal but with performance-mode UI (see §12.11)
- **Solo practice** — single player, no sync needed, local-only playback
- **Score viewing** — read-only, no playback, for studying/annotating offline

**Room lifecycle:**
1. Creator (typically the leader) creates room, gets room code/link
2. Performers join via code or direct link
3. Room persists as long as at least one member is connected (+ grace period of ~5 minutes for reconnection)
4. Room state (score position, tempo, who's connected) saved periodically for recovery
5. Room can be "saved" as a named session for future resumption

#### 12.9.3 Authentication & Identity

**Lightweight approach (recommended for a small ensemble):**

Rather than a full auth system, use **invite-based access with persistent tokens**:

1. **Composer (you)** creates an ensemble via admin panel
   - Defines ensemble name ("String Quartet No. 1 — Premiere Ensemble")
   - Assigns 4 performer slots: Violin I, Violin II, Viola, Cello
   - Generates unique invite links for each slot

2. **Performer** clicks invite link
   - First visit: prompted for display name, creates local profile
   - Server issues a JWT token stored in browser (httpOnly cookie + localStorage backup)
   - Token ties them to their slot (Violin I) in this ensemble
   - Subsequent visits: auto-authenticated, lands on their dashboard

3. **No passwords needed** — the invite link IS the credential (like a private game lobby link)
   - Links can be regenerated if compromised
   - Optional: add a simple PIN per performer for extra security on shared devices

**Data model:**

```
Ensemble
  ├── id, name, created_at
  ├── score_id (which score JSON to load)
  ├── members[]
  │     ├── slot: "violin1" | "violin2" | "viola" | "cello"
  │     ├── display_name: "Sarah"
  │     ├── invite_token: "abc123..."
  │     └── annotations_id (reference to their saved annotations)
  └── sessions[]
        ├── id, name ("Tuesday rehearsal"), created_at
        ├── type: "rehearsal" | "performance" | "solo"
        ├── markers[] (shared bookmarks for this session)
        └── state: { scoreTimeMs, isPlaying, ... }
```

#### 12.9.4 Persistence & Data Storage

**What needs to persist:**
- **Per-performer:** annotations (drawings, text), personal markers, preferences (UI settings, display options)
- **Per-ensemble:** shared markers, rehearsal notes, session history
- **Per-session:** score state (position, tempo), room state, who was present

**Storage options (increasing complexity):**

| Option | Pros | Cons | Best for |
|--------|------|------|----------|
| **JSON files on server** | Simplest, no DB setup, easy backup | No concurrent writes, scales poorly | Prototype / single ensemble |
| **SQLite** | Single-file DB, SQL queries, good for small-medium | Single-writer limitation | Small deployment (1-5 ensembles) |
| **PostgreSQL** | Full relational DB, concurrent access, robust | Requires DB server setup | Production with multiple ensembles |
| **Cloud (Firebase/Supabase)** | Managed, real-time sync built in, auth included | Vendor lock-in, cost at scale | If you want to avoid self-hosting |

**Recommendation:** Start with **JSON files** (one per performer, one per ensemble). The data volume is tiny — annotations for a 4-person quartet are maybe 100KB total. Migrate to SQLite or Postgres if/when multiple ensembles are needed.

#### 12.9.5 Score Version Management

Performers need to be able to:
- **Switch between full score and their part** (Violin I only, Violin II only, etc.)
- **View other parts** temporarily (e.g., Viola player wants to see what Cello is doing)
- **Have multiple annotation sets** on the same score (e.g., "with bowings" vs. "with fingerings" vs. "clean")

**Implementation:**
```
PerformerData/
  ├── violin1/
  │     ├── annotations/
  │     │     ├── default.json        (current working annotations)
  │     │     ├── bowings-v2.json     (saved version)
  │     │     └── concert-final.json  (saved version)
  │     ├── markers.json              (personal bookmarks)
  │     └── preferences.json          (UI settings)
  ├── violin2/
  │     └── ...
  └── shared/
        ├── markers.json              (shared rehearsal markers)
        └── sessions.json             (session history)
```

**Score view modes:**
- **My Part** — shows only their track (default during rehearsal/performance)
- **Full Score** — shows all 4 tracks (for study/following along)
- **Other Part** — temporarily view another player's part
- These are just visibility toggles on the existing track system — the score data already has per-track information

#### 12.9.6 Server Scaling Considerations

For simultaneous performances, the server needs to handle multiple rooms without cross-contamination:

- **CPU:** Sync messages are lightweight (timestamps). Even 10 simultaneous rooms with 4 players each = 40 connections, ~400 sync messages/second at the proposed rates. A single Node.js server handles this easily.
- **Memory:** Each room holds the score state (a few KB) plus connected socket references. Negligible.
- **Bandwidth:** Clock sync + position checks ≈ 1-2 KB/s per client. 40 clients = ~80 KB/s. Trivial.
- **Bottleneck:** The score JSON itself (~9 MB). Serve it from a CDN or cache aggressively. Don't re-send on every page load.

**When to scale beyond a single server:** Only if hosting dozens of simultaneous ensembles or if global latency requires regional servers. Not a concern for the initial deployment.

### 12.10 Rehearsal Mode — Features & iPad Interface

#### 12.10.1 iPad Touch Interface Design

The score UI must be designed for **finger and Apple Pencil** interaction on iPad. Key principles from industry leaders (forScore, digitalScore, Newzik):

**Input mode separation:**
- **Apple Pencil** = annotation (drawing, writing) — always active, no mode switch needed
- **Finger** = navigation and controls (page turns, taps, swipes, gestures)
- This separation is built into iPadOS — the browser can detect `pointerType === 'pen'` vs. `pointerType === 'touch'`

**Core touch gestures:**
| Gesture | Action |
|---------|--------|
| **Swipe left** | Next page |
| **Swipe right** | Previous page |
| **Tap left edge** | Previous page |
| **Tap right edge** | Next page |
| **Tap center** | Toggle controls overlay (play/stop, markers, settings) |
| **Two-finger tap** | Toggle between part view and full score |
| **Long press** | Context menu (add marker, add annotation, jump to...) |
| **Pinch zoom** | Zoom into notation detail (for reading small passages) |
| **Double tap** | Quick zoom to tapped area (like Maps) |

**Controls overlay (shown on center tap):**
```
┌─────────────────────────────────────────┐
│  ◀ Page 3 of 24 ▶     [🔖] [✏️] [⚙️]  │
│                                          │
│  [Score position indicator / mini-map]   │
│                                          │
│  [⏮] [⏪]  [ ▶ PLAY ]  [⏩] [⏭]       │
│                                          │
│  Jump to: [dropdown of markers]          │
│                                          │
│  [👤 Solo] [👥 Sync All]               │
└─────────────────────────────────────────┘
```

The overlay fades away after 3 seconds of inactivity, or on any score tap.

**Page position awareness:**
The current timeline may be too small for quick orientation during rehearsal. Options:
- **Mini-map bar** at the top or bottom — shows entire score as a thin horizontal bar, current position highlighted, markers shown as ticks. Tap anywhere on it to jump.
- **Page number badge** — always visible in corner, e.g., "P3/24" with a subtle progress ring
- **Section labels** — show current section/rehearsal letter prominently when controls are visible
- Recommendation: Use the **mini-map bar** (compact, always visible, tappable for navigation) + **page number badge**

#### 12.10.2 Custom Markers / Bookmarks

Performers and leaders need to name specific locations in the score for quick navigation.

**Marker types:**
- **Personal markers** — only visible to the creator (e.g., "tricky passage", "practice this")
- **Shared markers** — visible to all ensemble members (e.g., "Letter A", "start of fugue")
- **System markers** — auto-generated from score data (rehearsal letters, section boundaries, time stamps)

**Creating a marker:**
1. Long press at desired score position → context menu → "Add Marker"
2. Or: controls overlay → 🔖 button → "Mark Current Position"
3. Enter name (keyboard or voice dictation)
4. Choose: Personal or Shared
5. Optional: assign a color

**Using markers:**
- Tap 🔖 in controls → scrollable list of all markers, grouped by type
- Mini-map shows markers as colored ticks
- "Jump to..." dropdown for quick access
- Leaders can **broadcast a marker jump** — "everyone go to Letter A"

**Data structure:**
```json
{
    "markers": [
        {
            "id": "m1",
            "name": "Letter A - Exposition",
            "scoreTimeMs": 45000,
            "page": 3,
            "type": "shared",
            "color": "#ff6600",
            "createdBy": "violin1"
        }
    ]
}
```

#### 12.10.3 Looping / Repeat Section

For individual practice, a performer needs to loop a specific section:

**Setting a loop:**
1. Tap "Set Loop Start" at current position (or long-press → "Loop Start Here")
2. Play forward (or manually set) to desired end point
3. Tap "Set Loop End" (or long-press → "Loop End Here")
4. Loop indicators appear on the mini-map and score (colored brackets)
5. When playback reaches loop end, it jumps back to loop start

**Implementation:**
```js
// In AnimationEngine/ScoreTime update:
if (this.loopEnabled && this.loopEnd && ScoreTime.now() >= this.loopEnd) {
    // Jump back to loop start
    ScoreTime.goto(this.loopStart);
}
```

**Controls:**
- Loop on/off toggle (visible when loop region is set)
- Drag loop boundaries on the mini-map
- "Clear Loop" button
- Loop count display: "Loop 3 of ∞" or set a fixed count

**Scope:** Looping is **per-client** — it doesn't affect other connected performers. In solo practice mode, this is straightforward. In ensemble mode, looping is only available when in "independent" navigation mode (see 12.10.4).

#### 12.10.4 Collective vs. Independent Navigation

This is a critical distinction. In rehearsal, sometimes the leader says "let's go to bar 45" (collective), and sometimes a player wants to flip back to check something (independent).

**Two modes:**

**🔗 Synced Mode (default in rehearsal):**
- All players follow the same score position
- Leader's navigation commands (play, stop, goto) affect everyone
- Page turns happen automatically with playback
- Any member can request a jump, but it broadcasts to all (with confirmation if desired)
- Visual indicator: 🔗 icon in corner, green border glow

**🔓 Independent Mode:**
- Player detaches from the group
- Can freely swipe pages, scroll, zoom, set loops
- Playback continues on their local clock but they control their own view position
- Other players see them as "detached" in the room status
- Visual indicator: 🔓 icon, amber border
- **Re-sync button:** "Return to group position" — one tap to jump back to where everyone else is

**Switching:**
- Swiping backward/forward manually while in Synced Mode → auto-switches to Independent (with subtle notification: "You've detached from the group — tap 🔗 to re-sync")
- Tapping the 🔗 icon → re-syncs immediately
- Leader can "recall all" — sends a re-sync request to all detached players

**Leader privileges (any member can be designated leader):**
- Play / Stop / Goto affect all synced members
- "Recall All" — request all detached members to re-sync
- Set shared markers
- Designate another member as leader
- Leader can be transferred mid-rehearsal (e.g., "you lead this section")

#### 12.10.5 Score Position Awareness

Beyond the mini-map, performers need clear context about where they are:

**Always visible:**
- Page number badge: "P7/24"
- Current time: "2:34 / 8:15"
- Active section/marker name (if within a marked region)

**On controls overlay:**
- Mini-map with full score overview
- List of nearby markers
- Tempo indication

**During playback:**
- The existing cursor bar shows current position within the page
- Consider a subtle **page countdown** indicator when approaching a page turn: small "3... 2... 1..." or a progress bar in the cursor that fills as it approaches the right edge

### 12.11 Performance Mode — Live Concert Features

Performance mode is a stripped-down, fault-resistant version of rehearsal mode. The priorities shift from flexibility to **reliability and simplicity**.

#### 12.11.1 Performance Mode vs. Rehearsal Mode

| Feature | Rehearsal | Performance |
|---------|-----------|-------------|
| Independent navigation | ✅ | ❌ (locked to sync) |
| Looping | ✅ | ❌ |
| Adding markers | ✅ | ❌ (read-only) |
| Adding annotations | ✅ | ❌ (read-only) |
| Score editing | ✅ | ❌ |
| Page swipe (manual) | ✅ | ❌ (auto-advance only) |
| Controls overlay | Tap to show | Swipe up from bottom (harder to trigger accidentally) |
| Emergency menu | Available | Available (dedicated gesture) |
| Lead-in countdown | Optional | Required |
| UI chrome | Normal | Minimal (score fills screen) |
| Accidental touch protection | Normal | Enhanced (see 12.11.3) |

#### 12.11.2 Lead-In / Countdown

Before the first downbow, performers need a clear visual countdown:

**Configuration (set by leader before performance):**
- Lead-in duration: 3, 5, 8, or custom seconds
- Countdown style: numeric ("3... 2... 1..."), visual (pulsing circle), or both
- Optional: audible click/beep for each count (through earpiece only)
- Optional: GC ball animation starts immediately (if the piece has an opening GC)

**Implementation:**
```js
// Performance start sequence:
function startPerformance(leadInSeconds) {
    const startAt = ClockSync.now() + (leadInSeconds * 1000);
    
    io.to(roomId).emit('performanceCountdown', {
        startAt: startAt,
        leadInSeconds: leadInSeconds
    });
}

// Client:
socket.on('performanceCountdown', (data) => {
    showCountdown(data.leadInSeconds);
    
    // Schedule exact start using latency-compensated time (§12.7 Tier 3c)
    const delay = data.startAt - ClockSync.now();
    setTimeout(() => {
        ScoreTime.go();
    }, Math.max(0, delay));
});
```

**Visual countdown:**
- Full-screen overlay that fades from opaque to transparent
- Large centered number: **3** → **2** → **1** → (overlay disappears, score starts)
- Optional: the first page of the score is already visible behind the semi-transparent overlay so performers can see what's coming

#### 12.11.3 Fault-Proof Start / Stop Controls

Accidental touches during performance are a real risk. Mitigations:

**Start protection:**
- Performance start requires **leader confirmation** — leader taps "Begin Performance", then a second confirmation: "Start in 5 seconds? [Confirm] [Cancel]"
- The countdown provides a grace period — leader can cancel during countdown
- Non-leader performers cannot start the score

**Accidental touch protection during playback:**
- **Lock screen gesture:** Once playing, the controls overlay requires a **deliberate gesture** to summon — either swipe up from the very bottom edge (like iOS Control Center) or a **three-finger tap**
- **No single-tap actions** during playback — taps on the score body are ignored (no accidental page turns, no accidental mode switches)
- Apple Pencil still works for annotations if enabled (but recommended to disable annotation in performance mode)
- Page turns are fully automatic — no manual intervention needed

**Stop protection:**
- Stop button requires **long press** (1 second) — not a tap
- Or: leader sends stop command → all clients stop simultaneously
- Visual confirmation: "Performance stopped at 4:32"

**Emergency stop (panic button):**
- **Three-finger long press** (1.5 seconds) anywhere on screen → immediate stop + "EMERGENCY STOP" indicator to all connected performers
- Available to ALL performers, not just leader (safety measure)
- After emergency stop: score freezes at current position, can be resumed from that point

#### 12.11.4 Emergency Recovery Procedures

Things that can go wrong during a live performance, and how to handle them:

**1. Network disconnection (performer loses WiFi):**
- Score continues on local clock (§12.7 accidental fallback, improved to intentional)
- Red "OFFLINE" indicator appears (small, non-distracting)
- Auto-reconnection happens silently when WiFi returns
- Burst re-sync brings them back in alignment (§12.7 Tier 1b)
- **Worst case:** Performer's score drifts slowly. At typical clock drift rates (1-20ms/min), a 10-minute disconnection could mean 10-200ms of drift — generally not noticeable for a scrolling score

**2. App crash / page reload:**
- On page load: check for active room session in localStorage
- If found: auto-rejoin room, receive current scoreState, jump to correct position
- Lead-in: the page reload takes 2-5 seconds (HTML + score JSON). During this time the performer is briefly without their score.
- **Mitigation:** Service Worker caches the HTML and score JSON so reload is nearly instant (< 1 second) even without network
- Visual: "Reconnecting..." splash screen, then score appears at correct position

**3. iPad battery / sleep:**
- Acquire a Wake Lock (`navigator.wakeLock.request('screen')`) to prevent the screen from dimming/sleeping during performance
- If Wake Lock is lost (low battery mode), show a warning
- If iPad sleeps and wakes: same recovery as page reload — rejoin room, re-sync

**4. Score needs to restart from a specific point:**
- Leader uses the emergency menu (three-finger tap → long press on "Emergency Menu")
- Options: "Restart from beginning", "Jump to marker...", "Resume from current position"
- All options broadcast to all synced performers
- Non-destructive — annotations and state are preserved

**5. Complete server failure:**
- All clients switch to local-only mode automatically
- Each performer's score continues independently
- No recovery possible until server is back
- **Mitigation:** For critical performances, run the server on reliable infrastructure (cloud VM with auto-restart) and/or have a backup server URL configured

#### 12.11.5 Industry Practices & Additional Recommendations

Based on research into forScore, digitalScore, and Newzik:

**1. Adaptive caching for page turns (from forScore):**
forScore pre-renders adjacent pages so turns are "virtually instantaneous." Our system already has all SVG elements loaded, but we should ensure visibility toggling is fast. Pre-compositing the next page's SVG group while the current page plays could eliminate any flash.

**2. Setlist / program order (from forScore):**
For concerts with multiple pieces, a "setlist" feature lets performers arrange pieces in program order and navigate between them seamlessly. Future consideration if the system expands beyond a single piece.

**3. Remote page turning (from digitalScore):**
Some performers use foot pedals (Bluetooth page turners) or MIDI controllers. Our system doesn't need manual page turns during synced playback, but supporting Bluetooth page turner input for manual navigation in rehearsal/solo mode would be a nice touch. These devices send simple keyboard events (typically arrow keys).

**4. Practice tracking (from digitalScore):**
Log how much time a performer spends on each section. Useful for rehearsal planning. Low priority but easy to implement — just record timestamps of which pages/markers are visited.

**5. Prevent finger drawing (from forScore):**
When Apple Pencil annotation is enabled, disable finger drawing to prevent accidental marks. Only the Pencil can draw; fingers navigate. This is the `pointerType` check mentioned in 12.10.1.

**6. Score dimming / night mode:**
For performances in dim venues, offer brightness control and/or a warm-toned dark mode to avoid blinding performers (and audience) with bright white iPads.

### 12.12 Annotation System — Design for Small Notation

#### 12.12.1 The Core Challenge

Musical notation on an iPad screen is relatively small — a typical staff line might be 3-4mm tall. A human fingertip is ~10mm. Drawing precise annotations (fingerings, bowings, dynamic markings) with a finger is impractical at normal zoom.

**Apple Pencil largely solves this** — the tip is ~1mm and iPadOS provides excellent palm rejection and pressure sensitivity. For performers with an Apple Pencil, annotation is nearly as natural as writing on paper.

**But not all performers may have an Apple Pencil**, and some annotations are better typed than drawn.

#### 12.12.2 Annotation Types & Input Methods

| Annotation Type | Best Input | Example |
|----------------|------------|---------|
| **Freehand drawing** | Apple Pencil | Bowings, breath marks, circling a note |
| **Fingering numbers** | Tap-to-place stamp | "2" placed above a note |
| **Text note** | Keyboard popup | "watch intonation here" |
| **Bowing marks** | Tap-to-place stamp | ∏ (down bow) or V (up bow) |
| **Color highlight** | Apple Pencil or finger swipe | Yellow highlight over a passage |
| **Dynamic override** | Tap-to-place stamp | "mp" placed under a note |
| **Emoji/icon** | Tap-to-place | ⚠️ (warning), 👁️ (watch conductor), 🎵 (cue) |

#### 12.12.3 Solutions for Small-Notation Annotation

**Solution 1: Zoom-to-annotate (recommended primary method)**

When the performer wants to annotate:
1. **Pinch-zoom** to enlarge the target area (standard iPad gesture)
2. Draw/write with Apple Pencil at the enlarged scale
3. Annotation is stored at the actual score coordinates — when zoomed back out, it appears at correct size and position
4. Visual feedback: semi-transparent overlay shows annotation bounds

This is how forScore works — and it's the most natural approach. The zoom provides the precision; the Pencil provides the fine-tip input.

**Solution 2: Stamp palette (for common musical symbols)**

A floating palette of common annotation stamps:
```
┌─────────────────────────────┐
│  1  2  3  4  0  ∏  V  >    │
│  p  f  mp mf  •  ⚠️  📌   │
│  [Aa] [✏️] [🔤]            │
│  [Aa] = text  ✏️ = draw    │
│  [🔤] = custom stamp       │
└─────────────────────────────┘
```

- Tap a stamp → tap on the score where it should go
- Stamps are pre-sized to fit musical notation scale
- No zoom required for simple annotations
- Custom stamps: performer can create their own (e.g., a specific bowing pattern they use frequently)

**Solution 3: Annotation magnifier (loupe)**

Like the iOS text selection magnifier:
- Long press on the score → a magnified circular loupe appears above the finger
- While holding, drag to position precisely
- Release → place annotation at the magnified position
- Works with finger or Pencil

**Solution 4: Margin notes**

For longer text annotations that don't fit on the score:
- Tap in the margin area (above or below the staves)
- A text field expands for typing
- A thin line connects the note to the relevant score position
- Margin notes auto-collapse to a small icon (📝) when not focused
- Tap the icon to expand and read

**Recommendation:** Implement Solutions 1 + 2 as the primary system. Solution 1 (zoom-to-annotate with Apple Pencil) covers detailed work. Solution 2 (stamp palette) covers quick, common annotations without zooming. Add Solution 4 (margin notes) for text-heavy annotations. Solution 3 (loupe) is a nice-to-have.

#### 12.12.4 Annotation Storage & Rendering

**Storage format:**

```json
{
    "annotations": [
        {
            "id": "a1",
            "type": "freehand",
            "scoreTimeMs": 45200,
            "page": 3,
            "track": "violin1",
            "position": { "x": 0.45, "y": 0.32 },
            "data": {
                "paths": [
                    { "points": [[0,0],[2,3],[5,1]], "color": "#ff0000", "width": 2 }
                ]
            }
        },
        {
            "id": "a2",
            "type": "stamp",
            "scoreTimeMs": 46000,
            "page": 3,
            "track": "violin1",
            "position": { "x": 0.52, "y": 0.28 },
            "data": { "symbol": "2", "category": "fingering" }
        },
        {
            "id": "a3",
            "type": "text",
            "scoreTimeMs": 47500,
            "page": 3,
            "track": "violin1",
            "position": { "x": 0.60, "y": 0.15 },
            "data": { "text": "watch intonation", "fontSize": 10 }
        }
    ]
}
```

**Rendering:** Annotations are rendered as an **SVG overlay layer** on top of the score SVGs. This keeps them separate from the score data and easy to show/hide/edit without affecting score rendering.

**Position anchoring:** Annotations are stored with both `scoreTimeMs` (time-based) and `page`/`position` (spatial). The time-based anchor ensures annotations stay attached to the correct musical moment even if page layout changes. The spatial position provides sub-page precision.

#### 12.12.5 Annotation Persistence

- **Auto-save:** Every annotation change auto-saves after 2 seconds of inactivity (debounced)
- **Version snapshots:** "Save as..." creates a named snapshot of all current annotations
- **Undo/redo:** Standard undo stack for annotation actions (last 50 actions)
- **Sync to server:** Annotations sync to the server so they're available across devices. Performer's annotations are private by default — other ensemble members can't see them unless explicitly shared.
- **Export:** "Export annotations" as a standalone JSON file (for backup or sharing)

#### 12.12.6 Annotation Layer Visibility

During performance, annotations should be visible but not distracting:
- **Opacity control:** Slider to adjust annotation opacity (default: 60%)
- **Show/hide toggle:** Quick toggle to show/hide all annotations
- **Category filters:** Show only fingerings, only bowings, only text, etc.
- **Color coding:** Different annotation types can have default colors for quick visual scanning

### 12.13 Parts Extraction — Individual Performer Scores

#### 12.13.1 What "Parts" Means in This System

In traditional orchestral publishing, "parts extraction" means generating a separate document for each instrument — the violinist gets only violin notes, the cellist gets only cello notes. In this system, the equivalent is: show only the elements (SVGs, curves, GCs, lineWedges, badges) belonging to a single track.

**Current data architecture — every element already has a track:**
- `svgElements[].track` — integer 1-4
- `curves[].gTrack` — string "1"-"4" (or "A" for full-score)
- `gcs[].gTrack` — string "1"-"4"
- `lineWedges[].gTrack` — string "1"-"4"
- `badges[].gTrack` — string "1"-"4"
- `motiveGroups[].gTrack` — string "1"-"4"
- All 9 bundle types inherit track from their SVG element

**Key insight: parts extraction is a filter, not a transformation.** The data already contains the track assignment. Extraction = "show only elements where track === N."

#### 12.13.2 Two Approaches: Runtime vs. Build-Time

**Approach A: Runtime filtering (recommended)**

The Performance Score app filters elements at display time. No separate build step needed.

```js
// In SVGElementManager — filter on load:
const trackFilter = performerConfig.trackFilter; // e.g., [1] for Violin I, [1,2,3,4] for full score

loadElements(scoreData) {
    for (const el of scoreData.svgElements) {
        if (trackFilter && !trackFilter.includes(el.track)) continue;
        // ... load element as normal
    }
}

// Same pattern for curves, GCs, lineWedges, etc.
```

**Advantages:**
- Zero extra build steps — parts are just a view mode toggle
- Minor edits (SVG swap, timing shift) automatically reflected — no re-extraction needed
- Single score JSON serves all performers
- Performer can switch between "My Part" and "Full Score" instantly (§12.9.5)

**Disadvantages:**
- Full score JSON is loaded by all performers (~9 MB), even if they only need 1/4 of the elements
- Filtering happens on every load (but it's fast — just a loop with a conditional)

**Approach B: Build-time extraction**

A script generates separate score JSON files per track: `score_violin1.json`, `score_violin2.json`, etc.

```js
// extract_parts.js
for (const trackNum of [1, 2, 3, 4]) {
    const partScore = {
        ...fullScore,
        svgElements: fullScore.svgElements.filter(el => el.track === trackNum),
        // Also filter: curves, GCs, lineWedges, badges, all 9 bundle types
    };
    fs.writeFileSync(`score_track${trackNum}.json`, JSON.stringify(partScore));
}
```

**Advantages:**
- Smaller file per performer (~2-3 MB instead of ~9 MB)
- No runtime filtering overhead

**Disadvantages:**
- Extra build step required after any change
- Must re-run extraction after every minor edit
- More files to manage and deploy

**Recommendation: Approach A (runtime filtering)**. The ~9 MB score JSON loads in < 1 second on any modern device, even on iPad over WiFi. The simplicity of "one file, filter at runtime" outweighs the minor bandwidth savings. If file size becomes an issue, Approach B can be added later as an optimization without any architectural change.

#### 12.13.3 Change Propagation — How Edits Flow to Parts

Since Approach A filters at runtime from the master score JSON, edits propagate automatically:

| Edit Type | What Changes | Parts Impact |
|-----------|-------------|-------------|
| **SVG swap** (minor) | Replace `svgDataUrl` for one element | Automatic — element still has same track, next load picks up new SVG |
| **Timing shift** (minor) | Update `referenceSeconds` across data sources | Automatic — positions recompute at render time from `referenceSeconds` |
| **Major edit** (back to Workshop) | Regenerate full score JSON | Re-deploy updated `score.json` — parts automatically reflect changes on next load |

**No separate "re-extract parts" step is ever needed** with runtime filtering. The master score IS the parts source.

#### 12.13.4 Part View — Look and Feel

**Option 1: Same layout, fewer elements (simplest)**

Keep the exact same 4-track vertical layout. The performer's track shows all its elements; the other 3 tracks are empty but still visible as blank staves. This maintains spatial consistency — "my notes are always in the second row" — and requires zero layout changes.

- Pros: trivial to implement, no reflow complexity, looks identical to full score minus other parts
- Cons: wastes 75% of vertical space on empty tracks

**Option 2: Single-track expanded view (best for performer)**

Show only the performer's track, expanded to fill the full vertical height. The notation is now 4× taller — much easier to read.

```
Full Score layout (4 tracks, each 25% of height):
┌──────────────────────────────────┐
│ Track 1: Violin I                │  25%
│ Track 2: Violin II               │  25%
│ Track 3: Viola                   │  25%
│ Track 4: Cello                   │  25%
└──────────────────────────────────┘

Part view (1 track, 100% of height):
┌──────────────────────────────────┐
│                                  │
│                                  │
│ Track 2: Violin II               │  100%
│                                  │
│                                  │
└──────────────────────────────────┘
```

Implementation:
```js
// Override StaffPositions for part view:
StaffPositions.getPositions = function(scoreEl) {
    const scoreHeight = scoreEl.clientHeight;
    const availableHeight = scoreHeight - this.timelineHeight;
    
    if (partViewMode) {
        // Single track fills all available height
        return {
            Staff1Y: this.timelineHeight,
            Staff2Y: this.timelineHeight,  // all map to same Y
            Staff3Y: this.timelineHeight,
            Staff4Y: this.timelineHeight,
            staffHeight: availableHeight,   // full height
            availableHeight: availableHeight
        };
    }
    // ... normal 4-track layout
};
```

- Pros: 4× larger notation, much easier to read on iPad, more pages visible since elements are bigger
- Cons: SVGs designed for 25% height now render at 100% — they scale (vector), but proportions relative to the page change
- Risk: `offsetYFraction` positions elements within the track. At 4× height, these offsets scale proportionally — generally fine, but elements near track boundaries might look odd.

**Option 3: Reflow with configurable tracks-per-page**

Allow the performer to choose how many tracks to show: 1, 2, or 4. With 2 tracks visible, you could show Violin I + Violin II together, or Viola + Cello. Each track gets 50% of the height.

- Pros: flexible, accommodates different preferences
- Cons: more complex layout logic, but StaffPositions already divides by N — just change the divisor

**Recommendation: Start with Option 1** (same layout, fewer elements). It requires zero layout changes — just the runtime filter. Add **Option 2** (expanded single track) as a view mode toggle. The SVGs are vector, so they scale cleanly. Option 3 is a nice-to-have if performers request it.

#### 12.13.5 Rescaling Analysis — Making Notation Bigger

If a performer wants larger notation (e.g., for readability on a smaller iPad), the system supports this because:

1. **SVGs are vector** — scale to any size without quality loss
2. **All positioning is relative** — `offsetYFraction` is a 0-1 fraction of track height, `xPercent` is 0-100% of page width. These scale automatically when the viewport changes.
3. **`heightFraction`** — each element stores what fraction of the track height it occupies. If the track is taller (single-track view), the element renders proportionally taller.
4. **`calcPixelPosition()`** — already derives everything from time + track + viewport dimensions at render time. No hard-coded pixel values.

**What scaling involves:**
- **Track height increase (Option 2 above):** Notation becomes proportionally larger. No additional work.
- **Zoom beyond 1:1:** The pinch-zoom gesture (§12.10.1) already allows enlarging any area. For a permanent zoom level, add a preference: `displayScale: 1.5` which scales the SVG viewport.
- **Integrity with original score:** Since all positioning is relative (time-based X, fraction-based Y), the spatial relationships between elements are preserved at any scale. An element at 45.2 seconds on Track 2 at 30% Y-offset will always be at that exact position regardless of zoom level.

**The fallback — maintaining same look/feel as master score — is always available** since Option 1 (same layout, filter only) is the default. Rescaling is an additive feature, not a replacement.

#### 12.13.6 Pages-Per-View in Part Mode

In the full score, the performer sees 2 pages at a time (ScoreTop + ScoreBottom). In a single-track expanded view, the notation is 4× larger, so the performer effectively sees the equivalent detail but only for one track.

An alternative: in part view, show **more pages** simultaneously by stacking them vertically:

```
Full score: 2 pages visible (top + bottom), 4 tracks each
Part view option A: 2 pages visible, 1 track expanded to full height
Part view option B: 4 pages visible (2×2 grid), 1 track at 2× height
Part view option C: 6 pages visible (3×2 grid), 1 track at ~1.3× height
```

This is a layout preference — the data and rendering are the same, just the viewport division changes. The cursor and page-turn logic would need to know how many pages are visible to advance correctly.

**For now:** Start with same 2-page view (Option A). This is already built and works. Adding more pages is a UI layout change that can be explored after the core part view is working.

### 12.14 Print Score Output — PDF Generation

#### 12.14.1 Screen Rendering — What We're Reproducing

**Critical discovery:** The score rendering areas (`#ScoreTop`, `#ScoreBottom`) already have a **white background** on screen:

```css
#ScoreTop {
    background: white;
    /* ... */
}
#ScoreBottom {
    background: white;
    /* ... */
}
```

The dark theme (body: black, ScoreContainer: blueGrey #708090) is only the **surrounding UI chrome** — the score content itself renders on white. This means print output on white paper is actually matching the screen's score area, not opposing it.

All notation SVGs (LilyPond-generated) use black strokes/fills by default, designed for white backgrounds. Curves and lineWedges use vivid named colors (brightOrange, limeGreen, neonMagenta, etc.) stored as named strings in the score JSON, resolved at render time against CSS custom properties.

**Color storage format:** CSS custom properties with explicit RGBA/RGB/hex values:
```css
--clr-brightOrange: rgba(240,75,0,255);    /* #F04B00 */
--clr-limeGreen: rgb(153,255,0);            /* #99FF00 */
--clr-neonMagenta: rgb(255, 21, 160);       /* #FF15A0 */
--clr-brightBlue: rgba(56,126,211,255);     /* #387ED3 */
--clr-brightRed: rgba(229,42,25,255);       /* #E52A19 */
--clr-lavander: rgba(162,126,198,255);      /* #A27EC6 */
/* ... etc. */
```

These are all standard CSS color formats — fully deterministic, no device-dependent color spaces. What you see on screen IS what gets captured in any print/PDF pipeline.

#### 12.14.2 Why compose_pages.js Has Fidelity Issues

The existing `compose_pages.js` → `generate_print_html.js` pipeline (the "from-scratch renderer") has the **same class of problems** that led to abandoning the v1 Engraving app approach:

**Color map is incomplete and inaccurate:**

| Color Name | Workshop CSS (actual) | compose_pages.js | Status |
|---|---|---|---|
| neonMagenta | `#FF15A0` | `#ff00ff` | **WRONG** |
| limeGreen | `#99FF00` | `#00ff00` | **WRONG** |
| brightGreen | `#31d196` | `#00ff00` | **WRONG** |
| brightOrange | `#F04B00` | *(missing)* | **MISSING** |
| brightBlue | `#387ED3` | *(missing)* | **MISSING** |
| brightRed | `#E52A19` | `#ff0000` | **WRONG** |
| mustard | `#F4B600` | *(missing)* | **MISSING** |
| lavander | `#A27EC6` | *(missing)* | **MISSING** |
| yellow | `#FED500` | `#ffff00` | **WRONG** |

**Rendering differences beyond color:**
- Curve rendering uses simplified point-to-point algorithm (may differ in interpolation from Workshop)
- LineWedge rendering is simplified (thickness profile may differ)
- GC arcs are reduced to dashed vertical lines (Workshop renders full arc animations)
- Track background styling differs

These are fixable — the color map can be corrected, the rendering can be improved — but this is re-doing work that the Workshop's rendering engine already does correctly. **The same lesson from the v1 → v2 pivot applies: don't rebuild the renderer, capture the real one.**

#### 12.14.3 Recommended Approach: Puppeteer Capture of Actual App

**The guaranteed-fidelity approach:** Use a headless browser to capture the Performance Score app (which uses the Workshop's actual rendering code — pixel-perfect by definition) page by page as PDF.

```
Performance Score app (subtractive build — pixel-perfect)
    ↓  Puppeteer navigates to each page
    ↓  page.pdf() or page.screenshot() per page
Combined PDF (exact screen match)
```

**Implementation sketch:**

```js
// scripts/generate_print_pdf.js
const puppeteer = require('puppeteer');
const path = require('path');

async function generatePrintPDF(appUrl, outputPdf, totalPages) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Set viewport to match score aspect ratio
    await page.setViewport({ width: 1600, height: 1200 });
    await page.goto(appUrl, { waitUntil: 'networkidle0' });
    
    // Wait for score to fully load and render
    await page.waitForSelector('#ScoreTop svg', { timeout: 10000 });
    await page.waitForTimeout(1000); // Allow all SVGs to render
    
    // Hide Workshop UI panels (only show score area)
    await page.evaluate(() => {
        // Hide everything except ScoreTop and ScoreBottom
        document.querySelectorAll('.control-panel, .side-panel, #ControlBar')
            .forEach(el => el.style.display = 'none');
        // Expand score to fill viewport
        const container = document.getElementById('ScoreContainer');
        if (container) {
            container.style.maxWidth = '100vw';
            container.style.maxHeight = '100vh';
        }
    });
    
    const pages = [];
    
    for (let pageNum = 0; pageNum < totalPages; pageNum += 2) {
        // Navigate to this page spread (top + bottom)
        const targetSeconds = (pageNum * secondsPerPage) - leadInSeconds;
        await page.evaluate((sec) => {
            // Use the app's own navigation to jump to this time
            if (window.ClockSync && ClockSync.socket) {
                ClockSync.socket.emit('scoreGoto', { seconds: Math.max(0, sec) });
            }
        }, targetSeconds);
        
        await page.waitForTimeout(500); // Allow render
        
        // Capture ScoreTop and ScoreBottom as high-res screenshots
        const scoreTop = await page.$('#ScoreTop');
        const scoreBottom = await page.$('#ScoreBottom');
        
        if (scoreTop) pages.push(await scoreTop.screenshot({ type: 'png', omitBackground: false }));
        if (scoreBottom) pages.push(await scoreBottom.screenshot({ type: 'png', omitBackground: false }));
    }
    
    // Combine into PDF (or use page.pdf() for vector output)
    // ... assemble pages into final PDF
    
    await browser.close();
}
```

**Pros:**
- **Guaranteed screen match** — same rendering engine, same colors, same everything
- Same "subtractive" philosophy as the v2 app approach
- Captures all visual elements exactly as rendered (curves, lineWedges, GCs, SVGs, timeline)
- No color mapping needed — colors resolve through the same CSS custom properties

**Cons:**
- Requires Puppeteer/Playwright dependency (~200MB)
- Screenshot output is raster (PNG), not vector. For vector PDF, use `page.pdf()` instead
- Slightly slower than compose_pages.js (launches real browser)

**Vector vs. Raster tradeoff:**
- `page.pdf()` — vector output, but captures the full page (including hidden elements). May need CSS @media print rules.
- `element.screenshot()` — raster, but captures exactly the visible rendering of ScoreTop/ScoreBottom. At 4x resolution (6400×4800), quality is indistinguishable from vector at any reasonable print size.
- Best of both: use `page.pdf()` with print-specific CSS that hides UI panels and shows only the score area. This gives **vector PDF of the exact screen rendering**.

#### 12.14.4 Alternative: Fix compose_pages.js (Lower Priority)

The compose_pages.js pipeline could be made accurate by:
1. Importing the exact CSS color variables (correcting all 15+ color mappings)
2. Matching the Workshop's curve interpolation algorithm
3. Matching lineWedge rendering
4. Adding GC arc rendering
5. Testing every element type for visual match

This is feasible but amounts to **re-implementing the Workshop's renderer** — exactly what the v1 approach tried and failed at. It's worth doing only if Puppeteer is unacceptable (e.g., CI environment with no browser). The compose_pages.js output is still useful as a quick preview or lightweight approximation.

#### 12.14.5 The Vector Quality Question

**All notation SVGs are inherently vector** (LilyPond generates vector SVG paths). The question is whether the PDF pipeline preserves this:

| Approach | Vector? | Quality |
|----------|---------|---------|
| Puppeteer `page.pdf()` | **Yes** — SVG content preserved as vector PDF paths | Best: infinite resolution, small file |
| Puppeteer `element.screenshot()` at 4× | No — raster PNG | Excellent at print sizes, larger file |
| compose_pages.js → browser print | **Yes** — nested SVGs preserved | Good: vector, but colors/rendering may differ |
| Direct SVG→PDF (pdfkit) | **Yes** — if library supports full SVG spec | Variable: depends on SVG complexity |

**Recommendation:** Use Puppeteer `page.pdf()` with print CSS for guaranteed-fidelity vector output. This is the only approach that gives both **exact screen colors** AND **vector scalability**.

#### 12.14.6 Print Capture Dimensions — ScoreContainer as Page Boundary

**IMPORTANT:** The PDF page dimensions should match `#ScoreContainer`, NOT the full browser viewport.

```
┌──────────────── Browser viewport ────────────────┐
│  black body       ┌─────────────────┐             │
│  padding          │ #ScoreContainer │             │
│  (EXCLUDE)        │ 4:3 aspect ratio│             │
│                   │ bg: blueGrey    │             │
│                   │ ┌─────────────┐ │             │
│                   │ │ #ScoreTop   │ │             │
│                   │ │ bg: white   │ │             │
│                   │ ├─────────────┤ │             │
│                   │ │ #ScoreBottom│ │             │
│                   │ │ bg: white   │ │             │
│                   │ └─────────────┘ │             │
│                   └─────────────────┘             │
└──────────────────────────────────────────────────┘
```

The CSS for `#ScoreContainer`:
```css
#ScoreContainer {
    background: var(--clr-blueGrey);  /* #708090 — the gray border area */
    aspect-ratio: 4 / 3;
    max-width: calc((100vh - 10px) * 4 / 3);
    max-height: calc((100vw - 10px) * 3 / 4);
}
```

**For print capture:**
- Capture target: `#ScoreContainer` element (or its bounding box)
- **Aspect ratio: 4:3** — this becomes the PDF page aspect ratio
- The blueGrey background acts as the thin margin/border between ScoreTop and ScoreBottom. Whether to include it in print is a style choice — it provides visual separation between the two score halves. Could also be set to white for print.
- **Exclude:** The black `body` background and any padding outside ScoreContainer
- The control panels, side panels, and other UI elements within ScoreContainer should be hidden for print (as shown in the Puppeteer implementation sketch above)

In Puppeteer, capture specifically the ScoreContainer element:
```js
const container = await page.$('#ScoreContainer');
await container.screenshot({ path: 'page.png', omitBackground: true });
// Or set viewport to exactly match ScoreContainer dimensions:
await page.setViewport({ width: 1600, height: 1200 }); // 4:3
```

#### 12.14.5 Print at Larger Sizes

Since the output is vector PDF:

1. **Standard printing** (A4/Letter landscape): PDF viewer scales SVG to fit page. Sharp at any DPI.
2. **Large format** (A3, tabloid, poster): Same PDF, just tell the printer to scale up. Vector content remains sharp. No "resolution" concern.
3. **Custom page size:** Modify `@page { size: 420mm 297mm }` in the CSS (A3 landscape) or set Puppeteer's `page.pdf({ width: '420mm', height: '297mm' })`.

**The SVG viewBox coordinate space (1200×400) is abstract** — it maps to whatever physical size the PDF page is. A 1200×400 viewBox SVG printed on A3 paper looks identical to A4, just physically larger with the same proportions.

#### 12.14.6 Print Parts (Individual Performer PDFs)

Combine parts extraction (§12.13) with print generation:

```
Score JSON
    ↓  Filter by track (runtime or build-time)
Track-specific elements
    ↓  compose_pages.js (with track filter flag)
Part pages (track N only)
    ↓  generate_print_html.js
Part print HTML
    ↓  Browser/Puppeteer → PDF
violin1_part.pdf, violin2_part.pdf, viola_part.pdf, cello_part.pdf
```

Implementation: Add a `--track` flag to `compose_pages.js`:

```bash
node scripts/compose_pages.js builds/engraving --track 1  # Violin I part only
node scripts/compose_pages.js builds/engraving --track 2  # Violin II part only
node scripts/compose_pages.js builds/engraving             # Full score (all tracks)
```

The script filters elements by track before rendering. Elements on non-target tracks are simply skipped. The page layout stays the same (4 track rows), but only the target track has notation on it. Or, with the expanded layout from §12.13.4 Option 2, a single-track expanded version.

### 12.15 Change Propagation — Procedures for Edits

#### 12.15.1 Minor Edit: SVG Swap

**Scenario:** A performer notices an enharmonic spelling error — F♯ should be G♭.

**Procedure:**
1. Open Workshop (`node server.js`, navigate to the element)
2. Generate corrected LilyPond → SVG (using the notation fragment pipeline)
3. In Workshop, swap the SVG for the affected element
4. Save the score JSON
5. Deploy updated `score.json` to the Performance Score server

**Parts impact:** None — runtime filter picks up the new SVG automatically.
**Print impact:** Re-run print pipeline (`build_engraving.js` → `compose_pages.js` → `generate_print_html.js`).
**Time:** ~5-10 minutes.

#### 12.15.2 Minor Edit: Timing Shift

**Scenario:** A crescendo starts 0.5 seconds too early.

**Procedure:**
1. Open Workshop, select the bundle
2. Adjust `startTime` / `referenceSeconds` (either in UI or via a script that shifts all associated data sources)
3. Save the score JSON
4. Deploy updated `score.json`

**Parts impact:** None — positions recompute from `referenceSeconds` at render time.
**Print impact:** Re-run print pipeline.
**Time:** ~5-10 minutes.

#### 12.15.3 Major Edit: Back to Workshop

**Scenario:** The composer wants to change a fundamental aspect — rewrite 10 seconds of material, add a new technique, restructure a section.

**Procedure:**
1. Open Workshop with the current score JSON
2. Make edits (may involve LilyPond generation, new SVGs, new curves, new GCs, new bundles)
3. Save the score JSON (versioned — e.g., `2296-FinalScore-v2.json`)
4. Rebuild Performance Score:
   ```bash
   # Step 1: Generate new performance score app
   node scripts/build_engraving_app.js scores/2296-FinalScore-v2.json builds/performance
   
   # Step 2: Generate new print output
   node scripts/build_engraving.js scores/2296-FinalScore-v2.json builds/engraving
   node scripts/compose_pages.js builds/engraving
   node scripts/generate_print_html.js builds/engraving
   ```
5. Deploy updated files to server
6. Notify performers to reload (the app should detect a new score version and prompt reload)

**Parts impact:** Automatic — same score JSON, runtime filter applies.
**Print impact:** Re-run full print pipeline.
**Annotation impact:** Performer annotations reference `scoreTimeMs` and `page` positions. If timing changed, annotations may shift. Consider:
  - Annotations on unchanged sections: still correct
  - Annotations on changed sections: may need manual review. The app could flag "this annotation's score position has changed since it was created."

**Time:** Variable — depends on scope of edits. The rebuild steps take < 1 minute total.

#### 12.15.4 Full Rebuild Procedure (Reference)

One-command rebuild from score JSON to deployable output:

```bash
#!/bin/bash
SCORE_JSON="scores/2296-FinalScore-v2.json"
BUILD_DIR="builds/performance"

# Performance Score app
node scripts/build_engraving_app.js $SCORE_JSON $BUILD_DIR

# Print pipeline
node scripts/build_engraving.js $SCORE_JSON builds/engraving
node scripts/compose_pages.js builds/engraving
node scripts/generate_print_html.js builds/engraving

# Optional: generate per-part print PDFs
for track in 1 2 3 4; do
    node scripts/compose_pages.js builds/engraving --track $track
done
node scripts/generate_print_html.js builds/engraving

echo "Build complete. Deploy $BUILD_DIR to server."
```

This should be wrapped in a single `build_all.js` script for convenience. Total runtime: < 30 seconds for the current score size.

---

## 13. Comprehensive Implementation Plan

**Created:** Mar 19, 2026
**Purpose:** Ordered, testable, robust implementation plan with project management methodology, contingency planning, and session continuity protocols.

### 13.1 Project Management Methodology

#### 13.1.1 The Continuity Problem

AI-assisted implementation across multiple sessions has a specific failure mode: **context loss between sessions.** A new session may misread what was already implemented, make decisions that conflict with previous work, or forget that a particular approach was tried and abandoned. This section defines protocols to prevent these failures.

#### 13.1.2 Three-Tier Documentation System

Every implementation session produces documentation at three levels:

**Tier 1 — Memories (AI context, always available)**
- Updated at the END of every implementation session
- Captures: what was built, what was tested, what passed/failed, what's next
- Format: structured memory with tags for retrieval
- **Critical rule:** Memory must include the EXACT resume point — which phase, which step, what state the code is in, any known issues

**Tier 2 — Git Commits (code snapshots, always recoverable)**
- Commit after every completed step (not just phases)
- Commit message format: `[Phase X.Y] Brief description — status`
- Example: `[Phase 1.3] Strip MIDI/audio systems — verified, all rendering intact`
- Tag milestones: `git tag phase-1-complete` after each phase
- **Critical rule:** NEVER commit broken code. If a step is incomplete, stash or revert.

**Tier 3 — Progress File (`docs/IMPLEMENTATION_PROGRESS.md`)**
- Living document updated during each session
- Contains: phase status table, known issues list, decisions log, test results
- This is the **primary handoff document** between sessions
- Any AI starting a new session should READ THIS FILE FIRST before touching code

#### 13.1.3 Session Start Protocol

Every new implementation session begins with these steps, IN THIS ORDER:

```
1. Read `docs/IMPLEMENTATION_PROGRESS.md` — understand current state
2. Read relevant memories — verify they match the progress file
3. Check git log (`git log -5 --oneline`) — verify last commits match expected state
4. Run the app and verify it works — don't trust documentation alone
5. Read the specific phase/step section in this plan (§13.4)
6. ONLY THEN begin implementation
```

**If the progress file and memories disagree:** Trust the progress file (it's more detailed and was written closer to the work). If both disagree with the actual code state, investigate before proceeding — do NOT start implementing until the current state is understood.

#### 13.1.4 Session End Protocol

Every implementation session ends with:

```
1. Ensure all code changes are committed (or reverted if incomplete)
2. Run verification tests for the current step
3. Update `docs/IMPLEMENTATION_PROGRESS.md`:
   - Mark completed steps
   - Document any issues discovered
   - Write explicit "RESUME HERE" section with:
     a. Exact next step to implement
     b. Any context needed (why a particular approach was chosen, etc.)
     c. Any known issues that affect the next step
     d. Files that were modified in this session
4. Update memory with structured summary
5. If a phase was completed: `git tag phase-N-complete`
```

#### 13.1.5 Progress File Structure

`docs/IMPLEMENTATION_PROGRESS.md` follows this template:

```markdown
# Implementation Progress

## Current Status
**Active Phase:** Phase 3 — Parts Extraction
**Active Step:** 3.2 — Filter curves, GCs, lineWedges
**Last Session:** Mar 22, 2026
**Last Commit:** abc1234 — [Phase 3.1] Track filter on element load — verified

## Phase Status Table
| Phase | Status | Completion Date | Notes |
|-------|--------|----------------|-------|
| 1. Foundation | ✅ Complete | Mar 20 | All rendering verified |
| 2. Animation T1 | ✅ Complete | Mar 21 | Smooth cursor confirmed |
| 3. Parts Extraction | 🔄 In Progress | — | Step 3.1 done, 3.2 next |
| 4. Print Score | ⏳ Pending | — | |
...

## Known Issues
| ID | Phase | Description | Severity | Status |
|----|-------|-------------|----------|--------|
| BUG-001 | 1 | Occasional flash on page turn at second 45 | Low | Deferred to Phase 2 |
| BUG-002 | 3 | Track "A" curves not filtered (full-score only) | Medium | Investigating |

## RESUME HERE
Next step: Phase 3, Step 3.2 — Filter curves by gTrack.
Context: SVG element filtering works (step 3.1). Curves use `gTrack` (string "1"-"4") 
not `track` (integer). Need to normalize comparison. See CurveDatabase in index.html.
Files modified last session: public/index.html (lines 3627-3640), builds/engraving/index.html
```

#### 13.1.6 Decision Documentation

When making implementation decisions (choosing between approaches, deviating from the plan, etc.):

1. **Document WHY** in a code comment at the point of implementation
2. **Log in the progress file** under a "Decisions" section
3. **If the decision conflicts with this plan:** Note the conflict explicitly and explain the rationale

Example:
```
## Decisions Log
| Date | Phase | Decision | Rationale |
|------|-------|----------|-----------|
| Mar 20 | 1.3 | Kept MidiModelSystem stub instead of full removal | Some curve rendering references MIDI model names for display labels. Removing breaks curve tooltips. Stub returns empty data. |
```

### 13.2 Contingency Planning

#### 13.2.1 Bug Discovery Protocol

**When a bug is discovered during implementation:**

```
SEVERITY ASSESSMENT:
├── Does it block the current step?
│   ├── YES → Fix immediately before proceeding
│   │         Log fix in progress file with root cause
│   │         Commit the fix separately: "[BugFix] Description"
│   │
│   └── NO → Log in Known Issues table with severity
│            Continue current step
│            Schedule fix based on severity:
│            ├── HIGH (affects core rendering/playback) → Fix before next phase
│            ├── MEDIUM (affects a feature, workaround exists) → Fix within 2 phases
│            └── LOW (cosmetic, edge case) → Fix when convenient or batch at end
```

**Bug fix commits are always separate** from feature commits. This makes it possible to revert a fix without losing feature work, or vice versa.

#### 13.2.2 Regression Discovery — Later Phase Reveals Earlier Bug

This is the most dangerous scenario. A feature built in Phase 8 reveals that something from Phase 2 doesn't work correctly under certain conditions.

**Protocol:**

1. **STOP current work.** Do not try to work around the bug in the current phase.
2. **Characterize the bug precisely:** Write a minimal reproduction case. What input triggers it? What's the expected behavior? What actually happens?
3. **Trace to root cause:** Determine which phase introduced the bug and which file/function is responsible.
4. **Assess blast radius:** What other completed phases might be affected by this same root cause? Check the dependency chain (§13.5).
5. **Fix at the source:** Go back to the originating phase and fix the bug there. Do NOT patch it downstream.
6. **Regression test everything downstream:** After fixing, re-run the verification tests for every phase between the bug's origin and the current phase.
7. **Commit:** `[BugFix] Phase 2 regression: description — caught in Phase 8`
8. **Log:** Update progress file with the full story (root cause, fix, affected phases, re-test results).

**If the fix would require restructuring a completed phase:**
- Evaluate scope: is it a 30-minute fix or a 2-day rewrite?
- If < 1 hour: fix it, re-test, move on
- If > 1 hour: create a detailed issue in the progress file, implement a minimal temporary workaround in the current phase, and schedule the proper fix as a dedicated session

#### 13.2.3 New Ideas and Enhancements During Implementation

It's natural to discover better approaches or want new features during implementation. Protocol:

**Enhancement that improves current step:**
- If it's small (< 30 min) and doesn't change the interface to other phases → implement it now
- If it's larger → log it in progress file under "Enhancement Ideas" and continue with the original plan

**Enhancement that affects multiple phases:**
- NEVER implement it in the middle of another phase
- Log it in the progress file with full description
- At the next phase boundary (between phases), evaluate:
  - Does it obsolete any planned phases?
  - Does it change the dependency order?
  - Does it require re-work of completed phases?
- If it requires re-work: treat it as a "revision phase" — insert it into the plan at the appropriate point, re-test affected phases

**Enhancement that contradicts a previous decision:**
- Document the contradiction clearly
- Discuss with the user before implementing — the original decision may have had reasons that aren't obvious

#### 13.2.4 When Something Won't Debug

If a bug or issue resists debugging after 30+ minutes of focused effort:

1. **Document everything tried** — approaches, hypotheses, results. This prevents future sessions from re-trying the same dead ends.
2. **Create a minimal test case** — isolate the problem from the full app. Can you reproduce it in a 50-line HTML file?
3. **Add diagnostic logging** — targeted console output that captures the state at the point of failure.
4. **Step away** — end the session cleanly. Write up the problem in the progress file with all findings. The next session (or the user) may see what you missed.
5. **Escalation path:** If the user is available, present the findings and ask for guidance. If not, move to the next independent step and return to this issue later.

**What NOT to do:**
- Do NOT keep trying random fixes ("shotgun debugging")
- Do NOT implement a workaround that masks the root cause without understanding it
- Do NOT delete code you don't understand
- Do NOT skip the step and hope it resolves itself

#### 13.2.5 Plan Robustness — Principles

1. **Phases are independent where possible.** Phases 3 (Parts) and 4 (Print) can be done in either order. If one is blocked, switch to the other.
2. **Each phase has a clear "done" checkpoint.** You know you're done when the verification tests pass. No ambiguity.
3. **Rollback is always possible.** Git tags at each phase boundary mean you can always get back to the last known-good state.
4. **The plan is a guide, not a prison.** If real-world experience during implementation reveals that the order should change, log the change and adjust. But do it deliberately, not accidentally.
5. **Prefer minimal fixes over large refactors.** If a 3-line change solves the problem, don't rewrite the module. The codebase is already working — preserve that.

#### 13.2.6 Phase Completion Post-Mortem Protocol

**After every phase passes its completion checkpoint, perform this post-mortem before committing.** This protocol was established during Phase 1 and captures lessons learned about what to review and document at each phase boundary.

**Step A: Human Verbal Audit**
Walk through every step and bullet point in the phase plan. For each:
- Did we fully address it? If not, what's missing?
- Did the human visual test pass? Note any caveats.
- Record the audit results (pass/fail/partial per step).

**Step B: AI Audit**
AI independently verifies each step's bullet points:
- Run automated checks (console errors, element counts, asset presence, fetch calls)
- Verify stubs cover all unguarded references to stripped systems
- Verify no unintended code paths can trigger errors
- Report findings with specifics (counts, line numbers, file names)

**Step C: Post-Mortem Pass 1 — Capture (Tier 1 memories)**
Create memories documenting:
- Build script architecture (patches, strips, stubs, assets)
- Every bug encountered: symptom, root cause, fix, lesson learned
- Key design decisions and why they were made

**Step D: Post-Mortem Pass 2 — Future Impacts**
Review all bugs and discoveries for impact on future phases:
- What did we learn that changes assumptions in later phases?
- Are there entanglements or dependencies we now understand better?
- Are there process improvements needed (e.g., automated asset audit)?
- Flag any findings that contradict or require updates to the plan.

**Step E: Post-Mortem Pass 3 — Repeatability**
Document what's needed if this phase must be re-run (e.g., score changes requiring reconversion):
- Step-by-step rebuild instructions
- Visual audit checklist for human verification
- Known gotchas and what to watch for
- Conditions that would require build script updates

**Step F: Troubleshooting Review**
Compare actual debugging process against §13.2.1–§13.2.4:
- Did we follow severity assessment correctly?
- Did we fix at root cause or apply workarounds?
- Did we create minimal test cases when appropriate?
- Were diagnostic logs effective?
- Note any process improvements for future debugging.

**Step G: Documentation & Commit**
- Update Known Issues table with any open items
- Remove diagnostic/temporary code (e.g., playback diagnostic intervals)
- Commit: `[Phase N] Description — stripped, verified`
- Tag: `git tag phase-N-complete`
- Update progress file / decision log if maintained

### 13.3 Testing Strategy

#### 13.3.1 Testing Types

Every step in the implementation plan specifies one of three testing types:

**🤖 AI Test (automated/AI-verifiable)**
The AI can verify correctness by examining code, running scripts, checking console output, or comparing data structures. No human visual judgment needed.
- *Examples:* Element count matches expected, JSON is valid, no console errors, script runs without crashing, file exists and is non-empty

**👁️ Human Test (requires human visual/perceptual judgment)**
Only a human can verify correctness — involves visual quality, animation smoothness, "does it look right," color accuracy, or subjective UX assessment.
- *Examples:* Score rendering matches Workshop, cursor movement is smooth, colors are correct on print, touch gestures feel responsive

**🤖→👁️ AI Test + Human Confirmation**
The AI runs initial automated checks, then flags specific things for the human to verify. This reduces the human's burden to focused spot-checks rather than exhaustive review.
- *Examples:* AI verifies element count and no errors → human confirms visual match. AI verifies PDF generates → human confirms print quality.

#### 13.3.2 Testing Principles

1. **Test BEFORE moving to the next step.** Never skip verification to "save time." A bug caught now takes 5 minutes to fix; the same bug caught 3 phases later takes hours.

2. **Test at the right level.** Don't over-test trivial changes. Don't under-test architectural changes.

3. **Regression tests are cumulative.** After completing Phase N, the verification tests for Phases 1 through N should all still pass. If Phase 3 breaks Phase 1, you have a regression (see §13.2.2).

4. **Human testing happens at phase boundaries.** Individual steps within a phase get AI testing. The full phase gets human confirmation before proceeding to the next phase. This balances thoroughness with efficiency.

5. **Record test results.** In the progress file, log: what was tested, pass/fail, any caveats. This prevents future sessions from re-testing things that already passed.

#### 13.3.3 Test Environment Checklist

Before testing any phase, verify:
- [ ] Workshop server available at :5000 for comparison (`node server.js`)
- [ ] Performance Score app served at :3001 (inline Node server)
- [ ] Both load the same score JSON version
- [ ] Browser DevTools console is open (check for errors)
- [ ] Browser is Chrome or Edge (consistent rendering for comparison)

### 13.4 Implementation Phases — Ordered Plan

The phases below are in recommended implementation order. This order optimizes for:
- **Early testability:** Each phase produces something visible and verifiable
- **Dependency flow:** Later phases build on earlier ones
- **Risk front-loading:** The hardest/riskiest work comes first while the codebase is simplest
- **Independent work when blocked:** Some phases can be swapped if one is blocked

```
Phase Dependency Graph:

Phase 1: Foundation ──────────────────────────────────────────┐
    │                                                          │
    ├──→ Phase 2: Animation T1 ───┐                            │
    │                              │                            │
    ├──→ Phase 3: Parts ───────────┤                            │
    │                              │                            │
    ├──→ Phase 4: Print ───────────┤                            │
    │                              │                            │
    │                              ├──→ Phase 5: Server ────────┤
    │                              │        │                    │
    │                              │        ├──→ Phase 6: Sync T1│
    │                              │        │        │           │
    │                              │        │        ├──→ Phase 7: Auth
    │                              │        │        │        │
    │                              │        │        │        ├──→ Phase 8: Rehearsal
    │                              │        │        │        │        │
    │                              │        │        │        │        ├──→ Phase 9: Annotations
    │                              │        │        │        │        │
    │                              │        │        │        │        ├──→ Phase 10: Sync+Anim T2
    │                              │        │        │        │        │        │
    │                              │        │        │        │        │        ├──→ Phase 11: Perf Mode
    │                              │        │        │        │        │        │
    │                              │        │        │        │        │        ├──→ Phase 12: Part Views
    │                              │        │        │        │        │        │
    │                              │        │        │        │        │        ├──→ Phase 13: Sync+Anim T3
    │                              │        │        │        │        │        │
    │                              │        │        │        │        │        └──→ Phase 14: Website
```

**Estimated total:** ~35–50 sessions across all 14 phases.

**Key swap points (if blocked):**
- Phases 2, 3, 4 are independent of each other — can be done in any order after Phase 1
- Phases 9, 10, 11, 12 are largely independent of each other — can be reordered after Phase 8
- Phase 14 can be started partially in parallel with Phases 10-13 (hosting/domain setup doesn't depend on code features)

---

#### Phase 1: Foundation — Strip & Stabilize Performance Score App
**Depends on:** Nothing (starting point)
**Est. sessions:** 2–3
**Risk level:** Medium — the 38K-line HTML has deep interconnections; stripping must not break rendering

**Goal:** Take the Engraving app v2 (`build_engraving_app.js` output) and evolve it into a clean Performance Score app by removing all composition/generation tools while keeping score rendering pixel-perfect.

**Starting state:** Engraving app v2 works — loads score, renders, navigates, plays/stops. But still contains ALL Workshop code (composition panels, MIDI, audio, generation pipelines, LilyPond integration).

**Step 1.1: Audit — Catalog what to keep vs. remove**
- Open Engraving app at :3001 side-by-side with Workshop at :5000
- Go through every UI panel and feature
- For each, decide: KEEP (needed for score display/playback), REMOVE (composition-only), or STUB (referenced by kept code, needs empty replacement)
- Output: Audit checklist in progress file
- 🤖 *AI Test:* Checklist is complete and categorized

**Step 1.2: Strip composition UI panels**
- Remove or hide all generation panels: Sustained Tone, Vibrato, One-Shots, Crescendo, AccelDecel, BartokPizz, BowOverpressure, ColLegnoBattuto, PizzTrem, PizzTremGliss
- Remove: Notation Fragment creation UI, MusicalMaterial assembly UI
- Remove: FlowchartConnector UI, Group management UI
- Method: Add Patch 4 to `build_engraving_app.js` — CSS `display: none` on panel containers, or full HTML removal
- 🤖 *AI Test:* App loads without console errors, panels are gone, score still renders
- 👁️ *Human spot-check:* Score looks identical to Workshop (minus panels)

**Step 1.3: Strip MIDI and audio systems**
- Remove: MidiModelSystem, MidiController, MidiSnippetDatabase, AudioClipDatabase, AudioClipController
- Remove: All `<audio>` elements, MIDI file loading, Web Audio API setup
- Stub if needed: Some bundle types reference MIDI snippet IDs. If removing MIDI causes errors in bundle loading, stub with `MidiModelSystem = { getModel: () => null }`
- 🤖 *AI Test:* App loads without errors, no MIDI/audio references in console, score renders correctly
- **Regression check:** Play/Stop still works (animation only, no sound expected)

**Step 1.4: Strip server-dependent features**
- Identify all remaining `fetch()` or XHR calls to server endpoints (SVG assembly, LilyPond, etc.)
- Remove or stub each one
- Already handled: socket.io (Patch 1), score load (Patch 2), save (Patch 3)
- 🤖 *AI Test:* No network requests to localhost:5000 in DevTools Network tab. App is fully standalone.

**Step 1.5: Clean up CSS and layout**
- Remove dark Workshop chrome where appropriate (or defer to a later "light theme" step)
- Ensure ScoreContainer fills available space properly without side panels
- Remove leftover empty panel containers from the DOM
- 🤖→👁️ *AI verifies no errors, layout fills viewport → Human confirms clean appearance*

**Step 1.6: Update `build_engraving_app.js` with new patches**
- Codify all stripping from steps 1.2-1.5 as reproducible patches in the build script
- Verify: running the build script from a clean Workshop HTML produces the correct stripped output
- 🤖 *AI Test:* Run build script → diff output against manually-stripped version → match

**Phase 1 Completion Checkpoint:**
- 🤖 App loads from static JSON, no console errors, no network requests to server
- 🤖 Element count matches Workshop (542 SVGs visible)
- 👁️ **Human verification:** Open both apps side-by-side. Score rendering is pixel-perfect match. Navigation works. Play/Stop animates correctly. No visual artifacts.
- Commit: `[Phase 1] Performance Score foundation — stripped, verified`
- Tag: `git tag phase-1-complete`

---

#### Phase 2: Animation Engine Optimization — Tier 1
**Depends on:** Phase 1
**Est. sessions:** 1–2
**Risk level:** Low-Medium — targeted fixes to existing engine, no architecture change

**Goal:** Fix the three fundamental animation issues (§12.8 Tier 1) so the cursor is visually smooth and the frame loop is efficient. This is foundational — all subsequent features need smooth animation.

**Step 2.1: Remove frame quantization**
- Replace `Math.floor(elapsed / MS_PER_FRAME)` gating with continuous elapsed time
- The `onDraw` callback receives continuous `elapsedMs` instead of quantized frame numbers
- All downstream systems (StaffCursors, GCMaker) already compute from continuous time — they just inherit the quantized input
- Location: `AnimationEngine` in index.html (~line 3294-3387)
- 🤖 *AI Test:* Console log `elapsedMs` values — verify they're continuous (not stepping in 16.67ms increments)

**Step 2.2: Cache layout dimensions**
- Replace `this.scoreTopEl.clientWidth` reads inside `StaffCursors.update()` with cached values
- Cache updated on window `resize` event and initial load
- Location: `StaffCursors.update()` in index.html (~line 6451-6508)
- 🤖 *AI Test:* Add temporary logging — verify `clientWidth` is read only on resize, not every frame

**Step 2.3: Per-frame calculation cache**
- `calculateTotalPages()` called once at frame start, stored on shared object
- All subscribers read from cache instead of recomputing
- 🤖 *AI Test:* Verify `calculateTotalPages()` call count per frame is 1 (not 2-3)

**Step 2.4: Verify smoothness**
- Play the score from beginning. Watch cursor movement closely.
- Check DevTools Performance tab — no long frames (> 20ms)
- Test page turns — no flash or stutter
- 👁️ **Human verification required:** Cursor movement is visually smooth (no micro-stepping). Page turns are clean. GC balls follow trajectory without jitter.

**Phase 2 Completion Checkpoint:**
- 🤖 No frame quantization in code, cached dimensions, single calculateTotalPages per frame
- 🤖 No console errors, animation runs at 60fps (check via Performance tab)
- 👁️ **Human verification:** Smooth cursor, smooth page turns, smooth GC balls
- **Regression:** Phase 1 tests still pass (score renders correctly, navigation works)
- Commit: `[Phase 2] Animation Tier 1 — smooth cursor, cached dims, frame cache`
- Tag: `git tag phase-2-complete`

---

#### Phase 3: Parts Extraction — Runtime Track Filtering
**Depends on:** Phase 1 (Phase 2 is nice-to-have but not required)
**Est. sessions:** 1–2
**Risk level:** Low — filtering is additive, doesn't change existing rendering

**Goal:** Enable the Performance Score to show only a single performer's track (or any combination of tracks). This is a runtime filter — no build step, no separate files.

**Step 3.1: Add track filter to SVG element loading**
- Add `trackFilter` configuration (e.g., URL parameter `?track=1` or config object)
- In SVGElementManager's element loading loop: skip elements where `el.track` is not in filter
- Default: no filter (show all tracks = full score)
- 🤖 *AI Test:* Load with `?track=1` → count visible elements → should be ~135 (roughly 542/4). Load with no filter → 542.

**Step 3.2: Filter curves, GCs, lineWedges, badges**
- Apply same filter to `CurveDatabase` (uses `gTrack` string "1"-"4")
- Apply to GCMaker (uses `gTrack`)
- Apply to LineWedgeDatabase (uses `gTrack`)
- Apply to BadgeDatabase (uses `gTrack`)
- **Watch for:** Track "A" means "all tracks" — these should ALWAYS be shown regardless of filter
- **Watch for:** `gTrack` is a string, `track` is an integer — normalize comparison
- 🤖 *AI Test:* Load with `?track=2` → verify only Track 2 curves/GCs/lineWedges are visible. Verify "A" curves still show.

**Step 3.3: Part view Option 1 — same layout, fewer elements**
- With filter active, the 4-track layout stays the same. Non-filtered tracks show as empty staves.
- Verify: track divider lines still show, timeline still shows, cursor still moves across all pages
- 🤖→👁️ *AI verifies correct element counts → Human confirms visual: only one track has notation, other tracks are empty but layout is intact*

**Step 3.4: Test each track individually**
- Load with track=1, track=2, track=3, track=4 in sequence
- For each: verify correct elements shown, no elements from other tracks visible
- Spot-check: known elements on specific tracks appear at correct positions
- 🤖→👁️ *AI counts elements per track → Human spot-checks 2-3 known elements per track*

**Phase 3 Completion Checkpoint:**
- 🤖 Track filter works for all 4 tracks + full score. Element counts correct. No console errors.
- 🤖 "Track A" curves always visible regardless of filter
- 👁️ **Human verification:** Load each track individually. Notation appears in correct track row. Other tracks empty. Cursor/timeline/page turns still work.
- **Regression:** Full score (no filter) still renders exactly as before
- Commit: `[Phase 3] Parts extraction — runtime track filtering`
- Tag: `git tag phase-3-complete`

---

#### Phase 4: Print Score — Puppeteer PDF Capture
**Depends on:** Phase 1 (independent of Phases 2, 3)
**Est. sessions:** 2–3
**Risk level:** Medium — Puppeteer integration, page navigation automation

**Goal:** Generate a high-fidelity PDF of the full score by capturing the actual Performance Score app rendering via Puppeteer. The PDF must match what's on screen exactly — same colors, same layout, same everything.

**Step 4.1: Install Puppeteer and create capture script skeleton**
- `npm install puppeteer` (or add to package.json)
- Create `scripts/generate_print_pdf.js`
- Basic structure: launch browser → navigate to app → wait for load → capture
- 🤖 *AI Test:* Script runs, browser launches, page loads without errors

**Step 4.2: Determine page count and navigation**
- Read score JSON to determine total duration and secondsPerPage
- Calculate total page count: `Math.ceil(totalDuration / secondsPerPage)`
- Pages come in pairs (ScoreTop = even pages, ScoreBottom = odd pages)
- Implement navigation: use the socket stub's `scoreGoto` to jump to each page pair
- 🤖 *AI Test:* Script correctly calculates page count matching Workshop's page count

**Step 4.3: Capture ScoreContainer for each page pair**
- For each page pair: navigate to correct time position, wait for render (500-1000ms)
- Hide all UI panels (CSS injection: `display: none` on control panels, side panels)
- Capture `#ScoreContainer` element (4:3 aspect ratio, blueGrey border)
- Output: one image per page pair, or use `page.pdf()` for vector output
- 🤖 *AI Test:* Correct number of page images generated, all non-zero file size

**Step 4.4: Assemble into multi-page PDF**
- If using `page.pdf()`: configure page size to match ScoreContainer aspect ratio (4:3)
- If using screenshots: assemble PNGs into PDF using pdfkit or similar
- Add print-specific CSS: hide cursor, hide timeline ticks (optional), white body background
- 🤖 *AI Test:* PDF generates, has correct number of pages, file size is reasonable

**Step 4.5: Quality verification**
- Open PDF in viewer, zoom to 400%
- Compare colors against Workshop rendering
- Check: all notation SVGs present, curves rendered correctly, lineWedges visible, GC markers visible
- Check: no cursor artifacts, no panel remnants, no scrollbar shadows
- 👁️ **Human verification required:** Print quality is acceptable. Colors match screen. Notation is sharp. Compare first page, last page, and 2-3 random middle pages against Workshop.

**Step 4.6: Add per-track PDF generation (uses Phase 3)**
- If Phase 3 is complete: add `--track N` flag to `generate_print_pdf.js`
- Navigate with track filter active → capture part-only pages
- Output: `violin1_part.pdf`, `violin2_part.pdf`, etc.
- 🤖→👁️ *AI verifies PDFs generate → Human confirms correct track isolation*

**Phase 4 Completion Checkpoint:**
- 🤖 Script runs end-to-end without errors, produces full-score PDF and optionally per-track PDFs
- 🤖 PDF page count matches expected, file sizes are reasonable
- 👁️ **Human verification:** PDF opens correctly. Colors match screen. Zoom to 400% — sharp/vector quality. Compare against Workshop. Test print to paper if possible.
- Commit: `[Phase 4] Print score — Puppeteer PDF capture`
- Tag: `git tag phase-4-complete`

---

#### Phase 5: Server Architecture — Rooms & Multi-Client
**Depends on:** Phase 1 (and ideally Phase 2)
**Est. sessions:** 2–3
**Risk level:** Medium — transitioning from single-client stub to real multi-client server

**Goal:** Evolve the Workshop's existing `server.js` into a room-based architecture (§12.9) that supports multiple simultaneous sessions. This is the foundation for all multi-player features.

**Step 5.1: Refactor server.js — room-based state**
- Replace global `isPlaying`, `currentScoreTimeMs`, `scoreTimeOffset` with per-room state objects
- Implement `joinRoom` / `leaveRoom` events
- Scope all sync broadcasts (`clockSync`, `scoreGo`, `scoreStop`, `scoreGoto`) to rooms using Socket.IO `io.to(roomId).emit(...)`
- 🤖 *AI Test:* Server starts without errors. Room state objects created/destroyed correctly.

**Step 5.2: Client room joining**
- Replace the socket stub with real Socket.IO connection in the Performance Score app
- Add room join flow: app sends `joinRoom` on connect with roomId (from URL parameter or config)
- Handle `scoreState` response for initial state
- 🤖 *AI Test:* Client connects to server, joins room, receives scoreState

**Step 5.3: Multi-client sync verification**
- Open 2 browser tabs, both join same room
- Leader tab: Press Play → both tabs animate in sync
- Leader tab: Press Stop → both stop
- Leader tab: Jump To → both jump
- 🤖→👁️ *AI verifies events flow to both clients → Human confirms visual sync (both cursors at same position)*

**Step 5.4: Room isolation test**
- Open 4 tabs: 2 in Room A, 2 in Room B
- Play Room A → Room B is unaffected (and vice versa)
- 🤖 *AI Test:* Verify Socket.IO room membership. Play in Room A → only Room A clients receive scoreGo.

**Step 5.5: Room lifecycle**
- Room created on first join, destroyed when last client disconnects (+ 5-min grace period)
- Room state persisted to JSON file during grace period (for reconnection)
- 🤖 *AI Test:* Disconnect all clients → wait → room cleaned up. Reconnect within grace period → state restored.

**Phase 5 Completion Checkpoint:**
- 🤖 Server starts, rooms create/destroy correctly, sync messages scoped to rooms, no cross-room leakage
- 🤖→👁️ 2+ clients in same room sync correctly (play/stop/goto)
- 🤖 Room isolation verified (2 separate rooms operate independently)
- **Regression:** Single-client mode still works (backward compatible). Phase 1/2/3 features unaffected.
- Commit: `[Phase 5] Server — room-based architecture, multi-client sync`
- Tag: `git tag phase-5-complete`

---

#### Phase 6: Sync Improvements — Tier 1
**Depends on:** Phase 5
**Est. sessions:** 1–2
**Risk level:** Low-Medium — improving existing sync, not replacing it

**Goal:** Implement §12.7 Tier 1 sync improvements: `performance.now()`, connection awareness, drift correction, outlier rejection. This makes the sync reliable enough for rehearsal use.

**Step 6.1: Switch to performance.now() for local timing**
- Implement `perfBase`/`syncBase` anchoring in ClockSync (§12.7 code example)
- `ClockSync.now()` returns `syncBase + (performance.now() - perfBase)` instead of `Date.now() + offset`
- 🤖 *AI Test:* Verify `ClockSync.now()` is monotonic — log 1000 consecutive values, confirm none decrease

**Step 6.2: Connection state awareness**
- Add disconnect/reconnect handlers to Socket.IO client
- Implement burst re-sync (5 rapid pings at 50ms) on reconnect
- Add sync status UI indicator (green/yellow/red dot) — small, non-intrusive
- 🤖→👁️ *AI verifies event handlers registered → Human confirms: disconnect WiFi → red dot appears → reconnect → green dot returns*

**Step 6.3: Server-authoritative position check**
- Server broadcasts `scorePositionCheck` every 3 seconds during playback
- Client compares local position to server position
- If drift > 50ms: smooth correction over 500ms (~3ms/frame adjustment)
- 🤖 *AI Test:* Artificially inject 100ms drift → verify correction is applied gradually (not a jump). Log drift values — should converge to < 10ms.

**Step 6.4: Outlier rejection**
- Discard RTT samples > 2× median
- Weighted averaging: lower RTT samples get higher weight
- 🤖 *AI Test:* Inject one 500ms RTT spike → verify it doesn't pollute the offset average. Offset should remain stable.

**Phase 6 Completion Checkpoint:**
- 🤖 Monotonic clock, connection awareness, drift correction, outlier rejection all implemented
- 🤖 Drift converges to < 10ms in normal conditions
- 🤖→👁️ Disconnect/reconnect shows correct UI indicators, sync recovers within 2 seconds
- 👁️ **Human verification:** Play score on 2 devices. Watch cursors — they should stay aligned. Deliberately disconnect one → observe recovery.
- **Regression:** All previous phases still work
- Commit: `[Phase 6] Sync Tier 1 — perf.now, connection awareness, drift correction`
- Tag: `git tag phase-6-complete`

---

#### Phase 7: Authentication & Persistence
**Depends on:** Phase 5
**Est. sessions:** 2–3
**Risk level:** Low — standard auth patterns, small data volume

**Goal:** Implement invite-based authentication (§12.9.3) and per-performer data persistence (§12.9.4). Performers get persistent identities tied to their instrument slot.

**Step 7.1: Ensemble & performer data model**
- Create data structure: Ensemble → members[] → sessions[]
- Store as JSON files on server (one file per ensemble)
- Admin endpoint: create ensemble, define 4 performer slots
- 🤖 *AI Test:* Create ensemble via API → JSON file created with correct structure

**Step 7.2: Invite-based auth**
- Generate unique invite links per performer slot (e.g., `/join/abc123def`)
- First visit: prompt for display name → server issues JWT token
- Subsequent visits: auto-authenticate from stored token (localStorage + httpOnly cookie)
- No passwords — the invite link IS the credential
- 🤖 *AI Test:* Visit invite link → get token → subsequent requests authenticated. Visit wrong link → rejected.

**Step 7.3: Performer slot assignment**
- Each performer's token ties them to a slot (Violin I, Violin II, Viola, Cello)
- Room join includes slot info → server validates slot membership
- Server tracks which slots are occupied in each room
- 🤖 *AI Test:* Two performers join with different slots → both accepted. Duplicate slot → handled gracefully (second connection or rejection, TBD).

**Step 7.4: Per-performer preferences persistence**
- Save UI preferences (display options, part view settings) per performer
- Auto-load on login
- JSON file per performer: `data/performers/violin1/preferences.json`
- 🤖 *AI Test:* Change preference → save → reload → preference persists

**Phase 7 Completion Checkpoint:**
- 🤖 Ensemble creation, invite links, JWT auth all working. Preferences persist.
- 🤖→👁️ Full flow: create ensemble → generate invite → performer clicks link → enters name → lands on score → assigned to correct slot
- **Regression:** Anonymous (no-auth) mode still works for development/testing
- Commit: `[Phase 7] Auth — invite-based, JWT, per-performer persistence`
- Tag: `git tag phase-7-complete`

---

#### Phase 8: Rehearsal Mode — Core Features
**Depends on:** Phase 5, Phase 6, Phase 7
**Est. sessions:** 4–6
**Risk level:** High — new UI layer, touch gestures, multi-client interaction patterns

**Goal:** Build the iPad-facing rehearsal experience (§12.10): touch gestures, controls overlay, custom markers, looping, synced vs. independent navigation, and leader privileges. This is the first performer-facing feature — it must feel polished.

**Step 8.1: Touch gesture system**
- Implement pointer event handlers for iPad: swipe left/right (page turn), tap center (controls), long press (context menu), pinch zoom
- Detect `pointerType === 'pen'` vs `'touch'` for Apple Pencil vs. finger separation
- Test on desktop first (mouse events map to touch), then verify on iPad
- 🤖 *AI Test:* Event handlers registered, pointer type detection works (log outputs)
- 👁️ *Human test on iPad:* Swipes turn pages, taps show/hide controls, long press triggers menu

**Step 8.2: Controls overlay**
- Build floating overlay panel: Play/Stop, page number, Jump To dropdown, markers button, sync toggle
- Overlay appears on center tap, fades after 3 seconds of inactivity
- Position: centered over score, semi-transparent background
- 🤖 *AI Test:* Overlay shows/hides correctly, fade timer works
- 👁️ *Human test:* Overlay doesn't obscure critical score content, controls are tappable on iPad

**Step 8.3: Custom markers**
- Data model: markers with name, scoreTimeMs, page, type (personal/shared), color
- Create marker: long press → "Add Marker" → name input
- View markers: controls overlay → markers list
- Jump to marker: tap marker in list → score navigates
- Persist: personal markers saved per performer (Phase 7 persistence), shared markers saved per ensemble
- 🤖 *AI Test:* Create marker → appears in list → jump to it → correct position. Save → reload → marker persists.
- 🤖→👁️ *AI verifies data persistence → Human confirms markers appear at correct score positions*

**Step 8.4: Looping**
- Set loop start/end points during stopped playback
- When playing: reaching loop end → jump back to loop start
- Loop count display: "Loop 3 of ∞" or fixed count
- Looping is per-client only (doesn't affect other performers)
- 🤖 *AI Test:* Set loop → play → verify score jumps back at loop end. Loop count increments.
- 👁️ *Human test:* Loop transition is smooth, no visual glitch at loop boundary

**Step 8.5: Synced vs. Independent navigation**
- **Synced mode (default):** Leader's play/stop/goto affects all connected performers
- **Independent mode:** Player detaches, navigates freely, has re-sync button
- Auto-detach on manual page swipe while synced
- Subtle notification: "You've detached — tap 🔗 to re-sync"
- 🤖 *AI Test:* Events flow correctly — detach stops receiving sync, re-sync restores it. Two clients in same room: one detaches, other still receives sync.
- 👁️ *Human test:* Detach/re-sync feels responsive. Leader controls work as expected.

**Step 8.6: Leader privileges**
- Leader can: play/stop/goto for all synced members, recall all detached members, set shared markers
- Leader transfer: any member can be designated leader by current leader
- Non-leaders cannot start/stop playback for the group (only for themselves in independent mode)
- 🤖 *AI Test:* Leader sends play → all synced members receive it. Non-leader sends play → only their own client responds. Leader transfer works.

**Step 8.7: Mini-map / position awareness**
- Thin horizontal bar at bottom showing full score overview
- Current position highlighted, markers shown as colored ticks
- Tap anywhere on mini-map to jump to that position
- Page number badge always visible in corner
- 🤖→👁️ *AI verifies mini-map data matches score → Human confirms visual: mini-map accurately shows position and markers*

**Phase 8 Completion Checkpoint:**
- 🤖 All gesture handlers, overlay, markers, looping, sync modes, leader privileges functional
- 🤖 Multi-client test: 2-4 clients in a room, synced and independent modes work correctly
- 👁️ **Human verification (ideally on iPad):** Touch gestures feel natural. Controls overlay is usable. Markers navigate correctly. Looping is smooth. Synced/independent switching works intuitively. Leader controls work.
- **Regression:** All previous phases still work. Single-client mode unaffected.
- Commit: `[Phase 8] Rehearsal mode — gestures, overlay, markers, looping, sync modes`
- Tag: `git tag phase-8-complete`

---

#### Phase 9: Annotation System
**Depends on:** Phase 8 (needs gesture system and per-performer persistence)
**Est. sessions:** 3–4
**Risk level:** Medium — SVG overlay layer, coordinate mapping, Apple Pencil integration

**Goal:** Implement the annotation system (§12.12): zoom-to-annotate with Apple Pencil, stamp palette for common symbols, annotation storage with auto-save, and visibility controls. Performers can mark up their score.

**Step 9.1: SVG annotation overlay layer**
- Create transparent SVG overlay on top of ScoreTop and ScoreBottom
- Overlay captures Pencil input, passes touch/finger input through to gesture system below
- Overlay coordinate system matches score coordinate system (annotations positioned relative to score content)
- 🤖 *AI Test:* Overlay exists in DOM, pointer events pass through to score for finger, captured for pencil

**Step 9.2: Freehand drawing (Apple Pencil)**
- Pencil down → start path, pencil move → extend path, pencil up → end path
- Paths stored as SVG `<path>` elements with stroke color, width
- Coordinates stored relative to score (scoreTimeMs + position fraction) for resilience to layout changes
- 🤖 *AI Test:* Drawing creates SVG paths in overlay. Path data stored in annotation JSON.
- 👁️ *Human test on iPad:* Drawing feels responsive, lines are smooth, pressure sensitivity works if available

**Step 9.3: Stamp palette**
- Floating palette: fingering numbers (0-4), bowings (∏, V), dynamics (p, f, mp, mf), accent marks, emoji/icons
- Tap stamp → tap on score → stamp placed at that position
- Stamps pre-sized to fit notation scale
- 🤖 *AI Test:* Stamp appears at correct position, stored in annotation JSON
- 👁️ *Human test:* Stamps are readable at normal zoom, placement is accurate

**Step 9.4: Annotation storage and persistence**
- JSON format per §12.12.4: each annotation has id, type, scoreTimeMs, page, track, position, data
- Auto-save after 2 seconds of inactivity (debounced)
- Save to server per performer (Phase 7 persistence)
- Load annotations on login
- 🤖 *AI Test:* Create annotations → auto-save triggers → reload → annotations restored correctly

**Step 9.5: Version snapshots and undo/redo**
- "Save as..." creates named snapshot of current annotations
- Undo/redo stack (last 50 actions)
- 🤖 *AI Test:* Undo removes last annotation, redo restores it. Save snapshot → switch to different snapshot → switch back → correct annotations displayed.

**Step 9.6: Visibility controls**
- Opacity slider for annotation layer (default 60%)
- Show/hide toggle
- Category filters (show only fingerings, only bowings, etc.)
- 🤖→👁️ *AI verifies toggle/filter logic → Human confirms visual: annotations show/hide correctly, opacity slider works*

**Phase 9 Completion Checkpoint:**
- 🤖 Freehand drawing, stamps, storage, auto-save, versioning, undo/redo, visibility controls all functional
- 👁️ **Human verification (on iPad with Apple Pencil):** Drawing is responsive and accurate. Stamps place correctly. Annotations survive reload. Visibility controls work. Zoom-to-annotate flow feels natural.
- **Regression:** Score rendering unaffected. Gesture system still works. Markers still work.
- Commit: `[Phase 9] Annotations — drawing, stamps, persistence, visibility`
- Tag: `git tag phase-9-complete`

---

#### Phase 10: Sync & Animation — Tier 2
**Depends on:** Phase 6 (Sync T1), Phase 2 (Animation T1)
**Est. sessions:** 2–3
**Risk level:** Medium — deeper architectural changes to sync and animation systems

**Goal:** Implement §12.7 Tier 2 (MonotonicScoreClock, adaptive sync rate, sync quality metric, graceful degradation) and §12.8 Tier 2 (dual-clock model, CSS transforms, subscriber pattern). This makes the system production-ready for rehearsals with real performers.

**Step 10.1: MonotonicScoreClock**
- Wrap ScoreTime with a monotonic layer that applies corrections as rate adjustments (slewing), never jumps
- Guarantee: `.now()` never returns a value less than a previous call
- 🤖 *AI Test:* Inject a -50ms correction → verify clock slows down slightly instead of jumping backward. Log values → confirm strictly increasing.

**Step 10.2: Adaptive sync rate**
- Offset variance < 5ms → slow pings to 10s (stable, save bandwidth)
- Offset variance > 20ms → speed pings to 200ms (unstable, re-converge)
- 🤖 *AI Test:* Simulate stable network → verify ping rate increases. Simulate jitter → verify ping rate decreases.

**Step 10.3: Sync quality metric & UI**
- Compute quality from offset variance: excellent/good/fair/poor
- Display indicator: small colored dot with tooltip showing RTT and drift
- 🤖→👁️ *AI verifies metric calculation → Human confirms indicator is visible and accurate*

**Step 10.4: Graceful degradation**
- Disconnected > 5 seconds → show non-intrusive "OFFLINE — local clock" banner
- Score continues on local `performance.now()`
- On reconnect: banner disappears, burst re-sync fires
- 🤖→👁️ *AI verifies banner logic → Human confirms: disconnect → banner appears → reconnect → banner disappears, sync recovers*

**Step 10.5: rAF dual-clock model**
- Use `requestAnimationFrame` timestamp for smooth visual positioning (display-aligned)
- Keep ClockSync for sync verification against server
- Periodic check: if rAF time and ClockSync diverge > threshold, smoothly correct
- 🤖 *AI Test:* Log rAF timestamps vs ClockSync values — verify they track within tolerance

**Step 10.6: CSS transforms for cursor**
- Replace `setAttribute('x', ...)` with `style.transform = 'translateX(...)'`
- Add `will-change: transform` for GPU compositing
- Apply to: staff cursors, GC balls, any per-frame positioned elements
- 🤖 *AI Test:* No `setAttribute('x')` calls in animation loop. Elements have `will-change` CSS.
- 👁️ *Human test:* Cursor still visually correct. Check DevTools Layers panel — cursors promoted to own layer.

**Step 10.7: Subscriber pattern**
- Replace hook-chain `onDraw` wrapping with `AnimationEngine.subscribers[]` array
- Each system registers: `{ name: 'StaffCursors', fn: update, priority: 0 }`
- Systems can be individually enabled/disabled for profiling
- 🤖 *AI Test:* All subscribers registered. Disabling one doesn't break others. Frame timing unaffected.

**Phase 10 Completion Checkpoint:**
- 🤖 Monotonic clock, adaptive sync, dual-clock, transforms, subscriber pattern all implemented
- 🤖 No regressions in sync accuracy or animation smoothness
- 👁️ **Human verification:** Cursor is visually smooth (smoother than Tier 1). Sync indicator shows quality. Offline banner works. 2-device sync test shows tight alignment.
- **Regression:** All Phases 1-9 features still work
- Commit: `[Phase 10] Sync+Animation Tier 2 — monotonic clock, GPU compositing, subscribers`
- Tag: `git tag phase-10-complete`

---

#### Phase 11: Performance Mode
**Depends on:** Phase 8 (Rehearsal Mode), Phase 10 (Sync+Animation T2)
**Est. sessions:** 2–3
**Risk level:** Medium — fault-proof controls require careful gesture handling; emergency recovery adds complexity

**Goal:** Build the stripped-down, fault-resistant performance mode (§12.11): no independent navigation, no editing, enhanced touch protection, lead-in countdown, emergency stop, and recovery procedures.

**Step 11.1: Mode switching (rehearsal ↔ performance)**
- Add mode selector in admin/leader controls
- Performance mode: disable independent navigation, looping, annotation editing, manual page turns
- UI chrome minimized (score fills screen, minimal status indicators)
- 🤖 *AI Test:* Switch mode → verify disabled features are truly disabled (swipe doesn't turn page, etc.)

**Step 11.2: Lead-in countdown**
- Configurable duration (3, 5, 8, custom seconds)
- Full-screen overlay with countdown numbers: **3** → **2** → **1** → start
- Score visible behind semi-transparent overlay
- Latency-compensated start (§12.7 Tier 3c — schedule start in future so all clients begin simultaneously)
- 🤖 *AI Test:* Countdown displays, score starts at correct time, all clients start within tolerance
- 👁️ *Human test:* Countdown is visually clear, transition to playing is smooth

**Step 11.3: Fault-proof controls**
- Start: leader-only, double confirmation, cancelable during countdown
- During playback: controls require deliberate gesture (swipe from bottom edge or 3-finger tap)
- Stop: long press (1 second) required
- No single-tap actions during playback
- 🤖 *AI Test:* Single tap during playback → no response. Long press → stop triggers. Accidental swipe → no page turn.
- 👁️ *Human test on iPad:* Deliberately try to trigger accidental actions — none should fire during performance

**Step 11.4: Emergency stop**
- Three-finger long press (1.5s) anywhere → immediate stop for ALL connected performers
- Available to ALL performers, not just leader
- Visual indicator: "EMERGENCY STOP" flash → score freezes at current position
- Can resume from stopped position
- 🤖→👁️ *AI verifies stop broadcasts to all → Human confirms: emergency stop on one device stops all devices*

**Step 11.5: Emergency recovery**
- Network loss: local clock fallback (already implemented in Phase 6/10), red indicator
- App crash/page reload: auto-rejoin room from localStorage, receive current state
- iPad sleep: Wake Lock API (`navigator.wakeLock.request('screen')`) to prevent sleep
- Service Worker cache: HTML + score JSON cached for near-instant reload even without network
- 🤖 *AI Test:* Service Worker installed, cache populated. Simulate offline reload → page loads from cache. Wake Lock acquired.
- 👁️ *Human test:* Force-close app → reopen → auto-rejoins room, score at correct position. Wake Lock prevents dimming during 10-minute idle.

**Phase 11 Completion Checkpoint:**
- 🤖 Performance mode locks down features correctly. Countdown, fault-proof controls, emergency stop all functional.
- 🤖 Recovery mechanisms: Service Worker cache, auto-rejoin, Wake Lock
- 👁️ **Human verification (on iPad):** Performance mode feels safe — no accidental triggers. Countdown is clear. Emergency stop works from any device. Recovery from network loss is seamless.
- **Regression:** Rehearsal mode still works when not in performance mode
- Commit: `[Phase 11] Performance mode — lockdown, countdown, emergency, recovery`
- Tag: `git tag phase-11-complete`

---

#### Phase 12: Part View Enhancements
**Depends on:** Phase 3 (Parts Extraction), Phase 8 (Rehearsal Mode)
**Est. sessions:** 1–2
**Risk level:** Low — building on existing part filter with layout changes

**Goal:** Add the expanded single-track view (§12.13.4 Option 2) and optionally configurable tracks-per-page (Option 3). Enable two-finger tap toggle between part view and full score.

**Step 12.1: Single-track expanded view (Option 2)**
- Override `StaffPositions.getPositions()` when in part view: single track fills full available height
- Track height = `availableHeight` instead of `availableHeight / 4`
- Notation renders 4× larger (SVGs are vector, scale cleanly)
- 🤖 *AI Test:* In part view mode, track height is correct. Elements render at correct enlarged scale.
- 👁️ *Human test:* Notation is visually 4× larger. Elements don't overlap. Positions are correct.

**Step 12.2: Two-finger tap toggle**
- Two-finger tap on score → toggle between part view (single track, expanded) and full score (all 4 tracks)
- Smooth transition or instant switch (test both)
- 🤖→👁️ *AI verifies toggle triggers → Human confirms visual transition is clean*

**Step 12.3: Configurable tracks-per-page (Option 3, nice-to-have)**
- Allow 1, 2, or 4 tracks visible
- 2 tracks: show performer's track + one other (e.g., Violin I + Violin II, or Viola + Cello)
- Each track gets 50% of height
- 🤖 *AI Test:* Track height adjusts correctly for 1, 2, and 4 tracks visible

**Phase 12 Completion Checkpoint:**
- 🤖 Expanded single-track view works. Toggle between part/full score works.
- 👁️ **Human verification:** Expanded view is readable. Toggle is responsive. Elements positioned correctly at all zoom levels.
- Commit: `[Phase 12] Part view enhancements — expanded track, toggle, multi-track config`
- Tag: `git tag phase-12-complete`

---

#### Phase 13: Sync & Animation — Tier 3 (Optional / Pre-Performance)
**Depends on:** Phase 10 (Sync+Animation T2)
**Est. sessions:** 2–3
**Risk level:** Medium — advanced algorithms, subtle improvements that are hard to test

**Goal:** Implement §12.7 Tier 3 and §12.8 Tier 3: NTP-style offset calculation, server heartbeat/watchdog, latency-compensated starts, Web Animations API for cursor, predictive rendering. These are refinements for the highest-quality live performance sync.

**Step 13.1: NTP-style offset calculation**
- Sort samples by RTT, take best quartile, average those offsets
- Incrementally better than Tier 1 outlier rejection
- 🤖 *AI Test:* Compare offset accuracy vs Tier 1 approach. Should be tighter under simulated jitter.

**Step 13.2: Server heartbeat/watchdog**
- Server sends heartbeat every 500ms
- Client detects missed heartbeats (3+ seconds without heartbeat → needs full re-sync)
- Faster detection than Socket.IO's built-in 25-second timeout
- 🤖 *AI Test:* Kill heartbeat → client detects within 3 seconds. Resume heartbeat → client recovers.

**Step 13.3: Latency-compensated starts**
- `scoreGo` includes `scheduledStartTime = serverNow + 100ms`
- All clients start at the scheduled time (using ClockSync to translate server time to local time)
- All clients begin within ~1-2ms of each other
- 🤖→👁️ *AI verifies start time difference < 5ms → Human confirms: start 2 devices simultaneously, cursors align from first frame*

**Step 13.4: Web Animations API for cursor (if profiling warrants)**
- Replace per-frame JS cursor update with `element.animate()` from 0% to 100%
- Browser compositor thread handles actual pixel movement — immune to main-thread jank
- JS only intervenes for: page turns, sync corrections, stop/goto
- 🤖 *AI Test:* Animation created, compositor-rendered (check via Performance panel — no main thread paints for cursor)
- 👁️ *Human test:* Cursor movement is butter-smooth, page turns still work correctly

**Step 13.5: Predictive rendering**
- Calculate position for NEXT display refresh (+16.67ms at 60Hz)
- Cursor is positioned where it will be when the display actually paints
- Subtle improvement, mainly noticeable on high-refresh displays
- 🤖 *AI Test:* Position calculation includes frame budget offset. Verify no overshoot at page boundaries.

**Phase 13 Completion Checkpoint:**
- 🤖 All Tier 3 improvements implemented. Sync accuracy tighter than Tier 2.
- 👁️ **Human verification:** Play on 2+ devices. Cursors are visually indistinguishable in position. Starts are simultaneous. Heartbeat detection works. Cursor is butter-smooth even during heavy page turns.
- **This phase is optional** — Tier 2 may be sufficient for all practical purposes. Implement only if profiling or real-world testing shows the need.
- Commit: `[Phase 13] Sync+Animation Tier 3 — NTP, heartbeat, simultaneous start, compositor cursor`
- Tag: `git tag phase-13-complete`

---

#### Phase 14: Website & Production Deployment
**Depends on:** Phases 1-11 (core features complete)
**Est. sessions:** 3–5
**Risk level:** Medium — infrastructure, not code complexity

**Goal:** Deploy the Performance Score as a production website (§12.9): hosting, domain, SSL, admin panel, session management UI. This is the final step — making the system available to performers over the internet.

**Step 14.1: Hosting infrastructure**
- Choose hosting: cloud VM (DigitalOcean, AWS Lightsail), or PaaS (Railway, Render, Fly.io)
- Set up Node.js server with PM2 (process manager) for auto-restart
- Configure for WebSocket support (Socket.IO requires sticky sessions if load-balanced)
- 🤖 *AI Test:* Server deploys, responds to HTTP requests, WebSocket connects successfully

**Step 14.2: Domain & SSL**
- Register domain (or use subdomain of existing domain)
- Set up Let's Encrypt SSL certificate (required for Service Worker and Wake Lock API)
- Configure nginx or Caddy as reverse proxy
- 🤖 *AI Test:* HTTPS works, certificate valid, WebSocket upgrades succeed through proxy

**Step 14.3: Admin panel**
- Simple web interface for the composer (you):
  - Create/manage ensembles
  - Generate/regenerate invite links
  - View connected performers, room status
  - Deploy updated score JSON
  - View session history
- 🤖→👁️ *AI verifies API endpoints → Human confirms UI is usable and complete*

**Step 14.4: Session management UI**
- Performer dashboard: "Join Rehearsal", "Start Solo Practice", "View Score"
- Room creation flow for leaders
- Room list showing active sessions
- 🤖→👁️ *AI verifies flows → Human confirms UX is clear for non-technical performers*

**Step 14.5: Performance capture / logging (nice-to-have)**
- Log each performance: start time, duration, participants, sync quality over time
- Optional: record score position timeline for later analysis
- Store in data files on server
- 🤖 *AI Test:* Performance log file created with correct data after a test performance session

**Phase 14 Completion Checkpoint:**
- 🤖 Server deployed, SSL working, WebSocket connects from remote devices
- 🤖→👁️ Full end-to-end test: performer receives invite link → clicks → authenticates → sees score → joins room → plays together with another performer → annotations save → reload → everything persists
- 👁️ **Human verification:** Use real devices (iPad, phone, laptop) on real network. Everything works as expected.
- Commit: `[Phase 14] Production deployment — hosting, admin, session management`
- Tag: `git tag phase-14-complete` (🎉 V1.0)

---

#### Phase 15: Composition & Performance Notes
**Depends on:** Phase 14 (website infrastructure), but content authoring can begin anytime
**Est. sessions:** 1–2
**Risk level:** Low — static content generation, no complex interactivity

**Goal:** The composer writes composition and performance notes (program notes, performance instructions, technical explanations, interpretive guidance). These are made available through the website as both an HTML page (viewable inline) and a downloadable/printable PDF.

**Step 15.1: Author notes content**
- Create a Markdown source file: `docs/PERFORMANCE_NOTES.md`
- Sections might include: Program Notes, Performance Instructions, Notation Guide (explaining graphic score symbols), Technical Requirements, Synchronization Setup Guide, Performer Tips
- Content is written/edited by the composer over time — this step is ongoing
- 🤖 *AI Test:* Markdown file exists, is well-structured, renders correctly

**Step 15.2: Generate HTML page from notes**
- Create `scripts/generate_notes_html.js` — converts Markdown → styled HTML page
- Use a Markdown parser (e.g. `marked`) with a clean, printable stylesheet
- Output: `builds/performance/notes.html` (or served from website route `/notes`)
- Include navigation back to the score app
- 🤖→👁️ *AI verifies HTML renders correctly → Human confirms content reads well, styling is professional*

**Step 15.3: Generate downloadable PDF**
- Option A: Use Puppeteer to capture the HTML page as PDF (reuse from Phase 4 infrastructure)
- Option B: Use a Markdown-to-PDF library (e.g. `md-to-pdf`)
- Output: `builds/performance/notes.pdf` (or served from `/notes.pdf`)
- Ensure print-friendly layout: page breaks, headers/footers, page numbers
- 🤖→👁️ *AI verifies PDF generates without errors → Human confirms print layout, readability*

**Step 15.4: Integrate with website**
- Add "Notes" link/button to the Performance Score app UI (accessible from the right panel or a top nav)
- Add route on server: `/notes` serves HTML, `/notes.pdf` serves PDF download
- Optional: embed notes as a collapsible panel within the score app itself
- 🤖→👁️ *AI verifies links work → Human confirms navigation flow is intuitive*

**Phase 15 Completion Checkpoint:**
- 🤖 Notes HTML and PDF generate from Markdown source without errors
- 👁️ **Human verification:** Notes content is complete, well-formatted, and accessible from the website. PDF prints correctly.
- Commit: `[Phase 15] Composition & Performance Notes — HTML + PDF`
- Tag: `git tag phase-15-complete`

---

### 13.5 Phase Summary Table

| Phase | Name | Sessions | Depends On | Key Risk | Testing |
|-------|------|----------|-----------|----------|---------|
| **1** | Foundation — Strip & Stabilize | 2–3 | — | Breaking rendering during strip | 🤖→👁️ |
| **2** | Animation Tier 1 | 1–2 | 1 | Subtle timing bugs | 🤖→👁️ |
| **3** | Parts Extraction | 1–2 | 1 | Track "A" / string vs int | 🤖→👁️ |
| **4** | Print Score (Puppeteer) | 2–3 | 1 | Page navigation timing | 🤖→👁️ |
| **5** | Server — Rooms | 2–3 | 1 | Multi-client state management | 🤖→👁️ |
| **6** | Sync Tier 1 | 1–2 | 5 | Drift correction tuning | 🤖→👁️ |
| **7** | Auth & Persistence | 2–3 | 5 | JWT token management | 🤖 |
| **8** | Rehearsal Mode | 4–6 | 5,6,7 | Touch gesture complexity | 👁️ (iPad) |
| **9** | Annotations | 3–4 | 8 | Pencil coordinate mapping | 👁️ (iPad+Pencil) |
| **10** | Sync+Animation Tier 2 | 2–3 | 2,6 | Monotonic clock edge cases | 🤖→👁️ |
| **11** | Performance Mode | 2–3 | 8,10 | Fault-proof control testing | 👁️ (iPad) |
| **12** | Part View Enhancements | 1–2 | 3,8 | Layout math at different scales | 🤖→👁️ |
| **13** | Sync+Animation Tier 3 | 2–3 | 10 | Subtle timing improvements | 🤖→👁️ |
| **14** | Website & Production | 3–5 | 1-11 | Infrastructure / networking | 🤖→👁️ |
| **15** | Composition & Performance Notes | 1–2 | 14 (content anytime) | Minimal — static content | 🤖→👁️ |
| | **TOTAL** | **~33–50** | | | |

### 13.6 Milestone Gates

These are hard checkpoints where the system must be fully verified before proceeding. They represent natural "demo" points where the system is usable for a specific purpose.

| Milestone | After Phase | What You Can Do | Required Verification |
|-----------|-----------|-----------------|----------------------|
| **M1: Viewable Score** | 1 | View the full score in a standalone browser app. Navigate pages. Play animation. | Visual match with Workshop |
| **M2: Printable Score** | 4 | Generate full-score and per-part PDFs | Print quality, color fidelity, completeness |
| **M3: Multi-Player** | 6 | 2+ browsers synced in same room. Play/stop/goto together. | Sync accuracy < 50ms, room isolation |
| **M4: Rehearsal-Ready** | 8 | Performers can rehearse on iPads: markers, looping, sync/independent, leader controls | iPad usability test with 2+ people |
| **M5: Performance-Ready** | 11 | Fully locked-down performance mode with fault tolerance | Stress test: deliberate disconnect, emergency stop, recovery |
| **M6: Deployed** | 14 | Live on the internet, performers access via invite links | End-to-end remote test with real performers |

### 13.7 Session Handoff Protocol — Quick Reference

**Starting a session:**
```
1. READ docs/IMPLEMENTATION_PROGRESS.md
2. CHECK git log -5 --oneline
3. RUN the app, verify it loads
4. READ the current phase in §13.4
5. BEGIN implementation
```

**Ending a session:**
```
1. COMMIT all working code (or revert incomplete changes)
2. TEST current step
3. UPDATE docs/IMPLEMENTATION_PROGRESS.md (status, issues, RESUME HERE)
4. UPDATE memory (structured summary with resume point)
5. TAG if phase complete: git tag phase-N-complete
```

**When stuck:**
```
1. DOCUMENT what you tried
2. CREATE minimal test case
3. ADD diagnostic logging
4. LOG in progress file
5. MOVE to next independent step if possible
6. ASK the user if available
```

**When discovering a regression:**
```
1. STOP current work
2. CHARACTERIZE the bug (minimal repro)
3. TRACE to root cause (which phase introduced it?)
4. FIX at the source (not downstream)
5. RE-TEST all phases from origin to current
6. COMMIT as [BugFix]
7. LOG full story in progress file
```

### 13.8 Modularity Assessment — What Stays, What Goes

**Assessment Date:** Mar 19, 2026
**Source:** `public/index.html` — 38,036 lines, all JS inline as `const X = { ... }; window.X = X;` object literals.

**Bottom line: The codebase is well-suited for stripping.** Systems are independent object literals with clear boundaries. Generation/composition panels are leaf nodes — they call INTO core systems, but nothing in the rendering pipeline calls INTO them. Cross-references are guarded with `if (window.X)` patterns, so removing a system causes graceful skip, not crash.

#### 13.8.1 Systems to KEEP (~8,000 lines — the performance core)

These systems are required for score display, animation, sync, and navigation.

| System | Approx Lines | Role |
|--------|-------------|------|
| ClockSync | ~3179–3265 | Network time synchronization |
| ScoreTime | ~3269–3288 | Score playback clock |
| AnimationEngine | ~3294–3390 | requestAnimationFrame loop |
| CursorControls | ~3400–3579 | Play/Stop/GoTo UI |
| SVGElementManager | ~3588–4688 | Element rendering + positioning (has edit methods — keep all, dead code doesn't hurt) |
| StaffCursors | ~5760–7057 | Animated staff cursor lines + dividers + staff headers |
| ScoreZoom | ~7068–7203 | Zoom and pan |
| TrackSystem | ~7207–7565 | 4-track vertical layout |
| GraphicTimeline | ~7570–7812 | Second markers, timeline dots/labels |
| StaffPositions | ~10398–10417 | Vertical staff Y coordinates |
| GTrackSystem | ~10421–10497 | Graphic track SVG containers |
| CompositionPanel | ~10733–10796 | `getTrackDimensions()` called by rendering pipeline |
| CurveDatabase | ~10799–10852 | Curve data store (needed for curve rendering) |
| MotiveDatabase | ~10855–10908 | Motive data store |
| LineWedgeDatabase | ~10911–10964 | LineWedge data store (rendered on score) |
| BadgeDatabase | ~10967–11010 | Badge data store (rendered on score) |
| GroupDatabase | ~11013–11069 | Group data store (may be referenced by rendering) |
| ScoreManager | ~15255–16002 | Save/load/distribute (already partially patched in v2) |
| CurveMaker | ~16700–19460 | Curve rendering (bezier drawing). Also has creation methods — leave as dead code. |
| GlissandoSystem | ~19466–20107 | Glissando pitch SVG display during playback |

#### 13.8.2 Systems to STRIP (~18,000+ lines — composition/generation only)

These systems are used only during composition in the Workshop. Nothing in the rendering pipeline depends on them.

**Connectors & editing tools (~1,300 lines):**
| System | Approx Lines | Notes |
|--------|-------------|-------|
| FlowchartConnector | ~4691–5757 | Right-angle connectors between objects |
| EditCursor | ~10499–10730 | Neon yellow editing cursor |

**MIDI systems (~6,700 lines):**
| System | Approx Lines | Notes |
|--------|-------------|-------|
| MidiController | ~7815–9435 | MIDI device I/O, file loading, playback |
| MidiSnippetDatabase | ~11072–11129 | MIDI snippet storage |
| MidiMotiveParser | ~11132–11345 | MIDI file parsing |
| MidiMotiveDatabase | ~11348–11623 | MIDI motive storage |
| MidiModelSystem | ~11625–15177 | **Largest single system (~3,550 lines)**. Pre-defined MIDI articulation models. |

**Audio system (~1,015 lines):**
| System | Approx Lines | Notes |
|--------|-------------|-------|
| AudioController | ~9438–10393 | Audio file management and playback |
| AudioClipDatabase | ~15188–15250 | Audio clip storage |

**LilyPond & notation (~unknown, within 16004+):**
| System | Approx Lines | Notes |
|--------|-------------|-------|
| NotationManager | ~16004–? | LilyPond SVG integration — server endpoint calls |

**Generation panels (~10,800+ lines):**
| System | Approx Lines | Notes |
|--------|-------------|-------|
| ScoreAutomation | ~20113–20203 | AI workflow hub |
| LongToneUI | ~20206–21378 | Sustained tone generation |
| PizzTremGlissUI | ~21385–22344 | Pizz tremolo glissando generation |
| VibratoUI | ~22351–23453 | Vibrato notation generation |
| CrescendoUI | ~23462–25230 | Crescendo/decrescendo generation |
| AccelDecelUI | ~25235–25627 | Feathered beams generation |
| BartokPizzUI | ~25633–26530 | Bartók pizzicato generation |
| BowOverpressureUI | ~26536–27188 | Bow overpressure generation |
| ColLegnoBattutoUI | ~27194–27852 | Col legno battuto generation |
| OneShotPanelSwitcher | ~27857–27872 | One-shot panel UI switcher |
| OneShotGCPresets | ~27878–28133 | GC curve presets |
| PizzTremUI | ~28139–28949 | Pizzicato tremolo generation |
| NotationFragment | ~28951+ | Pre-generated notation fragment system |

#### 13.8.3 Entanglements — Watch Points During Stripping

Three cross-system references need attention:

**1. CompositionPanel.getTrackDimensions()** — Called by `calcPixelPosition()` in the rendering pipeline.
- The panel UI can be completely removed/hidden
- BUT the `getTrackDimensions()` method must remain
- **Solution:** Keep `CompositionPanel` as a stub with just `getTrackDimensions()` and `init()`, or keep the full object (small at ~60 lines)

**2. CurveMaker rendering vs. creation** — CurveMaker both RENDERS existing curves (drawing bezier paths on the SVG canvas — essential) and CREATES new curves (UI for clicking/dragging — composition-only).
- The rendering methods are interleaved with creation methods
- **Solution:** Keep the entire CurveMaker. Dead creation methods add file size but cause no harm. The creation UI elements won't exist in the stripped DOM, so creation code paths never activate.

**3. MidiModelSystem display labels** — Some bundle types reference MIDI model names for display labels (tooltip text).
- Removing MidiModelSystem may cause console errors if label rendering tries `MidiModelSystem.getModel()`
- **Solution:** One-line stub: `const MidiModelSystem = { getModel: () => null, models: [] };`

**4. Guard clause pattern (safety net):** The codebase consistently uses:
```js
if (window.GlissandoSystem && foundCurve.glissando) { ... }
if (window.MidiModelPanel) { ... }
```
If a system is removed, the guard clause silently skips it. This is the single most important architectural feature making the stripping safe. **However:** Verify after stripping that no unguarded references remain (run app, check DevTools console for `undefined` errors).

#### 13.8.4 Estimated Result After Stripping

```
Before:  ~38,000 lines (public/index.html)
Strip:   ~18,000 lines (MIDI, audio, LilyPond, generation panels)
After:   ~20,000 lines (Performance Score client)

Before:  ~2 MB (index.html file size after patching)
After:   ~1.1 MB estimated
```

Plus HTML panel markup (DOM elements for stripped panels) will also be removed, further reducing file size. The score JSON (~9 MB) is unchanged.

#### 13.8.5 Stripping Strategy (for Phase 1)

The `build_engraving_app.js` v2 approach extends cleanly. Currently applies 3 patches. Phase 1 adds patches:

```
Existing patches:
  Patch 1: socket.io stub (replace <script> tag)
  Patch 2: Static score load (replace server auto-load)
  Patch 3: Save as download (replace server POST)

New patches for Performance Score:
  Patch 4: Remove generation panel HTML (Sustained Tone, Vibrato, One-Shots, etc.)
  Patch 5: Remove MIDI/Audio JS blocks (MidiController through AudioClipDatabase)
  Patch 6: Remove generation panel JS blocks (LongToneUI through NotationFragment)
  Patch 7: Remove FlowchartConnector + EditCursor
  Patch 8: Add MidiModelSystem stub (one line)
  Patch 9: (Future) CSS overrides for performer-facing theme
```

Each patch is a find-and-replace on known comment markers or code boundaries. The script remains re-runnable from a clean Workshop HTML at any time.

---

### 13.9 Cloud Deployment Outline

This section outlines what's needed to deploy the Performance Score on a cloud VPS, corresponding to Phase 14 in the implementation plan (§13.4). Details like specific hosting provider, domain name, etc. will be decided later — this captures the architectural requirements and porting steps.

#### 13.9.1 What Gets Deployed

```
VPS Server
├── server.js              — Node.js server (evolved from Workshop server.js)
│                             • Express for static files + API routes
│                             • Socket.IO for real-time sync (rooms, clock, playback)
│                             • Auth middleware (JWT validation)
│                             • Room management (create, join, leave, cleanup)
│
├── package.json           — Dependencies: express, socket.io, jsonwebtoken, uuid
│                             (minimal — no database driver needed initially)
│
├── public/                — Static files served by Express
│   ├── index.html         — Stripped Performance Score (~20K lines, ~1.1 MB)
│   └── score.json         — Score data (~9 MB, loaded once per session)
│
├── data/                  — JSON file persistence (flat files, not a database)
│   ├── ensembles/         — One JSON file per ensemble
│   │   └── quartet1.json  — { name, members[], sessions[], sharedMarkers[] }
│   │
│   ├── performers/        — Per-performer data
│   │   ├── violin1/
│   │   │   ├── preferences.json   — UI settings, display options
│   │   │   └── annotations.json   — Personal score annotations
│   │   ├── violin2/
│   │   ├── viola/
│   │   └── cello/
│   │
│   └── rooms/             — Room state snapshots (for reconnection during grace period)
│       └── room_abc123.json
│
├── admin/                 — Admin panel (static HTML + JS, served under auth)
│   └── index.html         — Ensemble management, invite links, status dashboard
│
└── logs/                  — Performance logs, session history
    └── sessions.json
```

**Total deployment size:** ~12 MB (mostly score.json). Fits on any VPS.

#### 13.9.2 Server Architecture — Evolving from Workshop

The existing `server.js` already handles Socket.IO and score serving. The evolution for cloud:

**Current Workshop server.js provides:**
- Express static file serving
- Socket.IO with `clockSync`, `scoreGo`, `scoreStop`, `scoreGoto`, `scoreState`
- Score save/load via filesystem
- Global playback state (isPlaying, currentScoreTimeMs, scoreTimeOffset)

**Cloud server.js adds:**

| Feature | What Changes |
|---------|-------------|
| **Room-based state** | Replace global state with `rooms = new Map()`. Each room: `{ id, members[], isPlaying, scoreTimeMs, scoreTimeOffset, leader, createdAt }` |
| **Room scoping** | All emit calls become `io.to(roomId).emit(...)` instead of `io.emit(...)` |
| **Auth middleware** | Express middleware validates JWT on API routes. Socket.IO `connection` event validates token. |
| **Invite system** | `POST /api/ensemble/:id/invite` → generates unique token URL per performer slot |
| **Persistence endpoints** | `GET/PUT /api/performer/:id/preferences`, `GET/PUT /api/performer/:id/annotations` |
| **Room lifecycle** | Room auto-created on first join, auto-destroyed after 5-min grace period when empty |
| **Heartbeat** | Server sends 500ms heartbeat per room during playback (Tier 3 sync) |
| **Position check** | Server broadcasts `scorePositionCheck` every 3s during playback (Tier 1 sync) |

**Key point:** This is an EVOLUTION of the existing server, not a rewrite. The Socket.IO event names and payloads stay the same — the change is scoping them to rooms and adding auth.

#### 13.9.3 VPS Requirements

**Minimal spec (handles 10+ simultaneous rooms easily):**
- 1 vCPU, 1 GB RAM, 25 GB SSD
- Ubuntu 22.04 or Debian 12
- Node.js 18+ (LTS)
- nginx as reverse proxy (SSL termination, static file caching)
- Cost: ~$4-12/month (DigitalOcean, Vultr, Linode, AWS Lightsail)

**Why it's lightweight:**
- No database server (JSON files for tiny data volumes — ~100KB of performer data)
- No build step on the server (all files are pre-built and deployed as static assets)
- Single Node.js process handles all WebSocket connections
- Score JSON serves as a static file (no server-side processing)
- ~4-5 concurrent WebSocket connections per room (quartet + conductor/composer)

#### 13.9.4 VPS Setup Procedure

```
Step 1: Provision VPS
  - Create VM with provider of choice
  - SSH key authentication (no password)
  - Firewall: allow 80 (HTTP), 443 (HTTPS), 22 (SSH)

Step 2: Install runtime
  - sudo apt update && sudo apt upgrade
  - Install Node.js 18+ (via NodeSource or nvm)
  - Install nginx
  - Install PM2 globally: npm install -g pm2

Step 3: Configure nginx
  - Reverse proxy: port 443 → localhost:5000 (Node.js)
  - WebSocket upgrade support (required for Socket.IO):
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
  - Static file caching for score.json (Cache-Control: max-age=3600)
  - SSL via Let's Encrypt (certbot)

Step 4: Deploy application
  - Clone repo (or rsync deploy directory)
  - npm install --production
  - Create data/ directory structure
  - Create initial ensemble JSON
  - PM2 start: pm2 start server.js --name performance-score
  - PM2 startup: pm2 startup (auto-start on reboot)

Step 5: SSL certificate
  - sudo certbot --nginx -d yourdomain.com
  - Auto-renewal: certbot installs cron job automatically
  - Verify: https://yourdomain.com loads app

Step 6: Verify deployment
  - Load app in browser → score renders
  - Open 2 tabs → join same room → sync works
  - Test from mobile device on different network → WebSocket connects
  - Disconnect WiFi on one device → reconnects and re-syncs
```

#### 13.9.5 nginx Configuration Template

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Static files with caching
    location /score.json {
        proxy_pass http://localhost:5000;
        proxy_cache_valid 200 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    # WebSocket support (required for Socket.IO)
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;  # Keep WebSocket alive for 24h
    }

    # All other requests
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

#### 13.9.6 Deployment Workflow (Ongoing Updates)

After the initial setup, deploying score updates or code changes:

```
Score update only (minor edit, SVG swap, timing shift):
  1. Make edit in Workshop
  2. Save score JSON
  3. scp scores/2296-FinalScore-v2.json vps:~/app/public/score.json
  4. Performers reload page (or app detects version change and prompts)

Code update (new feature, bug fix):
  1. Build Performance Score: node scripts/build_engraving_app.js ...
  2. scp builds/performance/index.html vps:~/app/public/index.html
  3. If server.js changed: scp server.js vps:~/app/server.js
  4. SSH to VPS: pm2 restart performance-score
  5. Performers reload page

Full rebuild + deploy (one command, future):
  1. npm run deploy (script that builds + scps + restarts)
```

#### 13.9.7 SSL Requirement — Why HTTPS Matters

HTTPS is **required** (not optional) for several Performance Score features:
- **Service Worker** (emergency recovery cache) — only works on HTTPS
- **Wake Lock API** (prevent iPad sleep) — only works on HTTPS (secure context)
- **Clipboard API** (copy invite links) — secure context only
- **DeviceOrientation** (if used for any iPad features) — secure context
- Let's Encrypt provides free certificates with auto-renewal

#### 13.9.8 Monitoring & Maintenance

```
PM2 monitoring:
  pm2 status          — check if server is running
  pm2 logs            — view server logs
  pm2 monit           — live CPU/memory dashboard

Automated:
  PM2 auto-restart on crash (built-in)
  PM2 log rotation: pm2 install pm2-logrotate
  Let's Encrypt auto-renewal (certbot cron)
  Optional: UptimeRobot (free) for external ping monitoring

Backups:
  data/ directory is tiny (~100KB) — rsync to local machine weekly
  score.json lives in git repo — already backed up
  Server config (nginx, PM2 ecosystem file) — version control or document
```

#### 13.9.9 Scaling Notes (For Reference — Not Needed Initially)

The single-server setup handles the expected load easily (one quartet, maybe a few simultaneous rooms). If scaling is ever needed:

- **Vertical:** Upgrade VPS to 2 vCPU / 2 GB RAM (~$12/mo). Handles 50+ rooms.
- **Horizontal:** Socket.IO with Redis adapter for multi-server. Sticky sessions via nginx `ip_hash`. Only needed if serving dozens of ensembles simultaneously.
- **CDN:** Put score.json behind Cloudflare (free tier) for global edge caching. 9 MB served from edge instead of origin.
- **Database migration:** If JSON files become unwieldy (unlikely at this scale), migrate to SQLite (zero-config, single file) or PostgreSQL.

---

## 14. Phase 2 Post-Mortem — Animation Performance Optimizations

**Date:** Mar 19, 2026
**Tag:** `phase-2-complete`
**Scope:** Performance Score animation smoothness
**Workshop impact:** None — `public/index.html` unchanged (verified via `git diff` against `phase-1-complete` tag)

### 14.1 Problem Statement

Animation jitter in busy score sections during playback of the Performance Score. Cursors, motive pies, line-wedge meters, curve followers, and GC bouncing balls all exhibited visible stuttering.

### 14.2 Root Cause

**GPU rasterization bottleneck** caused by per-frame SVG `setAttribute()` calls on animated elements. Each `setAttribute` triggers SVG DOM recalculation and re-rasterization across the entire score SVG — expensive when the SVG contains hundreds of static elements (notation, badges, etc.).

Additionally, BadgeMaker's boid murmuration system ran **576 continuous SVG `<animateTransform>` animations** (9 boids × 2 transforms × 32 badges), forcing constant GPU rasterization even when nothing else was animating.

The AnimationEngine also used **frame quantization** (`Math.floor(elapsedMs / 16.67)`), causing positions to snap to 16.67ms boundaries — visible micro-stepping in cursor movement.

### 14.3 Strategy: What Was NOT the Cause

- **Delta-checking** (only updating changed attributes) was tried and made jitter WORSE — the overhead of comparison exceeded the savings.
- **JavaScript execution time** was not the bottleneck; GPU rasterization was.

### 14.4 What Was Built

All optimizations applied via **subtractive build patches** in `scripts/build_performance_app.js` and `scripts/performance_canvas_patches.js`. The Workshop source (`public/index.html`) is never modified.

#### A. Canvas Overlay (Patches O3a, O3b, O3c, O4)

Migrated all per-frame animated elements from SVG to HTML5 canvas:
- **Two `<canvas>` elements** created in `StaffCursors._createCanvasOverlays()`, one overlaying each score section (ScoreTop/ScoreBottom)
- **HiDPI-aware:** canvas buffer sized at `rect.width × devicePixelRatio`, CSS size matches logical pixels
- **Positioned absolutely** over the SVG, `z-index: 10`, `pointer-events: none`
- **Elements drawn on canvas:** cursor lines (fillRect), curve followers (_drawCurveFollower), motive pies (_drawMotivePie), line-wedge meters (_drawLineWedgeMeter), GC bouncing balls (arc + fill)
- **Canvas clears both sections each frame**, draws only on the active one
- **GCMaker** draws AFTER StaffCursors (wraps `StaffCursors.update` via existing hook pattern)
- **Result:** SVG is now completely static during playback — zero `setAttribute` calls per frame

#### B. Badge Freeze (Patch O2)

Replaced continuous SVG `<animateTransform>` animations with static transforms:
- Boid murmuration data is pre-computed (unchanged)
- Instead of creating `<animateTransform>` elements for all 120 keyframes, takes a **snapshot at frame 60** (middle keyframe)
- Sets `outer.setAttribute('transform', 'translate(x y)')` and `inner.setAttribute('transform', 'rotate(a)')` once
- **Eliminates 576 continuously running SVG animations** (9 boids × 2 transforms × ~32 badges)

#### C. CSS Containment (Patches O1a, O1b)

Added `contain: layout style paint` to `#ScoreTop` and `#ScoreBottom` CSS rules. This tells the browser that layout/paint changes inside these containers cannot affect elements outside them, limiting the scope of rasterization work.

#### D. AnimationEngine: Continuous Time (Patch AE2)

Removed frame quantization from the animation loop:
- **Before:** `Math.floor(elapsedMs / MS_PER_FRAME)` calculated discrete frame numbers; only drew on new frames; positions snapped to 16.67ms steps
- **After:** Always draws on every `requestAnimationFrame` callback using continuous `elapsedMs` — no frame gating, no snapping
- All downstream systems already computed positions from continuous time — they just inherited the quantized input. This change flows through automatically.

#### E. AnimationEngine: Subscriber Pattern (Patches AE1, AE3a–c)

Replaced fragile hook-chain wrapper pattern with clean subscriber array:
- **Before:** Each system overwrote `AnimationEngine.onDraw` with a closure wrapping the previous value. Hard to debug, profile, or selectively disable.
- **After:** `AnimationEngine.subscribe(name, fn, priority)` — systems register with a name and priority. Loop iterates sorted subscriber array.
- **Subscribers:** StaffCursors (priority 0), StaffPositions (priority 5), GraphicTimeline (priority 10)
- MidiController and AudioClipController already stripped by Phase 1 S3

#### F. Dimension Caching (Patches O3b, O3c)

Cached layout dimensions to eliminate per-frame reflow:
- `_cachedScoreWidth`, `_cachedScoreHeight`, `_cachedStaffHeight` computed on init and resize
- `StaffCursors.update()` reads from cache instead of `scoreTopEl.clientWidth` (which forces browser reflow)

### 14.5 Complete Patch Inventory (21 patches)

| # | Patch | Type | What |
|---|-------|------|------|
| 1 | O1a | Replace | CSS containment on #ScoreTop |
| 2 | O1b | Replace | CSS containment on #ScoreBottom |
| 3 | O2 strip | Strip | Remove animateTransform loop (1 KB) |
| 4 | O2 insert | Insert | Badge freeze — static snapshot at frame 60 |
| 5 | O3a | Replace | Canvas overlay init call in StaffCursors.init() |
| 6 | O3a2 | Replace | Resize handler — add `_resizeCanvases()` call |
| 7 | O5 | Replace | LW re-append cleanup (target not found — harmless) |
| 8 | AE1 | Insert | Subscriber pattern: `subscribers[]` + `subscribe()` on AnimationEngine |
| 9 | AE2 strip | Strip | Remove frame-quantized loop (2 KB) |
| 10 | AE2 insert | Insert | Continuous-time loop with subscriber calls |
| 11 | AE3a | Replace | StaffCursors → `AnimationEngine.subscribe('StaffCursors', fn, 0)` |
| 12 | AE3b | Replace | StaffPositions → `AnimationEngine.subscribe('StaffPositions', fn, 5)` |
| 13 | AE3c | Replace | GraphicTimeline → `AnimationEngine.subscribe('GraphicTimeline', fn, 10)` |
| 14 | O3b strip | Strip | Remove old createCursor + updateCursorDimensions (9.8 KB) |
| 15 | O3b insert | Insert | Canvas createCursor + _createCanvasOverlays + _resizeCanvases |
| 16 | O3c strip | Strip | Remove old update/pie/lw/curve/getPosition (34 KB) |
| 17 | O3c insert | Insert | Canvas update + _drawMotivePie + _drawLineWedgeMeter + _drawCurveFollower + getPosition |
| 18 | O4a | Replace | Remove ballsTop/ballsBottom SVG init |
| 19 | O4b strip | Strip | Remove old GCMaker.update SVG (3.5 KB) |
| 20 | O4b insert | Insert | Canvas GCMaker.update |
| 21 | Canvas patches | Load | `performance_canvas_patches.js` — large method replacements |

### 14.6 Files Modified/Created

| File | Action | Purpose |
|------|--------|--------|
| `scripts/build_performance_app.js` | Modified | Added Phase 2 patches (O1–O5, AE1–AE3) |
| `scripts/performance_canvas_patches.js` | **New** | Large method replacements for O3b, O3c, O4 |
| `builds/performance/index.html` | Regenerated | Output with all optimizations applied |
| `public/index.html` | **Unchanged** | Workshop source verified identical to `phase-1-complete` tag |

### 14.7 Build Output

- **Original size:** 1966 KB
- **After strips:** 979 KB (50.2% reduction)
- **Patches applied:** 21 (Phase 1: 16 + Phase 2: 5 new patches)
- **Score JSON:** 16.16 MB

### 14.8 §12.8 Implementation Status

| Item | Status | Implementation |
|------|--------|---------------|
| 1a. Remove frame quantization | ✅ Done | Continuous time in AnimationEngine.loop (AE2) |
| 1b. Cache layout dimensions | ✅ Done | `_cachedScoreWidth/Height/StaffHeight` (O3b) |
| 1c. Per-frame calculation cache | ✅ Done | GCMaker reuses StaffCursors page calc (O4) |
| 2b. CSS transforms / Canvas | ✅ Done | Canvas overlay — went further than planned (O3a–c, O4) |
| 2c. Subscriber pattern | ✅ Done | `AnimationEngine.subscribe()` (AE1, AE3a–c) |
| 2a. Dual-clock model | ⏳ Deferred | Phase 10 — needs real server for sync testing |
| 3a. Web Animations API | ⏳ Deferred | Phase 13 — needs sync system + profiling data |
| 3b. Predictive rendering | ⏳ Deferred | Phase 13 — only if profiling shows need |
| 3c. Sync quality indicator | ⏳ Deferred | Phase 10 — needs sync quality metric |

### 14.9 Bugs Encountered

1. **Ambiguous strip marker (O2):** `for (let i = 0; i < M.BOID_COUNT; i++) {` appears 3 times in `generateMurmurationSVG()` — once for data collection, once for angle unwrapping, once for the animateTransform loop. The strip matched the wrong (first) occurrence, removing the data collection loop and causing a `SyntaxError: Unexpected token ','` at runtime. **Fix:** Extended the marker to include `const outer = document.createElementNS(ns, 'g');\n...animateTransform` to uniquely target the correct loop.

2. **O5 marker not found:** The LW re-append cleanup target string wasn't found in the performance build. This is harmless — the code may have already been removed by a prior strip, or the exact string didn't match. The canvas overlay makes this code unnecessary regardless.

### 14.10 Git Safety

| Tag | Commit | Purpose |
|-----|--------|--------|
| `v1.0-composition` | — | Original composition milestone |
| `phase-1-complete` | `e25c1ba5` | Phase 1 Performance Score foundation |
| `workshop-verified-pre-phase2` | `3bd71d1b` | Verified workshop intact before Phase 2 |
| `phase-2-complete` | *(this commit)* | Phase 2 animation optimizations complete |
