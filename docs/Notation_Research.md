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

## Notes (add as needed)

<!-- Add new research findings here -->
