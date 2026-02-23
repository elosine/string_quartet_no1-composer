\version "2.20.0"
\language "english"

\include "midi-tags.ily"
\include "midi-logger.ily"

% ╔════════════════════════════════════════════════════════════════════════════╗
% ║  NotationFragment008 — Cello                                             ║
% ║  Notation Fragment System                                                ║
% ║  Pizz glissando + b.b. + Bartók pizz + Z-stem arpeggio chord            ║
% ╚════════════════════════════════════════════════════════════════════════════╝


% =====================================================================
% PAPER
% =====================================================================
\paper {
  tagline = ##f
  paper-width = 90\mm
  paper-height = 50\mm
  top-margin = 0\mm
  bottom-margin = 0\mm
  left-margin = 1\mm
  right-margin = 0\mm
}


% =====================================================================
% SCHEME FUNCTIONS
% =====================================================================

% Force tuplet brackets to be perfectly horizontal (flat).
% Takes the auto-calculated positions and sets both ends to the max.
#(define (flatten-tuplet-bracket grob)
   (let* ((pos (ly:grob-property grob 'positions))
          (max-pos (max (car pos) (cdr pos))))
     (ly:grob-set-property! grob 'positions (cons max-pos max-pos))))

% =====================================================================
% X NOTEHEAD CONFIGURATION
% =====================================================================
% Independent size control for X noteheads (change without affecting regular noteheads)
#(define x-notehead-size -4.5)

xHeadOnce = {
  \once \override NoteHead.style = #'cross
  \once \override NoteHead.font-size = #x-notehead-size
}

% =====================================================================
% Z-STEM CALLIGRAPHIC BARS
% =====================================================================
#(define z-bar-width 1.1)
#(define z-bar-height 0.4)
#(define z-y-offset 3.4)
#(define z-bar-vpos 1.4)
#(define z-nib-ratio 0.6)
#(define z-diag-thick 0.09)
#(define z-diag-nudge 0.06)

#(define (stem-with-z grob)
   (let* ((orig (ly:stem::print grob))
          (yex (ly:stencil-extent orig Y))
          (ymid (/ (+ (car yex) (cdr yex)) 2))
          (W z-bar-width)
          (H z-bar-height)
          (h z-bar-vpos)
          (yo z-y-offset)
          (s (* H z-nib-ratio))
          (half (/ W 2))
          (s2 (/ s 2))
          (dt z-diag-thick)
          (dn (- z-diag-nudge))
          (top-y (+ (- h) yo))
          (bot-y (+ h yo))
          (bars-stencil
            (make-path-stencil
              `(moveto ,(- s2 half) ,(+ top-y H)
                lineto ,(- (+ half s2)) ,top-y
                lineto ,(- half s2) ,top-y
                lineto ,(+ half s2) ,(+ top-y H)
                closepath
                moveto ,(- (+ half s2)) ,(- bot-y H)
                lineto ,(- s2 half) ,bot-y
                lineto ,(+ half s2) ,bot-y
                lineto ,(- half s2) ,(- bot-y H)
                closepath)
              0.01 1 1 #t))
          (diag-stencil
            (make-path-stencil
              `(moveto ,(- (- (+ half s2 dn)) (/ dt 2)) ,top-y
                lineto ,(+ (- (+ half s2 dn)) (/ dt 2)) ,top-y
                lineto ,(+ (+ half s2 dn) (/ dt 2)) ,bot-y
                lineto ,(- (+ half s2 dn) (/ dt 2)) ,bot-y
                closepath)
              0.01 1 1 #t)))
     (ly:stencil-add orig
       (ly:stencil-translate-axis diag-stencil ymid Y)
       (ly:stencil-translate-axis bars-stencil ymid Y))))


% =====================================================================
% CUSTOM STAFF LINES (Scheme)
% =====================================================================
#(define staff-line-width-mm 10)

#(define custom-staff-lines
   (lambda (grob)
     (let* ((staff-space (ly:staff-symbol-staff-space grob))
            (line-count (ly:grob-property grob 'line-count 5))
            (thickness (ly:grob-property grob 'thickness 1))
            (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
            (width staff-line-width-mm)
            (width-staff-spaces (/ (* width 3.2) staff-space))
            (half-height (* (/ (- line-count 1) 2) staff-space)))
       (apply ly:stencil-add
              (map (lambda (i)
                     (ly:make-stencil
                      (list 'draw-line line-thickness
                            0 (* i staff-space)
                            width-staff-spaces (* i staff-space))
                      (cons 0 width-staff-spaces)
                      (cons (- half-height) half-height)))
                   (iota line-count (- (/ (- line-count 1) 2))))))))


% =====================================================================
% MUSIC VARIABLE
% =====================================================================
music = {
    \time 4/4

    % --- Base overrides ---
    \override NoteHead.font-size = #-3.3
    \override Accidental.font-size = #-7
    \override Accidental.extra-offset = #'(0.3 . 0)  % move accidental closer to notehead (positive X = rightward)
    \override DynamicText.font-size = #-8.5
    \override Rest.font-size = #-4
    \override Stem.direction = #UP
    \override Stem.details.beamed-lengths = #'(6)
    \override Stem.details.lengths = #'(7)
    \override Stem.transparent = ##f

    % --- Beam overrides ---
    \override Beam.damping = #+inf.0  % forces perfectly flat/horizontal beams (no slope)

    % --- Tuplet overrides ---
    \override TupletBracket.bracket-visibility = ##t
    \override TupletBracket.direction = #UP
    \override TupletBracket.after-line-breaking = #flatten-tuplet-bracket
    \override TupletBracket.padding = #0.5       % bracket height: lower = closer to notes
    \override TupletNumber.text = #tuplet-number::calc-fraction-text
    \override TupletNumber.font-size = #-5


    % =================================================================
    % NOTATION
    % =================================================================

    % --- Beat 1: four 16ths with glissando (Db2→D2→Eb2→E2) ---
    \midiPizz
    \midiGlissUp
    df,16[
    -\tweak extra-offset #'(-2 . 0)
    ^\markup {
      \override #'(font-name . "Crimson Pro Light Italic")
      \fontsize #-4
      "pizz."
    }
    -\tweak extra-offset #'(0 . 0)
    \ff
    -\tweak extra-offset #'(0 . 0)           % same staff line: Db2→D2
    -\tweak bound-details.left.padding #0.15
    -\tweak bound-details.right.padding #-0.6
    \glissando
    d,16
    \glissando
    ef,16
    -\tweak extra-offset #'(0 . 0)           % same staff line: Eb2→E2
    -\tweak bound-details.left.padding #0.15
    -\tweak bound-details.right.padding #-0.6
    \glissando
    \midiGlissReset
    e,16]

    % --- Beat 2: quintuplet 5:4 (5 sixteenths in space of 4) ---
          \once \override TupletBracket.after-line-breaking =
      #(lambda (grob) (ly:grob-set-property! grob 'positions (cons 7.3 7.3)))
    \tuplet 5/4 {
      % 1st partial: A3 behind-the-bridge (full b.b. convention)
      \midiBB
      \xHeadOnce
      a16
      -\tweak extra-offset #'(0 . -2.6)
      ^\markup {
        \override #'(font-name . "Crimson Pro Light Italic")
        \fontsize #-4
        "b.b."
      }

      % Remaining 4 partials: glissando F2→Gb2→G2→Ab2
      \midiPizz
      \midiGlissUp
      f,16
      \glissando
      gf,16
      -\tweak extra-offset #'(0 . 0.3)           % same staff line: Gb2→G2
      -\tweak bound-details.left.padding #0.15
      -\tweak bound-details.right.padding #-0.6
      \glissando
      g,16
      \glissando
      \midiGlissReset
      af,16
    }

    % --- Beat 3: triplet 3:2 (3 eighths in space of 2) ---
          \once \override TupletBracket.after-line-breaking =
      #(lambda (grob) (ly:grob-set-property! grob 'positions (cons 9.5 9.5)))
    \tuplet 3/2 {
      % 1st partial: G2 Bartók pizzicato
      \midiBartokPizz
      g,8
      -\tweak extra-offset #'(0 . 0)
      -\tweak font-size #-3
      \snappizzicato

      % 2nd partial: G2 behind-the-bridge (full b.b. convention)
      \midiBB
      \xHeadOnce
      g,8
      -\tweak extra-offset #'(0 . -3)
      ^\markup {
        \override #'(font-name . "Crimson Pro Light Italic")
        \fontsize #-4
        "b.b."
      }

      % 3rd partial: F#4 Bartók pizzicato
      \midiBartokPizz
      fs'8
      -\tweak extra-offset #'(0 . 0)
      -\tweak font-size #-3
      \snappizzicato
    }

    % --- Beat 4: Z-stem b.b. chord + hidden MIDI sextuplet (dual-score \tag) ---
    <<
      {
        % Display voice: Z-stem b.b. chord with fermata + hairpin + arpeggio
        \midiBB
        \xHeadOnce
        \once \override Stem.stencil = #stem-with-z
        \once \override Stem.details.lengths = #'(6.2)
        \once \override Hairpin.height = #0.6
        <c, g, d a>4\arpeggio
          -\tweak extra-offset #'(0 . 0)
          -\tweak font-size #-6
          ^\fermata
          -\tweak extra-offset #'(0 . 0)
          ^\markup {
            \override #'(font-name . "Crimson Pro Light Italic")
            \fontsize #-4
            "b.b."
          }
          -\tweak extra-offset #'(0 . 0)
          -\tweak shorten-pair #'(0 . 6)
          \<
        s4\!
      }
      \tag #'midiVoice
      \new Voice {
        % Hidden MIDI voice: sextuplet 6:4, chord C2 G2 D3 A3, all b.b.
        \override NoteColumn.ignore-collision = ##t
        \override NoteHead.transparent = ##t
        \override NoteHead.no-ledgers = ##t
        \override Stem.transparent = ##t
        \override Beam.transparent = ##t
        \override Dots.transparent = ##t
        \override TupletBracket.transparent = ##t
        \override TupletNumber.transparent = ##t
        \midiBB
        \tuplet 6/4 {
          <c, g, d a>16 <c, g, d a>16 <c, g, d a>16
          <c, g, d a>16 <c, g, d a>16 <c, g, d a>16
        }
        s4
      }
    >>

    % =================================================================
}


% =====================================================================
% SCORE 1: LAYOUT (clean spacing — hidden MIDI voice removed)
% =====================================================================
\score {
  \new Staff \with {
    \omit TimeSignature
    \omit BarLine
    \omit Clef
    \omit KeySignature
    \clef bass
    \override StaffSymbol.thickness = #1
    \override StaffSymbol.stencil = #custom-staff-lines
  } {
    \removeWithTag #'midiVoice \music
  }
  \layout {
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/16)
      \override Glissando.breakable = ##t
      \override Glissando.minimum-length = #3
      \override Glissando.bound-details.left.padding = #0.1
      \override Glissando.bound-details.right.padding = #-0.4
    }
    indent = -0.9
    line-width = 100\mm
  }
}


% =====================================================================
% SCORE 2: MIDI LOGGER + MIDI (includes hidden voice for event capture)
% =====================================================================
\score {
  \new Staff \with {
    \omit TimeSignature
    \omit BarLine
    \omit Clef
    \omit KeySignature
    \clef bass
    \override StaffSymbol.thickness = #1
    \override StaffSymbol.stencil = #custom-staff-lines
  } {
    \music
  }
  \layout {
    \context {
      \Score
      proportionalNotationDuration = #(ly:make-moment 1/28)
      \override Glissando.breakable = ##t
      \override Glissando.minimum-length = #3
      \override Glissando.bound-details.left.padding = #0.15
      \override Glissando.bound-details.right.padding = #0.05
    }
    \context {
      \Voice
      \consists \midiLogEngraver
    }
    indent = -0.9
    line-width = 100\mm
  }
  \midi {}
}
