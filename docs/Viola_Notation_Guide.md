# Viola Notation Guide

**Living document — add notes as techniques and ranges are explored.**

---

## Open Strings

| String | Name | Pitch | LilyPond | Octave |
|--------|------|-------|----------|--------|
| **IV** (lowest) | C string | **C3** | c | 3 |
| **III** | G string | **G3** | g | 3 |
| **II** | D string | **D4** | d' | 4 |
| **I** (highest) | A string | **A4** | a' | 4 |

Tuning: C3 — G3 — D4 — A4 (ascending fifths — same string names as cello, one octave higher. Three strings in common with the violin: G, D, A.)

---

## Standard Range

- **Lowest note:** C3 (open IV string)
- **Practical upper limit (orchestral):** ~E6 (high positions, A string)
- **Extreme upper (solo/virtuoso):** ~A6 and beyond (harmonics, high positions)

**Clef:** Alto clef (C clef, middle line = C4) is standard. Treble clef used for sustained high passages (generally above C5/D5).

**Note on high positions:** Violists go above 7th position less frequently than violinists. The viola's larger body makes the upper bout harder to navigate — getting around the shoulder of the instrument requires more effort. Thumb position exists on viola but is far less common than on cello.

---

## Alto Clef Staff Reference

| Position | Pitch | LilyPond |
|----------|-------|----------|
| 3rd ledger line up | D6 | d''' |
| Space above 2nd ledger up | C6 | c''' |
| 2nd ledger line up | B5 | b'' |
| Space above 1st ledger up | A5 | a'' |
| 1st ledger line up | G5 | g'' |
| 1st space above staff | F5 | f'' |
| Top line | G4 | g' |
| 4th space | F4 | f' |
| 4th line | E4 | e' |
| 3rd space | D4 | d' |
| **Middle line** | **C4** | **c'** |
| 2nd space | B3 | b |
| 2nd line | A3 | a |
| 1st space | G3 | g |
| Bottom line | F3 | f |
| 1st space below staff | E3 | e |
| 1st ledger line down | D3 | d |
| Space below 1st ledger | C3 | c |
| 2nd ledger line down | B2 | b, |

---

## Position Guides — All Strings

The viola fingerboard uses half-step positions, identical in concept to the violin and cello. However, the viola's larger body (38–46 cm vs violin's ~35.5 cm) means **wider finger spacing** — the same intervals require a bigger stretch. The hand span in any position covers a **perfect fourth** (same as violin, wider than cello's minor third).

---

### 1st Position

#### C String (IV) — 1st Position
| Finger | Pitch | LilyPond |
|--------|-------|----------|
| Open | C3 | c |
| 1st (index) | Db3 / D3 | df / d |
| 2nd (middle) | D3 / Eb3 | d / ef |
| 3rd (ring) | Eb3 / E3 | ef / e |
| 4th (pinky) | F3 | f |

#### G String (III) — 1st Position
| Finger | Pitch | LilyPond |
|--------|-------|----------|
| Open | G3 | g |
| 1st (index) | Ab3 / A3 | af / a |
| 2nd (middle) | A3 / Bb3 | a / bf |
| 3rd (ring) | Bb3 / B3 | bf / b |
| 4th (pinky) | C4 | c' |

#### D String (II) — 1st Position
| Finger | Pitch | LilyPond |
|--------|-------|----------|
| Open | D4 | d' |
| 1st (index) | Eb4 / E4 | ef' / e' |
| 2nd (middle) | E4 / F4 | e' / f' |
| 3rd (ring) | F4 / F#4 | f' / fs' |
| 4th (pinky) | G4 | g' |

#### A String (I) — 1st Position
| Finger | Pitch | LilyPond |
|--------|-------|----------|
| Open | A4 | a' |
| 1st (index) | Bb4 / B4 | bf' / b' |
| 2nd (middle) | B4 / C5 | b' / c'' |
| 3rd (ring) | C5 / C#5 | c'' / cs'' |
| 4th (pinky) | D5 | d'' |

---

### 4th Position

Hand shifts up so 1st finger is a perfect fourth above the open string.

#### C String (IV) — 4th Position
| Finger | Pitch | LilyPond |
|--------|-------|----------|
| 1st (index) | F3 | f |
| 2nd (middle) | Gb3 / G3 | gf / g |
| 3rd (ring) | G3 / Ab3 | g / af |
| 4th (pinky) | Ab3 / A3 | af / a |

#### G String (III) — 4th Position
| Finger | Pitch | LilyPond |
|--------|-------|----------|
| 1st (index) | C4 | c' |
| 2nd (middle) | Db4 / D4 | df' / d' |
| 3rd (ring) | D4 / Eb4 | d' / ef' |
| 4th (pinky) | Eb4 / E4 | ef' / e' |

#### D String (II) — 4th Position
| Finger | Pitch | LilyPond |
|--------|-------|----------|
| 1st (index) | G4 | g' |
| 2nd (middle) | Ab4 / A4 | af' / a' |
| 3rd (ring) | A4 / Bb4 | a' / bf' |
| 4th (pinky) | Bb4 / B4 | bf' / b' |

#### A String (I) — 4th Position
| Finger | Pitch | LilyPond |
|--------|-------|----------|
| 1st (index) | D5 | d'' |
| 2nd (middle) | Eb5 / E5 | ef'' / e'' |
| 3rd (ring) | E5 / F5 | e'' / f'' |
| 4th (pinky) | F5 / F#5 | f'' / fs'' |

---

### 8th Position

Hand shifts up so 1st finger is approximately a minor sixth above the open string. Near the upper boundary of standard (non-high) positions.

#### C String (IV) — 8th Position
| Finger | Pitch | LilyPond |
|--------|-------|----------|
| 1st (index) | Ab3 | af |
| 2nd (middle) | A3 / Bb3 | a / bf |
| 3rd (ring) | Bb3 / B3 | bf / b |
| 4th (pinky) | B3 / C4 | b / c' |

#### G String (III) — 8th Position
| Finger | Pitch | LilyPond |
|--------|-------|----------|
| 1st (index) | Eb4 | ef' |
| 2nd (middle) | E4 / F4 | e' / f' |
| 3rd (ring) | F4 / F#4 | f' / fs' |
| 4th (pinky) | F#4 / G4 | fs' / g' |

#### D String (II) — 8th Position
| Finger | Pitch | LilyPond |
|--------|-------|----------|
| 1st (index) | Bb4 | bf' |
| 2nd (middle) | B4 / C5 | b' / c'' |
| 3rd (ring) | C5 / C#5 | c'' / cs'' |
| 4th (pinky) | C#5 / D5 | cs'' / d'' |

#### A String (I) — 8th Position
| Finger | Pitch | LilyPond |
|--------|-------|----------|
| 1st (index) | F5 | f'' |
| 2nd (middle) | F#5 / G5 | fs'' / g'' |
| 3rd (ring) | G5 / Ab5 | g'' / af'' |
| 4th (pinky) | Ab5 / A5 | af'' / a'' |

---

### Quick Summary — 4th Finger Reach by Position

| Position | C String (IV) | G String (III) | D String (II) | A String (I) |
|----------|--------------|----------------|----------------|--------------|
| **1st** | F3 (`f`) | C4 (`c'`) | G4 (`g'`) | D5 (`d''`) |
| **4th** | Ab3/A3 (`af`/`a`) | Eb4/E4 (`ef'`/`e'`) | Bb4/B4 (`bf'`/`b'`) | F5/F#5 (`f''`/`fs''`) |
| **8th** | B3/C4 (`b`/`c'`) | F#4/G4 (`fs'`/`g'`) | C#5/D5 (`cs''`/`d''`) | Ab5/A5 (`af''`/`a''`) |

---

## Pizzicato Notes

- Standard pizzicato: plucked with right hand index finger
- Left-hand pizzicato: indicated with `+` above the note
- Bartók (snap) pizzicato: string pulled away and snapped back against fingerboard, indicated with ⊙ (`\snappizzicato` in LilyPond)
- Viola pizzicato has a **warmer, darker tone** than violin, with more body in the lower register due to the longer string length and lower tuning
- The thicker strings respond slightly more slowly — plucks need a bit more energy than on violin
- Most resonant on open strings and lower positions; higher positions produce thinner, shorter-sustain tones

---

## LilyPond Notation Reference — Articulations & Techniques

### Open String
Indicated by a circle above the note.

**Project standard: `^\markup { \teeny "o" }`** (text "o" in teeny size)
```lilypond
c16^\markup { \teeny "o" }    % open C string (C3) ← CHOSEN
g4^\markup { \teeny "o" }     % open G string (G3)
```

**Other options** (not currently used):
```lilypond
% c16\flageolet               % slightly larger circle (Feta font)
% c16\open                    % standard small circle (Feta font)
% c16^\markup { \circle \null }  % drawn circle (geometric)
```

### Laissez Vibrer (Let Ring)
A short tie-like curve extending right from the note, not connecting to another note. Indicates the string should keep vibrating. Effective for open string pizzicato.

**Standard l.v. tie:**
```lilypond
c16\laissezVibrer           % let ring (C3)
c16\open\laissezVibrer      % open string + let ring (can combine)
```

**Arrowhead variant** (from percussion tradition, widely recognized):
```lilypond
\override TextSpanner.style = #'line
\override TextSpanner.bound-details.left.text = #""
\override TextSpanner.bound-details.right.arrow = ##t
\override TextSpanner.bound-details.right.padding = #-1
c16\open\startTextSpan s16\stopTextSpan
```

### Staccato
Short, detached. Dot above/below the note.
```lilypond
a'16-.              % staccato (shorthand) — A4
a'16\staccato       % staccato (verbose)
```

### Tenuto
Sustained, full value. Dash above/below the note.
```lilypond
g'8.--              % tenuto (shorthand) — G4
g'8.\tenuto         % tenuto (verbose)
```

### Articulation Shorthand Summary
| Shorthand | Name | Symbol |
|-----------|------|--------|
| `-.` | Staccato | dot |
| `--` | Tenuto | dash |
| `->` | Accent | > |
| `-!` | Marcato | ^ |
| `-^` | Marcato (alt) | ^ |
| `^\markup { \teeny "o" }` | Open string ← **CHOSEN** | o |
| `\flageolet` | Open string (alt) | ◦ |
| `\snappizzicato` | Bartók pizz | ⊙ |
| `\laissezVibrer` | Let ring | →tie |

### Tuplets
```lilypond
\tuplet 5/4 { r16 e'16 g'16 af16 r16 }      % quintuplet: 5 in the space of 4
\tuplet 6/4 { r16 d'8. r16 c'16 }            % sextuplet: 6 in the space of 4
\tuplet 3/2 { c8 d8 e8 }                      % triplet: 3 in the space of 2
```

Tuplet display overrides (project standard — flat bracket, ratio numbers):
```lilypond
\override TupletBracket.bracket-visibility = ##t
\override TupletBracket.direction = #UP
\override TupletBracket.after-line-breaking = #flatten-tuplet-bracket
\override TupletBracket.padding = #0.5     % bracket height: lower = closer to notes
\override TupletNumber.text = #tuplet-number::calc-fraction-text  % shows "5:4", "6:4", etc.
\override TupletNumber.font-size = #-5
```

Individual bracket height (per-tuplet, without affecting others):
```lilypond
\once \override TupletBracket.positions = #'(11.5 . 11.5)  % both values equal = flat
\tuplet 6/4 { ... }
```

Requires `flatten-tuplet-bracket` Scheme function (defined in templates before `\score` block):
```lilypond
#(define (flatten-tuplet-bracket grob)
   (let* ((pos (ly:grob-property grob 'positions))
          (max-pos (max (car pos) (cdr pos))))
     (ly:grob-set-property! grob 'positions (cons max-pos max-pos))))
```

### Flat Beams
Force all beams to be perfectly horizontal (no slope):
```lilypond
\override Beam.damping = #+inf.0
```

---

## Double, Triple & Quadruple Stops

### Overview

A **double stop** plays two strings simultaneously. A **triple stop** plays three, and a **quadruple stop** plays all four. On bowed instruments, the bridge curvature means:
- **Double stops**: fully sustainable, both strings sound together
- **Triple stops**: usually broken (two strings sustain, third is caught briefly)
- **Quadruple stops**: always arpeggiated (rolled), typically bottom-to-top

For **pizzicato**, these restrictions don't apply — all strings can be plucked simultaneously.

### Viola vs Violin/Cello: Stretch Differences

The viola's hand span covers a **perfect fourth** per position (same as violin), but the **wider finger spacing** due to the larger instrument means:
- Stretches that are easy on violin may be **slightly harder** on viola
- **Octaves** in low positions can be challenging for violists with smaller hands
- **Tenths** are very difficult — advanced technique, harder than on violin
- **Close intervals** (seconds) across strings require a more contorted hand frame on viola than on violin — the wider spacing between strings makes it less comfortable

Despite these challenges, viola double stops are well-established in the repertoire. Consecutive **thirds** and **sixths** are standard technique. The same intervals that are idiomatic on violin are generally playable on viola, just with somewhat more physical effort.

### Adjacent String Intervals

The open strings are tuned in **perfect fifths** (C3–G3–D4–A4), same as cello an octave higher.

| String Pair | Open Interval | Range of Practical Intervals |
|-------------|---------------|------------------------------|
| IV + III (C + G) | P5 (C3–G3) | m2 to ~octave (m10 advanced) |
| III + II (G + D) | P5 (G3–D4) | m2 to ~octave (m10 advanced) |
| II + I (D + A) | P5 (D4–A4) | m2 to ~octave (m10 advanced) |

### Idiomatic Double Stops (Most to Least Common)

#### 1. Open String + Fingered Note (easiest)
One string is open, freeing the left hand to finger the other string freely.

| Combination | Example | LilyPond |
|-------------|---------|----------|
| Open C + fingered G string | C3 + A3 | `<c a>` |
| Open G + fingered D string | G3 + F4 | `<g f'>` |
| Open D + fingered A string | D4 + C5 | `<d' c''>` |
| Open A + fingered D string | A4 + G4 | `<g' a'>` |
| Two open strings | C3 + G3 | `<c g>` |

#### 2. Thirds and Sixths (the bread and butter)
The most common fingered double stops on viola — consecutive runs of thirds and sixths are standard repertoire.

**Thirds** (two fingers on adjacent strings, separated by a third):

| Position | Strings | Notes | LilyPond | Interval |
|----------|---------|-------|----------|----------|
| 1st pos | III+II | A3 + F4 | `<a f'>` | m6 between strings → m3 |
| 1st pos | II+I | E4 + C5 | `<e' c''>` | m6 → m3 |
| 1st pos | III+II | B3 + G4 | `<b g'>` | m6 → m3 |

**Sixths** (wider stretch, moderate difficulty):

| Position | Strings | Notes | LilyPond | Interval |
|----------|---------|-------|----------|----------|
| 1st pos | III+II | C4 + A4 (open) | `<c' a'>` | M6 |
| 1st pos | IV+III | G3 (open) + E4 | `<g e'>` | M6 |
| 4th pos | II+I | Bb4 + G5 | `<bf' g''>` | M6 |

#### 3. Perfect Fifths (one finger barred across two strings)
A single finger presses two adjacent strings at the same point. Natural on all strings.

| Position | Strings | Notes | LilyPond |
|----------|---------|-------|----------|
| 1st pos, 1st finger | IV+III | D3 + A3 | `<d a>` |
| 1st pos, 1st finger | III+II | A3 + E4 | `<a e'>` |
| 1st pos, 1st finger | II+I | E4 + B4 | `<e' b'>` |
| 4th pos, 1st finger | II+I | G4 + D5 | `<g' d''>` |

#### 4. Octaves (moderate to difficult)
Same note name, one octave apart, on strings separated by one string (skip a string). Requires a wide stretch — **harder on viola than on violin** due to wider spacing, especially in low positions. Easier in higher positions where distances shrink.

| Position | Strings | Notes | LilyPond |
|----------|---------|-------|----------|
| 1st pos | IV+II | D3 + D4 | `<d d'>` |
| 1st pos | III+I | A3 + A4 (open) | `<a a'>` |
| 4th pos | IV+II | F3 + F4 | `<f f'>` |

#### 5. Tenths (very advanced)
A third + an octave. Skips a string. **Significantly harder on viola than on violin** due to the wider fingerboard. Only for advanced players or where one note is an open string.

### Idiomatic Triple Stops

Triple stops use three adjacent strings. At least one open string makes them much easier.

| Type | Example | LilyPond | Notes |
|------|---------|----------|-------|
| All open (C+G+D) | C3+G3+D4 | `<c g d'>` | Easiest possible |
| All open (G+D+A) | G3+D4+A4 | `<g d' a'>` | Easiest possible |
| 2 open + 1 fingered | C3+G3+E4 | `<c g e'>` | Very easy |
| 1 open + 2 fingered | G3+E4+B4 | `<g e' b'>` | Moderate |
| All fingered (1st pos) | D3+A3+F4 | `<d a f'>` | All 1st finger = barré |
| Power chord shape | D3+A3+D4 | `<d a d'>` | 5th + octave |

### Idiomatic Quadruple Stops

All four strings. Always arpeggiated. Open strings are key.

| Type | Example | LilyPond | Notes |
|------|---------|----------|-------|
| All open | C3+G3+D4+A4 | `<c g d' a'>` | The ultimate easy quad |
| 3 open + 1 | C3+G3+D4+B4 | `<c g d' b'>` | Very accessible |
| 2 open + 2 | C3+A3+D4+A4 | `<c a d' a'>` | Moderate |
| All fingered (barré) | D3+A3+E4+B4 | `<d a e' b'>` | 1st finger across all 4 |
| C major chord | C3+G3+E4+C5 | `<c g e' c''>` | Classic voicing |

### LilyPond Chord Notation
```lilypond
% Double stop
<c g>4            % C3 + G3, quarter note

% Triple stop
<c g d'>4         % C3 + G3 + D4

% Quadruple stop (arpeggiated)
<c g e' c''>4\arpeggio    % C major chord, rolled

% With dynamics and articulations
<d a>16-.\ff      % D3+A3 double stop, staccato, ff
```

### Stretch Guidelines

| Interval on Same String | Feasibility | Notes |
|--------------------------|-------------|-------|
| Half step (m2) | Easy | Any position |
| Whole step (M2) | Easy | Any position |
| Minor 3rd | Easy | Any position |
| Major 3rd | Comfortable | Any position |
| Perfect 4th | Normal technique | Standard hand span, any position |
| Augmented 4th / P5 | Stretch or extension | Doable but requires extension of 1st or 4th finger |

**Key difference from cello:** The viola hand span is a perfect fourth (same as violin), not the minor third of the cello. This makes wider intervals across strings more accessible, but the viola's larger size means each half step is physically wider than on violin.

**Rule of thumb for stops across strings:** If both notes are reachable in the same position on their respective strings, the double stop is idiomatic. If one note requires shifting while holding the other, it's difficult or impossible.

### Pizzicato-Specific Multi-String Notes

- **Strum**: Thumb or index finger sweeps across 2–4 strings rapidly (guitar-like)
- **Pluck chord**: Thumb on lower string + index on upper string simultaneously (true double stop)
- **Three-finger pluck**: Thumb + index + middle = true triple stop pizzicato
- **Pizzicato double stops are MORE accessible than bowed ones** — no bow curvature limitation

---

## Notes (add as needed)

<!-- Add technique notes, observations, and discoveries here -->
