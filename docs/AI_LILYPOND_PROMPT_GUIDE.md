# LilyPond Notation — Prompt Guide

**For:** User prompting + AI (Cascade) self-reference  
**Created:** Feb 19, 2026 (ASB-070)

---

## File Naming Convention

### Pattern
`{MotiveName}{Number}_{Instrument}_{Descriptor}_{Version}.ly`

| Part | Example | Required? |
|------|---------|----------|
| **Motive name** | PizzMotive | Yes |
| **Number** | 001, 002, ... | Yes (zero-padded 3 digits) |
| **Instrument** | Cello, Viola, Violin1, Violin2 | Yes |
| **Descriptor** | (optional label) | No |
| **Version** | Draft or Render | Yes |

Examples:
- `PizzMotive001_Cello_Draft.ly` / `PizzMotive001_Cello_Render.ly`
- `PizzMotive002_Viola_Arco_Draft.ly` / `PizzMotive002_Viola_Arco_Render.ly`

### Draft vs Render Convention
**Always create two files** for every new LilyPond notation:

| File | Purpose |
|------|---------|
| **Draft** | Working copy — edited by Cascade in the IDE |
| **Render** | Copy used in Frescobaldi for compilation — starts empty, user pastes from Draft when ready |

The Render file starts blank. The user copies Draft content into Render when they want to compile in Frescobaldi.

---

## How to Start Creating New Notation

### What to Say

> **"Create a new LilyPond file for [description]"**

Examples:
- "Create a new LilyPond file for a glissando from A4 to Ab4 in treble clef with dynamic f"
- "Create a new LilyPond file for a Bartók pizz on Ds5 in treble clef, fff"
- "Create a new LilyPond file for a crescendo from ppp to f with glissando, As4 to A4, treble"
- "Create a new LilyPond file for vibrato wide-to-narrow on C4, treble, fff to f"

### What Information to Include

| Parameter | Examples | Required? |
|-----------|----------|-----------|
| **Technique** | glissando, crescendo, vibrato, bartók pizz, col legno | Yes |
| **Pitch(es)** | C4, C#4, Bb3, C+4 (quarter sharp), Cd4 (quarter flat) | Yes |
| **Clef** | treble, alto (C clef), bass | Yes |
| **Dynamic(s)** | ppp, pp, p, mp, mf, f, ff, fff | Usually |
| **Direction** (for vibrato) | wide-to-narrow, narrow-to-wide | If vibrato |
| **Hairpin direction** | crescendo (\<), decrescendo (\>) | If hairpin |
| **Text annotations** | "Non-Vib", "secco", custom text | Optional |
| **Staff line width** | short, medium, wide (or mm value) | Optional (default: 2.4mm) |

### Pitch Notation Quick Reference

| You Write | Meaning | LilyPond |
|-----------|---------|----------|
| C4 | C natural, octave 4 | c' |
| C#4 | C sharp | cs' |
| Cb4 | C flat | cf' |
| Bb3 | B flat, octave 3 | bf |
| C+4 | C quarter-sharp | cqs' |
| Cd4 | C quarter-flat | cqf' |
| C#+4 | C three-quarter-sharp | ctqs' |
| Cbd4 | C three-quarter-flat | ctqf' |

---

## Adjusting Existing Notation

### Common Adjustments — What to Say

| You Want | What to Say |
|----------|-------------|
| Bigger/smaller note heads | "Make noteheads bigger" or "Set notehead size to -1" |
| Wider/narrower hairpin | "Make the hairpin wider" or "Set hairpin height to 0.7" |
| Move hairpin up/down | "Move the hairpin down" or "Set hairpin Y-offset to -0.5" |
| Longer/shorter hairpin | "Make the hairpin longer on the right" |
| Show/hide stems | "Show stems" or "Hide stems" |
| Bigger/smaller dynamics | "Make dynamics bigger" or "Set dynamic size to -6" |
| Wider/narrower staff lines | "Make staff lines wider" or "Set staff line width to 2.8" |
| Move a note left/right | "Move the first note further left" |
| Move accidental closer | "Move the accidental closer to the notehead" |
| Change paper size | "Make it wider" or "Set paper width to 19mm" |
| Same-staff-line glissando | "The glissando is between notes on the same staff line" |
| Add Non-Vib text | "Add Non-Vib text above" |
| Add secco text | "Add secco text below" |
| Different font | "Use Crimson Pro Light Italic" (project standard) |
| Smaller text | "Make the text annotations smaller" |
| Push dynamics away from ledger lines | "The notes have ledger lines below, push dynamics down" |

---

## Available Techniques (with Prompt Templates)

### 1. Pure Glissando (two notes, glissando line)
> "Create a LilyPond glissando from **[pitch1]** to **[pitch2]** in **[clef]** clef with dynamic **[dyn]**"

Optional: "same staff line" (adds Y-offset to glissando line)

### 2. Crescendo/Decrescendo with Glissando
> "Create a LilyPond crescendo from **[dyn1]** to **[dyn2]** with glissando from **[pitch1]** to **[pitch2]** in **[clef]** clef, with Non-Vib and secco text"

### 3. Crescendo/Decrescendo Single Pitch
> "Create a LilyPond crescendo from **[dyn1]** to **[dyn2]** on **[pitch]** (half note) in **[clef]** clef"

### 4. Vibrato (Wide → Narrow)
> "Create a LilyPond vibrato wide-to-narrow on **[pitch]** in **[clef]** clef, **[dyn1]** to **[dyn2]** decrescendo"

### 5. Vibrato (Narrow → Wide)
> "Create a LilyPond vibrato narrow-to-wide on **[pitch]** in **[clef]** clef, **[dyn1]** to **[dyn2]** crescendo"

### 6. Bartók Pizzicato
> "Create a LilyPond Bartók pizz on **[pitch]** in **[clef]** clef, **[dyn]**"

Note: This uses visible stems and snap pizzicato articulation.

### 7. Col Legno Battuto
> "Create a LilyPond col legno battuto, **[dyn]**"

Note: Uses RhythmicStaff with block notehead, single staff line.

---

## AI (Cascade) Self-Reference — What to Do When Asked

### When user asks for new notation:

1. **Start from `StartingTemplate.ly`** — copy it, rename for the notation
2. **Check `MasterTemplate.ly`** for technique-specific settings:
   - Hairpin: Section 5B → HAIRPIN SETTINGS + Example A or B
   - Glissando: Example A or H
   - Vibrato: Section 0 (Scheme function) + Section 5B (vibrato overrides) + Example D or E
   - Bartók pizz: Example C
   - Col legno: Example F
   - Harmonics: Example G
3. **Adjust paper dimensions** based on notation type (see presets in StartingTemplate.ly header)
4. **Adjust staff-line-width-mm** based on notation type
5. **Set the clef** (still needed for pitch placement even though hidden)
6. **Write the notation** in the marked area

### Key Files to Reference:

| File | Purpose |
|------|---------|
| `lilypond_code/StartingTemplate.ly` | Clean base — copy this to start |
| `lilypond_code/MasterTemplate.ly` | Full settings repository — grab technique-specific code from here |
| `docs/LILYPOND_MASTER_TEMPLATE_GUIDE.md` | Documentation of all settings, groups, and variations |
| `docs/AI_LILYPOND_PROMPT_GUIDE.md` | This file — prompt templates and AI workflow |

### Pitch Conversion (User → LilyPond):

| User | LilyPond | Octave marks |
|------|----------|-------------|
| C4 | c' | c, = C2, c = C3, c' = C4, c'' = C5, c''' = C6 |
| C#4 | cs' | Sharp = s suffix |
| Bb3 | bf | Flat = f suffix |
| C+4 | cqs' | Quarter-sharp = qs suffix |
| Cd4 | cqf' | Quarter-flat = qf suffix |
| C#+4 | ctqs' | Three-quarter-sharp = tqs suffix |
| Cbd4 | ctqf' | Three-quarter-flat = tqf suffix |

### Common Override Patterns:

```lilypond
% Move note horizontally
\once \override NoteColumn.X-offset = #-1.5

% Move accidental closer to note
\once \override Accidental.extra-offset = #'(0.3 . 0)

% Position any element (dynamic, text, hairpin, glissando)
-\tweak extra-offset #'(X . Y)    % X=right(+)/left(-), Y=up(+)/down(-)

% Shorten/lengthen hairpin ends
-\tweak shorten-pair #'(left . right)  % positive=shorter, negative=longer

% Glissando padding
-\tweak bound-details.left.padding #0.4
-\tweak bound-details.right.padding #-0.1

% Text markup (project standard font)
^\markup {
  \override #'(font-name . "Crimson Pro Light Italic")
  \fontsize #-6
  "Your Text"
}
% ^ = above staff, _ = below staff
```

### Paper Width Guidelines:

| Notation Content | Suggested paper-width |
|-----------------|----------------------|
| Single note | 9mm |
| Two notes (tight) | 17mm |
| Two notes (medium) | 19mm |
| Two notes + hairpin | 23mm |
| Extended (vibrato) | 80mm |

### Checklist Before Compiling:

- [ ] Clef set correctly (even though hidden)
- [ ] Paper dimensions appropriate for notation content
- [ ] Staff line width set (staff-line-width-mm)
- [ ] Stems: transparent (##t) or visible (##f)?
- [ ] Note column X-offset set to push notes left from default position
- [ ] line-width in \layout matches or exceeds paper-width

---

## Version History

| Date | Change | ASB# |
|------|--------|------|
| Feb 19, 2026 | Initial creation | ASB-070 |
