---
description: Capture score notation + dynamic elements as SVG for performance instructions document
---

# Notation Capture Pipeline

## Quick Reference

```bash
# Basic notation capture (SVG vector)
node scripts/capture_score_images.js --from <start> --to <end> --track <N> --name <output_name> --svg

# With synthetic playback elements (cursor, meter, follower, dial)
node scripts/capture_score_images.js --from <start> --to <end> --track <N> --name <output_name> --svg --playat <display_second>
```

Output goes to: `docs/notation_instructions/images/<name>.svg`

## What Gets Captured

### Static elements (always captured)
- **Notation SVGs** — from `svg-elements-container` (LilyPond fragments, text annotations)
- **Curves** — from `curve-container` (CurveMaker crescendo/decrescendo shapes)
- **Line wedges** — from `linewedge-container` (LineWedgeMaker colored line shapes)
- **GC arcs** — from `gc-container` (GCMaker gravitational conductor trajectories)
- **Badges** — from `badge-container` (BadgeMaker technique badges like flocking, etc.)

### Synthetic playback elements (with `--playat`)
Computed from curve/line-wedge data and injected as vector SVG:
- **Cursor line** — 3px wide, full staff height, track color (lime green track 1, magenta track 2, blue track 3, orange track 4)
- **Meter outline** — 8px wide, stroke only, curve color
- **Follower fill** — 8px wide, partial fill from bottom, curve color
- **Countdown dial** — square border + pie arc + clock hand
- **LW meter ring** — donut ring (stroke-only arc, transparent center) + square border. Injected when a line wedge is active and no curve is active. Cursor X derived from LW pixel positions.

### NOT captured (must add manually in Inkscape)
- **GC bouncing ball** — playback-only circle (r=5, filled with GC color). Standalone SVG available at `images/gc_ball_follower.svg`. Copy-paste into Inkscape.
- **Playback-only animations** — any element only created during real-time playback

## Flags

| Flag | Description |
|------|-------------|
| `--from N` | Start display second (required) |
| `--to N` | End display second (required) |
| `--track N` | Track: 1-4 or range like 1-2 (default: 1-4) |
| `--name STR` | Output filename without extension (required) |
| `--svg` | Vector SVG output (recommended) |
| `--playat N` | Inject cursor/meter/follower/dial at display second N |
| `--padding N` | Extra px around region (default: 20) |
| `--scale N` | DPI scale for PNG mode (default: 3) |

## Time Mapping
- Display seconds = what the user sees (0 = piece start)
- Score seconds = display + 2 (lead-in offset)
- The `--from`, `--to`, `--playat` flags all use **display seconds**

## Typical Workflow

1. **Identify the region** — note the display second range and track number
2. **Run capture** — use the command above with appropriate flags
3. **Preview in Inkscape** — open the SVG, check what's included
4. **Clean up** — remove unwanted elements (extra notation from margins, UI artifacts)
5. **Colors should work automatically** — `rgba()` values are normalized to `rgb()` during export for Inkscape compatibility. Reference hex values if manual touch-up needed:
   - Lime Green: `#99FF00` / Bright Blue: `#387ED3` / Neon Magenta: `#FF15A0`
   - Bright Orange: `#F04B00` / Bright Red: `#E52A19` / Plum: `#522C55` / Lavender: `#A27EC6`
6. **Add manual elements** — bouncing ball (copy from `gc_ball_follower.svg`), position adjustments
7. **Insert into document** — add entry in `docs/notation_instructions/index.html` using existing HTML patterns

## Known Issues (Resolved)
- **~~ColorMap resolution~~** — FIXED. `rgba()` → `rgb()` normalization applied post-serialization. Colors now render correctly in Inkscape.
- **~~Line wedge filtering~~** — FIXED. Y-coordinate filtering ensures only track-matching LWs are kept. UI artifacts (hit paths, node handles, highlights) stripped.
- **~~Badge black squares~~** — FIXED. Badge content renders correctly. UI artifacts stripped.

## Remaining Known Issues
- **Playback element X position** — synthetic cursor/meter position is computed but may not be pixel-perfect. Adjust in Inkscape if needed.
- **Time margin** — notation elements use ±4s margin from anchor point. Some extra elements may appear at edges; remove in Inkscape.
- **GC arcs from other tracks** — GC arcs may bleed through from adjacent tracks. Delete unwanted arcs in Inkscape.

## Document Authoring

The performance instructions document lives at `docs/notation_instructions/index.html` with styles in `styles.css`.

### Entry structure
Each entry follows this pattern:
1. `<h3>` title (hyphenated for material names, e.g., "Like-Walking-on-a-Carpet-of-Twigs")
2. Hero image: `<div class="notation-section"><img src="images/...svg">` — full-width score excerpt
3. Breakdown rows: `<div class="notation-section side-by-side">` — image-col (left) + text-col (right)
   - Use `style="max-width: Npx;"` on images to control size relative to hero image

### Image sizing guidelines
- Breakdown images should approximate their visual size in the hero image
- Typical values: motive cell ~160px, line wedge ~280px, badge ~80px, GC arc ~180px

## Inkscape Shortcuts
- **Fill & Stroke dialog**: `Shift+Ctrl+F`
- Paste hex color in the RGBA field
