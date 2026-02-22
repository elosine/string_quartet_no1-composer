# LilyPond Master Template Guide

**File:** `lilypond_code/MasterTemplate.ly`  
**Created:** Feb 19, 2026 (ASB-069)

---

## What Is This?

A single unified LilyPond file that collects **all** look-and-feel settings, notation techniques, and Scheme functions used across this project. Instead of settings being scattered across 38+ individual `.ly` files, they're organized by functional group with:

- **Grouped settings** — all hairpin tweaks together, all glissando tweaks together, etc.
- **Documented variations** — every value that was used across files, with explanations
- **Sample notation** — 8 examples (A through H) demonstrating each technique
- **AI-readable comments** — structured so Cascade can toggle features on/off by prompt

---

## File Structure

| Section | Contents |
|---------|----------|
| **Section 0** | Scheme helper functions (custom staff lines, vibrato stencil) |
| **Section 1** | Feature toggles (##t / ##f flags) |
| **Section 2** | Configurable values (sizes, offsets, fonts) |
| **Section 3** | Paper dimensions |
| **Section 4** | Custom notation definitions (blockHead, etc.) |
| **Section 5A** | Global overrides (always active) |
| **Section 5B** | Conditional feature overrides (comment/uncomment) |
| **Section 6** | Sample notation examples (A through H) |
| **Appendix** | Quick reference (pitch nomenclature, dynamics, tweaks) |

---

## How to Use

### Quick Start
1. Open `MasterTemplate.ly`
2. In **Section 1**, set feature toggles for what you need
3. In **Section 2**, adjust values (sizes, offsets)
4. In **Section 3**, set paper dimensions for your notation type
5. In **Section 6**, uncomment the example closest to what you want
6. Adjust pitches, dynamics, and tweak values
7. Compile with LilyPond

### AI Prompt Workflow
Tell Cascade what you want and it will modify the template:

| You Say | AI Does |
|---------|---------|
| "Enable hairpin" | Sets `useHairpin = ##t`, uncomments hairpin overrides |
| "Wider hairpin" | Increases `hairpinHeight` value |
| "Enable vibrato wide-to-narrow" | Sets `useVibrato = ##t`, sets `vibratoAmplitudes = #'(3.0 0.0)`, uncomments vibrato overrides |
| "Enable glissando" | Sets `useGlissando = ##t` |
| "Bartók pizz" | Sets `useBartokPizz = ##t`, shows stems, uses Example C |
| "Same staff line glissando" | Sets `glissYOffset = #0.3` |
| "Smaller text" | Decreases `textFontSize` |
| "Staff lines shorter" | Decreases `staff-line-width-mm` in Section 0 |

---

## Functional Groups Reference

### 1. Staff Lines (Scheme)
Custom-width staff lines via `custom-staff-lines` Scheme function.
- **Where to change:** `#(define staff-line-width-mm 2.4)` in Section 0
- **Range:** 0.8mm (tiny) to 3.0mm (wide)

### 2. Noteheads
- `noteHeadSize` — default `#-2` (smaller than LilyPond default)
- `NoteHead.style` — `#'default` (normal), `#'harmonic` (diamond)
- `blockHead` — filled rectangle for col legno battuto

### 3. Hairpins
- `hairpinHeight` — opening size (0.5 to 1.1)
- `hairpinYOffset` — vertical position (-0.9 for vibrato context, -0.3 standard)
- `hairpinShortenRight` — right-end length adjustment (-1.8 to 7)
- `hairpinExtraOffsetX/Y` — position fine-tuning

### 4. Glissando
- `glissYOffset` — 0 (normal) or 0.3 (same staff line)
- `glissLeftPadding` — gap from left note (0.2 to 0.4)
- `glissRightPadding` — gap from right note (-0.1)
- Style override: `#'zigzag` for special effects

### 5. Vibrato (Scheme)
- `vibratoAmplitudes` — wave envelope (list of amplitude values)
- `vibratoWavelength` — wave density (1.0 default)
- `vibratoThickness` — line weight (0.15 default)
- `vibratoWidthFrac` — span fraction (0.65 default)
- `vibratoYOffset` — vertical position (3.5 default)

### 6. Dynamics
- `dynamicTextSize` — font size (-6 to -9)
- `dynamicLineSpannerPadding` — push dynamics away from ledger lines

### 7. Text Annotations
- Font: "Crimson Pro Light Italic"
- Standard texts: "Non-Vib", "secco", "c.l. batt."
- Positioned with `\tweak extra-offset #'(X . Y)`

### 8. Accidentals
- `accidentalSize` — font size (-4 to -6)
- `Accidental.extra-offset` — fine-tune position relative to notehead

---

## Adding New Techniques

When you discover a new technique or want to add a new setting:

### Step 1: Identify the Functional Group
Does the new setting relate to an existing group (hairpin, glissando, etc.)? If so, add it to that group's section in the template.

### Step 2: Document Variations
If you've tried multiple values, document all of them:
```lilypond
% hairpinHeight: Controls opening width
%   #0.5  — subtle (vibrato context)
%   #0.65 — standard ← CURRENT
%   #0.7  — prominent
%   #1.1  — very tall (experimental, from Crescendo-Viola-D3_draft)
```

### Step 3: Add Toggle (if new feature)
In Section 1, add a new toggle:
```lilypond
useNewFeature = ##f  % Description of what it does
```

### Step 4: Add Sample Notation
In Section 6, add a new commented-out example:
```lilypond
% -----------------------------------------------------------------
% EXAMPLE X: NEW FEATURE (commented out)
% -----------------------------------------------------------------
% Description and key settings.
% Set paper dimensions, staff line width as needed.
%
% ... notation code ...
```

### Step 5: Commit and Document
- Tier 1: Create ASB memory with the new technique
- Tier 2: Git commit when 3-4 techniques accumulated
- Update this guide if a new functional group was added

---

## Paper Size Presets

| Notation Type | paper-width | paper-height | line-width | staff-line-width |
|--------------|-------------|--------------|------------|-----------------|
| Bartók Pizz | 9mm | 21mm | 37mm | 1.2mm |
| Glissando (pure) | 19mm | 20mm | 18mm | 2.4mm |
| Crescendo Single Pitch | 22mm | 25mm | 50mm | 2.0mm |
| Crescendo Glissando | 23mm | 25mm | 50mm | 2.4mm |
| Crescendo Instance | 17mm | 20-25mm | 50mm | 2.9mm |
| Vibrato | 80mm | 40mm | 55mm | 2.8mm |
| Col Legno Battuto | 130mm | 500mm | 20mm | n/a (1-line) |
| Cello Cell | 130mm | 500mm | 37mm | 0.8mm |

---

## Version History

| Date | Change | ASB# |
|------|--------|------|
| Feb 19, 2026 | Initial creation — all settings from 38 .ly files | ASB-069 |
