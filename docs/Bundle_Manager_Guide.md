# Bundle Manager — User Guide

**Tool Location:** `tools/bundle_manager.html`  
**Type:** Standalone HTML page (no server required)  
**Purpose:** Inspect, select, and delete bundles from saved score JSON files.

---

## What It Does

The Bundle Manager lets you open any saved score `.json` file and see every bundle (Bartók Pizz, Pizz Tremolo, Notation Fragment, Crescendo/Decresc, Pizz Trem Gliss, Vibrato) in a single sortable table. You can filter by type, track, or time range, select individual bundles or ranges, delete them (along with their associated GCs, curves, SVGs, and MIDI snippets), and save the cleaned result as a new score file.

---

## How to Use It

### 1. Open the Tool

Open `tools/bundle_manager.html` directly in your browser. No server needed — just double-click the file or drag it into a browser tab.

### 2. Load a Score

Click the file input at the top and select a score JSON from the `scores/` folder (e.g. `332.json`). The tool will parse all 6 bundle types and display them in a table sorted by time.

**Stats bar** appears showing counts: total bundles, per-type counts (BP, PT, NF, CD, PTG, VIB), plus GCs, SVGs, Curves, and MIDI snippets in the score.

### 3. Find the Bundles You Want to Delete

**Filters** (blue bar below stats):
- **Type** — filter to just one bundle type (e.g. only BP bundles)
- **Track** — filter to a specific track (1–4)
- **Time range** — set a "from" and "to" time in seconds to narrow the view

Click **Apply** to activate filters, **Clear** to reset.

**Sorting** — click any column header (Type, Time, Track, etc.) to sort. Click again to reverse.

### 4. Select Bundles

- **Single click** — check/uncheck individual bundles
- **Shift+click** — select a range (click first bundle, then Shift+click last bundle in the range — everything in between gets selected)
- **Select All Visible** — selects all bundles currently shown after filtering
- **Select Filtered Range** — same as above (useful after setting a time range filter)
- **Deselect All** — clears all selections

The selection count updates in real-time next to the Delete button.

### 5. Delete Selected Bundles

Click **Delete Selected (N)** — a confirmation dialog appears showing how many bundles will be removed.

**What gets deleted for each bundle:**
- The bundle record itself
- Its associated **GC** (for BP, PT, NF) or **Curve** (for CD, PTG, VIB)
- Its associated **SVG element**
- Its associated **MIDI snippet(s)**

Deleted bundles appear with a strikethrough and red background in the table.

**Undo** — click **Undo Last Delete** to revert the most recent batch of deletions.

### 6. Save as New Score

1. Enter a filename in the "Save as" field (default: `[original]-cleaned`)
2. Click **Save New Score** — downloads the cleaned JSON file
3. **Move the downloaded file** into the `scores/` folder to use it in the app

**The original score is never modified.** You always save as a new file, so you can revert by loading the original.

---

## Type Color Codes

| Color | Type | Full Name |
|-------|------|-----------|
| 🟣 Magenta | **BP** | Bartók Pizzicato |
| 🔴 Red | **PT** | Pizzicato Tremolo |
| 🟠 Orange | **NF** | Notation Fragment |
| 🔵 Blue | **CD** | Crescendo/Decrescendo |
| 🟣 Purple | **PTG** | Pizz Trem Glissando |
| 🟢 Teal | **VIB** | Vibrato |

---

## Tips

- **Work from filtered views** — set a time range filter first, then "Select All Visible" to grab everything in that range
- **Use Shift+click for contiguous ranges** — fastest way to select a run of bundles at similar times
- **Check the stats bar** after deleting — it updates live to show remaining counts
- **Always save as a new file** — never overwrite your working score until you've verified the cleaned version loads correctly
- **Multiple passes** — you can load the cleaned score back in and do another round of deletions if needed

---

## Bundle Data Reference

Each bundle type stores different cross-references:

| Type | Key Field | References |
|------|-----------|------------|
| BP | `impactTime` | gcId, svgId, midiSnippetId |
| PT | `startTime` | gcId, svgId, midiSnippetId |
| NF | `impactTime` | gcId, svgId, midiSnippetId |
| CD | `startTime` | curveId, svgId, midiSnippetIds[] |
| PTG | `startTime` | curveId, svgId, midiSnippetId |
| VIB | `startTime` | curveId, svgId, midiSnippetId |

GC-based bundles (BP, PT, NF) reference `databases.gcs.gcs[]`.  
Curve-based bundles (CD, PTG, VIB) reference `databases.curves.curves[]`.  
All bundles reference `svgElements[]` and `databases.midiSnippets.snippets[]`.
