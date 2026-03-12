# Notation Research

**Living document — collected research on notation symbols, techniques, and LilyPond implementation.**  
**Created:** Feb 19, 2026

---

## Laissez Vibrer / Let Ring — Symbols & Variants

### Standard: Open-Ended Tie (`\laissezVibrer`)
The most common "let ring" symbol. A short curved line (like a tie) extending to the right from the note, connecting to nothing. Widely used in:
- Percussion (vibraphone, marimba, timpani, piano with sustain pedal)
- String pizzicato (let the string continue vibrating)
- Any instrument where a note should decay naturally without damping

**LilyPond:** `c4\laissezVibrer`

Formatting can be tuned with `tie-configuration`:
```lilypond
\override LaissezVibrerTieColumn.tie-configuration =
  #`((-7 . ,DOWN) (-5 . ,DOWN) (-3 . ,UP) (-1 . ,UP))
```

### Variant: Arrowhead Tie (Let Ring →)
An open-ended tie with an arrowhead at the trailing end. **Legitimate notation practice**, primarily from the **percussion tradition** (vibraphone, marimba, timpani). Means "sustain indefinitely" or "let ring until naturally decayed."

**Origin/Usage:**
- Well-established in percussion notation
- Sometimes attributed to George Crumb, but Crumb's *Black Angels* (1970) primarily uses standard l.v. ties; arrows in his scores are more commonly used for directional glissandi and bowing direction
- Penderecki and the Polish school use arrows extensively but mainly for pitch bend direction and graphic contours
- Elaine Gould's *Behind Bars* documents the standard l.v. tie without arrowhead; the arrowhead variant is more of a composer-specific or percussion-tradition convention
- **Verdict: widely recognized, safe to use — any performer will understand**

**LilyPond implementation** (TextSpanner with arrow):
```lilypond
\override TextSpanner.style = #'line
\override TextSpanner.bound-details.left.text = #""
\override TextSpanner.bound-details.right.arrow = ##t
\override TextSpanner.bound-details.right.padding = #-1
c,16\open\startTextSpan s16\stopTextSpan
```

### Variant: "l.v." Text
Simply the text abbreviation "l.v." (laissez vibrer) placed above or below the note. Common in orchestral parts, especially when the open tie might be ambiguous.

**LilyPond:**
```lilypond
c4^\markup { \italic "l.v." }
```

### Combined Approach
For maximum clarity, combine the standard l.v. tie with text or an arrow:
```lilypond
c4\laissezVibrer^\markup { \italic "l.v." }
```

---

## Open String Notation

### Chosen: `^\markup { \teeny "o" }` ← PROJECT STANDARD
Text letter "o" in teeny size, placed above the note. Clean and unambiguous at small notehead sizes.

**LilyPond:** `c,4^\markup { \teeny "o" }`

### Other Options (not currently used)

| Command | Description | Font |
|---------|-------------|------|
| `^\markup { \teeny "o" }` | Text "o", teeny ← **CHOSEN** | Text font |
| `\flageolet` | Slightly larger circle | Feta (music font) |
| `\open` | Standard small circle | Feta (music font) |
| `^\markup { \teeny "o" }` | Text letter "o", very small | Text font |
| `^\markup { \musicglyph #"scripts.open" }` | Explicit Feta glyph reference | Feta |
| `^\markup { \circle \null }` | Drawn circle (geometric) | N/A |

**Note:** `\open` and `\flageolet` both produce circles but `\flageolet` is slightly larger and is more commonly associated with harmonic notation. For open strings, `\open` is the standard choice.

---

## Articulation Symbols Reference

### LilyPond Shorthand
| Shorthand | Name | Symbol |
|-----------|------|--------|
| `-.` | Staccato | dot |
| `--` | Tenuto | dash |
| `->` | Accent | > |
| `-!` | Marcato | ^ |
| `-^` | Marcato (alt) | ^ |
| `\open` | Open string | o |
| `\flageolet` | Harmonic | ◦ |
| `\snappizzicato` | Bartók pizz | ⊙ |
| `\laissezVibrer` | Let ring | →tie |
| `\downbow` | Down bow | ⊓ |
| `\upbow` | Up bow | V |

### Pizzicato Markings
- **"pizz."** — text markup, typically italic, placed above the staff at the first pizzicato note
- **"arco"** — text markup to return to bowing
- **Bartók pizzicato** (`\snappizzicato`) — snap the string against the fingerboard
- **Left-hand pizzicato** — indicated with `+` above the note

**LilyPond text markup (project standard):**
```lilypond
^\markup {
  \override #'(font-name . "Crimson Pro Light Italic")
  \fontsize #-4
  "pizz."
}
```

---

## Tuplet Notation

### Tuplet Ratios
```lilypond
\tuplet 3/2 { c8 d e }           % triplet: 3 in the space of 2
\tuplet 5/4 { c16 d e f g }      % quintuplet: 5 in the space of 4
\tuplet 6/4 { c16 d e f g a }    % sextuplet: 6 in the space of 4
\tuplet 7/4 { c16 d e f g a b }  % septuplet: 7 in the space of 4
```

### Project Standard Settings
```lilypond
% Flat bracket above notes, showing ratio (e.g., "5:4", "6:4"):
\override TupletBracket.bracket-visibility = ##t
\override TupletBracket.direction = #UP
\override TupletBracket.after-line-breaking = #flatten-tuplet-bracket
\override TupletBracket.padding = #0.5     % bracket height: lower = closer to notes
\override TupletNumber.text = #tuplet-number::calc-fraction-text
\override TupletNumber.font-size = #-5
```

### Individual Bracket Height
To override the height of a single tuplet bracket without affecting others:
```lilypond
\once \override TupletBracket.positions = #'(11.5 . 11.5)  % both values equal = flat
\tuplet 6/4 { ... }
```
The number is in half-staff-spaces from staff center. Lower value = closer to notes. Both values must be equal for a flat bracket.

### Scheme Function (required — define before \score block)
```lilypond
% Force tuplet brackets to be perfectly horizontal (flat).
#(define (flatten-tuplet-bracket grob)
   (let* ((pos (ly:grob-property grob 'positions))
          (max-pos (max (car pos) (cdr pos))))
     (ly:grob-set-property! grob 'positions (cons max-pos max-pos))))
```

### Alternative Approaches
```lilypond
% Hide numbers entirely (sf004 original style):
\override TupletNumber.visibility = ##f

% Manual per-tuplet ratio text:
\once \override TupletNumber.text = "7:4"

% Built-in ratio function (per-tuplet):
\once \override TupletNumber.text =
  #(tuplet-number::non-default-tuplet-fraction-text 5 2)

% Bracket padding (distance from notes — project default is 0.5):
\override TupletBracket.padding = #3

% Individual bracket height (per-tuplet):
\once \override TupletBracket.positions = #'(10 . 10)  % both values equal = flat

% Full-length bracket (extends to fill full duration):
\set tupletFullLength = ##t

% Hide everything:
\override TupletBracket.bracket-visibility = ##f
\override TupletNumber.stencil = ##f
```

---

## Staff Visibility — Stop/Start Pattern

From sf004 templates. Useful for hiding the staff mid-score while notes still play.

### Hide Staff
```lilypond
\stopStaff
\override NoteHead.transparent = ##t
\override NoteHead.no-ledgers = ##t
\override Script.transparent = ##t
\override Stem.transparent = ##t
\override TupletBracket.bracket-visibility = ##f
\override TupletNumber.transparent = ##t
\override Staff.Clef.transparent = ##t
\override Staff.BarLine.transparent = ##t
```

### Show Staff Again
```lilypond
\startStaff
\override NoteHead.transparent = ##f
\override NoteHead.no-ledgers = ##f
\override Script.transparent = ##f
\override Stem.transparent = ##f
\override TupletBracket.bracket-visibility = ##t
\override TupletNumber.transparent = ##f
\override Staff.Clef.transparent = ##f
\override Staff.BarLine.transparent = ##f
```

---

## Beam Slope (Flat Beams)

Force all beams to be perfectly flat/horizontal (no slope):
```lilypond
\override Beam.damping = #+inf.0
```

The `damping` property controls how much beam slope is reduced. Default is ~5. Setting to `+inf.0` forces zero slope. This is the native LilyPond property — no Scheme callback needed.

---

## Proportional Notation Duration Presets

Controls horizontal spacing between notes. Larger value = tighter spacing.

| Value | Spacing | Source |
|-------|---------|--------|
| `1/8` | Tightest | sf004 (commented) |
| `1/13` | Tight | PizzMotive001 (current) |
| `1/16` | Medium-tight | sf004 (active) |
| `1/20` | Medium-wide | sf004 (commented) |
| `1/28` | Wide | Earlier project templates |

```lilypond
\context {
  \Score
  proportionalNotationDuration = #(ly:make-moment 1/28)
}
```

---

## SpacingSpanner Options (from sf004)

Fine-tune note spacing behavior. All commented by default.

```lilypond
% Uniform stretching — all notes get equal spacing weight:
% \override SpacingSpanner.uniform-stretching = ##t

% Strict note spacing — notes align precisely to their duration:
% \override SpacingSpanner.strict-note-spacing = ##t

% Strict grace spacing — grace notes don't steal space:
% \override SpacingSpanner.strict-grace-spacing = ##t
```

---

## Line Arrows (from LilyPond snippets)

Arrows can be applied to TextSpanners and Glissandi.

### Glissando with Arrow
```lilypond
\override Glissando.bound-details.right.arrow = ##t
\override Glissando.arrow-length = #0.5
\override Glissando.arrow-width = #0.25
c4\glissando c'4
```

### TextSpanner with Arrow
```lilypond
\override TextSpanner.bound-padding = #1.0
\override TextSpanner.style = #'line
\override TextSpanner.bound-details.right.arrow = ##t
\override TextSpanner.bound-details.left.text = #"text"
\override TextSpanner.bound-details.right.padding = #0.6
c4\startTextSpan d e f\stopTextSpan
```

---

## Staff Size

```lilypond
% In \layout block:
#(layout-set-staff-size 20)  % default is 20 points
% Smaller values = smaller staff (and all attached elements)
```

---

## Z-Stem Notation — Unmeasured Tremolo / Pizzicato Tremolo

*(Research date: Feb 21, 2026)*

### What It Is

A **Z-shaped mark on the stem** of a note indicating **unmeasured tremolo** — "as fast as possible," with no specific rhythmic subdivision. Visually distinct from the standard 3-slash tremolo notation, which can be ambiguous (potentially read as measured 32nd notes, especially in slow tempi).

For **pizzicato tremolo**, the Z-stem indicates rapid unmeasured repeated plucking — a "buzz pizz" effect distinct from Bartók pizz (single snap) or standard pizz (single pluck).

### Variants (SMuFL Standard Music Font Layout)

SMuFL codifies four distinct unmeasured tremolo glyphs:

| Glyph Name | SMuFL Code | Origin | Description |
|---|---|---|---|
| **buzzRoll** | U+E22A (Tremolos range) | Percussion (snare drum) | Z shape — buzz/press roll. The percussion original. |
| **pendereckiTremolo** | U+E22B (Tremolos) + Stems range | Krzysztof Penderecki (~early 1960s) | Slightly different Z — introduced specifically for **strings**. Listed in both Tremolos and Stems ranges. |
| **Wieniawski unmeasured tremolo** | U+E22C / U+E22D (later U+E26C–E26D) | Henryk Wieniawski (19th c.) | Romantic-era variant, two glyphs (up/down stem). |
| **Stockhausen irregular tremolo** | U+E232 | Karlheinz Stockhausen | For irregular (not just fast) tremolo. |

The **Penderecki variant** (U+E22B) is the one most associated with contemporary string writing and the recommended choice for this project.

### Composers Who Use It

- **Krzysztof Penderecki** — Originated the string-specific Z-stem in the early 1960s (Polish school). Found throughout his string orchestra works (*Threnody to the Victims of Hiroshima*, *Polymorphia*, etc.). The definitive source.
- **Henryk Wieniawski** — Earlier variant from the Romantic virtuoso violin tradition.
- **Karlheinz Stockhausen** — His own variant for *irregular* tremolo.
- **Helmut Lachenmann** — Uses various extended tremolo notations in his string works.
- **Kaija Saariaho** — Uses tremolo with pitch changes under sustained tremolo.
- **Polish school broadly** — Roman Czura (composer/teacher in Poland): *"it needs one short explanation, then it is clear... it visually stands out from 3 slashes"*

### Sciarrino Note

Salvatore Sciarrino's *Sei Capricci* (1976) are primarily focused on harmonics and extreme extended techniques rather than Z-stem tremolo. His notation is famously idiosyncratic — described as "a sometimes-exasperating exercise in code breaking" (Yotam Haber, New Music USA). The Z-stem for unmeasured tremolo is more firmly Penderecki's territory.

### Why Z Instead of 3 Slashes?

- **Unambiguous** — 3 slashes can be misread as measured 32nds in slow tempi
- **Visually distinct** — One glance tells the player "unmeasured"
- **Efficient** — needs one short explanation, then clear for the rest of the piece
- **Evocative** — Z shape visually suggests buzzing/trembling

### LilyPond Implementation Approaches

Three approaches found for drawing Z-on-stem in LilyPond:

#### Approach 1: Text Markup with Positioning (simplest)

From LilyPond Cookbook (2015). Uses a "z" character with typewriter font, positioned via TextScript.extra-offset:

```lilypond
z = \markup { \override #'(font-family . typewriter) \fontsize #2 "z" }
\once \override TextScript.extra-offset = #'(.4 . -2.5)
c4^\z
```

**Pros:** Very simple.
**Cons:** Fragile — positioning must be adjusted per stem direction and note duration. Collides with eighth-note flags. Not automatic.

#### Approach 2: SVG Path + grob-transformer (most robust, LilyPond 2.23+)

From Reddit/robfelty (2024). Draws the Z as an SVG path, overlaid on the stem via `grob-transformer`:

```lilypond
buzzSymbol = \markup \path #0.25
  #(let ((x 1/2) (y 1/2))
    `((moveto ,x ,(- y)) (lineto ,(- x) ,(- y))
      (lineto ,x ,y) (lineto ,(- x) ,y)))

applyBuzzSymbol = #(grob-transformer 'stencil
  (lambda (grob orig)
    (let* ((yex (ly:stencil-extent orig Y))
           (ypos (interval-index yex CENTER))
           (sten (grob-interpret-markup grob buzzSymbol)))
      (ly:stencil-add orig
        (ly:stencil-translate-axis sten ypos Y)))))

buzz = \tweak Stem.stencil \applyBuzzSymbol \etc
```

**Pros:** Automatic centering on stem, works with both stem directions, clean Z shape.
**Cons:** Requires `grob-transformer` (LilyPond 2.23+). **NOT available in our project (2.20.0).**

#### Approach 3: Custom Stem Stencil Override (LilyPond 2.20 compatible) ← PROJECT APPROACH

Adapts Approach 2 for LilyPond 2.20 by directly overriding `Stem.stencil` with a Scheme lambda that draws the original stem + Z overlay:

```lilypond
#(define z-path '((moveto 0.45 -0.55)
                  (lineto -0.45 -0.55)
                  (lineto 0.45 0.55)
                  (lineto -0.45 0.55)))

#(define (stem-with-z grob)
   (let* ((orig (ly:stem::print grob))
          (yex (ly:stencil-extent orig Y))
          (ymid (/ (+ (car yex) (cdr yex)) 2))
          (z-stencil (grob-interpret-markup grob
                       (markup #:path 0.15 z-path))))
     (ly:stencil-add orig
       (ly:stencil-translate-axis z-stencil ymid Y))))
```

Usage: `\override Stem.stencil = #stem-with-z`

**Pros:** Works in 2.20, automatic centering, clean path rendering.
**Cons:** Overrides entire stem stencil (must revert when Z is not wanted).

### Path Geometry

The Z shape is drawn as four connected line segments:
```
(-0.45, -0.55) ——— (0.45, -0.55)   ← top horizontal bar
                  /
                /
              /
(-0.45, 0.55) ——— (0.45, 0.55)     ← bottom horizontal bar
```
- Path line thickness: 0.15 (adjustable)
- X extent: ±0.45 (width of Z)
- Y extent: ±0.55 (height of Z)
- Centered at stem midpoint

### References

- SMuFL Tremolos range: https://w3c.github.io/smufl/latest/tables/tremolos.html
- SMuFL Stems range: https://w3c.github.io/smufl/latest/tables/stems.html
- LilyPond Cookbook — Buzz Roll: https://lilypond-cookbook.tumblr.com/post/108846925424/noting-a-buzz-roll
- Dorico Forum — Z on stem: https://forums.steinberg.net/t/z-on-stem/739656
- Tim Davies — Tremolo and the Abstract Truth: https://www.timusic.net/debreved/tremolo-and-the-abstract-truth/
- MusicXML SMuFL tremolos issue: https://github.com/w3c/musicxml/issues/99

---

## Playing Behind the Bridge (Pizzicato or Bowed)

*(Migrated from NotationResearch.md — Feb 22, 2026)*

### Description

Plucking or bowing the **afterlength** — the short segment of string between the bridge and the tailpiece. Produces very high, squeaky, indeterminate pitches. On cello/bass the pitches are more recognizable due to longer string lengths; on violin/viola they can be extremely high, even above human hearing range.

Also known as: *dietro il ponticello* (Italian), "3rd bridge" (electric guitar term for same concept).

### Notation Approaches

1. **Text instruction** — `"behind the bridge"` or `"dietro il ponticello"` or abbreviated `"d.p."` / `"b.b."` written above the staff
2. **String clef system (Lachenmann)** — A special **"Behind the Bridge" string clef** replaces the standard clef. Uses a diagram showing the 4 strings (I–IV as Roman numerals) with an **arc below representing the bridge**. Notes are placed on string lines rather than pitched staff lines. The presence of the bridge arc distinguishes "behind the bridge" from "pegbox side."
   - First used in Lachenmann's *Zwei Gefühle, Musik mit Leonardo* (Breitkopf & Härtel, PB 5419)
   - Also discussed in Christian Dimpker's *Extended Notation: The Depiction of the Unconventional* (LIT Verlag, 2013)
   - A [SMuFL glyph proposal (Issue #275)](https://github.com/w3c/smufl/issues/275) exists to standardize these clef symbols — includes images and design proportions
3. **X-shaped noteheads** — Some composers use `x` noteheads to indicate indeterminate pitch behind the bridge
4. **Regular noteheads on string lines** — When using string clef, regular noteheads on the 4 string lines indicate which string to play

### Key Scores

| Composer | Work | Year | Technique | Link |
|----------|------|------|-----------|------|
| Krzysztof Penderecki | *Threnody to the Victims of Hiroshima* | 1961 | Bowing behind the bridge extensively; graphic notation with cluster bands | [Analysis + notation examples](https://musichistoryfsu.wordpress.com/2015/04/06/the-graphic-notation-of-krzysztof-pendereckis-threnody-for-the-victims-of-hiroshima/), [Wikipedia](https://en.wikipedia.org/wiki/Threnody_to_the_Victims_of_Hiroshima), [UNT Dissertation (PDF)](https://digital.library.unt.edu/ark:/67531/metadc500894/m2/1/high_res_d/1002775409-Daley.pdf) |
| Helmut Lachenmann | *Gran Torso* — String Quartet No. 1 | 1971/76/88 | Full string clef system, behind-bridge + pegbox playing, detailed technique catalog | [Score preview (Issuu)](https://issuu.com/breitkopf/docs/km_2233_issuu), [Purchase (Sheet Music Plus)](https://www.sheetmusicplus.com/en/product/gran-torso-2728737.html) |
| Helmut Lachenmann | *Grido* — String Quartet No. 3 | 2001 | Extended string clef notation, behind-bridge techniques | [Score preview (Issuu)](https://issuu.com/breitkopf/docs/km_2493_issuu) |
| Helmut Lachenmann | *Zwei Gefühle, Musik mit Leonardo* | 1992 | First systematic use of string clef + behind-bridge string clef | Breitkopf & Härtel, PB 5419 |
| Helmut Lachenmann | *Toccatina* (solo violin) | 1986 | Bowing on body, scroll, pegs, many extended techniques | Breitkopf & Härtel |
| George Crumb | *Black Angels* (electric string quartet) | 1970 | Bowing on "wrong" side of strings, thimble trilling, behind-bridge effects, glass harmonica | [Boosey & Hawkes](https://www.boosey.com/shop/prod/Crumb-George-Black-Angels/632749), [Wikipedia](https://en.wikipedia.org/wiki/Black_Angels_(Crumb)), [MTO Analysis](https://mtosmt.org/issues/mto.12.18.2/mto.12.18.2.johnston.html) |
| Ferde Grofé | *Grand Canyon Suite* | 1931 | Bowing behind bridge for donkey bray effect in violin cadenza | — |

---

## Pegbox Pizzicato (Playing In/On the Pegbox)

*(Migrated from NotationResearch.md — Feb 22, 2026)*

### Description

Plucking the strings **between the nut and the tuning pegs** (in the pegbox area). Produces extremely high, metallic, indeterminate pitches — even shorter string length than behind the bridge. Very quiet, delicate timbre.

Also referred to as: *sul pegbox*, "in the pegbox", "between the pegs", "behind the nut."

### Notation Approaches

1. **Text instruction** — `"sul pegbox"`, `"in the pegbox"`, `"between the pegs"`, or `"behind the nut"` written above the staff (italic)
2. **Lachenmann's string clef** — The **string clef without the bridge arc** represents the pegbox side of the instrument. Notes on the string lines indicate which string to pluck in the pegbox
3. **X noteheads + text** — Indeterminate pitch noteheads combined with text instruction
4. **No standardized symbol exists** — typically communicated through performance notes and text instructions

### Key Scores

| Composer | Work | Year | Notes |
|----------|------|------|-------|
| Helmut Lachenmann | *Gran Torso*, *Grido*, *Pression* | 1971–2001 | Systematically uses pegbox playing with string clef notation |
| Helmut Lachenmann | *Toccatina* (solo violin) | 1986 | Uses bowing on body of instrument, scroll, pegs, etc. |

---

## Related Extended Plucking Techniques

*(Migrated from NotationResearch.md — Feb 22, 2026)*

From [Wikipedia: Bowed string instrument extended technique](https://en.wikipedia.org/wiki/Bowed_string_instrument_extended_technique):

| Technique | Description | Notable Example |
|-----------|-------------|-----------------|
| **Buzz pizzicato** | Left hand finger placed parallel to string; pluck forcefully so string buzzes against fingerboard | Zhou Long, *Song of the Ch'in* (1982) |
| **Snap pizzicato (Bartók pizz)** | Pluck string away from fingerboard with enough force to snap back against it | Béla Bartók (extensive use); first directed by Gustav Mahler (Symphony No. 7) |
| **Nail pizzicato** | Pluck with fingernail only (not pad of finger); more harsh and metallic | Béla Bartók |

---

## Extended Technique Reference Links

*(Migrated from NotationResearch.md — Feb 22, 2026)*

### General Extended Technique References
- [Wikipedia: Bowed string instrument extended technique](https://en.wikipedia.org/wiki/Bowed_string_instrument_extended_technique) — comprehensive catalog of bowing, plucking, tapping, and miscellaneous effects
- [Wikipedia: Pizzicato](https://en.wikipedia.org/wiki/Pizzicato) — history, techniques, and notable repertoire
- [Noteflight: Playing Techniques and How to Write Them, Part 1: Strings](https://notes.noteflight.com/nfbehindthenotation-playing-techniques/) — practical notation guide

### Notation Standardization
- [SMuFL Issue #275: String Clef and Behind Bridge String Clef](https://github.com/w3c/smufl/issues/275) — proposed glyph designs for string clef and behind-bridge string clef, with images from Lachenmann scores and design proportions
- Christian Dimpker, *Extended Notation: The Depiction of the Unconventional* (LIT Verlag, 2013) — comprehensive book on extended notation systems

### Score Previews & Analysis
- [Lachenmann, *Gran Torso* — score preview (Issuu)](https://issuu.com/breitkopf/docs/km_2233_issuu)
- [Lachenmann, *Grido* — score preview (Issuu)](https://issuu.com/breitkopf/docs/km_2493_issuu)
- [Penderecki, *Threnody* — graphic notation analysis (FSU)](https://musichistoryfsu.wordpress.com/2015/04/06/the-graphic-notation-of-krzysztof-pendereckis-threnody-for-the-victims-of-hiroshima/)
- [Penderecki, *Threnody* — analysis (LSU)](https://music7703lsu.wordpress.com/2017/05/02/threnody-for-the-victims-of-hiroshima-for-52-strings-by-krzysztof-penderecki/)
- [Penderecki, *Threnody* — UNT Dissertation (PDF)](https://digital.library.unt.edu/ark:/67531/metadc500894/m2/1/high_res_d/1002775409-Daley.pdf)
- [Crumb, *Black Angels* — MTO analysis](https://mtosmt.org/issues/mto.12.18.2/mto.12.18.2.johnston.html)
- [Crumb, *Black Angels* — program notes (Newburyport Chamber Music)](https://www.newburyportchambermusic.org/program-notes/black-angels-thirteen-images-from-the-dark-land-for-electric-string-quartet-in-tempore-belli-1970)
- [Lachenmann, *temA* — Structure of Physicalities analysis](https://www.chrisswithinbank.net/2011/03/a-structure-of-physicalities-helmut-lachenmann-tema/)

### Recordings
- [Lachenmann: Complete String Quartets — Stadler Quartet (NEOS)](https://en.neos-music.com/product/helmut-lachenmann-string-quartets/)
- [Lachenmann: Complete String Quartets — Mode Records](https://moderecords.bandcamp.com/album/complete-string-quartets-mode267)

---

## Practical Decisions for String Quartet No. 1

*(Migrated from NotationResearch.md — Feb 22, 2026)*

**No universal standard symbol exists** for either pegbox or behind-the-bridge playing. Options:

1. **Text instruction approach** (simplest) — italic text like `"b.b."` (behind bridge) or `"sul pegbox"` above the staff, with `x` noteheads for indeterminate pitch
2. **String clef approach** (Lachenmann-style) — replace treble/bass clef with string diagram showing I–IV strings, with/without bridge arc to distinguish pegbox vs behind-bridge
3. **Performance notes** — define custom symbols in a legend at the top of the score

*Decision pending — to be determined during fragment composition.*

---

## Articulated Col Legno Flutter — Notation Research

*(Research date: Mar 11, 2026)*

### The Technique

An articulated **col legno** bowing where enough bow **pressure and speed** produce a **fluttering/chattering texture**. Distinct from:
- **Col legno battuto (c.l.b.)** — single percussive strike with wood
- **Col legno tratto (c.l.t.)** — drawing the wood smoothly across the string (quiet, airy)
- **Col legno gettato (c.l.g.)** — thrown/bounced wood, controlled ricochet
- **Jeté / ricochet** — bouncing bow (hair), not wood

The target sound is a sustained, pressured col legno draw that creates an articulated flutter — the wood chatters against the string rather than sliding cleanly. Analogous to **flutter tongue** on wind instruments.

### Existing Col Legno Vocabulary

| Technique | Abbreviation | Sound | Standard Notation |
|---|---|---|---|
| Col legno battuto | c.l.b. | Percussive tap | `x` notehead or text |
| Col legno tratto | c.l.t. | Quiet, airy, pitched with white noise | Text over normal noteheads |
| Col legno gettato | c.l.g. | Bouncing ricochet on wood | Text + staccato dots or z-stroke |
| Half wood/half hair | c.l.t. (variant) | Less airy, slightly more tone | Text "c.l.t. (half hair)" |

**Gap identified:** No established symbol for a sustained pressured col legno tratto producing a flutter/chatter texture.

### Composer Research

#### Salvatore Sciarrino — Sei Capricci (1976)

**Most relevant precedent.** Sciarrino's approach is **prescriptive** (notates what the player *does*, not what it *sounds like*).

**Key techniques:**
- **Spazzolare ("brushing")** — Caprice No. 3. A diagonal windshield-wiper bow motion across strings. Introduces a strong aleatoric element where harmonic pitches pop out unpredictably. Closest Sciarrino technique to the flutter concept — rapid pressured contact creating textural noise.
- **Jeté harmonics** — Caprices 1, 4, 6. Bouncing bow on harmonics. Caprice 6 has longer, more "indeterminate and gestural" jeté passages.
- **Oscillating harmonics** — Two pitches notated; player oscillates as fast as possible with light finger, combined with ponticello bow stroke.

**Notation system:** Asterisk footnotes in the score — symbols reference detailed text explanations at bottom of page, "written like footnotes, asterisks indicating descriptions as detailed as stage directions for the sought harmonic effect" (West Cork Music Festival notes).

**Viewable sources:**
- [Miranda Cuckson's talk (with video demos)](https://www.mirandacuckson.com/sciarrino-talk/) — best readable source, includes embedded video clips of each caprice's techniques
- [Scribd — Full Score](https://www.scribd.com/document/332823549/Sciarrino-6-Capricci-Per-Violino-Solo) — free account lets you preview pages including notation key
- [Scribd — Alternative Upload](https://www.scribd.com/document/538135955/Sciarrino-6-capricci-per-violino)
- [Caroline Eva Chin dissertation (CUNY)](https://academicworks.cuny.edu/gc_etds/4490/) — analysis and performance guide for each caprice
- [Yujin Sung dissertation (FSU, PDF)](https://www.research.fsu.edu/media/1764/sung.pdf) — lists notation symbols explicitly
- [Lourenço de Nardin Budó paper (Scribd)](https://www.scribd.com/document/479792443/Lourenco-de-Nardin-Budo-The-Marginal-Virtuosity-Salvatore-Sciarrino-and-Sei-Capricci) — reception, influences, and violin technique
- [West Cork Music Festival program notes](https://www.westcorkmusic.ie/works/sei-capricci-per-violino/) — describes notation system and technique overview

#### Krzysztof Penderecki — String Quartets

**String Quartet No. 1 (1960)** is a "sonic study" using the full range of traditional techniques plus Penderecki's own extensions.

**Notation approach:**
- **Graphic symbols** rather than traditional noteheads for many extended techniques
- **Zigzag lines** for tremolo variants
- **Thick/thin line weight** to indicate bow pressure
- **Arrow-headed lines** for directional bowing effects
- **Time-space notation** (proportional) rather than metered rhythms
- **Penderecki unmeasured tremolo glyph** (SMuFL U+E22B) — a Z-shaped stem decoration distinct from standard tremolo slashes

**Relevance:** Line thickness to encode pressure + zigzag/wavy lines for tremolo-like articulation directly applicable. See also Z-Stem section above.

#### George Crumb — Black Angels (1970)

Written for **electric string quartet** — amplification creates "highly surrealistic effect."

**Extended techniques:** Bowing on fingerboard above fingers, tapping strings with thimbles, pedal tones (heavy bow pressure), bowing on "wrong" side of strings, glass harmonica (bowed crystal goblets).

**Notation approach:** Combines traditional staff notation with **verbal instructions** and **graphic elements**. Detailed text instructions in score plus stage diagram.

**Relevance:** Practical model for combining conventional notation with specific text instructions for novel techniques.

#### Helmut Lachenmann — Pression (1969)

**Prescriptive notation system:** Notation indicates the player's **actions**, not resulting sounds.

**Key features:**
- **Multi-line staff** where different lines represent different physical parameters: bow position, bow pressure, bow speed, contact point
- **Bow pressure indicated by line thickness** or specific symbols
- Col legno passages notated with specific graphic markers showing where and how the wood contacts the string

**Relevance:** Most thorough precedent for encoding complex bowing actions. Pressure-as-line-weight convention directly useful.

**Viewable source:** [Erudit — Notation analysis article (François-Xavier Féron)](https://www.erudit.org/en/journals/circuit/2015-v25-n1-circuit01800/1029476ar/abstract/)

### Flutter Tongue Graphic Symbols (Wind Instrument Precedents)

The flutter tongue on wind instruments is the closest sonic analogy to the col legno flutter on strings. Research into graphic (non-text) notation for flutter tongue:

#### Standard Notation
- **Three tremolo slashes through the stem** (identical to unmeasured tremolo) + text "flz." / "frull." / "f.t."
- Per Wikipedia: "simply writing (3-line) tremolo marks on all rhythmic values without other indication is most generally accepted"

#### Graphic Alternatives

| Symbol | Description | Source/Composer |
|---|---|---|
| **Z on stem** | Z-shaped mark on note stem. Originally snare drum buzz roll; can represent unmeasured rapid repetition. | Standard percussion; SMuFL U+E22A |
| **Penderecki unmeasured tremolo** | SMuFL glyph U+E22B — specific stem decoration distinct from standard tremolo slashes. For strings. | Penderecki |
| **Rebecca Saunders' squiggle** | A **"stylized squiggle on the stem"** specifically for flutter tongue, freeing standard tremolo slashes for other techniques (valve tremolo, rapid repetitions). | Rebecca Saunders, cited in *The Modern Trumpet* by Nathan Plante |
| **Wavy trill line** | Wavy/zigzag line extending over duration of flutter. | Finale documentation; general practice |

#### The Rebecca Saunders Squiggle

Most relevant graphic precedent. Saunders recognized that standard tremolo slashes are ambiguous (measured tremolo vs. unmeasured vs. flutter tongue) and created a **distinct graphic stem decoration** specifically for flutter tongue.

**Viewable source:** [Rebecca Saunders, *Fury* — score extract (Issuu/Edition Peters)](https://issuu.com/scoresondemand/docs/rebecca_saunders_fury_ep11054_score_issuu_version_)

**Source reference:** Nathan Plante, [*The Modern Trumpet* — Flutter Tongue, Doodle Tongue and Growl](https://themoderntrumpet.com/2020/10/13/flutter-tongue-doodle-tongue-and-growl/): "I personally like Rebecca Saunders' solution of a stylized squiggle on the stem for flutter tongue while reserving the more traditional notation for other techniques."

### Emerging Synthesis Direction

**Design principles (from research):**
1. **Prescriptive** (à la Sciarrino/Lachenmann) — notate what the player does, not the sound result
2. **Flutter tongue analogy** — the col legno flutter is sonically analogous to flatterzunge; borrow graphic language
3. **Compact graphic** — avoid requiring text instruction on every occurrence

**Proposed elements to combine:**
1. **"c.l." text** — establishes col legno (wood of bow) on first occurrence
2. **A squiggle/wavy stem decoration** (à la Saunders) — indicates flutter/chattering quality, distinct from standard tremolo
3. **Prescriptive footnote** (à la Sciarrino) — first occurrence gets detailed performance instruction explaining bow speed/pressure producing flutter texture

*Decision pending — to be finalized after reviewing Sciarrino score pages and Saunders squiggle.*

---

## Notes

<!-- Add new research findings here -->
