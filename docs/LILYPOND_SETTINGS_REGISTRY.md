# LilyPond Settings Registry

**Single source of truth for all notation settings, decisions, and variations.**
**Extracted from exhaustive scan of 433 .ly files (771 unique setting lines).**

> **How to use this document:**
> - **Current Value** = what new files should use (matches StartingTemplate / MasterTemplate)
> - **All Values Found** = every variation discovered across the codebase
> - **Source files** = where each value was found (representative, not exhaustive)
> - **Commented** = setting was present but commented out (% or ;)
> - When creating a new .ly file, start from StartingTemplate.ly and consult this registry for technique-specific settings.

---

## Quick Reference for the User

**Slash command:** Type `/lilypond-registry` in chat before working on any `.ly` file.

| You want to… | What to say | What happens |
|---|---|---|
| **Start a new .ly file** | "New file for [technique]" | AI reads registry, applies current defaults + technique settings |
| **Change a default** | "Change [setting] to [value]" | AI updates the .ly file, registry, StartingTemplate, and MasterTemplate |
| **Use an old/alternate value** | "Use [setting] = [value] for this file" | AI applies it to this file only — registry unchanged |
| **Promote an old value to default** | "Make [value] the new default for [setting]" | AI swaps current/variant in registry, updates templates |
| **Found a new setting** | "I discovered [setting] in [context]" | AI adds it to registry — asks if it's a new default or variant |
| **Look up history** | "What values have we used for [setting]?" | AI reports current, all variants, source files, rationale |

**If you forget everything else:** just type `/lilypond-registry` and the AI will guide you.

### When to Engage the Registry

- **Don't bother** for normal iteration — tweaking values, re-rendering, trying different sizes. This is everyday work. Just keep going.
- **Don't bother** for one-off `\once \override` tweaks on a single note. Those are file-specific, not project defaults.
- **Update when you settle** — iteration is done, you're happy with a value, and it should be the standard going forward. Just say "this is final" or "use this going forward."
- **Update when you discover something new** — a new LilyPond command, a new technique, a setting you haven't used before.
- **Batch update at end of session** — if you made several discoveries, just say "let's update the registry with today's changes" and we'll do them all at once.

**The simple rule:** Iterate freely. When something is settled, tell the AI. The AI updates the registry.

---

## Update Protocol

When this registry is updated, follow these rules:

1. **Never delete old values.** Move them to the variants/history rows instead.
2. **Always date changes.** Add `(changed [date])` next to new CURRENT DEFAULT entries.
3. **Always note rationale.** Even one sentence — "too tall" or "matches Draft output" is enough.
4. **Propagate defaults.** If a CURRENT DEFAULT changes, also update:
   - `lilypond_code/StartingTemplate.ly`
   - `lilypond_code/MasterTemplate.ly`
5. **Technique-specific values don't propagate.** Only defaults go into templates.
6. **New sections are fine.** If a setting doesn't fit anywhere, add a new numbered section + TOC entry.

---

## Table of Contents

1. [Noteheads](#1-noteheads)
2. [Stems](#2-stems)
3. [Beams](#3-beams)
4. [Accidentals](#4-accidentals)
5. [Dynamics](#5-dynamics)
6. [Hairpins](#6-hairpins)
7. [Rests](#7-rests)
8. [Tuplets](#8-tuplets)
9. [Glissando](#9-glissando)
10. [Vibrato](#10-vibrato)
11. [Staff Lines & Staff Symbol](#11-staff-lines--staff-symbol)
12. [Text & Markup](#12-text--markup)
13. [Articulations & Scripts](#13-articulations--scripts)
14. [Note Column Positioning](#14-note-column-positioning)
15. [Layout & Spacing](#15-layout--spacing)
16. [Paper Dimensions](#16-paper-dimensions)
17. [Staff Visibility (stopStaff/startStaff)](#17-staff-visibility)
18. [Clef Overrides](#18-clef-overrides)
19. [Bar Numbers & Bar Lines](#19-bar-numbers--bar-lines)
20. [System Brackets](#20-system-brackets)
21. [Instrument Names](#21-instrument-names)
22. [Feathered Beams](#22-feathered-beams)
23. [Pressure Wedge](#23-pressure-wedge)
24. [Special Notehead Styles](#24-special-notehead-styles)
25. [Arpeggio](#25-arpeggio)
26. [Scheme Definitions](#26-scheme-definitions)
27. [Tweak Reference (per-instance)](#27-tweak-reference)
28. [Microtonal Pitch Syntax](#28-microtonal-pitch-syntax)
29. [Bartók Pizzicato](#29-bartók-pizzicato)

---

## 1. Noteheads

### NoteHead.font-size

| Value | Status | Context | Source Files |
|-------|--------|---------|-------------|
| **#-2** | **CURRENT DEFAULT** | Standard project notehead size | StartingTemplate, MasterTemplate, most files |
| #-1.25 | Variant | Larger noteheads (cluster notation) | e4_e5_b4cluster.ly |
| #-1.5 | Variant | Per-instance larger note | \once override in various |
| #-2.5 | Variant | Slightly smaller | Cello_E2_cell.ly |
| #-2.8 | Variant | Slightly smaller | Viola_B3_cell.ly |
| #-3.3 | Variant | Smaller | PitchCell variants |
| #-4 | Variant | Small noteheads | Various |
| #-6 | Variant | Very small (feathered beams context) | FeatheredBeams_draft.ly |
| #-8 | Variant | Tiny (inside grace note clusters) | grace note clusters.ly |

**Decision History:**
- Oldest files used #-2 consistently
- Grace note clusters used #-8 inside `\grace{}` blocks for cluster effect
- Feathered beams draft used #-6 for small-notation context
- Cell/pitch-cell files experimented with #-2.5 to #-3.3
- **#-2 settled as project standard**

### NoteHead.style

| Value | Purpose | Source Files |
|-------|---------|-------------|
| `#'default` | Revert to normal noteheads | MasterTemplate (commented) |
| `#'cross` | X noteheads — col legno battuto, indefinite pitch | col legno battuto ricochet.ly, Lachenmann, Crumb, Huebler |
| `#'harmonic` | Diamond noteheads — harmonics, harmonic touch | Huebler, MasterTemplate |

### NoteHead.stencil (custom shapes)

| Value | Purpose | Source Files |
|-------|---------|-------------|
| `#arrow-down-notehead` | Down arrow — Scheme custom | PizzicatoStorm_final.ly |
| `#arrow-up-notehead` | Up arrow — Scheme custom | PizzicatoStorm_final.ly |
| `#ly:text-interface::print` | Custom markup as notehead (blockHead) | MasterTemplate (col legno battuto) |
| `##f` | Hide notehead entirely | Various (commented) |

### NoteHead.no-ledgers

| Value | Purpose | Source Files |
|-------|--------|-------------|
| `##t` | Hide ledger lines on this note | col legno ricochet, M2a_jete, two handed pizz |
| `##f` | Show ledger lines (revert) | Same files (in startStaff block) |

### NoteHead.transparent

| Value | Purpose | Source Files |
|-------|---------|-------------|
| `##t` | Make notehead invisible (keep spacing) | Various (commented in stopStaff blocks) |
| `##f` | Revert to visible | Various (commented in startStaff blocks) |

---

## 2. Stems

### Stem.details.beamed-lengths (beamed notes)

| Value | Status | Context | Source Files |
|-------|--------|---------|-------------|
| **#'(6)** | **CURRENT DEFAULT** | Standard beamed stem length | StartingTemplate, MasterTemplate, PizzMotive001 |
| #'(0) | Variant | No visible beamed stem | Various (commented) |
| #'(4) | Variant | Short (action notation) | Huebler_ActionNotation |
| #'(4.5) | Variant | Short (feathered beams) | FeatheredBeams_draft.ly |
| #'(5) | Variant | Medium-short | Crumb, Lachenmann, QuasiGuitarra |
| #'(5.5) | Variant | Medium | M-series (M1, M2, M3), col legno, M2a_jete |
| #'(7) | Previous default | Was project standard before ASB-073 | Older templates, sf004, ILL files |
| #'(7.5) | Variant | Long | PizzicatoStorm, two handed pizz |
| #'(9) | Variant | Very long (proportional spacing) | proportional spacing template.ly |

**Decision History:**
- Oldest files: #'(7) was the original standard
- M-series files: used #'(5.5) for technique-specific contexts
- ASB-073 (Feb 2026): Changed default from #'(7) to **#'(6)** — user adjusted

### Stem.details.lengths (non-beamed notes)

| Value | Status | Context | Source Files |
|-------|--------|---------|-------------|
| **#'(6)** | **CURRENT DEFAULT** | Standard stem length | StartingTemplate, MasterTemplate, PizzMotive001 |
| #'(0) | Variant | No visible stem | Various (commented) |
| #'(5) | Variant | Short (action notation) | Huebler_ActionNotation |
| #'(5.5) | Variant | Medium | M3_vla_accented_long_tone_bowpressure, FeatheredBeams |
| #'(6) | Current | Also used in Crumb, Lachenmann, QuasiGuitarra |
| #'(6.5) | Variant | Slightly longer | Various |
| #'(7) | Previous default | Was project standard | sf004, ILL, older templates |
| #'(7.5) | Variant | Long | col legno ricochet, M2a_jete, PizzicatoStorm |
| #'(9) | Variant | Very long | proportional spacing template.ly |

### Stem.length (standalone/unbeamed — different property!)

| Value | Context | Source Files |
|-------|---------|-------------|
| #8 | Grace note stems (rasgueado) | QuasiGuitarra_Strum_final.ly |
| #12 | Long standalone stems (pluck notation) | PizzicatoStorm_final.ly |
| #pluck-stem-length | Scheme variable (=12) | PizzicatoStorm_final.ly |

> **Note:** `Stem.length` controls standalone notes. `Stem.details.lengths` controls the general system. These are different properties.

### Stem.details.stem-shorten

| Value | Context | Source Files |
|-------|---------|-------------|
| `#\`(,pluck-stem-shorten)` | Negative value (-2) extends stem upward | PizzicatoStorm_final.ly |

### Stem.transparent

| Value | Status | Source Files |
|-------|--------|-------------|
| **##t** | **CURRENT DEFAULT** | Stems hidden in most notation | StartingTemplate, MasterTemplate |
| ##f | Variant | Show stems (pizz, feathered beams, action notation) | FeatheredBeams, Huebler, PizzicatoStorm |

### Stem.direction

| Value | Context | Source Files |
|-------|---------|-------------|
| `#up` | Force all stems up | ILL20231216, grace note clusters |
| `#down` | Per-note stem down | \once override in many files |

### Other Stem Properties

| Setting | Value | Source |
|---------|-------|--------|
| `Stem.stencil = ##f` | Completely remove single stem | Various (\once) |
| `Stem.Y-extent` | Explicit top/bottom bounds | PizzicatoStorm |
| `\hide Stem` | Layout-level hide | e4_e5_b4cluster (layout block) |

---

## 3. Beams

### Beam.damping

| Value | Status | Source Files |
|-------|--------|-------------|
| **#+inf.0** | **CURRENT DEFAULT** | Forces perfectly flat/horizontal beams | StartingTemplate, MasterTemplate, PizzMotive001 |

**Decision History:**
- Added ASB-073 (Feb 2026). Before this, beams followed LilyPond default slope.
- `damping` is a native LilyPond property (beam-interface). The Scheme `after-line-breaking` callback approach does NOT work for beams.

### Beam.breakable

| Value | Status | Source Files |
|-------|--------|-------------|
| **##t** | **CURRENT DEFAULT** | Always in layout \Score context | All files |

### Beam.grow-direction

| Value | Context | Source Files |
|-------|---------|-------------|
| `#RIGHT` | Feathered beams (accelerando effect) | FeatheredBeams_draft.ly |
| `#LEFT` | Feathered beams (ritardando) | Not used yet |

> See [Section 22: Feathered Beams](#22-feathered-beams) for full details.

---

## 4. Accidentals

### Accidental.font-size

| Value | Status | Context | Source Files |
|-------|--------|---------|-------------|
| **#-5** | **CURRENT DEFAULT** | Standard project accidental size | StartingTemplate, MasterTemplate |
| -2 | Variant | Large (old ILL/grace note files) | ILL20231216, grace note clusters |
| #-3 | Variant | Per-instance (\once) | Various |
| -4 | Variant | Medium — common in older files | sf004, M-series, col legno, Crumb, Lachenmann, QuasiGuitarra |
| #-4 | Same as above | With # prefix | Various |
| -6 | Variant | Smallest | Various older files |

**Decision History:**
- Oldest files: -2 (same size as noteheads)
- Middle era: -4 (most common across M-series and technique files)
- Current: **-5** (settled in StartingTemplate era)

### Accidental.extra-offset

| Value | Context | Source Files |
|-------|---------|-------------|
| `#'(0.1 . 0)` | Move sharp slightly right | Various |
| `#'(0.3 . 0)` | Move sharp closer to note | MasterTemplate, various |

### Accidental.stencil

| Value | Context | Source Files |
|-------|---------|-------------|
| `##f` | Completely hide accidentals | PizzicatoStorm (fingering staff) |

### Accidental.transparent

| Value | Context | Source Files |
|-------|---------|-------------|
| `##t` | Make accidental invisible (keep spacing) | Various (\once) |

---

## 5. Dynamics

### DynamicText.font-size

| Value | Status | Context | Source Files |
|-------|--------|---------|-------------|
| **#-8.5** | **CURRENT DEFAULT** | Standard project dynamic size | StartingTemplate, MasterTemplate |
| #-2 | Variant | Large (old ILL/grace note files) | ILL20231216, grace note clusters |
| #-6 | Variant | Common in older technique files | sf004, M-series, col legno, Crumb, Lachenmann, etc. |
| #-7 | Variant | Medium-small | Various |
| #-9 | Variant | Very small | Various |

**Decision History:**
- Oldest files: -2 (large dynamics)
- Technique files era: -6 (most common across M-series)
- Current: **-8.5** (settled in StartingTemplate)

### DynamicText.extra-spacing-width

| Value | Context | Source Files |
|-------|---------|-------------|
| `#'(+inf.0 . -inf.0)` | Avoid dynamic collision with notes | FeatheredBeams_draft.ly (commented in others) |

### DynamicLineSpanner.staff-padding

| Value | Status | Source Files |
|-------|--------|-------------|
| **#1.2** | **CURRENT DEFAULT** | Controls dynamic distance from staff | MasterTemplate |

---

## 6. Hairpins

### Hairpin.height

| Value | Status | Context | Source Files |
|-------|--------|---------|-------------|
| #0.3 | Variant | Very small per-instance hairpin | \once override |
| **#0.5** | Variant | Shorter hairpins | MasterTemplate (commented) |
| #0.65 | Variant | Medium | Various |
| #0.7 | Variant | Standard-ish | Various |
| #1.1 | Variant | Tall hairpins | Various |

### Hairpin.Y-offset

| Value | Status | Source Files |
|-------|--------|-------------|
| **#-0.3** | Variant | Slight downward | Various |
| #-0.9 | Variant | More downward | Various |
| #-1 | Variant | Downward | Various |
| #-5 | Variant | Extreme (per-instance) | \once override |

### Hairpin.minimum-length

| Value | Source Files |
|-------|-------------|
| #0.0 | Various |
| #0.1 | FeatheredBeams_draft.ly |
| #8 | \once override (per-instance long hairpin) |

### Hairpin.extra-offset

| Value | Source Files |
|-------|-------------|
| `#'(-0.7 . 0)` | FeatheredBeams_draft.ly |
| `#'(-1 . 0)` | Various |

### Hairpin.bound-details.left.padding

| Value | Source Files |
|-------|-------------|
| #0 | Various |
| #0.2 | Via \tweak |
| #0.3 | Via \tweak |
| #0.4 | Via \tweak |
| #0.5 | Via \tweak |

### Hairpin.bound-details.right.padding

| Value | Source Files |
|-------|-------------|
| #-0.1 | Via \tweak |
| #0 | Via \tweak |
| #0.1 | Via \tweak |

### Hairpin shorten-pair (via \tweak)

| Value | Effect | Source Files |
|-------|--------|-------------|
| `#'(0 . -1.8)` | Longer right end | Various |
| `#'(0 . 0)` | No adjustment | Various |
| `#'(0 . 1.5)` | Shorter right end | Various |
| `#'(0 . 2.4)` | Shorter | Various |
| `#'(0 . 4)` | Much shorter right | Various |
| `#'(0 . 4.5)` | Much shorter | Various |
| `#'(0 . 5.8)` | Very short right | Various |
| `#'(0 . 6)` | Very short | Various |
| `#'(0 . 7)` | Extremely short right | Various |

---

## 7. Rests

### Rest.font-size

| Value | Status | Source Files |
|-------|--------|-------------|
| **#-4** | Only value found | MasterTemplate |

> Rests were not widely overridden across files. Only MasterTemplate defines a rest size.

---

## 8. Tuplets

### TupletBracket.bracket-visibility

| Value | Status | Context | Source Files |
|-------|--------|---------|-------------|
| **##t** | **CURRENT DEFAULT** | Brackets visible | Most files |
| ##f | Variant | Brackets hidden (stopStaff blocks, some techniques) | Crumb, Lachenmann, QuasiGuitarra, stopStaff blocks |

### TupletBracket.direction

| Value | Status | Source Files |
|-------|--------|-------------|
| **#UP** | **CURRENT DEFAULT** | Brackets above notes | MasterTemplate, StartingTemplate, PizzMotive001 |

### TupletBracket.after-line-breaking

| Value | Status | Source Files |
|-------|--------|-------------|
| **#flatten-tuplet-bracket** | **CURRENT DEFAULT** | Forces flat brackets | MasterTemplate, StartingTemplate, PizzMotive001 |

> Requires `#(define (flatten-tuplet-bracket grob) ...)` Scheme function.

### TupletBracket.padding

| Value | Status | Context | Source Files |
|-------|--------|---------|-------------|
| **#0.5** | **CURRENT DEFAULT** | Close to notes | StartingTemplate, MasterTemplate, PizzMotive001 |
| #2 | Previous default | Was project standard before ASB-073 | MasterTemplate (was default) |
| 3 | Oldest value | Original bracket height | proportional spacing template, grace note clusters, ILL20231216 |

**Decision History:**
- **Era 1 (oldest):** `padding = 3` — tall brackets, far from notes
- **Era 2:** `padding = #2` — MasterTemplate initial default
- **Era 3 (current, ASB-073):** `padding = #0.5` — tight brackets, close to notes

### TupletBracket.positions (per-tuplet)

| Value | Context | Source Files |
|-------|---------|-------------|
| `#'(9 . 9)` | Individual bracket height | MasterTemplate (commented) |
| `#'(10 . 10)` | Individual bracket height | MasterTemplate (commented) |
| `#'(11.5 . 11.5)` | Individual bracket height | PizzMotive001_Cello_Draft.ly |

> Both values must be equal for a flat bracket. Lower number = closer to notes.

### TupletNumber — Visibility Methods

Three different ways to hide tuplet numbers have been used:

| Method | Status | Source Files |
|--------|--------|-------------|
| `TupletNumber.visibility = ##f` | Oldest method | sf004, M-series, bartok pizz, col legno, proportional spacing |
| `TupletNumber.stencil = ##f` | Middle era | lyTemplateMax, m4_bowOverpressure |
| `\hide TupletNumber` | Layout-level | Commented in layout blocks of many files |

### TupletNumber — Visible with Formatting

| Setting | Value | Status | Source Files |
|---------|-------|--------|-------------|
| visibility | **##t** | When numbers are shown | Huebler, Ligeti, PizzMotive001 |
| **text** | **#tuplet-number::calc-fraction-text** | **CURRENT** — shows ratio "5:4" | MasterTemplate, StartingTemplate, PizzMotive001 |
| **font-size** | **#-5** | **CURRENT DEFAULT** | MasterTemplate, StartingTemplate, PizzMotive001 |
| font-size | #-3 | Variant — larger numbers | Huebler, Ligeti |

### TupletNumber — Old-Syntax Manual Ratio Text

| Setting | Value | Source Files |
|---------|-------|-------------|
| `\once \override TupletNumber #'text = "5:2"` | Old syntax, custom ratio | proportional spacing template |
| `\once \override TupletNumber #'text = "7:1"` | Old syntax, custom ratio | proportional spacing template |
| `\once \override TupletNumber #'text = "7:4"` | Old syntax, custom ratio | sf004, M-series, col legno (commented) |
| `#(tuplet-number::non-default-tuplet-fraction-text 5 2)` | Built-in function | proportional spacing template |

> **Note:** The `#'property` syntax is pre-2.20. Current syntax is `.property`.

### TupletNumber.transparent

| Value | Context | Source Files |
|-------|---------|-------------|
| ##t | Hide numbers in stopStaff blocks | Many files (commented) |
| ##f | Show numbers in startStaff blocks | Many files (commented) |

### \set tupletFullLength

| Value | Status | Context | Source Files |
|-------|--------|---------|-------------|
| **##t** | Active in some files | Brackets extend to fill full tuplet duration | proportional spacing template, ILL20231216, grace note clusters |
| ##t | Commented out | Referenced but not active | sf004, M-series, col legno, bartok pizz, e4_e5_b4cluster |

> **What it does:** When `##t`, tuplet brackets span the complete duration of the tuplet ratio, not just the notes. Useful when notes don't fill the full tuplet rhythmically.

### Tuplet Ratios Used Across Project

| Ratio | Meaning | Source Files |
|-------|---------|-------------|
| `\tuplet 3/2` | Triplet (3 in space of 2) | Many files |
| `\tuplet 5/4` | Quintuplet (5 in space of 4) | proportional spacing, Lachenmann, PizzMotive001 |
| `\tuplet 5/2` | 5 in space of 2 | proportional spacing |
| `\tuplet 6/4` | Sextuplet (6 in space of 4) | PizzMotive001, Ligeti |
| `\tuplet 7/8` | Septuplet (7 in space of 8) | proportional spacing, Ligeti, Huebler |
| `\tuplet 7/4` | Septuplet (7 in space of 4) | Referenced in comments |

### Hidden Accents in Tuplets

```lilypond
\tuplet 5/4 {e'''16\hide-> e'''e'''e'''e'''}
```
- `\hide->` hides the accent mark visually but keeps it for playback
- Found commented out in: sf004, M-series, col legno, e4_e5_b4cluster, proportional spacing

---

## 9. Glissando

### Glissando.style

| Value | Status | Context | Source Files |
|-------|--------|---------|-------------|
| (default — straight line) | **CURRENT DEFAULT** | Normal glissando | Most files |
| `#'zigzag` | Variant | Zigzag line | MasterTemplate (commented) |
| `#'trill` | Variant | Wavy line (action notation) | PizzicatoStorm_final.ly |

### Glissando.bound-details

| Setting | Value | Source Files |
|---------|-------|-------------|
| left.padding | #0.5 | MasterTemplate (commented) |
| left.padding | #1.2 | PizzicatoStorm_final.ly |
| right.padding | #1 | PizzicatoStorm_final.ly |

### Glissando extra-offset (via \tweak)

| Y Value | Context | Source Files |
|---------|---------|-------------|
| 0 | Different staff lines (default) | Most glissando files |
| 0.1 - 0.4 | Same staff line adjustment | Various Gliss-*.ly files |

> **Rule:** When start and end pitches land on the same staff line (e.g., A4→Ab4), a small Y-offset (0.3) is needed so the glissando line is visible.

### Glissando.breakable

| Value | Status | Source Files |
|-------|--------|-------------|
| **##t** | **CURRENT DEFAULT** | Always in layout \Score context | All files |

---

## 10. Vibrato

### Custom Scheme Stencil

The vibrato system uses a custom Scheme function `build-vibrato-stencil` that generates a cubic Bézier wave.

| Parameter | Description | Typical Values |
|-----------|-------------|----------------|
| amplitudes | List of envelope values | `'(0.15 0.3 0.5 0.7 0.85 1.0)` (W→N) or reversed |
| wavelength | Wave period | 1.4 - 2.0 |
| thickness | Line weight | 0.12 - 0.15 |
| width-frac | Fraction of note duration | 0.65 - 0.85 |

### TrillSpanner (vibrato line positioning)

| Setting | Value | Source Files |
|---------|-------|-------------|
| `TrillSpanner.Y-offset` | #3.5 | Vibrato templates |
| `TrillSpanner.bound-details.left.text` | ##f | Hide "tr" symbol |
| `TrillSpanner.after-line-breaking` | Custom callback | Vibrato system |

---

## 11. Staff Lines & Staff Symbol

### StaffSymbol.thickness

| Value | Status | Source Files |
|-------|--------|-------------|
| **#1** | **CURRENT DEFAULT** | Standard thickness | Most files |
| #0.5 | Variant | Thinner staff lines | Various |

### StaffSymbol.line-count

| Value | Context | Source Files |
|-------|---------|-------------|
| #1 | Single-line staff (percussion, pluck) | PizzicatoStorm, Huebler (R.H.) |
| #5 | Standard 5-line staff (explicit) | Huebler (L.H.), PizzicatoStorm (fingering) |

### StaffSymbol.stencil (custom staff lines)

Three implementations found:

| Implementation | Description | Source Files |
|----------------|-------------|-------------|
| `#custom-staff-lines` | Parameterized via `staff-line-width-mm` variable | MasterTemplate, StartingTemplate, PizzMotive001 |
| `#(make-custom-staff-stencil width-mm)` | Function-based, per-staff width | PizzicatoStorm_final.ly |
| `#(lambda (grob) ...)` | Inline lambda with hardcoded width | Crumb, Lachenmann, QuasiGuitarra, FeatheredBeams, older files |

### Staff line width values (mm)

| Value | Context | Source Files |
|-------|---------|-------------|
| **2.4** | **CURRENT DEFAULT** (small notation) | StartingTemplate, MasterTemplate |
| **2.8** | Current for PizzMotive001 | PizzMotive001_Cello_Draft.ly |
| 2.9 | PizzicatoStorm staves | PizzicatoStorm_final.ly |
| 3.3 | Feathered beams | FeatheredBeams_draft.ly |
| 10 | Fallback/large | MasterTemplate (commented) |
| 50-60 | Hardcoded in older inline lambdas | Crumb (55), Lachenmann (60), QuasiGuitarra (50) |

> **Note:** Older files used raw unitless values in the inline lambda. Current files use the parameterized `staff-line-width-mm` Scheme variable. The multiplier `2.8346` converts mm to staff spaces.

### StaffSymbol.transparent

| Value | Context | Source Files |
|-------|---------|-------------|
| ##t | Hide staff lines (but keep custom stencil) | FeatheredBeams_draft.ly |

### StaffSymbol.ledger-line-thickness

| Value | Context | Source Files |
|-------|---------|-------------|
| `#'(1 . 0)` | Hides ledger lines completely | Various |

---

## 12. Text & Markup

### Font Names

| Font | Context | Source Files |
|------|---------|-------------|
| **"Crimson Pro Light Italic"** | **CURRENT** — technique instructions | MasterTemplate, col legno ricochet, PizzicatoStorm, bow overpressure |
| "Crimson Pro" | Alternate — partial labels, interval numbers | m8 CLB flutter files |

### Font Sizes in Markup

| Size | Context | Source Files |
|------|---------|-------------|
| #-2 | Standard text instructions | col legno ricochet, TextScript overrides |
| #-3 | Smaller text | Huebler, PizzicatoStorm, various TextScript |
| #-6 | Small technique labels | bow overpressure, MasterTemplate |
| #-8 | Very small (jeté, bow instructions) | M-series bow overpressure |
| #-10 | Tiny (partial number labels) | m8 CLB flutter files |

### TextScript.font-size (global)

| Value | Source Files |
|-------|-------------|
| #-2 | Crumb, col legno ricochet |
| #-3 | Huebler, Lachenmann, PizzicatoStorm |

### TextScript.extra-offset (per-instance positioning)

| Value | Source Files |
|-------|-------------|
| `#'(-1 . 2.5)` | Crumb |
| `#'(-1.5 . 2.5)` | Various |
| `#'(-2 . 3)` | Various |
| `#'(-2 . 3.5)` | Crumb |
| `#'(-2 . 4)` | Various |
| `#'(-3 . 2)` | Huebler |
| `#'(-3 . 3)` | Various |
| `#'(-3 . 4)` | Various |
| `#'(-3 . 5)` | QuasiGuitarra |
| `#'(-4 . 4)` | Lachenmann |

### Markup Line Properties

| Setting | Value | Source Files |
|---------|-------|-------------|
| `baseline-skip` | 2 | Multi-line markup stacking |
| `thickness` | 0.4, 0.8 | Markup line weight |

---

## 13. Articulations & Scripts

### Score.Script.font-size

| Value | Context | Source Files |
|-------|---------|-------------|
| #-2 | Smaller articulations | ILL20231216, grace note clusters |

### Script.font-size (per-instance)

| Value | Context | Source Files |
|-------|---------|-------------|
| #1 | Larger articulation | Various (\once) |

### Articulation Types Used

| Articulation | Syntax | Context |
|-------------|--------|---------|
| Marcato (accent) | `-^` | Grace note clusters, col legno |
| Left-hand pizzicato | `-+` | Huebler, Lachenmann |
| Snap pizzicato | `\snappizzicato` | Lachenmann_MultiAttack |
| Hidden accent | `\hide->` | Commented in older files |
| Tenuto | `--` | Various |
| Staccato | `-.` | Various |

### Script.transparent

| Value | Context | Source Files |
|-------|---------|-------------|
| ##t | Hide articulations (stopStaff blocks) | Various (commented) |
| ##f / #f | Show articulations (startStaff blocks) | Various (commented) |

---

## 14. Note Column Positioning

### NoteColumn.X-offset values used

| Value | Context | Source Files |
|-------|---------|-------------|
| #0 | No offset (notecolumn 2) | Various |
| #-0.5 | Slight left | Various |
| #-0.7 | Standard Column 1 | MasterTemplate, various |
| #-0.8 | Standard Column 1 | FeatheredBeams, various |
| #-0.9 | Slight more left | Various |
| #-1 | Medium left (notecolumn 2) | Various |
| #-1.2 | More left | Various |
| #-1.4 | Column 1 adjustment | Various |
| #-1.5 | Column 1 adjustment | Various |
| #-1.6 | More left | Various |
| #-1.7 | More left | Various |
| #-1.8 | Far left (notecolumn 2) | Various |
| #-2 | Very far left | Various |
| #-2.5 | Extreme left | Various |

### NoteColumn via \tweak (chord spreading)

| Value | Context | Source Files |
|-------|---------|-------------|
| #0, #2, #4, #6 | Horizontal spread of chord notes | PitchCell files, Cello_E2_cell, Viola_B3_cell |

> Used to spread chord notes horizontally for cell/cluster notation.

---

## 15. Layout & Spacing

### proportionalNotationDuration

| Value | Status | Context | Source Files |
|-------|--------|---------|-------------|
| 1/8 | Variant | Tightest (commented) | sf004, M-series |
| **1/13** | **CURRENT DEFAULT** | Tight spacing | PizzMotive001 |
| 1/16 | Variant | Medium-tight | sf004_withStaffLines |
| 1/20 | Variant | Medium | e4_e5_b4cluster |
| 1/24 | Variant | Medium-wide | PizzicatoStorm |
| 1/28 | Previous default | Was project standard | StartingTemplate, MasterTemplate, most older files |
| 1/32 | Variant | Wide | Huebler |
| 1/35 | Variant | Very wide | grace note clusters |
| 1/40 | Variant | Very wide | Lachenmann |
| 1/56 | Variant | Widest found | Various |

**Decision History:**
- Oldest standard: **1/28** (most common across all files)
- ASB-073: Changed to **1/13** for PizzMotive001 (tighter spacing)
- Comment in files: "smallest space quintuplet or 5*4" refers to 1/20

### layout-set-staff-size

| Value | Context | Source Files |
|-------|---------|-------------|
| 18 | Smaller staves (action notation, multi-staff) | PizzicatoStorm, Huebler |
| **20** | **CURRENT DEFAULT** | Standard | Most files |
| 30 | Larger | Various |
| 33 | Largest found | grace note clusters |

### indent

| Value | Context | Source Files |
|-------|---------|-------------|
| **-0.9** | **CURRENT DEFAULT** | Slight negative (notation starts left) | StartingTemplate, MasterTemplate |
| 0 | No indent | Most older files |
| -1.5 | More negative | Various |
| 12\mm | For instrument names | Various |
| 15\mm | For instrument names | Huebler |
| 18\mm | For instrument names | PizzicatoStorm |

### short-indent

| Value | Context | Source Files |
|-------|---------|-------------|
| 8\mm | Multi-staff subsequent systems | PizzicatoStorm |

### SpacingSpanner

| Setting | Value | Status | Source Files |
|---------|-------|--------|-------------|
| uniform-stretching | ##t | Commented in most | proportional spacing, sf004 |
| strict-note-spacing | ##t | Commented in most | proportional spacing, grace note clusters |
| strict-grace-spacing | ##t | Commented everywhere | grace note clusters |

### Score.tempoHideNote

| Value | Context | Source Files |
|-------|---------|-------------|
| ##t | Hide tempo marking from display | ILL20231216, grace note clusters |

---

## 16. Paper Dimensions

### Paper Width Presets

| Width | Context / Notation Type |
|-------|------------------------|
| 9\mm | Bartók pizz (single note) |
| 11-22\mm | Various small notation cells |
| 23\mm | Crescendo glissando |
| 50\mm | PizzicatoStorm |
| 70-80\mm | Vibrato |
| 100-140 (unitless) | Older medium files |
| 180-220 (unitless) | Older large files |
| 1450-3885 (unitless) | Full-score width (px-per-beat calculation) |

### Paper Height Presets

| Height | Context |
|--------|---------|
| 20-25\mm | Small notation (glissando, crescendo) |
| 40\mm | Vibrato |
| 100 (unitless) | ILL, grace note clusters |
| 500 (unitless) | Standard tall page for development |

### Margin Defaults

Most files use:
```lilypond
top-margin = 0\mm (or 5)
bottom-margin = 0\mm (or 10)
left-margin = 1\mm (or 0)
right-margin = 0\mm (or 1)
```

### system-system-spacing

Standard values across most files:
```lilypond
#'((basic-distance . 15)
    (minimum-distance . 8)
    (padding . 1 or 2)
    (stretchability . 60))
```

| Parameter | Variants Found |
|-----------|---------------|
| basic-distance | 8, 15 |
| minimum-distance | 6, 8 |
| padding | 1, 2 |
| stretchability | 60 |

---

## 17. Staff Visibility

### stopStaff / startStaff Pattern

Used to hide/show staff lines mid-piece. Found in col legno ricochet, M2a_jete, two handed pizz, and commented in many files.

**To hide staff and notation elements:**
```lilypond
\stopStaff
\override NoteHead.no-ledgers = ##t
\override Stem.transparent = ##t
\override TupletBracket.bracket-visibility = ##f
\override TupletNumber.transparent = ##t
\override Staff.Clef.transparent = ##t
\override Staff.BarLine.transparent = ##t
```

**To restore:**
```lilypond
\startStaff
\override NoteHead.no-ledgers = ##f
\override Stem.transparent = ##f
\override TupletBracket.bracket-visibility = ##t
\override TupletNumber.transparent = ##f
\override Staff.Clef.transparent = ##f
\override Staff.BarLine.transparent = ##f
```

### hideNotes / unHideNotes

| Usage | Source Files |
|-------|-------------|
| `\hideNotes r8 \unHideNotes` | Invisible spacer rests | grace note clusters |
| `\once \hideNotes` | Hide single note | Various |

---

## 18. Clef Overrides

### Per-instance clef sizing

| Setting | Value | Source Files |
|---------|-------|-------------|
| `Staff.Clef.font-size` | #-4 | Various |
| `Staff.Clef.X-extent` | `#'(0 . 1.2)` | Various |
| `Staff.Clef.Y-extent` | `#'(-1.5 . 1.5)` | Various |
| `Staff.Clef.stencil` | ##f | Completely remove clef glyph |
| `Staff.Clef.transparent` | ##t / ##f | Toggle visibility | stopStaff/startStaff blocks |

---

## 19. Bar Numbers & Bar Lines

### Score.BarNumber.break-visibility

| Value | Status | Source Files |
|-------|--------|-------------|
| **##(#f #f #f)** | **CURRENT DEFAULT** | Hide all bar numbers | All files |

> Format: `#(end-of-line middle-of-line beginning-of-line)`

### BarLine

| Setting | Value | Source Files |
|---------|-------|-------------|
| `\omit BarLine` | Standard hide (in \with) | Most files |
| `BarLine.stencil = ##f` | Alternative hide method | Various |
| `Staff.BarLine.transparent = ##t` | Toggle hide | stopStaff blocks |
| `\undo \omit Staff.BarLine` | Restore bar lines | Various |

---

## 20. System Brackets

| Setting | Value | Source Files |
|---------|-------|-------------|
| `SystemStartBar.thickness` | #0.5 | PizzicatoStorm |
| `SystemStartBracket.collapse-height` | #1 | PizzicatoStorm |
| `SystemStartBracket.padding` | #0.3 | PizzicatoStorm |
| `SystemStartBracket.thickness` | #0.5 | PizzicatoStorm |

> Used only in multi-staff scores (PizzicatoStorm with 3 staves).

---

## 21. Instrument Names

| Setting | Value | Source Files |
|---------|-------|-------------|
| `instrumentName` | `\markup { ... }` | PizzicatoStorm, Huebler |
| `instrument-name-font-size` | -3, -6 | Scheme variables |
| `instrument-name-padding` | -1, -2.5 | Scheme variables |
| `InstrumentName.font-size` | #-1 | PizzicatoStorm |
| `InstrumentName.padding` | #instrument-name-padding | PizzicatoStorm |

> Font: "Crimson Pro Light Italic" used for all instrument names.

---

## 22. Feathered Beams

**Technique:** Beams that gradually change spacing (accelerando/ritardando effect).

| Setting | Value | Source Files |
|---------|-------|-------------|
| `Beam.grow-direction` | `#RIGHT` (accel) or `#LEFT` (rit) | FeatheredBeams_draft.ly |
| `\featherDurations` | `#(ly:make-moment 1/2)` | FeatheredBeams_draft.ly |

**Associated settings used with feathered beams:**
```lilypond
\override NoteHead.font-size = #-6
\override Stem.details.beamed-lengths = #'(4.5)
\override Stem.details.lengths = #'(5.5)
\override Hairpin.minimum-length = #0.1
\once \override DynamicText.extra-spacing-width = #'(+inf.0 . -inf.0)
\override Hairpin.bound-details.left.padding = #0
\override Hairpin.extra-offset = #'(-0.7 . 0)
```

---

## 23. Pressure Wedge

**Technique:** Custom TextSpanner stencil creating a tapering polygon for bow pressure notation.

Found in: `M3_vla_accented_long_tone_bowpressure.ly`

| Parameter | Value | Description |
|-----------|-------|-------------|
| start-thick | 1.4 | Thickness at start (max pressure) |
| end-thick | 0.1 | Thickness at end (normal) |
| TextSpanner.padding | #3 | Height above staff |
| TextSpanner.bound-details.left.padding | #0 | Start alignment |
| TextSpanner.bound-details.right.padding | #0 | End alignment |

**Associated text markup:**
- `"max. pressure"` — Crimson Pro Light Italic, fontsize -6
- `"ord."` — return to normal
- `"molto premuto (jeté)"` — Crimson Pro Light Italic, fontsize -8

---

## 24. Special Notehead Styles

| Style | Syntax | Meaning | Source Files |
|-------|--------|---------|-------------|
| Cross (X) | `NoteHead.style = #'cross` | Col legno battuto, indefinite pitch, noise | col legno ricochet, Crumb, Lachenmann, Huebler |
| Harmonic (diamond) | `NoteHead.style = #'harmonic` | Natural harmonics, harmonic touch | Huebler, MasterTemplate |
| Block (filled box) | Custom stencil via `ly:text-interface::print` | Col legno battuto block | MasterTemplate |
| Arrow down | Custom Scheme `arrow-down-notehead` | Bow direction / fingering action | PizzicatoStorm |
| Arrow up | Custom Scheme `arrow-up-notehead` | Bow direction / fingering action | PizzicatoStorm |
| Default | `NoteHead.style = #'default` | Revert to normal | Various |

> Use `\revert NoteHead.style` to return to default after changing style.

---

## 25. Arpeggio

| Command | Effect | Source Files |
|---------|--------|-------------|
| `\arpeggioArrowDown` | Down-strum arrow on arpeggio | QuasiGuitarra_Strum_final.ly |
| `\arpeggioArrowUp` | Up-strum arrow on arpeggio | QuasiGuitarra_Strum_final.ly |
| `\arpeggio` | Arpeggio marking on chord | QuasiGuitarra_Strum_final.ly |

---

## 26. Scheme Definitions

### Functions

| Name | Purpose | Source Files |
|------|---------|-------------|
| `custom-staff-lines` | Parameterized staff line stencil | MasterTemplate, StartingTemplate |
| `make-custom-staff-stencil` | Per-staff width function | PizzicatoStorm |
| `build-vibrato-stencil` | Cubic Bézier vibrato wave | MasterTemplate, Vibrato templates |
| `\vibrato` (music function) | Wraps vibrato stencil | MasterTemplate |
| `flatten-tuplet-bracket` | Forces flat tuplet brackets | MasterTemplate, StartingTemplate, PizzMotive001 |
| `arrow-down-notehead` | Custom down-arrow notehead | PizzicatoStorm |
| `arrow-up-notehead` | Custom up-arrow notehead | PizzicatoStorm |

### Variables

| Name | Values Found | Source Files |
|------|-------------|-------------|
| `staff-line-width-mm` | 2.4, 10 | MasterTemplate, StartingTemplate |
| `instrument-name-font-size` | -3, -6 | PizzicatoStorm |
| `instrument-name-padding` | -1, -2.5 | PizzicatoStorm |
| `pluck-stem-length` | 12 | PizzicatoStorm |
| `pluck-stem-shorten` | -2 | PizzicatoStorm |
| `pluck-stem-bottom` | 0 | PizzicatoStorm |
| `pluck-stem-top` | 13 | PizzicatoStorm |
| `arrow-notehead-y-offset` | 0.5 | PizzicatoStorm |
| `lh-pluck-staff-width` | 2.9 | PizzicatoStorm |
| `lh-fingering-staff-width` | 2.9 | PizzicatoStorm |
| `rh-pluck-staff-width` | 2.9 | PizzicatoStorm |

### Markup Commands

| Name | Purpose | Source Files |
|------|---------|-------------|
| `(nail layout props)` | Fingernail pizzicato text | Lachenmann_MultiAttack |

---

## 27. Tweak Reference (per-instance)

### Glissando extra-offset (Y values for same-staff-line)

| Y Value | Context |
|---------|---------|
| 0 | Default (different staff lines) |
| 0.1 | Slight offset |
| 0.2 | Small offset |
| 0.3 | Standard same-line offset |
| 0.4 | Larger offset |

### Dynamic extra-offset (via \tweak)

| Value | Context |
|-------|---------|
| `(0 . 0)` | Default position |
| `(0 . 2)` | Raise dynamic |
| `(0 . 2.6)` | Raise dynamic more |

### Open String "o" Positioning

| Value | Context | Source |
|-------|---------|-------|
| `-\tweak extra-offset #'(0 . -9)` | Below bracket | PizzMotive001 |

### "pizz." Text Positioning

| Value | Context | Source |
|-------|---------|-------|
| `-\tweak extra-offset #'(-2 . 0.8)` | Left and up | PizzMotive001 |

---

## 28. Microtonal Pitch Syntax

LilyPond with `\language "english"` supports microtonal accidentals via pitch suffixes.

### Suffix Reference

| Accidental | Suffix | Example | Sounds as |
|------------|--------|---------|----------|
| Natural | (none) | `c'` | C4 |
| Sharp | `s` | `cs'` | C#4 |
| Flat | `f` | `cf'` | Cb4 |
| Double sharp | `ss` | `css'` | C##4 |
| Double flat | `ff` | `cff'` | Cbb4 |
| Quarter sharp | `qs` | `cqs'` | C+4 (quarter-tone up) |
| Quarter flat | `qf` | `cqf'` | Cd4 (quarter-tone down) |
| Three-quarter sharp | `tqs` | `ctqs'` | C#+4 |
| Three-quarter flat | `tqf` | `ctqf'` | Cb-d4 |

### Octave Marks

| Mark | Octave | Middle C reference |
|------|--------|-------------------|
| `c,,,` | C0 | 4 below |
| `c,,` | C1 | 3 below |
| `c,` | C2 | 2 below |
| `c` | C3 | 1 below |
| `c'` | C4 | Middle C |
| `c''` | C5 | 1 above |
| `c'''` | C6 | 2 above |
| `c''''` | C7 | 3 above |

### Treble Clef Ledger Line Reference

| Position | Pitch | LilyPond |
|----------|-------|----------|
| Space above 3rd ledger up | F6 | `f'''` |
| 3rd ledger line up | E6 | `e'''` |
| Space above 2nd ledger up | D6 | `d'''` |
| 2nd ledger line up | C6 | `c'''` |
| Space above 1st ledger up | B5 | `b''` |
| 1st ledger line up | A5 | `a''` |
| 1st space above staff | G5 | `g''` |
| Top line (F5) | F5 | `f''` |
| ... staff ... | ... | ... |
| Bottom line (E4) | E4 | `e'` |
| 1st space below staff | D4 | `d'` |
| 1st ledger line down | C4 | `c'` |
| Space below 1st ledger | B3 | `b` |
| 2nd ledger line down | A3 | `a` |
| Space below 2nd ledger | G3 | `g` |
| 3rd ledger line down | F3 | `f` |
| Space below 3rd ledger | E3 | `e` |

**Source files using microtonal syntax:** pitches_final.ly, pitches_draft.ly, PitchCell_final.ly, Cello_E2_cell.ly, Viola_B3_cell.ly, all Gliss-*.ly files with quarter-tone pitches, BartokPizz-treble-Ftqs6.ly, BartokPizz-treble-Eqf3.ly

---

## 29. Bartók Pizzicato

**Technique:** Snap pizzicato — string pulled vertically and released to snap against fingerboard.

### Template Structure

Based on `BartokPizz-Violin-G5.ly` and test files (Feb 20, 2026).

| Setting | Value | Notes |
|---------|-------|-------|
| `\snappizzicato` | Articulation mark | Circle-with-line symbol above note |
| Note duration | `16` (sixteenth) | Single short note |
| `Stem.transparent` | `##f` | Stems visible for pizz |
| `NoteColumn.X-offset` | `#-0.8` | Shift notation left |
| `NoteHead.font-size` | `#-2` | Standard project size |
| `DynamicText.font-size` | `#-6` | Older technique-file size |
| `Stem.details.beamed-lengths` | `#'(5.5)` | Technique-file stem length |
| `Stem.details.lengths` | `#'(6.5)` | Technique-file stem length |
| `Accidental.font-size` | `-4` | Technique-file size |
| Staff line width | `1.2` mm | Narrow for single-note notation |

### Paper Dimensions

| Pitch Range | paper-width | paper-height | Rationale |
|-------------|-------------|-------------|----------|
| On staff (no ledger lines) | 9\mm | 23\mm | Original BartokPizz template |
| 1-2 ledger lines | 9-11\mm | 25\mm | Slight height increase |
| 3 ledger lines + microtonal | 11\mm | 30\mm | Extra height for snap pizz symbol + dynamic + ledger lines; extra width for accidental glyph |

### Naming Convention

`BartokPizz-[clef]-[PitchName].ly`

Examples:
- `BartokPizz-treble-B4.ly` — B natural, middle line
- `BartokPizz-treble-Ftqs6.ly` — F three-quarter-sharp, 3 ledger lines up
- `BartokPizz-treble-Eqf3.ly` — E quarter-flat, 3 ledger lines down
- `BartokPizz-Violin-G5.ly` — original template (older naming)

### Parameters (for future automation)

| Parameter | Type | Example Values |
|-----------|------|---------------|
| Pitch | LilyPond pitch string | `g''`, `ftqs'''`, `eqf`, `b'` |
| Dynamic | LilyPond dynamic | `\fff`, `\ff`, `\mf`, `\pp` |
| Clef | LilyPond clef | `treble`, `alto`, `bass` |

### Source Files

- `BartokPizz-Violin-G5.ly` — original template
- `BartokPizz-treble-Ftqs6.ly` — test: 3 ledger lines up, three-quarter sharp
- `BartokPizz-treble-Eqf3.ly` — test: 3 ledger lines down, quarter flat
- `BartokPizz-treble-B4.ly` — test: middle line, no accidental
- `bartok pizz.ly` — older technique study
- `bartok_pizz_secco.ly` — secco variant

*(Section added: Feb 20, 2026)*

---

## Appendix: Standard \omit Block

Every file uses some combination of these in `\new Staff \with {}`:

```lilypond
\omit TimeSignature
\omit BarLine
\omit Clef          % (clef still set for pitch placement)
\omit KeySignature
\omit LedgerLineSpanner  % (only in some files)
```

---

## Appendix: Files Scanned

**Total: 433 .ly files** in `lilypond_code/` directory.

Key file categories:
- **Templates:** MasterTemplate.ly, StartingTemplate.ly, lyTemplate*.ly, sf004_ly_template*.ly, ly_template.ly, proportional spacing template.ly
- **Automated instances:** Gliss-*.ly, Vib-*.ly, BartokPizz-*.ly, Crescendo_Gliss-*.ly, CrescendoSinglePitch-*.ly
- **M-series (movements):** M1-M9 files (violaCres, vln1and2Cres, jete, bowOverpressure, BartokPizz, CLBflutter)
- **Technique studies:** grace note clusters.ly, featheredbeams.ly, FeatheredBeams_draft/final.ly, col legno battuto ricochet.ly, two handed pizz.ly, bartok pizz.ly, bartok_pizz_secco.ly, e4_e5_b4cluster.ly
- **Reference studies:** Crumb_BlackAngels_ThimblePick_final.ly, Huebler_ActionNotation_TwoHands_final.ly, Lachenmann_MultiAttack_final.ly, Ligeti_SQ2_MechanicalPizz_final.ly, QuasiGuitarra_Strum_final.ly, PizzicatoStorm.ly/final.ly
- **Cells:** PitchCell*.ly, Cello_E2_cell.ly, Viola_B3_cell.ly
- **ILL files:** ILL20231216.ly, ill20240130*.ly
- **Pizz motives:** PizzMotive001_Cello_Draft/Render.ly
- **Two-handed pizz finals:** TwoHandedPizz-Cello-C2_final.ly, TwoHandedPizz-Viola-C3_final.ly

---

*Registry created: Feb 20, 2026*
*Source: Automated extraction from all 433 .ly files — 771 unique setting lines*
*Raw scan data: docs/scan_data/_scan_overrides.txt, _scan_set.txt, _scan_define.txt, _scan_layout.txt, _scan_misc.txt*
