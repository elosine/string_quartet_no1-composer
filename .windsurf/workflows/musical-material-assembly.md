---
description: Musical Material Assembly - step-by-step process for creating any new notation assembly (sustained tones, one-shots, etc.)
---

# Musical Material Assembly

Use this workflow when creating **any** new notation type in the SVG assembly system — sustained tones, one-shots, or future categories.

A **Musical Material Assembly** is a complete notation object that flows through: SVG assembly engine → server endpoint → GC + SVG + MIDI insertion → bundle management.

## Categories

- **Sustained tone assemblies** — multi-element, duration-based (single pitch, glissando)
- **One-shot assemblies** — single-event articulations (bartók pizz, bow overpressure)
- Future categories as needed

---

## Step 1: Define the Notation Type

Gather and organize this information before prompting.

**⚡ Before filling in the MIDI spec below, consult `docs/MIDI_MUSIC_GENERATION.md` §19 (MIDI Architecture Standards) for established patterns on pitch bend segmentation, pitch/volume coupling, volume control method, channel bank selection, and timing database usage.**

```
NOTATION TYPE NAME: ___
CATEGORY: sustained-tone / one-shot / ___
PROFILE NAME (code): PROFILES.___ (e.g., bowOverpressureAccent)

MIDI SPEC:
  CC0 value: ___
  Default velocity: ___
  Note duration: ___ (ms or ticks)
  Quarter-tone support: yes / no

INSTRUMENT RANGES:
  Violin: ___ – ___ (MIDI note numbers)
  Viola:  ___ – ___
  Cello:  ___ – ___

STEM/DIRECTION RULES: ___ (e.g., "B4+ down, A4- up" or "always up" or "none")

SVG COMPONENTS (list all visual elements):
  - Notehead type: longTone / shortTone / square / other: ___
  - Stem: yes/no, direction rule: ___
  - Accidentals: yes/no
  - Ledger lines: yes/no
  - Staff lines: yes/no (width: ___ ss)
  - Articulation marks: ___ (above/below, which glyphs)
  - Dynamic marking: ___ (variable from UI / fixed always-shown / none)
  - Hairpin: yes/no
  - Text annotations: ___ (e.g., "Non-Vib", "secco")
  - Glissando line: yes/no
  - New glyphs needed: ___ (list with source SVG/template files)

UI INPUTS:
  - Track, Clef, Instrument, Pitch (manual/random), Time
  - Dynamic dropdown / Velocity input / both / neither
  - Other inputs: ___

REFERENCE FILES:
  - LilyPond templates: ___
  - Rendered SVG templates: ___
  - Existing similar assembly: ___

GC PARAMS:
  - Color: ___
  - Stiffness/Damping/Ictus/Duration: ___ (or "same as ___")

BUNDLE: yes / no
POSITIONING (for score insertion):
  - anchorElement: ___
  - heightFraction: ___
  - offsetYFraction: ___
```

---

## Step 2: Extract & Register Glyphs

For each **new glyph** not already in `svg_component_library.json`:

1. Identify the glyph path in the rendered SVG template
2. Note the `transform` scale values (e.g., `scale(0.0025, -0.0025)`)
3. Extract the `d` attribute (path data)
4. Add entry to `lilypond_code/svg_assembly/svg_component_library.json`
5. Run bbox computation:
   - **Path glyphs:** `node svg_bbox.js populate`
   - **Text elements:** Open `measure_text_bbox.html` in browser, measure, paste bbox

### Key reference files
- Component library: `lilypond_code/svg_assembly/svg_component_library.json`
- Bbox calculator: `lilypond_code/svg_assembly/svg_bbox.js`
- Text bbox tool: `lilypond_code/svg_assembly/measure_text_bbox.html`

---

## Step 3: Create Assembly Profile + Function

In `lilypond_code/svg_assembly/assemble_svg.js`:

1. **Create profile:** `PROFILES.myType = createProfile({ ... })`
   - Notation-specific values only (noteX, staffWidth, etc.)
   - Override LAYOUT_RULES only if this type needs an exception
2. **Write generator functions** for any new element types (e.g., `generateSquareNotehead()`)
3. **Write assembly function:** `assembleMyType(params)` returning `{ svg, metadata }`
   - Use `profile.rules.*` for all spacing
   - Include debug overlay support (`debug: true`)
   - Return positioning metadata for score placement
4. **Add CLI test cases** in the `switch` block at bottom of file
5. **Export** new functions in `module.exports`

### Key reference
- Existing profiles: `PROFILES.sustainedToneSinglePitch`, `PROFILES.sustainedToneGlissando`
- Existing assembly functions: `assembleSustainedTone()`, `assembleSustainedToneGlissando()`
- Layout rules: `LAYOUT_RULES` (~line 195)

---

## Step 4: Generate Test SVGs + Visual Review

```powershell
node assemble_svg.js [test-command]
```

Run from `lilypond_code/svg_assembly/`. Open output SVGs in Inkscape to verify:
- Element spacing and alignment
- Ledger lines at extreme pitches
- Accidental variants
- Stem direction (if applicable)
- Debug overlay bboxes (blue=notehead, orange=accidental, red=dynamics, etc.)

**USER REVIEWS before proceeding to server/UI phases.**

---

## Step 5: Server Endpoint

In `server.js`:

1. New endpoint: `POST /api/svg-assembly/[type-name]`
2. Accept pitch, clef, and type-specific params
3. Call `pitchToStaffPosition()` and `pitchToAccidental()` for pitch conversion
4. Call the assembly function
5. Write SVG to disk, return `{ svgPath, metadata }`

---

## Step 6: UI Integration

In `public/index.html`:

1. **For one-shots:** Add to `OneShotUI` articulation dropdown + conditional fields
2. **For sustained tones:** Add to `CrescendoUI` or create new UI section
3. Wire Go button → server endpoint → GC creation → SVG insertion → MIDI generation
4. MIDI generation: CC0 value, velocity, duration, pitch bend (quarter-tone if needed)

---

## Step 7: Bundle System

1. Register bundle linking GC + SVG + MIDI snippet IDs
2. Unified drag (shift all 3 components)
3. Unified delete
4. Save/load via ScoreManager

---

## Step 8: Test End-to-End

1. Click Go → verify GC, SVG, and MIDI all appear in score
2. Save → reload → verify persistence
3. Drag bundle → verify all components move together
4. Delete bundle → verify all components removed

---

## Key Documentation References

| Doc | Location |
|-----|----------|
| SVG Assembly Engine guide | Memory: ASB-132 through ASB-137 |
| Layout Rules + Profile system | Memory: ASB-137 |
| SVG Positioning Metadata | Memory: SVG Positioning Metadata Architecture |
| Musical Material Workflow | `docs/MUSICAL_MATERIAL_WORKFLOW.md` |
| Bundle system pattern | Memory: ASB-109 (Bartók Pizz bundles) |
| LilyPond Settings Registry | `docs/LILYPOND_SETTINGS_REGISTRY.md` |
