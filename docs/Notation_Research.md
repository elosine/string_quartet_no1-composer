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

## Notes (add as needed)

<!-- Add new research findings here -->
